'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashboardData {
  stats: {
    totalMeetings: number
    todayMeetings: number
    weekMeetings: number
    monthMeetings: number
    totalUsers: number
    totalRooms: number
    pendingMeetings: number
    failedMeetings: number
    totalBookings: number
    todayBookings: number
    activeBookings: number
  }
  statusCount: Record<string, number>
  emailStats: Record<string, number>
  recentMeetings: Array<{
    id: string
    title: string
    status: string
    createdAt: string
    room: { name: string }
    _count: { attendees: number }
  }>
  recentBookings: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
    status: string
    room: { name: string }
    user: { name: string }
  }>
}

const MEETING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:          { label: '준비중',   color: 'bg-slate-100 text-slate-600' },
  recording:      { label: '녹음중',   color: 'bg-red-100 text-red-700' },
  uploaded:       { label: '업로드됨', color: 'bg-yellow-100 text-yellow-700' },
  transcribing:   { label: '전사중',   color: 'bg-blue-100 text-blue-700' },
  transcribed:    { label: '전사완료', color: 'bg-blue-100 text-blue-700' },
  summarizing:    { label: '요약중',   color: 'bg-purple-100 text-purple-700' },
  summarized:     { label: '요약완료', color: 'bg-purple-100 text-purple-700' },
  excel_generated:{ label: '엑셀완료', color: 'bg-green-100 text-green-700' },
  emailed:        { label: '발송완료', color: 'bg-green-100 text-green-700' },
  failed:         { label: '실패',     color: 'bg-red-100 text-red-700' },
}

const BOOKING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:  { label: '예약확정', color: 'bg-blue-100 text-blue-700' },
  checked_in: { label: '사용중',   color: 'bg-green-100 text-green-700' },
  completed:  { label: '완료',     color: 'bg-slate-100 text-slate-600' },
  cancelled:  { label: '취소',     color: 'bg-red-100 text-red-600' },
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'meeting' | 'booking'>('meeting')

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-red-500 p-4">데이터를 불러올 수 없습니다.</div>

  const { stats, recentMeetings, recentBookings } = data

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-tachometer-alt text-blue-600 text-lg"></i>
          통합 대시보드
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">회의 녹음 및 예약 시스템 현황</p>
      </div>

      {/* 회의 녹음 통계 */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <i className="fas fa-microphone text-red-400"></i> 회의 녹음
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard title="전체 회의" value={stats.totalMeetings} icon="fas fa-file-alt" color="blue" />
        <StatCard title="오늘 회의" value={stats.todayMeetings} icon="fas fa-calendar-day" color="green" />
        <StatCard title="처리중" value={stats.pendingMeetings} icon="fas fa-hourglass-half" color="yellow" />
        <StatCard title="실패" value={stats.failedMeetings} icon="fas fa-exclamation-triangle" color="red"
          action={stats.failedMeetings > 0 ? { label: '확인', href: '/admin/meetings?status=failed' } : undefined} />
      </div>

      {/* 예약 시스템 통계 */}
      <div className="mb-2 mt-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <i className="fas fa-calendar-check text-emerald-400"></i> 회의실 예약
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 sm:mb-8">
        <StatCard title="전체 예약" value={stats.totalBookings || 0} icon="fas fa-calendar-alt" color="teal" />
        <StatCard title="오늘 예약" value={stats.todayBookings || 0} icon="fas fa-map-marker-alt" color="indigo" />
        <StatCard title="현재 사용중" value={stats.activeBookings || 0} icon="fas fa-circle" color="orange" />
        <StatCard title="회의실" value={stats.totalRooms} icon="fas fa-door-open" color="purple"
          action={{ label: '관리', href: '/admin/rooms' }} />
      </div>

      {/* 빠른 액션 + 최근 기록 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* 빠른 액션 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-bolt text-yellow-400"></i> 빠른 액션
          </h2>
          <div className="space-y-2">
            {[
              { href: '/meeting',         icon: 'fas fa-microphone',     label: '회의 녹음 시작',    sub: '회의 시작 페이지로 이동',  bg: 'bg-blue-50 hover:bg-blue-100',   text: 'text-blue-800',  sub2: 'text-blue-500' },
              { href: '/booking',         icon: 'fas fa-calendar-plus',  label: '회의실 예약',        sub: '실시간 예약 현황 확인',    bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-800', sub2: 'text-emerald-500' },
              { href: '/admin/bookings',  icon: 'fas fa-clipboard-list', label: '예약 관리',          sub: '예약 현황 조회 및 관리',   bg: 'bg-teal-50 hover:bg-teal-100',   text: 'text-teal-800',  sub2: 'text-teal-500' },
              { href: '/admin/users',     icon: 'fas fa-users',          label: '사용자 관리',        sub: '계정 및 권한 관리',        bg: 'bg-purple-50 hover:bg-purple-100',text: 'text-purple-800',sub2: 'text-purple-500' },
              { href: '/admin/meetings',  icon: 'fas fa-file-alt',       label: '회의 기록',          sub: '전체 회의 기록 조회',      bg: 'bg-slate-50 hover:bg-slate-100', text: 'text-slate-800', sub2: 'text-slate-500' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 p-3 ${item.bg} rounded-xl transition-colors`}>
                <i className={`${item.icon} text-lg w-6 text-center ${item.sub2}`}></i>
                <div className="min-w-0">
                  <div className={`font-medium ${item.text} text-sm leading-tight`}>{item.label}</div>
                  <div className={`${item.sub2} text-xs mt-0.5 truncate`}>{item.sub}</div>
                </div>
              </Link>
            ))}
            {stats.failedMeetings > 0 && (
              <Link href="/admin/meetings?status=failed"
                className="flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                <i className="fas fa-redo text-lg w-6 text-center text-red-500"></i>
                <div className="min-w-0">
                  <div className="font-medium text-red-800 text-sm">실패 건 재처리</div>
                  <div className="text-red-500 text-xs">{stats.failedMeetings}건 처리 필요</div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* 최근 기록 탭 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-clock text-slate-400"></i> 최근 현황
            </h2>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button onClick={() => setActiveTab('meeting')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'meeting' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}>
                <i className="fas fa-microphone mr-1"></i>회의
              </button>
              <button onClick={() => setActiveTab('booking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'booking' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}>
                <i className="fas fa-calendar-check mr-1"></i>예약
              </button>
            </div>
          </div>

          {activeTab === 'meeting' && (
            recentMeetings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <i className="fas fa-inbox text-4xl mb-2 block"></i>
                <p className="text-sm">아직 회의 기록이 없습니다.</p>
                <Link href="/meeting" className="mt-2 inline-block text-blue-600 hover:underline text-xs">
                  첫 번째 회의 시작하기 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMeetings.map(meeting => {
                  const si = MEETING_STATUS_LABELS[meeting.status] || { label: meeting.status, color: 'bg-slate-100 text-slate-600' }
                  return (
                    <Link key={meeting.id} href={`/admin/meetings/${meeting.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate group-hover:text-blue-600">{meeting.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {meeting.room.name} · {meeting._count.attendees}명 · {new Date(meeting.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${si.color}`}>
                        {si.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )
          )}

          {activeTab === 'booking' && (
            !recentBookings || recentBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <i className="fas fa-inbox text-4xl mb-2 block"></i>
                <p className="text-sm">최근 예약이 없습니다.</p>
                <Link href="/booking" className="mt-2 inline-block text-emerald-600 hover:underline text-xs">
                  예약 페이지로 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentBookings.map(booking => {
                  const si = BOOKING_STATUS_LABELS[booking.status] || { label: booking.status, color: 'bg-slate-100 text-slate-600' }
                  return (
                    <div key={booking.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">{booking.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {booking.room.name} · {booking.user.name} ·{' '}
                          {new Date(booking.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}~
                          {new Date(booking.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${si.color}`}>
                        {si.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, action }: {
  title: string; value: number; icon: string; color: string
  action?: { label: string; href: string }
}) {
  const colorMap: Record<string, string> = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red:    'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    teal:   'from-teal-500 to-teal-600',
    orange: 'from-orange-500 to-orange-600',
  }

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} rounded-2xl p-4 sm:p-5 text-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-2xl sm:text-3xl font-bold leading-tight">{value.toLocaleString()}</div>
          <div className="text-white/80 text-xs sm:text-sm mt-1 truncate">{title}</div>
        </div>
        <i className={`${icon} text-2xl sm:text-3xl opacity-70 flex-shrink-0 ml-2`}></i>
      </div>
      {action && (
        <Link href={action.href}
          className="mt-3 inline-block text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">
          {action.label} →
        </Link>
      )}
    </div>
  )
}
