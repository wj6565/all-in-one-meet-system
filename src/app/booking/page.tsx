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
  room: { id: string; name: string }
  user: { id: string; name: string; department?: { name: string } | null }
}
interface Session { user: { name: string; email: string; userType: string; userId: string; department?: { name: string } | null } }

export default function BookingPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: '' })
  const [error, setError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [view, setView] = useState<'board' | 'list'>('board')

  // 타임슬롯 09:00 ~ 20:00, 30분 단위
  const timeSlots = Array.from({ length: 23 }, (_, i) => {
    const h = Math.floor(i / 2) + 9
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setSession(data)
    })
    fetch('/api/rooms').then(r => r.json()).then(data => {
      setRooms(data)
      setLoading(false)
    })
  }, [])

  const fetchBookings = useCallback(async () => {
    const params = new URLSearchParams({ date: selectedDate })
    if (selectedRoom) params.set('roomId', selectedRoom.id)
    const data = await fetch(`/api/bookings?${params}`).then(r => r.json())
    setBookings(Array.isArray(data) ? data : [])
  }, [selectedDate, selectedRoom])

  useEffect(() => { fetchBookings() }, [fetchBookings])

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
      setForm({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: '' })
      fetchBookings()
    } catch { setError('서버 오류') } finally { setSubmitLoading(false) }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('예약을 취소하시겠습니까?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    fetchBookings()
  }

  // 빠른 예약 - 현재시간 기준 다음 30분 단위 자동설정
  const quickBook = (room: Room) => {
    const now = new Date()
    let h = now.getHours()
    let m = now.getMinutes()
    if (m < 30) { m = 30 }
    else { m = 0; h += 1 }
    if (h >= 20) { alert('금일 예약 가능 시간이 종료되었습니다'); return }
    const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const eh = h + 1
    const endStr = `${String(eh).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setSelectedRoom(room)
    setForm({ title: '', description: '', startTime: startStr, endTime: eh < 21 ? endStr : '20:00', roomId: room.id })
    setShowModal(true)
  }

  const openNewBooking = (room?: Room) => {
    setSelectedRoom(room || selectedRoom)
    setForm({ title: '', description: '', startTime: '09:00', endTime: '10:00', roomId: room?.id || selectedRoom?.id || '' })
    setShowModal(true)
  }

  // 회의실 현재 상태
  const getRoomStatus = (room: Room) => {
    const now = new Date()
    const rb = bookings.filter(b => b.room.id === room.id && b.status !== 'cancelled')
    const cur = rb.find(b => new Date(b.startTime) <= now && new Date(b.endTime) > now)
    const nxt = rb.filter(b => new Date(b.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
    if (cur) return { label: '사용중', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50 border-red-200', booking: cur }
    if (nxt) {
      const mins = (new Date(nxt.startTime).getTime() - now.getTime()) / 60000
      if (mins < 30) return { label: `${Math.round(mins)}분 후`, color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50 border-amber-200', booking: nxt }
    }
    return { label: '사용가능', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50 border-emerald-100', booking: null }
  }

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
      <div className="text-center text-white">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm opacity-80">로딩 중...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - 참조 시스템과 동일한 스타일 */}
      <div className="shadow-md sticky top-0 z-20" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* 로고 */}
            <div className="flex-shrink-0">
              <Image src="/wonjin-logo.png" alt="WONJIN Group" width={120} height={40}
                style={{ objectFit: 'contain', height: '40px', width: 'auto', filter: 'brightness(0) invert(1)' }} priority />
            </div>
            {/* 타이틀 */}
            <div className="flex-1 flex items-center min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">회의실 예약 시스템</h1>
            </div>
            {/* 우측: 사용자 정보 + 버튼들 */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* 사용자 정보 (PC만) */}
              <div className="hidden md:flex items-center gap-3 text-white">
                <div className="text-right">
                  <p className="text-sm font-semibold">{session?.user?.name}</p>
                  <p className="text-xs opacity-80">{(session?.user as { department?: { name: string } | null })?.department?.name || '부서 없음'}</p>
                </div>
                <div className="w-px h-8 bg-white opacity-30"></div>
              </div>
              {session?.user?.userType === 'admin' && (
                <button onClick={() => window.location.href = '/admin'}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="관리자">
                  <i className="fas fa-cog text-lg"></i>
                </button>
              )}
              <button onClick={() => window.location.href = '/home'}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="메인으로">
                <i className="fas fa-home text-lg"></i>
              </button>
              <button onClick={handleLogout}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="로그아웃">
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* 요약 카드 - 참조 시스템 동일 */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">전체 회의실</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{rooms.length}</p>
              </div>
              <i className="fas fa-door-open text-2xl sm:text-4xl text-blue-200"></i>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">내 예약</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {bookings.filter(b => b.user?.id === session?.user?.userId && b.status !== 'cancelled').length}
                </p>
              </div>
              <i className="fas fa-calendar-check text-2xl sm:text-4xl text-green-200"></i>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">오늘 예약</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {bookings.filter(b => b.status !== 'cancelled').length}
                </p>
              </div>
              <i className="fas fa-clock text-2xl sm:text-4xl text-purple-200"></i>
            </div>
          </div>
        </div>

        {/* 날짜 선택 + 뷰 전환 + 예약 버튼 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm" />
            {isToday && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">오늘</span>}
            {/* 뷰 전환 */}
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              {(['board', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    view === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {v === 'board'
                    ? <><i className="fas fa-th-large mr-1"></i>현황판</>
                    : <><i className="fas fa-list mr-1"></i>목록</>}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:ml-auto">
            <button onClick={() => openNewBooking()}
              className="flex items-center gap-2 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm whitespace-nowrap"
              style={{ background: '#2f4394' }}>
              <i className="fas fa-plus"></i>새 예약
            </button>
          </div>
        </div>

        {/* 예약현황판 */}
        {view === 'board' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
            {rooms.map(room => {
              const { label, color, textColor, bgLight, booking: statusBooking } = getRoomStatus(room)
              const roomBookings = bookings.filter(b => b.room.id === room.id && b.status !== 'cancelled')
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              const isSelected = selectedRoom?.id === room.id
              return (
                <div key={room.id}
                  onClick={() => setSelectedRoom(isSelected ? null : room)}
                  className={`bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col ${
                    isSelected ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'
                  }`}>
                  {/* 카드 헤더 */}
                  <div className="p-3 sm:p-4 pb-2">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm leading-tight truncate" style={{ color: '#2f4394' }}>
                          {room.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {room.location && <><i className="fas fa-map-marker-alt mr-1 text-xs"></i>{room.location}</>}
                          {room.capacity && <span className="ml-1">· {room.capacity}명</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap`}>{label}</span>
                        {room.isTabletMode && (
                          <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">
                            <i className="fas fa-tablet-alt text-xs"></i>
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 진행 중 예약 */}
                    {statusBooking && (
                      <div className={`mt-2 p-2 rounded-lg border text-xs ${bgLight}`}>
                        <p className={`font-semibold truncate ${textColor}`}>{statusBooking.title}</p>
                        <p className="text-gray-500">{fmtTime(statusBooking.startTime)} ~ {fmtTime(statusBooking.endTime)}</p>
                      </div>
                    )}
                  </div>

                  {/* 오늘 타임라인 */}
                  {isToday && (
                    <div className="px-3 sm:px-4 pb-2">
                      <div className="flex gap-0.5 h-3 sm:h-4">
                        {Array.from({ length: 22 }, (_, i) => {
                          const slotH = Math.floor(i / 2) + 9
                          const slotM = i % 2 === 0 ? 0 : 30
                          const slotDate = new Date(`${selectedDate}T${String(slotH).padStart(2,'0')}:${String(slotM).padStart(2,'0')}:00`)
                          const active = roomBookings.find(b => new Date(b.startTime) <= slotDate && new Date(b.endTime) > slotDate)
                          return (
                            <div key={i} className={`flex-1 rounded-sm ${active ? 'bg-blue-400' : 'bg-gray-100'}`}
                              title={active ? `${active.title} ${fmtTime(active.startTime)}~${fmtTime(active.endTime)}` : ''} />
                          )
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
                        <span>9시</span><span>13시</span><span>18시</span>
                      </div>
                    </div>
                  )}

                  {/* 예약 목록 미리보기 */}
                  <div className="px-3 sm:px-4 pb-2 flex-1">
                    {roomBookings.length > 0 ? (
                      <div className="space-y-1">
                        {roomBookings.slice(0, 3).map(b => (
                          <div key={b.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{fmtTime(b.startTime)}</span>
                            <p className="text-xs text-gray-700 truncate flex-1">{b.title}</p>
                          </div>
                        ))}
                        {roomBookings.length > 3 && (
                          <p className="text-xs text-center text-gray-400">+{roomBookings.length - 3}건 더</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-gray-400 py-2">예약 없음</p>
                    )}
                  </div>

                  {/* 빠른예약 / 태블릿 버튼 */}
                  <div className="p-2.5 sm:p-3 pt-0 space-y-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); quickBook(room) }}
                      className="w-full py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(to right, #2f4394, #667eea)' }}>
                      <i className="fas fa-bolt"></i>
                      <span className="truncate">{room.name} 빠른 예약</span>
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); window.open(`/tablet/${room.code || room.id}`, '_blank') }}
                        className="w-full py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-1.5">
                        <i className="fas fa-tablet-alt"></i> 태블릿 화면
                      </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 예약 목록 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h2 className="font-bold text-gray-800 text-sm sm:text-base flex items-center gap-1.5 whitespace-nowrap">
                <i className="fas fa-calendar-check text-blue-600 text-sm"></i>
                <span className="truncate">{selectedRoom ? selectedRoom.name : '전체'} 예약 현황</span>
              </h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">{selectedDate}</span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">{bookings.length}건</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedRoom && (
                <button onClick={() => setSelectedRoom(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded whitespace-nowrap">
                  전체 ×
                </button>
              )}
              <button onClick={() => openNewBooking()}
                className="text-xs text-white px-3 py-1.5 rounded-lg font-medium whitespace-nowrap"
                style={{ background: '#2f4394' }}>
                <i className="fas fa-plus mr-1"></i>예약 추가
              </button>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-10 sm:py-14 text-gray-400">
              <i className="fas fa-calendar-times text-4xl sm:text-5xl mb-3 block"></i>
              <p className="text-sm mb-3">예약이 없습니다</p>
              <button onClick={() => openNewBooking()}
                className="text-white px-5 py-2 rounded-xl text-sm font-medium"
                style={{ background: '#2f4394' }}>
                <i className="fas fa-plus mr-2"></i>예약 만들기
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.map(b => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  confirmed:  { label: '예약확정', cls: 'bg-blue-100 text-blue-700' },
                  checked_in: { label: '사용중',   cls: 'bg-green-100 text-green-700' },
                  completed:  { label: '완료',     cls: 'bg-gray-100 text-gray-500' },
                  cancelled:  { label: '취소됨',   cls: 'bg-red-100 text-red-500' },
                }
                const st = statusMap[b.status] || { label: b.status, cls: 'bg-gray-100 text-gray-500' }
                const barColors: Record<string, string> = { confirmed: 'bg-blue-500', checked_in: 'bg-green-500', completed: 'bg-gray-300', cancelled: 'bg-red-300' }
                return (
                  <div key={b.id} className="px-3 sm:px-5 py-3 sm:py-3.5 flex items-center gap-2 sm:gap-3 hover:bg-gray-50 transition-colors">
                    <div className={`w-1 h-10 ${barColors[b.status] || 'bg-gray-300'} rounded-full flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{b.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        <i className="fas fa-door-open mr-1"></i>{b.room.name}
                        <span className="mx-1">·</span>
                        <i className="fas fa-user mr-1"></i>{b.user.name}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {fmtTime(b.startTime)}~{fmtTime(b.endTime)}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </div>
                    {b.status === 'confirmed' && (
                      <button onClick={() => handleCancel(b.id)}
                        className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 px-1.5 sm:px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        취소
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 타임라인 바 */}
          {view === 'board' && bookings.length > 0 && (
            <div className="px-3 sm:px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                <i className="fas fa-clock"></i> 타임라인 ({selectedDate})
              </p>
              <div className="flex gap-0.5 overflow-x-auto pb-1">
                {timeSlots.map(slot => {
                  const slotDate = new Date(`${selectedDate}T${slot}:00`)
                  const active = bookings.find(b => new Date(b.startTime) <= slotDate && new Date(b.endTime) > slotDate && b.status !== 'cancelled')
                  return (
                    <div key={slot} className="flex-shrink-0 w-7 sm:w-8 text-center">
                      <div className={`h-4 sm:h-5 rounded ${active ? 'bg-blue-500' : 'bg-gray-200'}`}
                        title={active ? `${active.title} (${active.room.name})` : ''} />
                      <p className="text-xs text-gray-300 mt-0.5 leading-none">{slot.endsWith(':00') ? slot.slice(0,2) : ''}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 예약 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  <i className="fas fa-calendar-plus mr-2" style={{ color: '#2f4394' }}></i>새 예약
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedDate}{selectedRoom && ` · ${selectedRoom.name}`}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* 회의실 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  <i className="fas fa-door-open mr-1"></i>회의실 *
                </label>
                <select value={form.roomId || selectedRoom?.id || ''} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">회의실 선택</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.location ? ` - ${r.location}` : ''} ({r.capacity}명)</option>)}
                </select>
              </div>
              {/* 회의명 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  <i className="fas fa-comment mr-1"></i>회의 주제 *
                </label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="회의 주제를 입력하세요" required />
              </div>
              {/* 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    <i className="fas fa-clock mr-1"></i>시작 *
                  </label>
                  <select value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    <i className="fas fa-clock mr-1"></i>종료 *
                  </label>
                  <select value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* 메모 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  <i className="fas fa-sticky-note mr-1"></i>메모 (선택)
                </label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="추가 메모사항" />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <i className="fas fa-exclamation-circle"></i> {error}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                  취소
                </button>
                <button type="submit" disabled={submitLoading}
                  className="flex-1 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors"
                  style={{ background: '#2f4394' }}>
                  {submitLoading
                    ? <><i className="fas fa-spinner fa-spin mr-1"></i>예약 중...</>
                    : <><i className="fas fa-check mr-1"></i>예약 확정</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
