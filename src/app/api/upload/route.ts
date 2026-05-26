export async function POST(request: Request) {
  try {
    const incomingFormData = await request.formData()
    const file = incomingFormData.get('file')

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file found in request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const formData = new FormData()
    formData.append('file', file)

    const upstreamResponse = await fetch('https://fileshow.lengyuer.autos/api/external/upload', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.UPLOAD_API_KEY || 'ak_j8xr9qecnjvfwwao',
      },
      body: formData,
    })

    const data = await upstreamResponse.json()

    return new Response(JSON.stringify(data), {
      status: upstreamResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Upload proxy error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
