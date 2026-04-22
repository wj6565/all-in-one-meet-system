import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const roomId = searchParams.get('roomId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (roomId) where.roomId = roomId
    if (status && status !== 'all') where.status = status
    if (date) {
      const start = new Date(date + 'T00:00:00')
      const end = new Date(date + 'T23:59:59')
      where.startTime = { gte: start, lte: end }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, name: true, department: { select: { name: true } } } },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    })
    return NextResponse.json(bookings)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}
