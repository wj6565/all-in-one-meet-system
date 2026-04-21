import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalMeetings,
    todayMeetings,
    weekMeetings,
    monthMeetings,
    totalUsers,
    totalRooms,
    pendingMeetings,
    failedMeetings,
    recentMeetings,
    emailStats,
    // 예약 통계
    totalBookings,
    todayBookings,
    activeBookings,
    recentBookings,
  ] = await Promise.all([
    prisma.meeting.count(),
    prisma.meeting.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.meeting.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.meeting.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.meeting.count({
      where: { status: { in: ['recording', 'uploaded', 'transcribing', 'summarizing'] } }
    }),
    prisma.meeting.count({ where: { status: 'failed' } }),
    prisma.meeting.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { name: true } },
        _count: { select: { attendees: true } }
      }
    }),
    prisma.emailLog.groupBy({
      by: ['status'],
      _count: { status: true }
    }),
    // 예약
    prisma.booking.count({ where: { status: { not: 'cancelled' } } }),
    prisma.booking.count({ where: { startTime: { gte: todayStart }, status: { not: 'cancelled' } } }),
    prisma.booking.count({ where: { status: 'checked_in' } }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { startTime: 'desc' },
      where: { status: { not: 'cancelled' } },
      include: {
        room: { select: { name: true } },
        user: { select: { name: true } },
      }
    }),
  ])

  const statusCount: Record<string, number> = {
    recording: 0, uploaded: 0, transcribing: 0, transcribed: 0,
    summarizing: 0, summarized: 0, excel_generated: 0, emailed: 0, failed: 0
  }

  const statusMeetings = await prisma.meeting.groupBy({
    by: ['status'],
    _count: { status: true }
  })

  for (const s of statusMeetings) {
    statusCount[s.status] = s._count.status
  }

  return NextResponse.json({
    stats: {
      totalMeetings,
      todayMeetings,
      weekMeetings,
      monthMeetings,
      totalUsers,
      totalRooms,
      pendingMeetings,
      failedMeetings,
      // 예약 통계
      totalBookings,
      todayBookings,
      activeBookings,
    },
    statusCount,
    emailStats: emailStats.reduce((acc: Record<string, number>, e: { status: string; _count: { status: number } }) => ({ ...acc, [e.status]: e._count.status }), {}),
    recentMeetings,
    recentBookings,
  })
}
