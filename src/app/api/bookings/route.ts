import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'

// 예약 목록 조회
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const roomId = searchParams.get('roomId')
    const mine = searchParams.get('mine')

    const where: Record<string, unknown> = {}
    if (roomId) where.roomId = roomId
    if (date) {
      const start = new Date(date + 'T00:00:00')
      const end = new Date(date + 'T23:59:59')
      where.startTime = { gte: start, lte: end }
    }

    if (mine === '1') {
      // mine=1: 내 예약만 조회
      // session.user.userId 가 User 테이블 ID이면 바로 사용
      // Account(admin)로 로그인한 경우 email로 User 찾기
      let userId = session.user.userId

      // Account ID인지 확인 (User 테이블에 해당 id가 없으면 Account로 로그인한 것)
      const userExists = await prisma.user.findUnique({ where: { id: userId } })
      if (!userExists && session.user.email) {
        // email로 User 찾기
        const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } })
        if (userByEmail) userId = userByEmail.id
      }

      where.userId = userId
      // mine 조회 시 취소된 것도 포함하여 모두 보여줌
    } else {
      where.status = { notIn: ['cancelled'] }
    }

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
    const session = await getSession()
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

    // userId 결정: User 테이블에 존재하는지 확인
    let userId = session.user.userId
    const userExists = await prisma.user.findUnique({ where: { id: userId } })
    if (!userExists) {
      // Account(admin)로 로그인 - email로 User 찾기
      const userByEmail = session.user.email
        ? await prisma.user.findUnique({ where: { email: session.user.email } })
        : null
      if (userByEmail) {
        userId = userByEmail.id
      } else {
        // User 테이블에 없으면 예약 불가 (admin은 User 레코드 없음)
        return NextResponse.json({ error: '예약 가능한 사용자 계정이 없습니다. 일반 사용자 계정으로 로그인하세요.' }, { status: 403 })
      }
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
