import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processMeeting } from '@/lib/meeting-processor'
import * as fs from 'fs'
import * as path from 'path'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const meetingId = formData.get('meetingId') as string
  const audioFile = formData.get('audio') as File
  const duration = parseInt(formData.get('duration') as string || '0')

  if (!meetingId) return NextResponse.json({ error: 'meetingId가 없습니다.' }, { status: 400 })
  if (!audioFile) return NextResponse.json({ error: '오디오 파일이 없습니다.' }, { status: 400 })

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } })
  if (!meeting) return NextResponse.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 })

  // 녹음 파일 저장
  const recordingsDir = path.join(process.cwd(), 'uploads', 'recordings')
  if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true })

  const buffer = Buffer.from(await audioFile.arrayBuffer())
  const ext = audioFile.name.split('.').pop() || 'webm'
  const recordingPath = path.join(recordingsDir, `${meetingId}.${ext}`)
  fs.writeFileSync(recordingPath, buffer)

  // 회의 종료 처리
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: 'uploaded',
      endedAt: new Date(),
      recordingPath,
      recordingSize: buffer.length,
      recordingDuration: duration,
    }
  })

  // 비동기로 분석 파이프라인 시작
  processMeeting(meetingId).catch(err => {
    console.error(`[처리 실패] ${meetingId}:`, err)
    prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'failed', errorMessage: String(err) }
    }).catch(() => {})
  })

  return NextResponse.json({ success: true, meetingId, message: '업로드 완료. 분석을 시작합니다.' })
}
