'use client'

import { useState } from 'react'

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; url?: string; fileName?: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setResult({ success: false, message: '请选择一个文件' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('https://fileshow.lengyuer.autos/api/external/upload', {
        method: 'POST',
        headers: {
          'x-api-key': 'ak_j8xr9qecnjvfwwao',
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: '上传成功',
          url: data.url,
          fileName: data.fileName,
        })
      } else {
        setResult({ success: false, message: data.error || '上传失败' })
      }
    } catch (error) {
      setResult({ success: false, message: '上传失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  const isImage = (filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    return IMAGE_EXTENSIONS.includes(ext)
  }

  return (
    <div className="container">
      <h1>静态资源管理系统</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={handleFileChange}
          accept="*"
        />
        <button type="submit" disabled={loading || !file}>
          {loading ? '上传中...' : '上传文件'}
        </button>
      </form>

      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          <strong>{result.success ? '成功!' : '错误!'}</strong>
          <p>{result.message}</p>
          {result.url && (
            <div className="url-display">
              <strong>访问地址:</strong>
              <br />
              <a href={result.url} target="_blank" rel="noopener noreferrer">
                {result.url}
              </a>
            </div>
          )}
          {result.url && result.fileName && isImage(result.fileName) && (
            <div className="image-preview">
              <strong>图片预览:</strong>
              <br />
              <img src={result.url} alt="Preview" className="preview-image" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
