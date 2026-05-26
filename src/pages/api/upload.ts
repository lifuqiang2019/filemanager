import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const config = {
  api: {
    bodyParser: false,
  },
}

function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = []
  let startIndex = 0
  
  for (let i = 0; i <= buffer.length - delimiter.length; i++) {
    let match = true
    for (let j = 0; j < delimiter.length; j++) {
      if (buffer[i + j] !== delimiter[j]) {
        match = false
        break
      }
    }
    
    if (match) {
      if (i > startIndex) {
        parts.push(buffer.slice(startIndex, i))
      }
      startIndex = i + delimiter.length
      i = startIndex - 1
    }
  }
  
  if (startIndex < buffer.length) {
    parts.push(buffer.slice(startIndex))
  }
  
  return parts
}

const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const filesDir = path.join(process.cwd(), 'files')
    
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true })
    }

    const contentType = req.headers['content-type'] || ''
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' })
    }

    const boundaryMatch = contentType.match(/boundary=(.+)/)
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid multipart boundary' })
    }
    const boundary = boundaryMatch[1]

    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const boundaryStr = Buffer.from(`--${boundary}`, 'utf-8')
    const parts = splitBuffer(buffer, boundaryStr)

    for (const part of parts) {
      if (part.length === 0) continue
      
      const headerEnd = part.indexOf('\r\n\r\n')
      if (headerEnd === -1) continue

      const header = part.slice(0, headerEnd).toString('utf-8')
      const body = part.slice(headerEnd + 4)

      const filenameMatch = header.match(/filename="([^"]+)"/)
      if (!filenameMatch) continue

      let originalFilename = filenameMatch[1]
      if (!originalFilename) {
        originalFilename = `file_${Date.now()}.bin`
      }

      const invalidChars = /[<>:"/\\|?*\0]/
      if (invalidChars.test(originalFilename) || originalFilename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' })
      }

      const ext = path.extname(originalFilename)
      const hash = crypto.createHash('md5').update(body).digest('hex').substring(0, 8)
      const basename = path.basename(originalFilename, ext)
      const filename = `${basename}_${hash}${ext}`

      let cleanBody = body
      const endIndex = cleanBody.lastIndexOf('\r\n--')
      if (endIndex !== -1) {
        cleanBody = cleanBody.slice(0, endIndex)
      }

      const filePath = path.join(filesDir, filename)
      fs.writeFileSync(filePath, cleanBody)
      console.log(`File saved: ${filePath}, size: ${cleanBody.length} bytes`)

      const protocol = req.headers['x-forwarded-proto'] || 'http'
      const host = req.headers.host || 'localhost:3000'
      const fileUrl = `${protocol}://${host}/api/files/${encodeURIComponent(filename)}`

      return res.status(200).json({
        success: true,
        filename,
        originalFilename,
        url: fileUrl,
        message: 'File uploaded successfully'
      })
    }

    return res.status(400).json({ error: 'No file found in request' })
    
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default uploadHandler
