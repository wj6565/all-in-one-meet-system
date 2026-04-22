import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000-ijs4eutws43johl4tqboy-de59bda9.sandbox.novita.ai'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'nodemailer', 'better-sqlite3', 'form-data'],
  images: {
    unoptimized: true,
  },
  // 빌드 속도 최적화
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
