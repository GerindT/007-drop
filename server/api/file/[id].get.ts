import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const fileId = getRouterParam(event, 'id')
  
  if (!fileId) {
    throw createError({
      statusCode: 400,
      message: 'File ID required'
    })
  }
  
  try {
    // Get file info from database
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()
    
    if (error || !file) {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      })
    }
    
    // Check if file is expired
    if (new Date(file.expires_at) < new Date()) {
      // Clean up expired file
      await supabase.storage.from('drops').remove([file.storage_path])
      await supabase.from('files').delete().eq('id', fileId)
      
      throw createError({
        statusCode: 410,
        message: 'File has expired'
      })
    }
    
    // Check if download limit reached
    if (file.download_count >= file.download_limit) {
      throw createError({
        statusCode: 410,
        message: 'Download limit reached'
      })
    }
    
    return {
      id: file.id,
      name: file.original_name,
      size: file.file_size,
      mimeType: file.mime_type,
      expiresAt: file.expires_at,
      downloadsRemaining: file.download_limit - file.download_count
    }
    
  } catch (err) {
    if (err.statusCode) throw err
    console.error('File info error:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to retrieve file info'
    })
  }
})
