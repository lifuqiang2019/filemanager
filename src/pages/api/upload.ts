import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
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

    const chunks: Buffer[] = []
    let filename = ''

    for await (const chunk of req) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const content = buffer.toString('utf-8')
    
    const match = content.match(/Content-Disposition: form-data; name="file"; filename="([^"]+)"/)
    if (match) {
      filename = match[1]
    } else {
      filename = `file_${Date.now()}.bin`
    }

    const boundaryMatch = content.match(/^--([^\r\n]+)/)
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid multipart form data' })
    }

    const boundary = boundaryMatch[1]
    const parts = content.split(`--${boundary}`)
    
    for (const part of parts) {
      if (part.includes('Content-Disposition') && part.includes('filename')) {
        const lines = part.split('\r\n')
        let contentStartIndex = 0
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] === '') {
            contentStartIndex = i + 1
            break
          }
        }

        const fileContent = lines.slice(contentStartIndex).join('\r\n').replace(/--$/, '').trimEnd()
        const filePath = path.join(filesDir, filename)
        
        fs.writeFileSync(filePath, fileContent, { encoding: 'binary' })
        
        const fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/files/${encodeURIComponent(filename)}`
        
        return res.status(200).json({
          success: true,
          filename,
          url: fileUrl,
          message: 'File uploaded successfully'
        })
      }
    }

    return res.status(400).json({ error: 'No file found in request' })
    
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default uploadHandler
