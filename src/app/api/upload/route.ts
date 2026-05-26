import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

export async function POST(request: Request) {
  try {
    const filesDir = process.env.FILES_DIR || '/home/u330586698/domains/file.aoobooc.me/files'
    console.log(`Files directory: ${filesDir}`)
    
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true })
      console.log(`Created files directory: ${filesDir}`)
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file found in request' }), { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), { status: 413 })
    }

    const filename = file.name
    
    const invalidChars = /[<>:"/\\|?*\0]/
    if (invalidChars.test(filename) || filename.includes('..')) {
      return new Response(JSON.stringify({ error: 'Invalid filename' }), { status: 400 })
    }

    const ext = path.extname(filename).toLowerCase()
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').substring(0, 8)
    let basename = path.basename(filename, ext)
    if (basename.endsWith(ext)) {
      basename = basename.slice(0, -ext.length)
    }
    const savedFilename = `${basename}_${hash}${ext}`

    const filePath = path.join(filesDir, savedFilename)
    fs.writeFileSync(filePath, fileBuffer)
    fs.chmodSync(filePath, 0o644) // 设置文件权限
    console.log(`[UPLOAD] File saved: ${filePath}, size: ${fileBuffer.length} bytes`)
    console.log(`[UPLOAD] Saved filename: "${savedFilename}"`)
    console.log(`[UPLOAD] Directory contents after save:`, fs.readdirSync(filesDir))

    const headers = Object.fromEntries(request.headers)
    const protocol = headers['x-forwarded-proto'] || 'http'
    const host = headers.host || 'localhost:3000'
    const fileUrl = `${protocol}://${host}/api/files/${encodeURIComponent(savedFilename)}`

    return new Response(JSON.stringify({
      success: true,
      filename: savedFilename,
      originalFilename: filename,
      url: fileUrl,
      message: 'File uploaded successfully',
      filePath: filePath
    }), { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      } 
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
