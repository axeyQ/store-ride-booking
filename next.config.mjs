/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
  }
}

export default nextConfig