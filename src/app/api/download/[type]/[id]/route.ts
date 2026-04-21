import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'
import { generateSampleUserExcel } from '@/lib/excel'
import * as fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params

  // 샘플 파일은 인증 없이 다운로드 가능
  if (type === 'sample') {
    const buffer = generateSampleUserExcel()
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename*=UTF-8\'\'%EC%82%AC%EC%9A%A9%EC%9E%90_%EC%97%85%EB%A1%9C%EB%93%9C_%EC%83%98%ED%94%8C.xlsx',
      }
    })
  }

  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  if (type === 'excel') {
    const meeting = await prisma.meeting.findUnique({ where: { id } })
    if (!meeting || !meeting.excelPath) {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!fs.existsSync(meeting.excelPath)) {
      return NextResponse.json({ error: '파일이 서버에 없습니다.' }, { status: 404 })
    }

    const buffer = fs.readFileSync(meeting.excelPath)
    const safeTitle = meeting.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_')
    const filename = encodeURIComponent(`회의록_${safeTitle}.xlsx`)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      }
    })
  }

  if (type === 'transcript') {
    const meeting = await prisma.meeting.findUnique({ where: { id } })
    if (!meeting || !meeting.transcriptText) {
      return NextResponse.json({ error: '전사 결과를 찾을 수 없습니다.' }, { status: 404 })
    }

    const filename = encodeURIComponent(`전사_${meeting.title}.txt`)
    return new NextResponse(meeting.transcriptText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      }
    })
  }

  if (type === 'recording') {
    const meeting = await prisma.meeting.findUnique({ where: { id } })
    if (!meeting || !meeting.recordingPath) {
      return NextResponse.json({ error: '녹음 파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!fs.existsSync(meeting.recordingPath)) {
      return NextResponse.json({ error: '녹음 파일이 서버에 없습니다.' }, { status: 404 })
    }

    const buffer = fs.readFileSync(meeting.recordingPath)
    const safeTitle = meeting.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_')
    const filename = encodeURIComponent(`녹음_${safeTitle}.webm`)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      }
    })
  }

  return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
}
