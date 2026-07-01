import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '3000-ijs4eutws43johl4tqboy-8f57ffe2.sandbox.novita.ai',
    '*.sandbox.novita.ai',
    'localhost:3000',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'nodemailer', 'better-sqlite3'],
  images: {
    unoptimized: true,
  },
  // 빌드 속도 최적화
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
