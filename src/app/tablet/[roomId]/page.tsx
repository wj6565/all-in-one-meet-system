'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Image from 'next/image'

interface Room {
  id: string
  name: string
  location: string | null
  code: string | null
  capacity: number
  isTabletMode: boolean
  tabletPinCode: string | null
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

function formatTime(date: Date) {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

export default function TabletRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)

  const [room, setRoom] = useState<Room | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showQuickBooking, setShowQuickBooking] = useState(false)
  const [quickForm, setQuickForm] = useState({ title: '', duration: '60' })
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [pinVerified, setPinVerified] = useState(false)
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(true)

  // 시계 업데이트
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // 회의실 정보 로드
  useEffect(() => {
    fetch('/api/rooms').then(r => r.json()).then((rooms: Room[]) => {
      const found = rooms.find((r: Room) => r.id === roomId || r.code === roomId)
      setRoom(found || null)
      setLoading(false)
      // PIN이 없거나 태블릿 모드가 아닌 경우 자동 통과
      if (found && (!found.isTabletMode || !found.tabletPinCode)) {
        setPinVerified(true)
      }
    })
  }, [roomId])

  const loadBookings = useCallback(async () => {
    if (!room) return
    const today = new Date().toISOString().split('T')[0]
    const data = await fetch(`/api/bookings?date=${today}&roomId=${room.id}`).then(r => r.json())
    setBookings(Array.isArray(data) ? data : [])
  }, [room])

  useEffect(() => {
    if (room && pinVerified) {
      loadBookings()
      const t = setInterval(loadBookings, 30000)
      return () => clearInterval(t)
    }
  }, [room, pinVerified, loadBookings])

  const getRoomStatus = () => {
    if (!room) return { status: 'available', label: '사용가능', current: null as Booking | null, next: null as Booking | null }
    const now = currentTime
    const roomBookings = bookings.filter(b => b.status !== 'cancelled')
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

  const handlePinVerify = () => {
    if (room?.tabletPinCode && pinInput === room.tabletPinCode) {
      setPinVerified(true)
      setPinError('')
    } else {
      setPinError('PIN이 올바르지 않습니다')
    }
  }

  const handleQuickBooking = async () => {
    setBookingError('')
    if (!quickForm.title) { setBookingError('회의명을 입력하세요.'); return }
    if (!room) return
    const now = new Date()
    const end = new Date(now.getTime() + parseInt(quickForm.duration) * 60000)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: room.id,
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
      setQuickForm({ title: '', duration: '60' })
      loadBookings()
      setTimeout(() => setBookingSuccess(''), 5000)
    }
  }

  const { status, label, current, next } = getRoomStatus()

  const statusStyle = {
    in_use:    { bg: 'bg-red-600',     border: 'border-red-500',    badge: 'bg-red-500',    text: '사용중입니다' },
    soon:      { bg: 'bg-amber-600',   border: 'border-amber-500',  badge: 'bg-amber-500',  text: '곧 사용 예정' },
    available: { bg: 'bg-emerald-600', border: 'border-emerald-500', badge: 'bg-emerald-500', text: '사용 가능합니다' },
  }[status] || { bg: 'bg-slate-600', border: 'border-slate-500', badge: 'bg-slate-500', text: '' }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!room) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="text-center">
        <i className="fas fa-door-open text-5xl mb-4 opacity-40"></i>
        <p className="text-xl font-bold">회의실을 찾을 수 없습니다</p>
        <a href="/tablet" className="mt-4 inline-block text-slate-400 hover:text-white">← 전체 현황으로</a>
      </div>
    </div>
  )

  // PIN 확인 화면
  if (room.isTabletMode && room.tabletPinCode && !pinVerified) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-lock text-blue-400 text-2xl"></i>
        </div>
        <h2 className="text-white font-bold text-xl mb-1">{room.name}</h2>
        <p className="text-slate-400 text-sm mb-6">PIN을 입력하세요</p>
        <input
          type="number"
          value={pinInput}
          onChange={e => setPinInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePinVerify()}
          maxLength={4}
          className="w-full bg-slate-700 border border-slate-600 text-white text-center text-2xl font-mono rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest mb-3"
          placeholder="• • • •"
        />
        {pinError && <p className="text-red-400 text-sm mb-3">{pinError}</p>}
        <button onClick={handlePinVerify}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors mb-3">
          확인
        </button>
        <a href="/tablet" className="text-slate-500 hover:text-slate-300 text-sm">← 전체 현황</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white select-none flex flex-col">
      {/* 헤더 */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="bg-white rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 flex-shrink-0">
              <Image src="/wonjin-logo.png" alt="WONJIN" width={90} height={28}
                style={{ objectFit: 'contain', height: '22px', width: 'auto' }} priority />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm sm:text-lg truncate">{room.name}</h1>
              {room.location && <p className="text-slate-400 text-xs truncate">{room.location} · {room.capacity}명</p>}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-xl sm:text-3xl font-mono font-bold text-white">
              {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-slate-400 text-xs hidden sm:block">{formatDate(currentTime)}</div>
          </div>
        </div>
      </header>

      {/* 상태 배너 */}
      <div className={`${statusStyle.bg} px-4 sm:px-6 py-4 sm:py-5`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-block bg-white/20 text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-2">{label}</span>
            <p className="text-white text-lg sm:text-2xl font-bold">{statusStyle.text}</p>
            {current && <p className="text-white/80 text-sm truncate mt-1">{current.title}</p>}
          </div>
          {status !== 'in_use' && (
            <button
              onClick={() => setShowQuickBooking(true)}
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors flex-shrink-0 ml-3">
              <i className="fas fa-bolt mr-1.5"></i>즉시 예약
            </button>
          )}
        </div>
      </div>

      {/* 성공 메시지 */}
      {bookingSuccess && (
        <div className="bg-emerald-600 text-white text-center py-2.5 text-sm font-medium">
          ✅ {bookingSuccess}
        </div>
      )}

      {/* 본문 */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 현재/다음 예약 */}
          {current && (
            <div className="bg-red-900/30 border border-red-700 rounded-2xl p-4 sm:p-5">
              <p className="text-red-300 text-xs font-bold uppercase mb-2">현재 사용 중</p>
              <p className="text-white font-bold text-lg sm:text-xl truncate">{current.title}</p>
              <p className="text-red-300 text-sm mt-1">{formatTime(new Date(current.startTime))} ~ {formatTime(new Date(current.endTime))}</p>
              <p className="text-slate-400 text-xs mt-1">{current.user?.name} {current.user?.department?.name ? `· ${current.user.department.name}` : ''}</p>
            </div>
          )}
          {next && (
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-4">
              <p className="text-amber-300 text-xs font-bold uppercase mb-1.5">다음 예약</p>
              <p className="text-white font-semibold truncate">{next.title}</p>
              <p className="text-amber-300 text-sm">{formatTime(new Date(next.startTime))} ~ {formatTime(new Date(next.endTime))}</p>
            </div>
          )}

          {/* 오늘 전체 스케줄 */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 sm:p-5">
            <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <i className="fas fa-calendar-day text-blue-400"></i>오늘 예약 현황
            </h2>
            {bookings.filter(b => b.status !== 'cancelled').length === 0 ? (
              <div className="text-slate-500 text-center py-8">오늘 예약이 없습니다</div>
            ) : (
              <div className="space-y-2">
                {bookings.filter(b => b.status !== 'cancelled')
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map(b => {
                    const isNow = new Date(b.startTime) <= currentTime && new Date(b.endTime) > currentTime
                    return (
                      <div key={b.id} className={`flex items-center gap-3 p-3 rounded-xl ${isNow ? 'bg-red-900/30 border border-red-700/50' : 'bg-slate-700/30'}`}>
                        <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${isNow ? 'bg-red-400 animate-pulse' : 'bg-slate-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{b.title}</p>
                          <p className="text-slate-400 text-xs">{b.user?.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white text-sm whitespace-nowrap">{formatTime(new Date(b.startTime))}~{formatTime(new Date(b.endTime))}</p>
                          {isNow && <p className="text-red-400 text-xs font-bold">진행중</p>}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-3">
            <a href="/booking"
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-center py-3 rounded-xl text-sm font-medium transition-colors">
              <i className="fas fa-calendar-alt mr-1.5"></i>전체 예약 현황
            </a>
            <a href="/tablet"
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-center py-3 rounded-xl text-sm font-medium transition-colors">
              <i className="fas fa-th-large mr-1.5"></i>전체 회의실
            </a>
          </div>
        </div>
      </main>

      {/* 즉시 예약 모달 */}
      {showQuickBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-6">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fas fa-bolt text-yellow-400"></i>즉시 예약 — {room.name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">회의명</label>
                <input value={quickForm.title} onChange={e => setQuickForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="회의명 입력"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">사용 시간</label>
                <div className="grid grid-cols-4 gap-2">
                  {['30', '60', '90', '120'].map(d => (
                    <button key={d} onClick={() => setQuickForm(f => ({ ...f, duration: d }))}
                      className={`py-3 rounded-xl text-sm font-bold transition-colors ${
                        quickForm.duration === d ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}>
                      {d}분
                    </button>
                  ))}
                </div>
              </div>
              {bookingError && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
                  {bookingError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowQuickBooking(false); setBookingError('') }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors">
                취소
              </button>
              <button onClick={handleQuickBooking}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-colors">
                <i className="fas fa-check mr-1.5"></i>예약 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
