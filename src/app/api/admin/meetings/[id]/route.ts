import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { processMeeting } from '@/lib/meeting-processor'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { id } = await params
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      room: true,
      attendees: { include: { user: { include: { department: true } } } },
      emailLogs: { orderBy: { createdAt: 'desc' } },
      actionItems: { include: { assignee: true } },
      processLogs: { orderBy: { createdAt: 'asc' } },
    }
  })

  if (!meeting) return NextResponse.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(meeting)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { action } = body

  if (action === 'retry') {
    await prisma.meeting.update({
      where: { id },
      data: { status: 'uploaded', errorMessage: null, retryCount: { increment: 1 } }
    })

    // 비동기 처리 시작
    processMeeting(id).catch(err => console.error('재처리 실패:', err))
    return NextResponse.json({ success: true, message: '재처리가 시작되었습니다.' })
  }

  if (action === 'resend-email') {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        attendees: { include: { user: true } },
        room: true,
      }
    })
    if (!meeting || !meeting.summaryData || !meeting.excelPath) {
      return NextResponse.json({ error: '회의 데이터가 없습니다.' }, { status: 400 })
    }

    const { createEmailProvider } = await import('@/providers/email')
    const { generateMeetingExcel } = await import('@/lib/excel')
    const summaryData = JSON.parse(meeting.summaryData)
    const excelBuffer = generateMeetingExcel({
      summary: summaryData,
      transcriptText: meeting.transcriptText || '',
      meetingId: id,
    })

    const emailProvider = createEmailProvider()
    const safeTitle = meeting.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_')
    const excelFileName = `회의록_${safeTitle}.xlsx`

    for (const attendee of meeting.attendees) {
      const emailLog = await prisma.emailLog.create({
        data: {
          meetingId: id,
          toEmail: attendee.user.email,
          toName: attendee.user.name,
          subject: `[회의록] ${meeting.title}`,
          status: 'pending',
          provider: process.env.EMAIL_PROVIDER || 'mock',
        }
      })

      const result = await emailProvider.sendMeetingReport({
        to: attendee.user.email,
        toName: attendee.user.name,
        summary: summaryData,
        excelBuffer,
        excelFileName,
      })

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: result.success ? 'sent' : 'failed',
          errorMsg: result.error,
          sentAt: result.success ? new Date() : null,
        }
      })
    }

    return NextResponse.json({ success: true, message: '메일 재발송이 완료되었습니다.' })
  }

  return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 })
}
