import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const departmentId = searchParams.get('departmentId') || ''

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { department: { name: { contains: search } } },
        ]
      } : {}),
      ...(departmentId ? { departmentId } : {}),
    },
    include: { department: true },
    orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    take: 100
  })

  return NextResponse.json(users)
}
