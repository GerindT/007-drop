import { serverSupabaseServiceRole } from '#supabase/server'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No file provided'
      })
    }
    
    const fileField = formData.find(field => field.name === 'file')
    
    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        message: 'No file provided'
      })
    }
    
    // Check for original metadata (for encrypted uploads)
    const originalNameField = formData.find(field => field.name === 'originalName')
    const originalSizeField = formData.find(field => field.name === 'originalSize')
    const originalTypeField = formData.find(field => field.name === 'originalType')
    
    // Check for password protection fields
    const isPasswordProtectedField = formData.find(field => field.name === 'isPasswordProtected')
    const passwordSaltField = formData.find(field => field.name === 'passwordSalt')
    
    // Check for download limit (0 = unlimited)
    const downloadLimitField = formData.find(field => field.name === 'downloadLimit')
    
    // Use original metadata if provided, otherwise fall back to file field values
    const originalName = originalNameField?.data?.toString() || fileField.filename || 'untitled'
    const mimeType = originalTypeField?.data?.toString() || fileField.type || 'application/octet-stream'
    const originalSize = originalSizeField ? parseInt(originalSizeField.data.toString()) : fileField.data.length
    const encryptedSize = fileField.data.length
    const isPasswordProtected = isPasswordProtectedField?.data?.toString() === 'true'
    const passwordSalt = passwordSaltField?.data?.toString() || null
    const downloadLimit = downloadLimitField ? parseInt(downloadLimitField.data.toString()) : 1
    
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (encryptedSize > maxSize) {
      throw createError({
        statusCode: 413,
        message: 'File size exceeds 50MB limit'
      })
    }
    
    // Check for webhook URL
    const webhookUrlField = formData.find(field => field.name === 'webhookUrl')
    let webhookUrl = webhookUrlField?.data?.toString() || null
    
    // Basic validation for webhook URL
    if (webhookUrl && !webhookUrl.startsWith('http')) {
      webhookUrl = null
    }

    // Generate unique ID for this file
    const fileId = randomUUID()
    const deleteToken = randomUUID()
    const storagePath = `drops/${fileId}`
    
    // Check for thumbnail
    const thumbnailField = formData.find(field => field.name === 'thumbnail')
    const hasPreview = !!thumbnailField
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('drops')
      .upload(storagePath, fileField.data, {
        contentType: mimeType,
        upsert: false
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw createError({
        statusCode: 500,
        message: 'Failed to upload file'
      })
    }
    
    // Upload thumbnail if present
    if (hasPreview && thumbnailField?.data) {
      const { error: thumbError } = await supabase.storage
        .from('drops')
        .upload(`${storagePath}-preview`, thumbnailField.data, {
          contentType: 'application/octet-stream',
          upsert: false
        })
        
      if (thumbError) {
        console.warn('Thumbnail upload failed:', thumbError)
        // Continue without preview, just log it
      }
    }
    
    // Create database record
    console.log('Inserting file record into DB:', { id: fileId, originalName, downloadLimit, hasPreview })
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    const { error: dbError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        original_name: originalName,
        storage_path: storagePath,
        file_size: originalSize,
        mime_type: mimeType,
        download_limit: downloadLimit, // 0 = unlimited
        download_count: 0,
        expires_at: expiresAt.toISOString(),
        is_password_protected: isPasswordProtected,
        password_salt: passwordSalt,
        has_preview: hasPreview,
        delete_token: deleteToken,
        webhook_url: webhookUrl
      })
    
    if (dbError) {
      // Rollback: delete uploaded file and thumbnail
      console.error('Database insert failed:', dbError)
      await supabase.storage.from('drops').remove([storagePath])
      if (hasPreview) {
        await supabase.storage.from('drops').remove([`${storagePath}-preview`])
      }
      
      throw createError({
        statusCode: 500,
        message: 'Failed to create file record: ' + dbError.message
      })
    }
    
    console.log('Upload successful for file:', fileId)
    
    return {
      id: fileId,
      name: originalName,
      size: originalSize,
      expiresAt: expiresAt.toISOString(),
      deleteToken: deleteToken
    }
    
  } catch (err) {
    console.error('Upload error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: err.message || 'Upload failed'
    })
  }
})
