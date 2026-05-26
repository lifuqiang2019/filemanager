/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'cdnfile.lengyuer.autos'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/files/**',
      },
      {
        protocol: 'https',
        hostname: 'cdnfile.lengyuer.autos',
        pathname: '/uploads/**',
      },
    ],
  },
}

module.exports = nextConfig