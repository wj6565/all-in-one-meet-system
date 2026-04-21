'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Room { id: string; name: string; location: string | null; capacity: number; code: string | null }
interface Booking {
  id: string; title: string; startTime: string; endTime: string; status: string
  room: { id: string; name: string }
  user: { id: string; name: string; department?: { name: string } | null }
}
interface Session { user: { name: string; email: string; userType: string; userId: string } }

export default function BookingPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', roomId: '' })
  const [error, setError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(setSession)
    fetch('/api/rooms').then(r => r.json()).then(data => {
      setRooms(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedRoom])

  const fetchBookings = async () => {
    const params = new URLSearchParams({ date: selectedDate })
    if (selectedRoom) params.set('roomId', selectedRoom.id)
    const data = await fetch(`/api/bookings?${params}`).then(r => r.json())
    setBookings(Array.isArray(data) ? data : [])
  }

  const handleLogout = async () => {
    const { csrfToken } = await fetch('/api/auth/csrf').then(r => r.json())
    await fetch('/api/auth/signout', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken }) })
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
      setForm({ title: '', description: '', startTime: '', endTime: '', roomId: '' })
      fetchBookings()
    } catch { setError('서버 오류') } finally { setSubmitLoading(false) }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('예약을 취소하시겠습니까?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    fetchBookings()
  }

  // 타임슬롯 생성 (09:00 ~ 20:00, 30분 간격)
  const timeSlots = Array.from({ length: 23 }, (_, i) => {
    const h = Math.floor(i / 2) + 9
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  const getRoomStatus = (room: Room) => {
    const now = new Date()
    const roomBookings = bookings.filter(b => b.room.id === room.id && b.status !== 'cancelled')
    const current = roomBookings.find(b => new Date(b.startTime) <= now && new Date(b.endTime) > now)
    const next = roomBookings.find(b => new Date(b.startTime) > now)
    if (current) return { status: 'in_use', label: '사용중', color: 'bg-red-500', booking: current }
    if (next) {
      const mins = (new Date(next.startTime).getTime() - now.getTime()) / 60000
      if (mins < 30) return { status: 'soon', label: `${Math.round(mins)}분 후`, color: 'bg-amber-500', booking: next }
    }
    return { status: 'available', label: '사용가능', color: 'bg-emerald-500', booking: null }
  }

  const getBookingColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-blue-500', checked_in: 'bg-green-500', completed: 'bg-slate-400', cancelled: 'bg-red-300'
    }
    return colors[status] || 'bg-blue-500'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Image src="/wonjin-logo.png" alt="WONJIN" width={100} height={28} style={{ objectFit: 'contain', height: '26px', width: 'auto' }} priority />
          <span className="text-gray-300 hidden sm:block">|</span>
          <span className="text-gray-700 font-bold text-sm hidden sm:block">🏢 회의실 예약</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.location.href = '/home'} className="text-xs text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors hidden sm:block">← 메인</button>
          <span className="text-xs text-gray-500 hidden sm:inline">{session?.user?.name}</span>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">로그아웃</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* 날짜 선택 + 액션 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm" />
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(['calendar', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                  {v === 'calendar' ? '🗓 현황' : '📋 목록'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setShowModal(true); setForm({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: selectedRoom?.id || '' }) }}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
            <span>+</span> 새 예약
          </button>
        </div>

        {view === 'calendar' ? (
          /* 회의실 현황 카드뷰 */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {rooms.map(room => {
              const { status, label, color, booking } = getRoomStatus(room)
              return (
                <div key={room.id} onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                  className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all shadow-sm hover:shadow-md ${selectedRoom?.id === room.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-emerald-300'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{room.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{room.location} · {room.capacity}명</p>
                    </div>
                    <span className={`${color} text-white text-xs px-2 py-1 rounded-full font-medium`}>{label}</span>
                  </div>
                  {booking && status !== 'available' && (
                    <div className="bg-gray-50 rounded-lg p-2 text-xs">
                      <p className="font-medium text-gray-700 truncate">{booking.title}</p>
                      <p className="text-gray-400">{new Date(booking.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ {new Date(booking.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  )}
                  {status === 'available' && (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); setShowModal(true); setForm({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: room.id }) }}
                      className="w-full mt-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold py-2 rounded-lg transition-colors">
                      + 예약하기
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}

        {/* 예약 목록 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">{selectedRoom ? `${selectedRoom.name} 예약 현황` : '전체 예약 현황'} ({selectedDate})</h2>
            {selectedRoom && (
              <button onClick={() => setSelectedRoom(null)} className="text-xs text-gray-400 hover:text-gray-600">전체 보기 ×</button>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">예약이 없습니다</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-emerald-600 hover:underline text-sm">예약 만들기 →</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.map(b => (
                <div key={b.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-12 ${getBookingColor(b.status)} rounded-full flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{b.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.room.name} · {b.user.name} {b.user.department?.name ? `(${b.user.department.name})` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(b.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ {new Date(b.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      b.status === 'checked_in' ? 'bg-green-100 text-green-700' :
                      b.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {b.status === 'confirmed' ? '예약확정' : b.status === 'checked_in' ? '사용중' : b.status === 'completed' ? '완료' : '취소'}
                    </span>
                  </div>
                  {b.status === 'confirmed' && (
                    <button onClick={() => handleCancel(b.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors ml-2 flex-shrink-0">취소</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 타임라인 뷰 */}
          {view === 'calendar' && bookings.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-3">오늘 타임라인</p>
              <div className="relative">
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {timeSlots.map(slot => {
                    const slotDate = new Date(`${selectedDate}T${slot}:00`)
                    const active = bookings.find(b =>
                      new Date(b.startTime) <= slotDate && new Date(b.endTime) > slotDate && b.status !== 'cancelled'
                    )
                    return (
                      <div key={slot} className="flex-shrink-0 w-10 text-center">
                        <div className={`h-6 rounded ${active ? 'bg-blue-500' : 'bg-gray-100'}`} title={active?.title} />
                        <p className="text-xs text-gray-300 mt-0.5">{slot.split(':')[1] === '00' ? slot : ''}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 예약 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">🏢 새 예약</h2>
              <p className="text-sm text-gray-400 mt-0.5">{selectedDate}</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">회의실 *</label>
                <select value={form.roomId || selectedRoom?.id || ''} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                  <option value="">회의실 선택</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity}명)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">회의명 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="회의명을 입력하세요" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">시작 시간 *</label>
                  <select value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">종료 시간 *</label>
                  <select value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">메모</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="선택사항" />
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">취소</button>
                <button type="submit" disabled={submitLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-60">
                  {submitLoading ? '예약 중...' : '예약 확정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
