import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'

const DEFAULT_SETTINGS: Record<string, string> = {
  emailFromName: '회의록 시스템',
  emailFromAddress: 'noreply@company.com',
  sttProvider: 'mock',
  summaryProvider: 'mock',
  emailProvider: 'mock',
  recordingConsent: '본 회의는 회의록 작성을 위해 자동으로 녹음됩니다.\n녹음 내용은 회의록 생성 후 보관 정책에 따라 관리됩니다.\n\n회의에 참여하면 녹음에 동의한 것으로 간주됩니다.',
  meetingSummaryTemplate: '표준',
  retentionDays: '365',
  emailSubjectTemplate: '[회의록] {title} - {date}',
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const settings = await prisma.setting.findMany()
  const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
  
  for (const s of settings) {
    settingsMap[s.key] = s.value
  }

  return NextResponse.json(settingsMap)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  
  for (const [key, value] of Object.entries(body)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) }
    })
  }

  return NextResponse.json({ success: true })
}
