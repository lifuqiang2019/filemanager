import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: Request) {
  try {
    const filesDir =
      process.env.FILES_DIR || '/home/u330586698/domains/file.aoobooc.me/public_html/files'
    const publicBaseUrl = process.env.PUBLIC_FILES_BASE_URL || 'https://file.aoobooc.me/files'

    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true })
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file found in request' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
        status: 413,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const fileName = file.name
    const invalidChars = /[<>:"/\\|?*\0]/
    if (invalidChars.test(fileName) || fileName.includes('..')) {
      return new Response(JSON.stringify({ error: 'Invalid filename' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext).replace(/\//g, '_')
    const hash = crypto
      .createHash('md5')
      .update(fileBuffer)
      .update(Date.now().toString())
      .digest('hex')
      .slice(0, 8)
    const safeFileName = `${baseName}_${hash}${ext}`
    const filePath = path.join(filesDir, safeFileName)
    fs.writeFileSync(filePath, fileBuffer)
    fs.chmodSync(filePath, 0o644)

    const url = `${publicBaseUrl}/${encodeURIComponent(safeFileName)}`

    return new Response(
      JSON.stringify({
        fileName: safeFileName,
        url,
        size: fileBuffer.length.toString(),
        contentType: file.type || 'application/octet-stream',
        createdAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
