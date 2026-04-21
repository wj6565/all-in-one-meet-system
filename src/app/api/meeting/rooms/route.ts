import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 회의 실행 페이지용 - 인증 불필요 (내부 네트워크 전제)
export async function GET(req: NextRequest) {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(rooms)
}
