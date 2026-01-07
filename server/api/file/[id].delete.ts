import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const fileId = getRouterParam(event, 'id')
  const deleteToken = getRequestHeader(event, 'x-delete-token')
  
  if (!fileId) {
    throw createError({
      statusCode: 400,
      message: 'File ID required'
    })
  }
  
  if (!deleteToken) {
    throw createError({
      statusCode: 401,
      message: 'Delete token required'
    })
  }
  
  try {
    // Check if file exists and token matches
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('storage_path, delete_token, has_preview')
      .eq('id', fileId)
      .single()
      
    if (fetchError || !file) {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      })
    }
    
    // Verify token (simple string comparison, timing attack negligible for this use case)
    if (file.delete_token !== deleteToken) {
      throw createError({
        statusCode: 403,
        message: 'Invalid delete token'
      })
    }
    
    // Delete from storage
    const filesToDelete = [file.storage_path]
    if (file.has_preview) {
      filesToDelete.push(`${file.storage_path}-preview`)
    }
    
    const { error: storageError } = await supabase.storage
      .from('drops')
      .remove(filesToDelete)
      
    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue to delete from DB anyway to avoid zombie records
    }
    
    // Delete from DB
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      
    if (dbError) {
      throw createError({
        statusCode: 500,
        message: 'Database delete failed'
      })
    }
    
    return { success: true }
    
  } catch (err) {
    if (err.statusCode) throw err
    console.error('Delete error:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete file'
    })
  }
})
