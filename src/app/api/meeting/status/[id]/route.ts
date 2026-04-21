import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      title: true,
      startedAt: true,
      endedAt: true,
      errorMessage: true,
      retryCount: true,
      _count: { select: { emailLogs: true } },
      emailLogs: {
        select: { status: true },
      }
    }
  })

  if (!meeting) return NextResponse.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 })
  
  const emailSent = meeting.emailLogs.filter(e => e.status === 'sent').length
  const emailFailed = meeting.emailLogs.filter(e => e.status === 'failed').length

  return NextResponse.json({
    ...meeting,
    emailSent,
    emailFailed,
  })
}
