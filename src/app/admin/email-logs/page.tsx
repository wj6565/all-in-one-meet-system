'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface EmailLog {
  id: string
  toEmail: string
  toName: string | null
  subject: string
  status: string
  errorMsg: string | null
  provider: string | null
  sentAt: string | null
  createdAt: string
  meeting: {
    id: string
    title: string
    room: { name: string }
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700' },
  sent: { label: '✅ 발송완료', color: 'bg-green-100 text-green-700' },
  failed: { label: '❌ 실패', color: 'bg-red-100 text-red-700' },
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
  })
  const [stats, setStats] = useState<{ sent: number; failed: number; pending: number } | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    params.set('page', String(filters.page))
    params.set('limit', '20')
    const res = await fetch(`/api/admin/email-logs?${params}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setLogs(data.logs)
    setTotal(data.total)
    setStats(data.stats)
    setLoading(false)
  }, [filters])

  useEffect(() => { loadLogs() }, [loadLogs])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">메일 발송 이력</h1>
        <p className="text-slate-500 mt-1">전체 메일 발송 현황을 조회합니다</p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-green-700">{stats.sent.toLocaleString()}</div>
            <div className="text-green-600 text-sm mt-1">발송 성공</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-red-700">{stats.failed.toLocaleString()}</div>
            <div className="text-red-600 text-sm mt-1">발송 실패</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-yellow-700">{stats.pending.toLocaleString()}</div>
            <div className="text-yellow-600 text-sm mt-1">대기중</div>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="이메일, 이름, 회의명 검색..."
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 상태</option>
            <option value="sent">발송완료</option>
            <option value="failed">발송실패</option>
            <option value="pending">대기중</option>
          </select>
          <button
            onClick={() => setFilters({ status: '', search: '', page: 1 })}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            필터 초기화
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            로딩 중...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-400">조건에 맞는 이메일 이력이 없습니다.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">수신자</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">회의</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">상태</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">발송일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => {
                  const statusInfo = STATUS_LABELS[log.status] || { label: log.status, color: 'bg-slate-100 text-slate-600' }
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 text-sm">{log.toName || log.toEmail}</div>
                        <div className="text-xs text-slate-400">{log.toEmail}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/meetings/${log.meeting.id}`}
                          className="text-sm text-blue-600 hover:underline font-medium">
                          {log.meeting.title}
                        </Link>
                        <div className="text-xs text-slate-400">{log.meeting.room.name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {log.errorMsg && (
                          <div className="text-xs text-red-500 mt-1 max-w-48 truncate" title={log.errorMsg}>
                            {log.errorMsg}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {log.provider || '-'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {log.sentAt
                          ? new Date(log.sentAt).toLocaleString('ko-KR')
                          : new Date(log.createdAt).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
