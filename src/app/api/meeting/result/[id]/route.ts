import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      startedAt: true,
      endedAt: true,
      summaryData: true,
      transcriptText: true,
      room: { select: { name: true, location: true } },
      attendees: {
        include: {
          user: {
            select: { name: true, email: true, position: true, department: { select: { name: true } } }
          }
        }
      },
      emailLogs: { select: { status: true, toName: true, toEmail: true } },
    }
  })

  if (!meeting) {
    return NextResponse.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 })
  }

  // summaryData JSON 파싱
  let summaryData = null
  if (meeting.summaryData) {
    try {
      summaryData = typeof meeting.summaryData === 'string'
        ? JSON.parse(meeting.summaryData)
        : meeting.summaryData
    } catch {
      summaryData = null
    }
  }

  const emailSent = meeting.emailLogs.filter(e => e.status === 'sent').length
  const emailFailed = meeting.emailLogs.filter(e => e.status === 'failed').length

  return NextResponse.json({
    id: meeting.id,
    title: meeting.title,
    status: meeting.status,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    room: meeting.room,
    attendees: meeting.attendees.map(a => ({
      name: a.user.name,
      email: a.user.email,
      position: a.user.position,
      department: a.user.department?.name,
    })),
    summaryData,
    transcriptText: meeting.transcriptText,
    emailSent,
    emailFailed,
  })
}
