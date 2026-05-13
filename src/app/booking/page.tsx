'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Room {
  id: string
  name: string
  location: string | null
  capacity: number
  code: string | null
  isTabletMode: boolean
  description: string | null
}
interface Booking {
  id: string; title: string; startTime: string; endTime: string; status: string
  room: { id: string; name: string; location: string | null }
  user: { id: string; name: string; department?: { name: string } | null }
}
interface Session { user: { name: string; email: string; userType: string; userId: string; department?: { name: string } | null } }

const STATUS_MAP: Record<string, { label: string; dot: string; badge: string }> = {
  confirmed:  { label: '예약확정', dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  checked_in: { label: '사용중',   dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700 ring-green-200' },
  completed:  { label: '완료',     dot: 'bg-gray-300',   badge: 'bg-gray-50 text-gray-500 ring-gray-200' },
  cancelled:  { label: '취소됨',   dot: 'bg-red-300',    badge: 'bg-red-50 text-red-500 ring-red-200' },
}

export default function BookingPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: '' })
  const [error, setError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'mine'>('board')
  const [now, setNow] = useState(new Date())

  // 실시간 시계
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const timeSlots = Array.from({ length: 23 }, (_, i) => {
    const h = Math.floor(i / 2) + 9
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setSession)
    fetch('/api/rooms').then(r => r.json()).then(data => { setRooms(data); setLoading(false) })
    loadMyBookings()
  }, [])

  const loadMyBookings = async () => {
    try {
      const data = await fetch('/api/bookings?mine=1').then(r => r.json())
      setMyBookings(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  const fetchBookings = useCallback(async () => {
    const params = new URLSearchParams({ date: selectedDate })
    if (selectedRoom) params.set('roomId', selectedRoom.id)
    const data = await fetch(`/api/bookings?${params}`).then(r => r.json())
    setBookings(Array.isArray(data) ? data : [])
  }, [selectedDate, selectedRoom])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: form.roomId || selectedRoom?.id,
          title: form.title,
          description: form.description,
          startTime: `${selectedDate}T${form.startTime}:00`,
          endTime: `${selectedDate}T${form.endTime}:00`,
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '예약 실패'); return }
      setShowModal(false)
      setForm({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: '' })
      fetchBookings(); loadMyBookings()
    } catch { setError('서버 오류') } finally { setSubmitLoading(false) }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('예약을 취소하시겠습니까?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    fetchBookings(); loadMyBookings()
  }

  const quickBook = (room: Room) => {
    const h = now.getHours(); let m = now.getMinutes()
    let sh = h; let sm = m < 30 ? 30 : 0
    if (m >= 30) sh = h + 1
    if (sh >= 20) { alert('금일 예약 가능 시간이 종료되었습니다'); return }
    const start = `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`
    const eh = sh + 1
    const end = eh < 21 ? `${String(eh).padStart(2,'0')}:${String(sm).padStart(2,'0')}` : '20:00'
    setSelectedRoom(room)
    setForm({ title: '', description: '', startTime: start, endTime: end, roomId: room.id })
    setShowModal(true)
  }

  const openNewBooking = (room?: Room) => {
    setSelectedRoom(room || selectedRoom)
    setForm({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: room?.id || selectedRoom?.id || '' })
    setShowModal(true)
  }

  const getRoomStatus = (room: Room) => {
    const rb = bookings.filter(b => b.room.id === room.id && b.status !== 'cancelled')
    const cur = rb.find(b => new Date(b.startTime) <= now && new Date(b.endTime) > now)
    const upcoming = rb.filter(b => new Date(b.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    const nxt = upcoming[0]
    if (cur) return { type: 'busy', label: '사용 중', color: '#ef4444', bg: 'from-red-500 to-rose-600', light: 'bg-red-50 border-red-100', text: 'text-red-600', booking: cur }
    if (nxt) {
      const mins = (new Date(nxt.startTime).getTime() - now.getTime()) / 60000
      if (mins < 30) return { type: 'soon', label: `${Math.round(mins)}분 후`, color: '#f59e0b', bg: 'from-amber-400 to-orange-500', light: 'bg-amber-50 border-amber-100', text: 'text-amber-600', booking: nxt }
    }
    return { type: 'free', label: '예약 가능', color: '#10b981', bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600', booking: null }
  }

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today
  const myTodayBookings = myBookings.filter(b => new Date(b.startTime).toISOString().split('T')[0] === today && b.status !== 'cancelled')
  const myActiveBookings = myBookings.filter(b => b.status !== 'cancelled')
  const freeRooms = rooms.filter(r => {
    const s = getRoomStatus(r); return s.type === 'free'
  }).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-white/60 tracking-widest uppercase">Loading</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #f0f9ff 100%)' }}>

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-30 border-b border-white/60 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.85)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
              <i className="fas fa-calendar-check text-white text-sm"></i>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-base leading-tight">회의실 예약</h1>
              <p className="text-xs text-gray-400 hidden sm:block">실시간 현황 · 즉시 예약</p>
            </div>
          </div>

          {/* 날짜 선택 */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <i className="fas fa-calendar text-gray-400 text-xs"></i>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="text-sm text-gray-700 bg-transparent focus:outline-none" />
            {isToday && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">오늘</span>}
          </div>

          {/* 새 예약 */}
          <button onClick={() => openNewBooking()}
            className="hidden sm:flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
            <i className="fas fa-plus text-xs"></i> 새 예약
          </button>

          {/* 우측 아이콘 */}
          <div className="flex items-center gap-1">
            {session?.user?.userType === 'admin' && (
              <a href="/admin" className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="관리자">
                <i className="fas fa-cog"></i>
              </a>
            )}
            <a href="/home" className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="홈">
              <i className="fas fa-home"></i>
            </a>
            <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="로그아웃">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── KPI 카드 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: 'fa-check-circle', label: '내 전체 예약', value: myActiveBookings.length, color: '#6366f1', bg: 'from-indigo-500 to-purple-600' },
            { icon: 'fa-calendar-day', label: '오늘 내 예약', value: myTodayBookings.length, color: '#0ea5e9', bg: 'from-sky-400 to-blue-600' },
            { icon: 'fa-door-open',    label: '사용 가능',   value: freeRooms,                 color: '#10b981', bg: 'from-emerald-400 to-teal-600' },
            { icon: 'fa-building',     label: '전체 회의실', value: rooms.length,              color: '#f59e0b', bg: 'from-amber-400 to-orange-500' },
          ].map((k, i) => (
            <div key={i} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.bg} p-4 text-white shadow-lg`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-white/70 font-medium mb-1">{k.label}</p>
                  <p className="text-3xl font-black">{k.value}</p>
                </div>
                <i className={`fas ${k.icon} text-2xl text-white/25`}></i>
              </div>
              <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/10"></div>
            </div>
          ))}
        </div>

        {/* ── 탭 ── */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {[
              { key: 'board', icon: 'fa-th-large', label: '현황판' },
              { key: 'mine',  icon: 'fa-user-clock', label: '내 예약' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key as 'board'|'mine')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === t.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                <i className={`fas ${t.icon} text-xs`}></i> {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-xs text-gray-400">
            <span className="font-medium text-gray-600">
              {new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <span>·</span>
            <span>예약 {bookings.filter(b=>b.status!=='cancelled').length}건</span>
            <button onClick={() => { fetchBookings(); loadMyBookings() }}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all ml-1">
              <i className="fas fa-sync-alt text-xs"></i>
            </button>
          </div>
        </div>

        {/* ── 현황판 탭 ── */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {rooms.map(room => {
              const st = getRoomStatus(room)
              const roomBookings = bookings
                .filter(b => b.room.id === room.id && b.status !== 'cancelled')
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              const isSelected = selectedRoom?.id === room.id

              return (
                <div key={room.id} onClick={() => setSelectedRoom(isSelected ? null : room)}
                  className={`group bg-white rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                    isSelected ? 'border-blue-500 shadow-blue-100 shadow-lg' : 'border-transparent'
                  }`}>

                  {/* 상단 상태 바 */}
                  <div className={`h-1.5 bg-gradient-to-r ${st.bg}`}></div>

                  <div className="p-4 flex-1 flex flex-col">
                    {/* 헤더 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{room.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                          {room.location && <><i className="fas fa-map-marker-alt" style={{ color: '#2f4394' }}></i> {room.location}</>}
                          {room.capacity && <span className="ml-1">· {room.capacity}명</span>}
                        </p>
                      </div>
                      <span className={`ml-2 flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${st.bg}`}>
                        {st.label}
                      </span>
                    </div>

                    {/* 현재 진행 예약 */}
                    {st.booking && (
                      <div className={`mb-3 p-2.5 rounded-xl border text-xs ${st.light}`}>
                        <p className={`font-semibold truncate ${st.text}`}>{st.booking.title}</p>
                        <p className="text-gray-400 mt-0.5">{fmtTime(st.booking.startTime)} ~ {fmtTime(st.booking.endTime)}</p>
                      </div>
                    )}

                    {/* 타임라인 */}
                    <div className="mb-3">
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        {roomBookings.map(b => {
                          const ds = new Date(`${selectedDate}T09:00:00`).getTime()
                          const de = new Date(`${selectedDate}T20:00:00`).getTime()
                          const total = de - ds
                          const bs = Math.max(new Date(b.startTime).getTime(), ds)
                          const be = Math.min(new Date(b.endTime).getTime(), de)
                          const left = ((bs - ds) / total) * 100
                          const width = ((be - bs) / total) * 100
                          const isActive = now >= new Date(b.startTime) && now < new Date(b.endTime)
                          const isPast = now >= new Date(b.endTime)
                          return (
                            <div key={b.id}
                              className={`absolute top-0 h-full rounded-full opacity-80 ${isPast ? 'bg-gray-300' : isActive ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                              title={`${b.title} ${fmtTime(b.startTime)}~${fmtTime(b.endTime)}`} />
                          )
                        })}
                        {isToday && (() => {
                          const ds = new Date(`${selectedDate}T09:00:00`).getTime()
                          const de = new Date(`${selectedDate}T20:00:00`).getTime()
                          const pct = ((now.getTime() - ds) / (de - ds)) * 100
                          if (pct >= 0 && pct <= 100) return (
                            <div className="absolute top-0 h-full w-0.5 bg-indigo-600 z-10 rounded-full"
                              style={{ left: `${pct}%` }} />
                          )
                        })()}
                      </div>
                      <div className="flex justify-between text-gray-300 text-xs mt-0.5 px-0.5">
                        <span>9</span><span>14</span><span>20</span>
                      </div>
                    </div>

                    {/* 예약 목록 */}
                    <div className="flex-1 min-h-0">
                      {roomBookings.length > 0 ? (
                        <div className="space-y-1">
                          {roomBookings.slice(0, 3).map(b => {
                            const isActive = now >= new Date(b.startTime) && now < new Date(b.endTime)
                            const isPast = now >= new Date(b.endTime)
                            return (
                              <div key={b.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                                isActive ? 'bg-red-50' : isPast ? 'bg-gray-50' : 'bg-blue-50'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-red-400' : isPast ? 'bg-gray-300' : 'bg-blue-400'}`}></span>
                                <span className="font-semibold text-gray-500 whitespace-nowrap">{fmtTime(b.startTime)}</span>
                                <span className="text-gray-600 truncate flex-1">{b.title}</span>
                              </div>
                            )
                          })}
                          {roomBookings.length > 3 && (
                            <p className="text-center text-xs text-gray-400 py-0.5">+{roomBookings.length - 3}건 더</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-xs text-gray-300 py-2 flex items-center justify-center gap-1">
                          <i className="fas fa-check-circle text-emerald-300"></i> 예약 없음
                        </p>
                      )}
                    </div>

                    {/* 버튼 그룹 */}
                    <div className="mt-3 space-y-1.5">
                      <button onClick={e => { e.stopPropagation(); quickBook(room) }}
                        className="w-full py-2 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
                        <i className="fas fa-bolt"></i> 빠른 예약
                      </button>
                      <button onClick={e => { e.stopPropagation(); window.open(`/tablet/${room.code || room.id}`, '_blank') }}
                        className="w-full py-1.5 text-white text-xs font-semibold rounded-xl hover:opacity-90 flex items-center justify-center gap-1.5 transition-all"
                        style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)' }}>
                        <i className="fas fa-tablet-alt"></i> 태블릿 전용화면
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── 내 예약 탭 ── */}
        {activeTab === 'mine' && (
          <div className="space-y-3 mb-6">
            {myActiveBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-calendar-times text-gray-300 text-2xl"></i>
                </div>
                <p className="text-gray-400 text-sm mb-4">예약 내역이 없습니다</p>
                <button onClick={() => openNewBooking()}
                  className="text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
                  첫 예약 만들기
                </button>
              </div>
            ) : (
              myActiveBookings
                .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map(b => {
                  const st = STATUS_MAP[b.status] || STATUS_MAP.confirmed
                  const isToday_ = new Date(b.startTime).toISOString().split('T')[0] === today
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all">
                      <div className={`w-1 h-12 rounded-full flex-shrink-0 ${st.dot}`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{b.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                          <i className="fas fa-door-open" style={{ color: '#2f4394' }}></i>
                          {b.room.name}
                          {b.room.location && <span className="text-gray-300">· {b.room.location}</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-gray-700">
                          {new Date(b.startTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          {isToday_ && <span className="ml-1 text-blue-600">오늘</span>}
                        </p>
                        <p className="text-xs text-gray-500">{fmtTime(b.startTime)} ~ {fmtTime(b.endTime)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${st.badge} font-medium`}>{st.label}</span>
                      </div>
                      {b.status === 'confirmed' && (
                        <button onClick={() => handleCancel(b.id)}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        )}

        {/* ── 전체 예약 현황 리스트 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <i className="fas fa-list-alt text-blue-500"></i>
                {selectedRoom ? selectedRoom.name : '전체'} 예약 현황
              </h2>
              {selectedRoom && (
                <button onClick={() => setSelectedRoom(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full transition-all">
                  ✕ 필터 해제
                </button>
              )}
            </div>
            <button onClick={() => openNewBooking()}
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
              <i className="fas fa-plus text-xs"></i> 예약 추가
            </button>
          </div>

          {bookings.filter(b=>b.status!=='cancelled').length === 0 ? (
            <div className="text-center py-14 text-gray-300">
              <i className="fas fa-calendar-times text-4xl mb-3 block"></i>
              <p className="text-sm">이 날 예약이 없습니다</p>
              <button onClick={() => openNewBooking()}
                className="mt-4 text-white text-sm font-semibold px-5 py-2 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
                예약 만들기
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.filter(b=>b.status!=='cancelled')
                .sort((a,b)=>new Date(a.startTime).getTime()-new Date(b.startTime).getTime())
                .map(b => {
                  const st = STATUS_MAP[b.status] || STATUS_MAP.confirmed
                  const isActive = now >= new Date(b.startTime) && now < new Date(b.endTime)
                  return (
                    <div key={b.id} className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${isActive ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>
                      <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${st.dot}`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate flex items-center gap-2">
                          {b.title}
                          {isActive && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium animate-pulse">진행 중</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <i className="fas fa-door-open mr-1"></i>{b.room.name}
                          <span className="mx-1 text-gray-200">·</span>
                          <i className="fas fa-user mr-1"></i>{b.user.name}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-gray-700">{fmtTime(b.startTime)}~{fmtTime(b.endTime)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ring-1 ${st.badge}`}>{st.label}</span>
                      </div>
                      {b.status === 'confirmed' && (
                        <button onClick={() => handleCancel(b.id)}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── 예약 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
                    <i className="fas fa-calendar-plus text-white text-sm"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">회의실 예약</h3>
                    <p className="text-xs text-gray-400">{selectedDate} {selectedRoom?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 회의실 선택 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">회의실</label>
                <select value={form.roomId || selectedRoom?.id || ''}
                  onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                  <option value="">-- 회의실 선택 --</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.location ? ` (${r.location})` : ''}</option>)}
                </select>
              </div>

              {/* 회의명 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">회의명 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="회의 목적이나 주제를 입력하세요" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
              </div>

              {/* 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">시작 시간</label>
                  <select value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">종료 시간</label>
                  <select value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">메모 (선택)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="회의 관련 메모..." rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <i className="fas fa-exclamation-circle"></i> {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-all">
                  취소
                </button>
                <button type="submit" disabled={submitLoading}
                  className="flex-1 py-3 text-white font-bold rounded-xl text-sm shadow-md disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
                  {submitLoading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i>처리 중</> : '예약 확정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모바일 FAB */}
      <button onClick={() => openNewBooking()}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-2xl z-20 hover:scale-110 transition-transform"
        style={{ background: 'linear-gradient(135deg, #2f4394, #4f6ef7)' }}>
        <i className="fas fa-plus text-xl"></i>
      </button>
    </div>
  )
}
