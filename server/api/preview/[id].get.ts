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
    // Get file info/check permissions
    const { data: file, error } = await supabase
      .from('files')
      .select('storage_path, has_preview')
      .eq('id', fileId)
      .single()
    
    if (error || !file) {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      })
    }
    
    if (!file.has_preview) {
      throw createError({
        statusCode: 404,
        message: 'No preview available'
      })
    }
    
    // Download thumbnail from storage
    const { data, error: downloadError } = await supabase.storage
      .from('drops')
      .download(`${file.storage_path}-preview`)
      
    if (downloadError) {
      console.error('Preview download error:', downloadError)
      throw createError({
        statusCode: 500,
        message: 'Failed to retrieve preview'
      })
    }
    
    // Return the blob data
    // Nuxt/Nitro handles Blob/Buffer returns automatically
    return data
    
  } catch (err) {
    if (err.statusCode) throw err
    console.error('Preview error:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to get preview'
    })
  }
})
