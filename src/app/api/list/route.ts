import fs from 'fs'
import path from 'path'

export async function GET() {
  const filesDir = process.env.FILES_DIR || '/home/u330586698/domains/file.aoobooc.me/files'
  
  console.log(`[LIST] Checking directory: ${filesDir}`)
  
  try {
    if (!fs.existsSync(filesDir)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Directory does not exist',
        directory: filesDir 
      }), { status: 404 })
    }
    
    const files = fs.readdirSync(filesDir)
    const fileDetails = files.map(filename => {
      const filePath = path.join(filesDir, filename)
      const stats = fs.statSync(filePath)
      return {
        filename,
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory()
      }
    })
    
    console.log(`[LIST] Found ${files.length} files in directory:`, files)
    
    return new Response(JSON.stringify({
      success: true,
      directory: filesDir,
      files: fileDetails
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    
  } catch (error) {
    console.error('[LIST] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error),
      directory: filesDir 
    }), { status: 500 })
  }
}
