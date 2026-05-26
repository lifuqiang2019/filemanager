/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'file.aoobooc.me'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/files/**',
      },
      {
        protocol: 'https',
        hostname: 'file.aoobooc.me',
        pathname: '/files/**',
      },
    ],
  },
}

module.exports = nextConfig
