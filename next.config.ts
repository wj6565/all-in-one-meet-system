import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // 녹음 파일 업로드를 위한 제한 증가
    },
  },
  // 큰 오디오 파일 업로드를 위해 body parser 크기 증가
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'nodemailer', 'better-sqlite3', 'form-data'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
