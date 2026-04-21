import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'
// 예약 취소
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
    const { id } = await params
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) return NextResponse.json({ error: '예약 없음' }, { status: 404 })
    if (booking.status === 'cancelled') return NextResponse.json({ error: '이미 취소됨' }, { status: 400 })

    await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: session.user.id }
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '취소 실패' }, { status: 500 })
  }
}

// 예약 수정
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
      },
      include: {
        room: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      }
    })
    return NextResponse.json({ success: true, booking })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }
}
