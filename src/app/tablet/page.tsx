'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Room {
  id: string
  name: string
  location: string | null
  code: string | null
  capacity: number
  isTabletMode: boolean
}

interface Booking {
  id: string
  title: string
  startTime: string
  endTime: string
  status: string
  room?: { id: string; name: string }
  user: { name: string; department: { name: string } | null }
}

interface Session {
  user: { name: string; userType: string; id: string }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

export default function TabletPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [view, setView] = useState<'dashboard' | 'booking' | 'meeting'>('dashboard')
  const [showQuickBooking, setShowQuickBooking] = useState(false)
  const [quickForm, setQuickForm] = useState({ roomId: '', title: '', duration: '60' })
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')

  // 시계 업데이트
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // 세션 확인
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(setSession)
  }, [])

  const loadData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [roomsData, bookingsData] = await Promise.all([
      fetch('/api/rooms').then(r => r.json()),
      fetch(`/api/bookings?date=${today}`).then(r => r.json()),
    ])
    setRooms(Array.isArray(roomsData) ? roomsData : [])
    setBookings(Array.isArray(bookingsData) ? bookingsData : [])
  }, [])

  useEffect(() => {
    loadData()
    const t = setInterval(loadData, 30000) // 30초마다 갱신
    return () => clearInterval(t)
  }, [loadData])

  const getRoomStatus = (room: Room) => {
    const now = currentTime
    const roomBookings = bookings.filter(b => b.room?.id === room.id && b.status !== 'cancelled')
    const current = roomBookings.find(b => new Date(b.startTime) <= now && new Date(b.endTime) > now)
    const upcoming = roomBookings.filter(b => new Date(b.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    if (current) return { status: 'in_use', label: '사용중', current, next: upcoming[0] || null }
    if (upcoming.length > 0) {
      const mins = (new Date(upcoming[0].startTime).getTime() - now.getTime()) / 60000
      if (mins < 30) return { status: 'soon', label: `${Math.round(mins)}분 후 예약`, current: null, next: upcoming[0] }
    }
    return { status: 'available', label: '사용가능', current: null, next: upcoming[0] || null }
  }

  const handleQuickBooking = async () => {
    setBookingError('')
    if (!quickForm.roomId || !quickForm.title) {
      setBookingError('회의실과 회의명을 입력하세요.')
      return
    }
    const now = new Date()
    const end = new Date(now.getTime() + parseInt(quickForm.duration) * 60000)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: quickForm.roomId,
        title: quickForm.title,
        startTime: now.toISOString(),
        endTime: end.toISOString(),
      })
    })
    const data = await res.json()
    if (!res.ok) {
      setBookingError(data.error || '예약 실패')
    } else {
      setBookingSuccess(`예약 완료! ${formatTime(now)} ~ ${formatTime(end)}`)
      setShowQuickBooking(false)
      setQuickForm({ roomId: '', title: '', duration: '60' })
      loadData()
      setTimeout(() => setBookingSuccess(''), 5000)
    }
  }

  const handleLogout = async () => {
    const csrfRes = await fetch('/api/auth/csrf').catch(() => null)
    const { csrfToken } = csrfRes ? await csrfRes.json() : { csrfToken: '' }
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken }),
    })
    window.location.href = '/login'
  }

  const getRoomBookings = (roomId: string) =>
    bookings.filter(b => b.room?.id === roomId && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  return (
    <div className="min-h-screen bg-slate-900 text-white select-none">
      {/* 헤더 */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl px-4 py-2">
              <Image src="/wonjin-logo.png" alt="WONJIN" width={120} height={32}
                style={{ objectFit: 'contain', height: '28px', width: 'auto' }} priority />
            </div>
            <div>
              <div className="text-white font-bold text-lg">ALL IN ONE MEET SYSTEM</div>
              <div className="text-slate-400 text-sm">태블릿 대시보드</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-white">
              {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-slate-400 text-sm">{formatDate(currentTime)}</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuickBooking(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              + 즉시 예약
            </button>
            <button
              onClick={() => setView(view === 'meeting' ? 'dashboard' : 'meeting')}
              className={`font-bold px-5 py-2.5 rounded-xl text-sm transition-colors ${
                view === 'meeting' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}>
              {view === 'meeting' ? '⏹ 녹음 종료' : '🎙️ 회의 녹음'}
            </button>
            <button onClick={handleLogout}
              className="text-slate-400 hover:text-white px-3 py-2.5 rounded-xl hover:bg-slate-700 text-sm transition-colors">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 성공 메시지 */}
      {bookingSuccess && (
        <div className="bg-emerald-600 text-white text-center py-3 text-sm font-medium">
          ✅ {bookingSuccess}
        </div>
      )}

      {/* 회의 녹음 모드 */}
      {view === 'meeting' && (
        <div className="flex items-center justify-center min-h-[calc(100vh-73px)]">
          <div className="text-center">
            <div className="w-48 h-48 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center text-8xl mx-auto mb-8 animate-pulse">
              🎙️
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">회의 녹음 중</h2>
            <p className="text-slate-400 text-xl mb-8">회의실 태블릿에서 바로 녹음을 시작합니다</p>
            <a href="/meeting"
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-xl px-12 py-5 rounded-2xl transition-colors inline-block">
              🎙️ 녹음 시작 페이지 열기
            </a>
          </div>
        </div>
      )}

      {/* 대시보드 모드 */}
      {view === 'dashboard' && (
        <main className="p-6">
          {/* 회의실 현황 그리드 */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {rooms.map(room => {
              const { status, label, current, next } = getRoomStatus(room)
              const roomBookings = getRoomBookings(room.id)
              const statusColors = {
                in_use: 'border-red-500 bg-red-900/20',
                soon: 'border-amber-500 bg-amber-900/20',
                available: 'border-emerald-500 bg-emerald-900/20',
              }
              const labelColors = {
                in_use: 'bg-red-500',
                soon: 'bg-amber-500',
                available: 'bg-emerald-500',
              }

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                  className={`rounded-2xl border-2 p-5 cursor-pointer transition-all hover:scale-105 ${
                    statusColors[status as keyof typeof statusColors] || 'border-slate-600 bg-slate-800/50'
                  } ${selectedRoom?.id === room.id ? 'ring-2 ring-white' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-lg">{room.name}</h3>
                      {room.location && <p className="text-slate-400 text-sm">{room.location}</p>}
                      <p className="text-slate-400 text-xs mt-0.5">수용 {room.capacity}명</p>
                    </div>
                    <span className={`${labelColors[status as keyof typeof labelColors] || 'bg-slate-500'} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                      {label}
                    </span>
                  </div>

                  {/* 현재 사용 정보 */}
                  {current && (
                    <div className="bg-red-800/30 rounded-xl p-3 mb-2">
                      <div className="text-white font-medium text-sm truncate">{current.title}</div>
                      <div className="text-red-300 text-xs mt-0.5">
                        {formatTime(new Date(current.startTime))} ~ {formatTime(new Date(current.endTime))}
                      </div>
                      <div className="text-slate-400 text-xs">{current.user?.name}</div>
                    </div>
                  )}

                  {/* 오늘 예약 목록 */}
                  <div className="space-y-1 mt-3">
                    {roomBookings.slice(0, 4).map(b => {
                      const isNow = new Date(b.startTime) <= currentTime && new Date(b.endTime) > currentTime
                      return (
                        <div key={b.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${
                          isNow ? 'bg-red-700/30 text-red-200' : 'text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isNow ? 'bg-red-400' : 'bg-slate-500'
                          }`} />
                          <span>{formatTime(new Date(b.startTime))}</span>
                          <span className="truncate flex-1">{b.title}</span>
                        </div>
                      )
                    })}
                    {roomBookings.length === 0 && (
                      <div className="text-slate-500 text-xs text-center py-2">오늘 예약 없음</div>
                    )}
                  </div>

                  {/* 즉시 예약 버튼 */}
                  {status === 'available' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setQuickForm({ roomId: room.id, title: '', duration: '60' })
                        setShowQuickBooking(true)
                      }}
                      className="w-full mt-3 bg-emerald-500/80 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
                      + 즉시 예약
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* 하단 전체 예약 타임라인 */}
          <div className="mt-6 bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
            <h2 className="text-white font-bold mb-4">오늘 전체 예약 현황</h2>
            {bookings.filter(b => b.status !== 'cancelled').length === 0 ? (
              <div className="text-slate-400 text-center py-6">오늘 예약이 없습니다</div>
            ) : (
              <div className="space-y-2">
                {bookings
                  .filter(b => b.status !== 'cancelled')
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map(b => {
                    const isNow = new Date(b.startTime) <= currentTime && new Date(b.endTime) > currentTime
                    return (
                      <div key={b.id} className={`flex items-center gap-4 p-3 rounded-xl ${isNow ? 'bg-blue-800/30 border border-blue-700' : 'bg-slate-700/30'}`}>
                        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${isNow ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{b.title}</div>
                          <div className="text-slate-400 text-xs">{b.user?.name} {b.user?.department?.name ? `· ${b.user.department.name}` : ''}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-white text-sm font-medium">
                            {formatTime(new Date(b.startTime))} ~ {formatTime(new Date(b.endTime))}
                          </div>
                          {isNow && <div className="text-blue-400 text-xs font-bold">현재 사용중</div>}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </main>
      )}

      {/* 즉시 예약 모달 */}
      {showQuickBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-6">
            <h2 className="text-white font-bold text-xl mb-5">⚡ 즉시 예약</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">회의실</label>
                <select
                  value={quickForm.roomId}
                  onChange={e => setQuickForm(f => ({ ...f, roomId: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">회의실 선택</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity}명)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">회의명</label>
                <input
                  value={quickForm.title}
                  onChange={e => setQuickForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="회의명 입력"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">사용 시간</label>
                <div className="grid grid-cols-4 gap-2">
                  {['30', '60', '90', '120'].map(d => (
                    <button key={d}
                      onClick={() => setQuickForm(f => ({ ...f, duration: d }))}
                      className={`py-3 rounded-xl text-sm font-bold transition-colors ${
                        quickForm.duration === d
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}>
                      {d}분
                    </button>
                  ))}
                </div>
              </div>
              {bookingError && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
                  ⚠️ {bookingError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowQuickBooking(false); setBookingError(''); setQuickForm({ roomId: '', title: '', duration: '60' }) }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-xl font-medium transition-colors">
                취소
              </button>
              <button onClick={handleQuickBooking}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold transition-colors">
                ✅ 예약 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
