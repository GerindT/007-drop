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
    
    // Use original metadata if provided, otherwise fall back to file field values
    const originalName = originalNameField?.data?.toString() || fileField.filename || 'untitled'
    const mimeType = originalTypeField?.data?.toString() || fileField.type || 'application/octet-stream'
    const originalSize = originalSizeField ? parseInt(originalSizeField.data.toString()) : fileField.data.length
    const encryptedSize = fileField.data.length
    
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (encryptedSize > maxSize) {
      throw createError({
        statusCode: 413,
        message: 'File size exceeds 50MB limit'
      })
    }
    
    // Generate unique ID for this file
    const fileId = randomUUID()
    const storagePath = `drops/${fileId}`
    
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
    
    // Create database record
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    const { error: dbError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        original_name: originalName,
        storage_path: storagePath,
        file_size: originalSize,
        mime_type: mimeType,
        download_limit: 1,
        download_count: 0,
        expires_at: expiresAt.toISOString()
      })
    
    if (dbError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('drops').remove([storagePath])
      console.error('Database insert error:', dbError)
      throw createError({
        statusCode: 500,
        message: 'Failed to create file record'
      })
    }
    
    return {
      id: fileId,
      name: originalName,
      size: fileSize,
      expiresAt: expiresAt.toISOString()
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
