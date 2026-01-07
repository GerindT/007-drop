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
    
    // Check if download limit reached (skip if unlimited = 0)
    if (file.download_limit > 0 && file.download_count >= file.download_limit) {
      // Clean up file
      await supabase.storage.from('drops').remove([file.storage_path])
      await supabase.from('files').delete().eq('id', fileId)
      
      throw createError({
        statusCode: 410,
        message: 'Download limit reached'
      })
    }
    
    // Increment download count
    const { error: updateError } = await supabase
      .from('files')
      .update({ download_count: file.download_count + 1 })
      .eq('id', fileId)
    
    if (updateError) {
      console.error('Failed to update download count:', updateError)
    }
    
    // Generate signed URL for download (valid for 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('drops')
      .createSignedUrl(file.storage_path, 300, {
        download: file.original_name
      })
    
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError)
      throw createError({
        statusCode: 500,
        message: 'Failed to generate download link'
      })
    }
    
    // If this was the last download (and not unlimited), delete the file
    if (file.download_limit > 0 && file.download_count + 1 >= file.download_limit) {
      // Schedule deletion after a short delay to allow download
      setTimeout(async () => {
        try {
          await supabase.storage.from('drops').remove([file.storage_path])
          await supabase.from('files').delete().eq('id', fileId)
          console.log(`Deleted file ${fileId} after reaching download limit`)
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError)
        }
      }, 60000) // 1 minute delay
    }
    
    return {
      url: signedUrlData.signedUrl,
      name: file.original_name
    }
    
  } catch (err) {
    if (err.statusCode) throw err
    console.error('Download error:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to process download'
    })
  }
})
