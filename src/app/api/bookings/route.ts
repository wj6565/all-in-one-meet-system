import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'
// 예약 목록 조회
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const roomId = searchParams.get('roomId')

    const where: Record<string, unknown> = {}
    if (roomId) where.roomId = roomId
    if (date) {
      const start = new Date(date + 'T00:00:00')
      const end = new Date(date + 'T23:59:59')
      where.startTime = { gte: start, lte: end }
    }
    where.status = { notIn: ['cancelled'] }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, name: true, department: { select: { name: true } } } },
      },
      orderBy: { startTime: 'asc' },
    })
    return NextResponse.json(bookings)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '예약 조회 실패' }, { status: 500 })
  }
}

// 예약 생성
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const body = await req.json()
    const { roomId, title, description, startTime, endTime } = body

    if (!roomId || !title || !startTime || !endTime) {
      return NextResponse.json({ error: '필수 정보를 입력하세요' }, { status: 400 })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = (end.getTime() - start.getTime()) / 60000

    if (duration < 30) return NextResponse.json({ error: '예약은 최소 30분 이상이어야 합니다' }, { status: 400 })
    if (duration > 180) return NextResponse.json({ error: '예약은 최대 3시간까지 가능합니다' }, { status: 400 })

    // 중복 확인
    const overlap = await prisma.booking.findFirst({
      where: {
        roomId,
        status: { notIn: ['cancelled', 'no_show'] },
        OR: [
          { startTime: { lt: end }, endTime: { gt: start } },
        ],
      },
    })
    if (overlap) return NextResponse.json({ error: '해당 시간대에 이미 예약이 있습니다' }, { status: 409 })

    // userId 결정 (Account or User)
    let userId = session.user.userId
    if (!userId) {
      // Account로 로그인한 경우 User 찾기
      const user = await prisma.user.findFirst({ where: { email: session.user.email || '' } })
      userId = user?.id || session.user.id
    }

    const booking = await prisma.booking.create({
      data: { roomId, userId, title, description: description || null, startTime: start, endTime: end },
      include: {
        room: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ success: true, booking }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '예약 생성 실패' }, { status: 500 })
  }
}
