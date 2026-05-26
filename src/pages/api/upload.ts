import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

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

      let filename = filenameMatch[1]
      if (!filename) {
        filename = `file_${Date.now()}.bin`
      }

      const invalidChars = /[<>:"/\\|?*\0]/
      if (invalidChars.test(filename) || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' })
      }

      const cleanBody = body.slice(0, -2)

      const filePath = path.join(filesDir, filename)
      fs.writeFileSync(filePath, cleanBody)

      const protocol = req.headers['x-forwarded-proto'] || 'http'
      const host = req.headers.host || 'localhost:3000'
      const fileUrl = `${protocol}://${host}/api/files/${encodeURIComponent(filename)}`

      return res.status(200).json({
        success: true,
        filename,
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
