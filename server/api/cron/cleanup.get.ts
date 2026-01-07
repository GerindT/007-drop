import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Security check
  const authHeader = getHeader(event, 'Authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (authHeader !== `Bearer ${cronSecret}` && getQuery(event).key !== cronSecret) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const supabase = await serverSupabaseServiceRole(event)
  
  try {
    const now = new Date().toISOString()
    
    // Find expired files or files that reached download limit
    // Note: Supabase JS client doesn't support complex OR conditions easily in one query
    // So we'll fetch potentially expired files and filter in code or make two queries
    
    // Query 1: Time expired
    const { data: timeExpiredFiles, error: timeError } = await supabase
      .from('files')
      .select('id, storage_path, original_name')
      .lt('expires_at', now)
    
    if (timeError) throw timeError
    
    // Query 2: Download limit reached (and not unlimited)
    // We can't easily do "download_count >= download_limit" in postgrest-js without rpc
    // So we'll fetch all files with a limit > 0 and filter in JS for now (not efficient for millions of files but fine for MVP)
    // A better approach would be a database function or a raw SQL query if we had access
    const { data: limitFiles, error: limitError } = await supabase
      .from('files')
      .select('id, storage_path, original_name, download_count, download_limit')
      .gt('download_limit', 0)
      
    if (limitError) throw limitError
    
    const limitExpiredFiles = limitFiles?.filter(f => f.download_count >= f.download_limit) || []
    
    // Combine unique files to delete
    const filesToDelete = [...(timeExpiredFiles || []), ...limitExpiredFiles]
    
    // Deduplicate by ID
    const uniqueFiles = filesToDelete.filter((file, index, self) => 
      index === self.findIndex((t) => t.id === file.id)
    )
    
    if (uniqueFiles.length === 0) {
      return { message: 'No files to cleanup', deleted: 0 }
    }
    
    const storagePaths = uniqueFiles.map(f => f.storage_path)
    const fileIds = uniqueFiles.map(f => f.id)
    
    // Delete from Storage
    const { error: storageError } = await supabase.storage
      .from('drops')
      .remove(storagePaths)
      
    if (storageError) {
      console.error('Storage cleanup error:', storageError)
    }
    
    // Delete from Database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .in('id', fileIds)
      
    if (dbError) throw dbError
    
    return {
      message: 'Cleanup successful',
      deleted: uniqueFiles.length,
      files: uniqueFiles.map(f => f.original_name)
    }
    
  } catch (err) {
    console.error('Cleanup error:', err)
    throw createError({
      statusCode: 500,
      message: 'Cleanup failed: ' + err.message
    })
  }
})
