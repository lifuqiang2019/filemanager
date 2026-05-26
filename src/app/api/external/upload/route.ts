import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const API_KEY = process.env.API_KEY || 'ak_j8xr9qecnjvfwwao'
    const CDN_DOMAIN = process.env.CDN_DOMAIN || 'https://cdnfile.lengyuer.autos'
    
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

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
    fs.chmodSync(filePath, 0o644)
    console.log(`[UPLOAD] File saved: ${filePath}, size: ${fileBuffer.length} bytes`)

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const key = `uploads/users/default/${dateStr}/${savedFilename}`
    const url = `${CDN_DOMAIN}/${key}`

    return new Response(JSON.stringify({
      id: crypto.randomUUID(),
      fileName: filename,
      key: key,
      url: url,
      size: fileBuffer.length.toString(),
      contentType: file.type || 'application/octet-stream',
      createdAt: now.toISOString()
    }), { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'x-api-key, Content-Type'
      } 
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'x-api-key, Content-Type'
    }
  })
}