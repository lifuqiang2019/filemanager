import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import busboy from 'busboy'

export async function POST(request: Request) {
  try {
    const filesDir = path.resolve(process.cwd(), 'files')
    console.log(`Files directory: ${filesDir}`)
    
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true })
      console.log(`Created files directory: ${filesDir}`)
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024
    const headers = Object.fromEntries(request.headers) as Record<string, string>

    return new Promise<Response>((resolve, reject) => {
      const bb = busboy({ headers })
      let receivedSize = 0
      
      bb.on('file', (name, file, info) => {
        const { filename } = info
        const chunks: Buffer[] = []
        
        file.on('data', (data) => {
          receivedSize += data.length
          if (receivedSize > MAX_FILE_SIZE) {
            file.destroy()
            resolve(new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), { status: 413 }))
            return
          }
          chunks.push(data)
        })
        
        file.on('end', () => {
          const fileData = Buffer.concat(chunks)
          
          const invalidChars = /[<>:"/\\|?*\0]/
          if (invalidChars.test(filename) || filename.includes('..')) {
            resolve(new Response(JSON.stringify({ error: 'Invalid filename' }), { status: 400 }))
            return
          }

          const ext = path.extname(filename).toLowerCase()
          const hash = crypto.createHash('md5').update(fileData).digest('hex').substring(0, 8)
          let basename = path.basename(filename, ext)
          if (basename.endsWith(ext)) {
            basename = basename.slice(0, -ext.length)
          }
          const savedFilename = `${basename}_${hash}${ext}`

          const filePath = path.join(filesDir, savedFilename)
          fs.writeFileSync(filePath, fileData)
          console.log(`File saved: ${filePath}, size: ${fileData.length} bytes`)

          const protocol = headers['x-forwarded-proto'] || 'http'
          const host = headers.host || 'localhost:3000'
          const fileUrl = `${protocol}://${host}/api/files/${encodeURIComponent(savedFilename)}`

          resolve(new Response(JSON.stringify({
            success: true,
            filename: savedFilename,
            originalFilename: filename,
            url: fileUrl,
            message: 'File uploaded successfully',
            filePath: filePath
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        })
      })

      bb.on('finish', () => {
        resolve(new Response(JSON.stringify({ error: 'No file found in request' }), { status: 400 }))
      })

      bb.on('error', (err) => {
        console.error('Busboy error:', err)
        reject(new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }))
      })

      ;(request as any).body?.pipe(bb)
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
