'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

type Step = 'setup' | 'recording' | 'processing' | 'send-confirm' | 'done' | 'error'

interface Room { id: string; name: string; location: string | null }
interface User { id: string; name: string; email: string; position: string | null; department: { name: string } | null }
interface StatusData { id: string; status: string; emailSent: number; emailFailed: number }

const STATUS_STEPS: Record<string, { label: string; progress: number }> = {
  uploaded:        { label: '파일 업로드 완료', progress: 20 },
  transcribing:    { label: '음성 텍스트 변환 중...', progress: 40 },
  transcribed:     { label: '전사 완료', progress: 55 },
  summarizing:     { label: 'AI 요약 생성 중...', progress: 70 },
  summarized:      { label: '요약 완료', progress: 80 },
  excel_generated: { label: '엑셀 파일 생성 완료', progress: 90 },
  emailed:         { label: '메일 발송 완료!', progress: 100 },
  failed:          { label: '처리 실패', progress: 0 },
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function MeetingPage() {
  const [step, setStep] = useState<Step>('setup')
  const [rooms, setRooms] = useState<Room[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [meetingTitle, setMeetingTitle] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [meetingId, setMeetingId] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseCount, setPauseCount] = useState(0)
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)
  const [consentText, setConsentText] = useState('본 회의는 회의록 작성을 위해 자동으로 녹음됩니다.\n녹음에 동의하면 회의를 시작할 수 있습니다.')

  // 종료 후 발송자 관리
  const [sendUserIds, setSendUserIds] = useState<Set<string>>(new Set())
  const [sendUserSearch, setSendUserSearch] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [extraEmails, setExtraEmails] = useState('')  // 외부 이메일 추가

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true
    const q = userSearch.toLowerCase()
    return u.name.includes(q) || u.email.includes(q) || u.department?.name?.includes(q)
  })

  const filteredSendUsers = users.filter(u => {
    if (!sendUserSearch) return true
    const q = sendUserSearch.toLowerCase()
    return u.name.includes(q) || u.email.includes(q) || u.department?.name?.includes(q)
  })

  useEffect(() => {
    fetch('/api/meeting/rooms').then(r => r.json()).then(setRooms)
    fetch('/api/meeting/users').then(r => r.json()).then(setUsers)
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (data.recordingConsent) setConsentText(data.recordingConsent)
    }).catch(() => {})
  }, [])

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n })
  }
  const toggleSendUser = (userId: string) => {
    setSendUserIds(prev => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n })
  }
  const selectAll = () => setSelectedUserIds(new Set(filteredUsers.map(u => u.id)))
  const clearAll = () => setSelectedUserIds(new Set())

  // 타이머
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRecordingTime(t => t + 1)
    }, 1000)
  }, [])
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  // 회의 시작
  const handleStart = async () => {
    if (!selectedRoom) { setError('회의실을 선택하세요.'); return }
    if (selectedUserIds.size === 0) { setError('참석자를 1명 이상 선택하세요.'); return }
    if (!consent) { setError('녹음 동의가 필요합니다.'); return }
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      const res = await fetch('/api/meeting/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle || `${selectedRoom.name} 회의 ${new Date().toLocaleDateString('ko-KR')}`,
          roomId: selectedRoom.id,
          attendeeIds: [...selectedUserIds],
        }),
      })
      if (!res.ok) { const err = await res.json(); setError(err.error || '회의 시작 실패'); stream.getTracks().forEach(t => t.stop()); return }
      const data = await res.json()
      setMeetingId(data.id)

      audioChunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start(1000)
      mediaRecorderRef.current = mr

      setRecordingTime(0)
      setIsPaused(false)
      setPauseCount(0)
      startTimer()
      setStep('recording')
    } catch (e) {
      setError('마이크 접근 권한이 필요합니다. 브라우저 설정을 확인하세요.')
      console.error(e)
    }
  }

  // 일시정지 / 재개
  const handlePause = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (isPaused) {
      // 재개
      mr.resume()
      startTimer()
      setIsPaused(false)
    } else {
      // 일시정지
      mr.pause()
      stopTimer()
      setIsPaused(true)
      setPauseCount(c => c + 1)
    }
  }

  // 녹음 종료 → 발송자 선택 화면
  const handleStop = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    stopTimer()

    mr.onstop = () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      // 초기 발송자 = 참석자와 동일하게 설정
      setSendUserIds(new Set(selectedUserIds))
      setSendUserSearch('')
      setExtraEmails('')
      setStep('send-confirm')
    }
    if (mr.state !== 'inactive') mr.stop()
  }

  // 발송자 확정 후 업로드 처리
  const handleConfirmSend = async () => {
    setSendLoading(true)
    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('meetingId', meetingId!)
      // 발송 대상 유저 IDs
      formData.append('sendUserIds', JSON.stringify([...sendUserIds]))
      // 외부 추가 이메일
      const extras = extraEmails.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes('@'))
      if (extras.length > 0) formData.append('extraEmails', JSON.stringify(extras))

      const res = await fetch('/api/meeting/upload', { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json(); setError(err.error || '업로드 실패'); setStep('error'); return }

      setStep('processing')
      startPolling()
    } catch (e) {
      setError('업로드 실패: ' + String(e))
      setStep('error')
    } finally {
      setSendLoading(false)
    }
  }

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      if (!meetingId) return
      try {
        const res = await fetch(`/api/meeting/status/${meetingId}`)
        const data = await res.json()
        setStatusData(data)
        if (data.status === 'emailed' || data.status === 'failed') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setStep(data.status === 'emailed' ? 'done' : 'error')
        }
      } catch { /* ignore */ }
    }, 3000)
  }, [meetingId])

  useEffect(() => () => {
    stopTimer()
    if (pollRef.current) clearInterval(pollRef.current)
  }, [stopTimer])

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Image src="/wonjin-logo.png" alt="WONJIN" width={100} height={28} style={{ objectFit: 'contain', height: '26px', width: 'auto' }} priority />
          <span className="text-gray-300 hidden sm:block">|</span>
          <span className="text-gray-700 font-bold text-sm hidden sm:block">🎙️ 회의 녹음</span>
        </div>
        <div className="flex items-center gap-2">
          {step === 'setup' && (
            <button onClick={() => window.location.href = '/home'}
              className="text-xs text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              ← 메인
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">

        {/* ─── 설정 단계 ─── */}
        {step === 'setup' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-gray-800">회의 시작</h1>
              <p className="text-gray-400 text-sm mt-1">회의실과 참석자를 선택하고 녹음을 시작하세요</p>
            </div>

            {/* 회의실 선택 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">🏢 회의실 선택</h2>
              <div className="grid grid-cols-2 gap-2">
                {rooms.map(room => (
                  <button key={room.id} onClick={() => setSelectedRoom(room)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedRoom?.id === room.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-blue-300 bg-white'
                    }`}>
                    <div className="font-medium text-sm text-gray-800">{room.name}</div>
                    {room.location && <div className="text-xs text-gray-400 mt-0.5">{room.location}</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* 회의명 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">📝 회의명 (선택)</h2>
              <input
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
                placeholder={selectedRoom ? `${selectedRoom.name} 회의 ${new Date().toLocaleDateString('ko-KR')}` : '자동 생성됩니다'}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 참석자 선택 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700 text-sm">👥 참석자 선택</h2>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">전체선택</button>
                  <span className="text-gray-200">|</span>
                  <button onClick={clearAll} className="text-xs text-gray-400 hover:underline">초기화</button>
                </div>
              </div>
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="이름, 부서 검색..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="max-h-52 overflow-y-auto space-y-1">
                {filteredUsers.map(user => (
                  <label key={user.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    selectedUserIds.has(user.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}>
                    <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => toggleUser(user.id)}
                      className="w-4 h-4 text-blue-600 rounded" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-gray-800">{user.name}</span>
                      {user.department && <span className="text-xs text-gray-400 ml-1.5">{user.department.name}</span>}
                      {user.position && <span className="text-xs text-gray-400 ml-1">{user.position}</span>}
                    </div>
                    <span className="text-xs text-gray-300 truncate max-w-[100px]">{user.email}</span>
                  </label>
                ))}
              </div>
              {selectedUserIds.size > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-blue-600 font-medium">
                  {selectedUserIds.size}명 선택됨
                </div>
              )}
            </div>

            {/* 녹음 동의 */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h2 className="font-semibold text-amber-800 mb-2 text-sm">⚠️ 녹음 동의</h2>
              <p className="text-amber-700 text-sm whitespace-pre-line mb-3">{consentText}</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded" />
                <span className="text-amber-800 font-medium text-sm">녹음에 동의합니다</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>
            )}

            <button onClick={handleStart}
              disabled={!selectedRoom || selectedUserIds.size === 0 || !consent}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-colors text-base shadow-sm">
              🎙️ 회의 시작 및 녹음
            </button>
          </div>
        )}

        {/* ─── 녹음 단계 ─── */}
        {step === 'recording' && (
          <div className="space-y-5">
            <div className="text-center py-6">
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl shadow-2xl transition-all duration-300 ${
                isPaused
                  ? 'bg-amber-100 border-4 border-amber-300'
                  : 'bg-red-100 border-4 border-red-400 animate-pulse'
              }`}>
                {isPaused ? '⏸️' : '🎙️'}
              </div>
              <div className="text-5xl font-mono font-bold text-gray-800 mb-2 tracking-tight">
                {formatTime(recordingTime)}
              </div>
              <div className={`text-sm font-medium ${isPaused ? 'text-amber-600' : 'text-red-500'}`}>
                {isPaused ? '⏸ 일시정지됨' : '● 녹음 중'}
              </div>
              {pauseCount > 0 && (
                <div className="text-xs text-gray-400 mt-1">일시정지 {pauseCount}회</div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs text-gray-500 mb-2 font-medium">📋 현재 회의</div>
              <div className="font-semibold text-gray-800">{meetingTitle || `${selectedRoom?.name} 회의`}</div>
              <div className="text-sm text-gray-400 mt-0.5">
                {selectedRoom?.name} · 참석자 {selectedUserIds.size}명
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 일시정지 / 재개 버튼 */}
              <button onClick={handlePause}
                className={`py-4 rounded-2xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 ${
                  isPaused
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-white'
                }`}>
                {isPaused ? (
                  <><span>▶</span><span>재개</span></>
                ) : (
                  <><span>⏸</span><span>일시정지</span></>
                )}
              </button>

              {/* 종료 버튼 */}
              <button onClick={handleStop}
                className="py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-base transition-colors shadow-sm flex items-center justify-center gap-2">
                <span>⏹</span><span>녹음 종료</span>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600">
              💡 일시정지 후 재개하면 녹음이 이어집니다. 종료 시 발송자를 확인할 수 있습니다.
            </div>
          </div>
        )}

        {/* ─── 발송자 확인 단계 (종료 후) ─── */}
        {step === 'send-confirm' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-gray-800">📤 메일 발송 설정</h1>
              <p className="text-gray-400 text-sm mt-1">회의록을 받을 대상을 확인하고 수정하세요</p>
            </div>

            {/* 녹음 요약 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{meetingTitle || `${selectedRoom?.name} 회의`}</div>
                  <div className="text-xs text-gray-400 mt-0.5">녹음시간 {formatTime(recordingTime)} · 일시정지 {pauseCount}회</div>
                </div>
                <div className="text-3xl">🎙️</div>
              </div>
            </div>

            {/* 발송 대상 선택 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700 text-sm">
                  📧 메일 발송 대상
                  <span className="ml-2 text-blue-600 font-bold">{sendUserIds.size}명</span>
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSendUserIds(new Set(users.map(u => u.id)))}
                    className="text-xs text-blue-600 hover:underline">전체</button>
                  <span className="text-gray-200">|</span>
                  <button
                    onClick={() => setSendUserIds(new Set())}
                    className="text-xs text-gray-400 hover:underline">초기화</button>
                </div>
              </div>

              <input
                value={sendUserSearch}
                onChange={e => setSendUserSearch(e.target.value)}
                placeholder="이름, 부서 검색..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="max-h-52 overflow-y-auto space-y-1">
                {filteredSendUsers.map(user => (
                  <label key={user.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    sendUserIds.has(user.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}>
                    <input type="checkbox" checked={sendUserIds.has(user.id)} onChange={() => toggleSendUser(user.id)}
                      className="w-4 h-4 text-blue-600 rounded" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-gray-800">{user.name}</span>
                      {user.department && <span className="text-xs text-gray-400 ml-1.5">{user.department.name}</span>}
                      {/* 참석자 뱃지 */}
                      {selectedUserIds.has(user.id) && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full ml-1.5">참석</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 truncate max-w-[100px]">{user.email}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 외부 이메일 추가 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 text-sm mb-2">✉️ 외부 이메일 추가 (선택)</h2>
              <textarea
                value={extraEmails}
                onChange={e => setExtraEmails(e.target.value)}
                placeholder="외부 수신자 이메일 입력&#10;쉼표·줄바꿈으로 여러 개 입력 가능&#10;예: kim@partner.com, lee@external.co.kr"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 발송 대상 없을 때 안내 */}
            {sendUserIds.size === 0 && extraEmails.trim() === '' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                ⚠️ 발송 대상이 없으면 메일이 발송되지 않습니다.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  // 취소하고 처음으로
                  if (confirm('녹음을 취소하고 처음으로 돌아갈까요?')) {
                    setStep('setup')
                    audioChunksRef.current = []
                  }
                }}
                className="py-3.5 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-50 transition-colors">
                ✗ 취소
              </button>
              <button onClick={handleConfirmSend} disabled={sendLoading}
                className="py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl text-sm transition-colors">
                {sendLoading ? '업로드 중...' : '📤 회의록 처리 시작'}
              </button>
            </div>
          </div>
        )}

        {/* ─── 처리 중 단계 ─── */}
        {step === 'processing' && (
          <div className="space-y-5">
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-4xl mx-auto mb-4 animate-pulse">
                ⚙️
              </div>
              <h1 className="text-xl font-bold text-gray-800 mb-1">처리 중</h1>
              <p className="text-gray-400 text-sm">회의록을 자동으로 생성하고 있습니다</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {statusData && STATUS_STEPS[statusData.status] && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {STATUS_STEPS[statusData.status].label}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {STATUS_STEPS[statusData.status].progress}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${STATUS_STEPS[statusData.status].progress}%` }}
                    />
                  </div>
                </>
              )}
              {!statusData && (
                <div className="flex items-center gap-3 text-gray-500 text-sm">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  업로드 중...
                </div>
              )}
            </div>

            <div className="space-y-2">
              {Object.entries(STATUS_STEPS).filter(([k]) => k !== 'failed').map(([key, val]) => {
                const current = statusData?.status
                const currentProgress = current ? (STATUS_STEPS[current]?.progress || 0) : 0
                const done = val.progress < currentProgress
                const active = key === current
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${
                    active ? 'bg-blue-50' : done ? 'opacity-60' : 'opacity-30'
                  }`}>
                    <span>{done ? '✅' : active ? '⏳' : '○'}</span>
                    <span className={active ? 'text-blue-700 font-medium' : 'text-gray-600'}>{val.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── 완료 단계 ─── */}
        {step === 'done' && (
          <div className="space-y-5 text-center py-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl mx-auto mb-4">
              ✅
            </div>
            <h1 className="text-2xl font-bold text-gray-800">완료!</h1>
            <p className="text-gray-400">회의록이 자동 생성되어 발송되었습니다</p>

            {statusData && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-left">
                <div className="text-sm text-green-700">
                  <div>✉️ 발송 성공: <strong>{statusData.emailSent}건</strong></div>
                  {statusData.emailFailed > 0 && (
                    <div className="text-red-600 mt-1">⚠️ 발송 실패: {statusData.emailFailed}건</div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => window.location.href = '/home'}
                className="py-3.5 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-50">
                🏠 메인으로
              </button>
              <button onClick={() => window.location.reload()}
                className="py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm">
                🎙️ 새 회의 시작
              </button>
            </div>
          </div>
        )}

        {/* ─── 오류 단계 ─── */}
        {step === 'error' && (
          <div className="space-y-5 text-center py-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-4xl mx-auto mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800">처리 오류</h1>
            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => window.location.href = '/home'}
                className="py-3.5 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-50">
                메인으로
              </button>
              <button onClick={() => window.location.reload()}
                className="py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm">
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
