'use client'

import { useState, useEffect, useCallback } from 'react'

interface Booking {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  status: string
  room: { id: string; name: string; location: string | null }
  user: { id: string; name: string; department: { name: string } | null }
}

interface Room { id: string; name: string }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:  { label: '예약확정', color: 'bg-blue-100 text-blue-700' },
  checked_in: { label: '사용중',   color: 'bg-green-100 text-green-700' },
  completed:  { label: '완료',     color: 'bg-slate-100 text-slate-600' },
  cancelled:  { label: '취소',     color: 'bg-red-100 text-red-600' },
  no_show:    { label: '노쇼',     color: 'bg-orange-100 text-orange-700' },
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [filterRoom, setFilterRoom] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ date })
    if (filterRoom) params.set('roomId', filterRoom)
    if (filterStatus !== 'all') params.set('status', filterStatus)
    const data = await fetch(`/api/admin/bookings?${params}`).then(r => r.json())
    setBookings(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [date, filterRoom, filterStatus])

  useEffect(() => {
    fetch('/api/rooms').then(r => r.json()).then(setRooms)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id: string) => {
    if (!confirm('이 예약을 취소하시겠습니까?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = bookings.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return b.title.toLowerCase().includes(q) ||
      b.user.name.toLowerCase().includes(q) ||
      b.room.name.toLowerCase().includes(q)
  })

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    checkedIn: bookings.filter(b => b.status === 'checked_in').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-calendar-check text-blue-600 text-lg"></i>
          예약 관리
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">회의실 예약 현황을 조회하고 관리합니다</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: '전체 예약', value: stats.total,     icon: 'fas fa-clipboard-list', color: 'from-blue-500 to-blue-600' },
          { label: '예약확정', value: stats.confirmed,  icon: 'fas fa-check-circle',   color: 'from-emerald-500 to-teal-600' },
          { label: '사용중',   value: stats.checkedIn,  icon: 'fas fa-circle',         color: 'from-orange-500 to-orange-600' },
          { label: '취소',     value: stats.cancelled,  icon: 'fas fa-times-circle',   color: 'from-slate-400 to-slate-500' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 sm:p-5 text-white shadow-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-bold">{s.value}</div>
                <div className="text-white/80 text-xs sm:text-sm mt-1">{s.label}</div>
              </div>
              <i className={`${s.icon} text-2xl opacity-70`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">모든 회의실</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">모든 상태</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="text" placeholder="회의명·예약자 검색..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-1 lg:col-span-1" />
          <button onClick={load}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-sync-alt"></i>
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 예약 목록 - PC 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-sm sm:text-base flex items-center gap-2">
            <i className="fas fa-list text-gray-400 text-sm"></i>
            예약 목록
            <span className="text-gray-400 font-normal text-sm">({filtered.length}건)</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <i className="fas fa-inbox text-4xl mb-3 block"></i>
            <p className="text-sm">조건에 맞는 예약이 없습니다</p>
          </div>
        ) : (
          <>
            {/* PC 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">회의실</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">회의명</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">예약자</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">시간</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">상태</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-800 text-sm truncate max-w-[140px]">{b.room.name}</div>
                        {b.room.location && <div className="text-xs text-gray-400 truncate max-w-[140px]">{b.room.location}</div>}
                      </td>
                      <td className="px-5 py-3.5 max-w-[180px]">
                        <div className="font-medium text-gray-800 text-sm truncate">{b.title}</div>
                        {b.description && <div className="text-xs text-gray-400 truncate">{b.description}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-gray-700 truncate max-w-[100px]">{b.user.name}</div>
                        {b.user.department && <div className="text-xs text-gray-400 truncate max-w-[100px]">{b.user.department.name}</div>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-700">
                          {fmtTime(b.startTime)} ~ {fmtTime(b.endTime)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000)}분
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[b.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[b.status]?.label || b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {b.status === 'confirmed' && (
                          <button onClick={() => handleCancel(b.id)}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map(b => (
                <div key={b.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{b.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{b.room.name}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${STATUS_LABELS[b.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[b.status]?.label || b.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span><i className="fas fa-user mr-1 text-gray-300"></i>{b.user.name}</span>
                      <span className="font-medium text-gray-700">
                        {fmtTime(b.startTime)}~{fmtTime(b.endTime)}
                      </span>
                    </div>
                    {b.status === 'confirmed' && (
                      <button onClick={() => handleCancel(b.id)}
                        className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
                        취소
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
