'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '준비중', color: 'bg-slate-100 text-slate-600' },
  recording: { label: '🔴 녹음중', color: 'bg-red-100 text-red-700' },
  uploaded: { label: '업로드됨', color: 'bg-yellow-100 text-yellow-700' },
  transcribing: { label: '⏳ 전사중', color: 'bg-blue-100 text-blue-700' },
  transcribed: { label: '전사완료', color: 'bg-blue-100 text-blue-700' },
  summarizing: { label: '⏳ 요약중', color: 'bg-purple-100 text-purple-700' },
  summarized: { label: '요약완료', color: 'bg-purple-100 text-purple-700' },
  excel_generated: { label: '엑셀완료', color: 'bg-teal-100 text-teal-700' },
  emailed: { label: '✅ 발송완료', color: 'bg-green-100 text-green-700' },
  failed: { label: '❌ 실패', color: 'bg-red-100 text-red-700' },
}

interface Meeting {
  id: string
  title: string
  status: string
  createdAt: string
  startedAt: string | null
  endedAt: string | null
  room: { name: string }
  _count: { attendees: number }
  attendees: Array<{ user: { name: string; email: string } }>
  emailLogs: Array<{ status: string }>
}

function MeetingsContent() {
  const searchParams = useSearchParams()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    roomId: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    page: 1,
  })
  const [retrying, setRetrying] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/meeting/rooms').then(r => r.json()).then(setRooms)
  }, [])

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.roomId) params.set('roomId', filters.roomId)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (filters.search) params.set('search', filters.search)
    params.set('page', String(filters.page))
    params.set('limit', '20')
    const res = await fetch(`/api/admin/meetings?${params}`)
    const data = await res.json()
    setMeetings(data.meetings)
    setTotal(data.total)
    setLoading(false)
  }, [filters])

  useEffect(() => { loadMeetings() }, [loadMeetings])

  const handleRetry = async (id: string) => {
    if (!confirm('재처리하시겠습니까?')) return
    setRetrying(id)
    await fetch(`/api/admin/meetings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry' }),
    })
    alert('재처리가 시작되었습니다.')
    loadMeetings()
    setRetrying(null)
  }

  const handleResendEmail = async (id: string) => {
    if (!confirm('이메일을 재발송하시겠습니까?')) return
    setRetrying(id)
    const res = await fetch(`/api/admin/meetings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend-email' }),
    })
    const data = await res.json()
    alert(data.message || (res.ok ? '재발송 완료' : '실패'))
    setRetrying(null)
    loadMeetings()
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">회의 기록 관리</h1>
        <p className="text-slate-500 mt-1">모든 회의 기록을 조회하고 관리합니다</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="회의명 검색..."
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 상태</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filters.roomId}
            onChange={e => setFilters(f => ({ ...f, roomId: e.target.value, page: 1 }))}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 회의실</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="date" value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value, page: 1 }))}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input type="date" value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value, page: 1 }))}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner mx-auto mb-3" />
            로딩 중...
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-400">조건에 맞는 회의가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {meetings.map(meeting => {
                const statusInfo = STATUS_LABELS[meeting.status] || { label: meeting.status, color: 'bg-slate-100' }
                const emailSent = meeting.emailLogs.filter(e => e.status === 'sent').length
                const emailFailed = meeting.emailLogs.filter(e => e.status === 'failed').length
                return (
                  <div key={meeting.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/admin/meetings/${meeting.id}`}
                            className="font-medium text-slate-800 hover:text-blue-600 truncate">
                            {meeting.title}
                          </Link>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>🏢 {meeting.room.name}</span>
                          <span>👥 {meeting._count.attendees}명</span>
                          {meeting.startedAt && <span>📅 {new Date(meeting.startedAt).toLocaleString('ko-KR')}</span>}
                          {meeting.emailLogs.length > 0 && (
                            <span>📧 {emailSent}명 발송{emailFailed > 0 ? ` / ${emailFailed}명 실패` : ''}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {meeting.attendees.slice(0, 4).map(a => (
                            <span key={a.user.email} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {a.user.name}
                            </span>
                          ))}
                          {meeting._count.attendees > 4 && (
                            <span className="text-xs text-slate-400">+{meeting._count.attendees - 4}명</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link href={`/admin/meetings/${meeting.id}`}
                          className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
                          상세보기
                        </Link>
                        {['emailed', 'excel_generated', 'summarized'].includes(meeting.status) && (
                          <a href={`/api/download/excel/${meeting.id}`}
                            className="text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors">
                            📥 엑셀
                          </a>
                        )}
                        {meeting.status === 'failed' && (
                          <button onClick={() => handleRetry(meeting.id)}
                            disabled={retrying === meeting.id}
                            className="text-xs px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg disabled:opacity-50">
                            {retrying === meeting.id ? '처리중...' : '🔄 재처리'}
                          </button>
                        )}
                        {['emailed', 'excel_generated'].includes(meeting.status) && (
                          <button onClick={() => handleResendEmail(meeting.id)}
                            disabled={retrying === meeting.id}
                            className="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg disabled:opacity-50">
                            📧 재발송
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-500">총 {total}건</div>
              <div className="flex gap-2">
                <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  disabled={filters.page <= 1}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">
                  이전
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600">
                  {filters.page} / {Math.max(1, Math.ceil(total / 20))}
                </span>
                <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  disabled={filters.page >= Math.ceil(total / 20)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">
                  다음
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-slate-400">로딩 중...</div>}>
      <MeetingsContent />
    </Suspense>
  )
}
