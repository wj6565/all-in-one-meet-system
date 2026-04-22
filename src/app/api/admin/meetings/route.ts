import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const roomId = searchParams.get('roomId') || ''
  const status = searchParams.get('status') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const search = searchParams.get('search') || ''

  const where: Record<string, unknown> = {}
  if (roomId) where.roomId = roomId
  if (status) where.status = status
  if (search) where.title = { contains: search }
  if (dateFrom || dateTo) {
    where.startedAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
    }
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: {
        room: { select: { name: true } },
        attendees: {
          include: { user: { select: { name: true, email: true } } },
          take: 5
        },
        emailLogs: { select: { status: true } },
        _count: { select: { attendees: true, emailLogs: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.meeting.count({ where })
  ])

  return NextResponse.json({ meetings, total, page, limit })
}
