import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, roomId, attendeeIds } = body

  if (!roomId) return NextResponse.json({ error: '회의실을 선택하세요.' }, { status: 400 })
  if (!attendeeIds || attendeeIds.length === 0) {
    return NextResponse.json({ error: '참석자를 1명 이상 선택하세요.' }, { status: 400 })
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room || !room.isActive) {
    return NextResponse.json({ error: '유효하지 않은 회의실입니다.' }, { status: 400 })
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: title || `${room.name} 회의 ${new Date().toLocaleDateString('ko-KR')}`,
      roomId,
      status: 'recording',
      startedAt: new Date(),
      attendees: {
        create: attendeeIds.map((userId: string) => ({ userId }))
      }
    },
    include: {
      room: true,
      attendees: { include: { user: true } }
    }
  })

  return NextResponse.json(meeting, { status: 201 })
}
