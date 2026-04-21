import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { toEmail: { contains: search } },
      { toName: { contains: search } },
      { meeting: { title: { contains: search } } },
    ]
  }

  const [logs, total, sentCount, failedCount, pendingCount] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            room: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailLog.count({ where }),
    prisma.emailLog.count({ where: { status: 'sent' } }),
    prisma.emailLog.count({ where: { status: 'failed' } }),
    prisma.emailLog.count({ where: { status: 'pending' } }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    limit,
    stats: {
      sent: sentCount,
      failed: failedCount,
      pending: pendingCount,
    }
  })
}
