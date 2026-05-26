import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import busboy from 'busboy'

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

    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: req.headers as Record<string, string> })
      
      bb.on('file', (name, file, info) => {
        const { filename } = info
        const chunks: Buffer[] = []
        
        file.on('data', (data) => {
          chunks.push(data)
        })
        
        file.on('end', () => {
          const fileData = Buffer.concat(chunks)
          
          const invalidChars = /[<>:"/\\|?*\0]/
          if (invalidChars.test(filename) || filename.includes('..')) {
            resolve(res.status(400).json({ error: 'Invalid filename' }))
            return
          }

          const ext = path.extname(filename)
          const hash = crypto.createHash('md5').update(fileData).digest('hex').substring(0, 8)
          const basename = path.basename(filename, ext)
          const savedFilename = `${basename}_${hash}${ext}`

          const filePath = path.join(filesDir, savedFilename)
          fs.writeFileSync(filePath, fileData)

          const protocol = req.headers['x-forwarded-proto'] || 'http'
          const host = req.headers.host || 'localhost:3000'
          const fileUrl = `${protocol}://${host}/api/files/${encodeURIComponent(savedFilename)}`

          resolve(res.status(200).json({
            success: true,
            filename: savedFilename,
            originalFilename: filename,
            url: fileUrl,
            message: 'File uploaded successfully'
          }))
        })
      })

      bb.on('finish', () => {
        resolve(res.status(400).json({ error: 'No file found in request' }))
      })

      bb.on('error', (err) => {
        console.error('Busboy error:', err)
        reject(res.status(500).json({ error: 'Internal server error' }))
      })

      req.pipe(bb)
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default uploadHandler
