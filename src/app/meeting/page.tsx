'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Step = 'setup' | 'mic-test' | 'recording' | 'processing' | 'send-confirm' | 'done' | 'error'

interface Room { id: string; name: string; location: string | null }
interface User { id: string; name: string; email: string; position: string | null; department: { name: string } | null }
interface StatusData {
  id: string
  status: string
  emailSent: number
  emailFailed: number
  summaryData?: SummaryData | null
  transcriptText?: string | null
}

interface ActionItem {
  assignee: string
  task: string
  dueDate?: string | null
  status: string
}

interface SummaryData {
  meetingTitle: string
  dateTime: string
  roomName: string
  mainContent: string
  decisions: string[]
  actionItems: ActionItem[]
  pendingIssues: string[]
  nextSteps: string[]
}

const STATUS_STEPS: Record<string, { label: string; progress: number; icon: string }> = {
  uploaded:        { label: '파일 업로드 완료',      progress: 20,  icon: 'fa-cloud-upload-alt' },
  transcribing:    { label: '음성 텍스트 변환 중...', progress: 40,  icon: 'fa-wave-square' },
  transcribed:     { label: '전사 완료',             progress: 55,  icon: 'fa-check' },
  summarizing:     { label: 'AI 요약 생성 중...',    progress: 70,  icon: 'fa-robot' },
  summarized:      { label: '요약 완료',             progress: 80,  icon: 'fa-check' },
  excel_generated: { label: '엑셀 파일 생성',        progress: 90,  icon: 'fa-file-excel' },
  emailed:         { label: '메일 발송 완료!',       progress: 100, icon: 'fa-envelope-open-text' },
  failed:          { label: '처리 실패',             progress: 0,   icon: 'fa-exclamation-triangle' },
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/* ─── 로고 팔레트 ───
   #2e4f9f  corporate blue (primary)
   #f1c218  gold accent
   #3c3c3c  dark gray text
   white / light gray backgrounds
*/

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

  // 마이크 테스트
  const [micTestLevel, setMicTestLevel] = useState(0)
  const [micTestStatus, setMicTestStatus] = useState<'idle'|'testing'|'ok'|'error'>('idle')
  const [micTestStream, setMicTestStream] = useState<MediaStream | null>(null)
  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const micAnimFrameRef = useRef<number>(0)
  const [volumeHistory, setVolumeHistory] = useState<number[]>(Array(30).fill(0))

  // 발송 관련
  const [sendUserIds, setSendUserIds] = useState<Set<string>>(new Set())
  const [sendUserSearch, setSendUserSearch] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [extraEmails, setExtraEmails] = useState('')

  // 회의결과 확인
  const [showResult, setShowResult] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

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

  // 마이크 테스트 시작
  const startMicTest = async () => {
    setMicTestStatus('testing'); setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      setMicTestStream(stream)
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      micAnalyserRef.current = analyser
      const dataArr = new Uint8Array(analyser.frequencyBinCount)
      let histBuf: number[] = Array(30).fill(0)
      const draw = () => {
        analyser.getByteFrequencyData(dataArr)
        const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length
        const level = Math.min(100, Math.round(avg * 2.5))
        setMicTestLevel(level)
        histBuf = [...histBuf.slice(1), level]
        setVolumeHistory([...histBuf])
        micAnimFrameRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch {
      setMicTestStatus('error')
      setError('마이크 접근 권한이 없습니다. 브라우저 설정에서 마이크를 허용해 주세요.')
    }
  }

  const stopMicTest = () => {
    cancelAnimationFrame(micAnimFrameRef.current)
    micTestStream?.getTracks().forEach(t => t.stop())
    setMicTestStream(null); setMicTestLevel(0)
    setVolumeHistory(Array(30).fill(0)); setMicTestStatus('ok')
  }

  useEffect(() => () => {
    cancelAnimationFrame(micAnimFrameRef.current)
    micTestStream?.getTracks().forEach(t => t.stop())
  }, [micTestStream])

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n })
  }
  const toggleSendUser = (userId: string) => {
    setSendUserIds(prev => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n })
  }
  const selectAll = () => setSelectedUserIds(new Set(filteredUsers.map(u => u.id)))
  const clearAll = () => setSelectedUserIds(new Set())

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  }, [])
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

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
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      })
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start(1000)
      mediaRecorderRef.current = mr
      setRecordingTime(0); setIsPaused(false); setPauseCount(0)
      startTimer(); setStep('recording')
    } catch (e) {
      setError('마이크 접근 권한이 필요합니다. 브라우저 설정을 확인하세요.')
      console.error(e)
    }
  }

  const handlePause = () => {
    const mr = mediaRecorderRef.current; if (!mr) return
    if (isPaused) { mr.resume(); startTimer(); setIsPaused(false) }
    else { mr.pause(); stopTimer(); setIsPaused(true); setPauseCount(c => c + 1) }
  }

  const handleStop = () => {
    const mr = mediaRecorderRef.current; if (!mr) return
    stopTimer()
    mr.onstop = () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      setSendUserIds(new Set(selectedUserIds)); setSendUserSearch(''); setExtraEmails('')
      setStep('send-confirm')
    }
    if (mr.state !== 'inactive') mr.stop()
  }

  const handleConfirmSend = async () => {
    setSendLoading(true)
    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('meetingId', meetingId!)
      formData.append('sendUserIds', JSON.stringify([...sendUserIds]))
      const extras = extraEmails.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes('@'))
      if (extras.length > 0) formData.append('extraEmails', JSON.stringify(extras))
      const res = await fetch('/api/meeting/upload', { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json(); setError(err.error || '업로드 실패'); setStep('error'); return }
      setStep('processing'); startPolling()
    } catch (e) { setError('업로드 실패: ' + String(e)); setStep('error') }
    finally { setSendLoading(false) }
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
          clearInterval(pollRef.current!); pollRef.current = null
          setStep(data.status === 'emailed' ? 'done' : 'error')
        }
      } catch { /* ignore */ }
    }, 3000)
  }, [meetingId])

  useEffect(() => () => { stopTimer(); if (pollRef.current) clearInterval(pollRef.current) }, [stopTimer])

  const resetAll = () => {
    setStep('setup'); setMeetingTitle(''); setSelectedRoom(null)
    setSelectedUserIds(new Set()); setConsent(false)
    setRecordingTime(0); setIsPaused(false); setPauseCount(0)
    setMeetingId(null); setStatusData(null); setError('')
    setMicTestStatus('idle'); setShowResult(false); setShowTranscript(false)
    audioChunksRef.current = []
  }

  const summary = statusData?.summaryData

  // ── RENDER ──
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #e8eeff 50%, #f5f7ff 100%)' }}>

      {/* 헤더 */}
      <header className="sticky top-0 z-30 border-b border-gray-200 shadow-sm" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
            <i className="fas fa-microphone text-white text-xs"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm" style={{ color: '#3c3c3c' }}>회의 녹음</h1>
            <p className="text-xs text-gray-400">음성 전사 · AI 요약 · 자동 메일</p>
          </div>
          {/* 스텝 인디케이터 */}
          <div className="hidden sm:flex items-center gap-1">
            {(['setup','recording','send-confirm','processing','done'] as Step[]).map((s, i) => (
              <div key={s} className={`h-2 rounded-full transition-all ${
                step === s ? 'w-6' :
                i < ['setup','mic-test','recording','send-confirm','processing','done'].indexOf(step)
                  ? 'w-2 opacity-50' : 'w-2 opacity-20'
              }`} style={{ background: '#2e4f9f' }}></div>
            ))}
          </div>
          {step === 'setup' && (
            <a href="/home" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              <i className="fas fa-home text-sm"></i>
            </a>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ─── 설정 단계 ─── */}
        {step === 'setup' && (
          <div className="space-y-4">
            <div className="mb-2">
              <h2 className="text-xl font-black" style={{ color: '#3c3c3c' }}>회의 시작</h2>
              <p className="text-gray-400 text-sm mt-1">회의실과 참석자를 선택하고 녹음을 시작하세요</p>
            </div>

            {/* 마이크 테스트 배너 */}
            <div className="rounded-2xl p-4 flex items-center gap-4 shadow-md"
              style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <i className="fas fa-microphone text-white"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">마이크 테스트</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>녹음 전 마이크가 제대로 작동하는지 확인하세요</p>
              </div>
              <button onClick={() => setStep('mic-test')}
                className="flex-shrink-0 font-bold text-xs px-4 py-2 rounded-xl transition-all hover:opacity-90"
                style={{ background: '#f1c218', color: '#3c3c3c' }}>
                테스트
              </button>
            </div>

            {/* 회의실 선택 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#3c3c3c' }}>
                <i className="fas fa-door-open" style={{ color: '#2e4f9f' }}></i> 회의실 선택
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {rooms.map(room => (
                  <button key={room.id} onClick={() => setSelectedRoom(room)}
                    className="p-3 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: selectedRoom?.id === room.id ? '#2e4f9f' : '#e5e7eb',
                      background: selectedRoom?.id === room.id ? '#eef2ff' : '#f9fafb',
                    }}>
                    <div className="font-bold text-sm" style={{ color: '#3c3c3c' }}>{room.name}</div>
                    {room.location && <div className="text-xs text-gray-400 mt-0.5">{room.location}</div>}
                    {selectedRoom?.id === room.id && (
                      <div className="mt-1"><span className="text-xs font-semibold" style={{ color: '#2e4f9f' }}>✓ 선택됨</span></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 회의명 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#3c3c3c' }}>
                <i className="fas fa-pen" style={{ color: '#2e4f9f' }}></i> 회의명 <span className="text-gray-300 font-normal">(선택)</span>
              </h3>
              <input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)}
                placeholder={selectedRoom ? `${selectedRoom.name} 회의 ${new Date().toLocaleDateString('ko-KR')}` : '자동 생성됩니다'}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none bg-gray-50 transition-all"
                style={{ '--tw-ring-color': '#2e4f9f' } as React.CSSProperties}
                onFocus={e => { e.target.style.borderColor = '#2e4f9f'; e.target.style.boxShadow = '0 0 0 2px rgba(46,79,159,0.15)' }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} />
            </div>

            {/* 참석자 선택 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: '#3c3c3c' }}>
                  <i className="fas fa-users" style={{ color: '#2e4f9f' }}></i> 참석자 선택
                  {selectedUserIds.size > 0 && (
                    <span className="text-xs text-white px-2 py-0.5 rounded-full" style={{ background: '#2e4f9f' }}>{selectedUserIds.size}명</span>
                  )}
                </h3>
                <div className="flex gap-2 text-xs">
                  <button onClick={selectAll} className="font-semibold" style={{ color: '#2e4f9f' }}>전체선택</button>
                  <span className="text-gray-200">|</span>
                  <button onClick={clearAll} className="text-gray-400 hover:text-gray-600">초기화</button>
                </div>
              </div>
              <div className="relative mb-3">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="이름, 부서 검색..."
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none" />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {filteredUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                    style={{ background: selectedUserIds.has(user.id) ? '#eef2ff' : 'transparent' }}>
                    <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => toggleUser(user.id)}
                      className="w-4 h-4 rounded" style={{ accentColor: '#2e4f9f' }} />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm" style={{ color: '#3c3c3c' }}>{user.name}</span>
                      {user.department && <span className="text-xs text-gray-400 ml-1.5">{user.department.name}</span>}
                      {user.position && <span className="text-xs text-gray-300 ml-1">{user.position}</span>}
                    </div>
                    <span className="text-xs text-gray-300 truncate max-w-[100px]">{user.email}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 녹음 동의 */}
            <div className="rounded-2xl p-5 border" style={{ background: '#fffbea', borderColor: '#f1c218' }}>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: '#92700a' }}>
                <i className="fas fa-shield-alt" style={{ color: '#c69e0a' }}></i> 녹음 동의
              </h3>
              <p className="text-sm whitespace-pre-line mb-3 leading-relaxed" style={{ color: '#a07c10' }}>{consentText}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  className="w-4 h-4 rounded" style={{ accentColor: '#c69e0a' }} />
                <span className="font-semibold text-sm" style={{ color: '#7a5f08' }}>녹음에 동의합니다</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <button onClick={handleStart}
              disabled={!selectedRoom || selectedUserIds.size === 0 || !consent}
              className="w-full py-4 text-white font-black rounded-2xl text-base shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
              <i className="fas fa-microphone mr-2"></i>회의 시작 및 녹음
            </button>
          </div>
        )}

        {/* ─── 마이크 테스트 단계 ─── */}
        {step === 'mic-test' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black" style={{ color: '#3c3c3c' }}>마이크 테스트</h2>
              <p className="text-gray-400 text-sm mt-1">녹음 전 마이크가 제대로 작동하는지 확인하세요</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
              <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center transition-all duration-300`}
                style={{
                  background: micTestStatus === 'testing' ? '#eef2ff' : micTestStatus === 'ok' ? '#ecfdf5' : micTestStatus === 'error' ? '#fef2f2' : '#f9fafb',
                  border: `4px solid ${micTestStatus === 'testing' ? '#2e4f9f' : micTestStatus === 'ok' ? '#10b981' : micTestStatus === 'error' ? '#ef4444' : '#e5e7eb'}`,
                  boxShadow: micTestStatus === 'testing' ? '0 8px 24px rgba(46,79,159,0.2)' : 'none',
                }}>
                <i className={`fas text-4xl ${
                  micTestStatus === 'testing' ? 'fa-microphone animate-pulse' :
                  micTestStatus === 'ok' ? 'fa-check-circle' :
                  micTestStatus === 'error' ? 'fa-microphone-slash' : 'fa-microphone'
                }`} style={{
                  color: micTestStatus === 'testing' ? '#2e4f9f' : micTestStatus === 'ok' ? '#10b981' : micTestStatus === 'error' ? '#ef4444' : '#d1d5db'
                }}></i>
              </div>

              {micTestStatus === 'testing' && (
                <div className="mb-5">
                  <p className="text-sm text-gray-500 mb-3">마이크에 대고 말을 해보세요</p>
                  <div className="flex items-end justify-center gap-0.5 h-12 mb-3">
                    {volumeHistory.map((v, i) => (
                      <div key={i} className="w-1.5 rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.max(4, v * 0.48)}px`,
                          background: `hsl(${220 - v * 0.3}, 70%, ${45 + v * 0.1}%)`,
                          opacity: 0.3 + (i / 30) * 0.7,
                        }}></div>
                    ))}
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${micTestLevel}%`,
                        background: micTestLevel > 70 ? 'linear-gradient(to right, #10b981, #34d399)' :
                                   micTestLevel > 30 ? `linear-gradient(to right, #2e4f9f, #4f6ef7)` :
                                   'linear-gradient(to right, #94a3b8, #cbd5e1)'
                      }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-300 mt-1.5">
                    <span>조용함</span>
                    <span className="font-bold" style={{ color: micTestLevel > 30 ? '#2e4f9f' : '#d1d5db' }}>
                      {micTestLevel > 70 ? '🎤 잘 들립니다!' : micTestLevel > 30 ? '입력 감지 중' : '말해보세요...'}
                    </span>
                    <span>충분함</span>
                  </div>
                </div>
              )}

              {micTestStatus === 'ok' && (
                <div className="mb-5">
                  <p className="font-bold text-lg" style={{ color: '#10b981' }}>마이크 정상 작동!</p>
                  <p className="text-gray-400 text-sm mt-1">녹음을 시작해도 좋습니다</p>
                </div>
              )}
              {micTestStatus === 'error' && (
                <div className="mb-5">
                  <p className="text-red-600 font-bold">마이크 접근 실패</p>
                  <p className="text-gray-400 text-sm mt-1">브라우저 설정에서 마이크 권한을 허용해 주세요</p>
                </div>
              )}
              {micTestStatus === 'idle' && (
                <div className="mb-5">
                  <p className="font-bold" style={{ color: '#3c3c3c' }}>마이크 테스트 준비</p>
                  <p className="text-gray-300 text-sm mt-1">버튼을 눌러 테스트를 시작하세요</p>
                </div>
              )}

              {micTestStatus === 'idle' && (
                <button onClick={startMicTest}
                  className="w-full py-3.5 text-white font-bold rounded-2xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
                  <i className="fas fa-microphone mr-2"></i>테스트 시작
                </button>
              )}
              {micTestStatus === 'testing' && (
                <button onClick={stopMicTest}
                  className="w-full py-3.5 text-white font-bold rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <i className="fas fa-check mr-2"></i>테스트 완료
                </button>
              )}
              {(micTestStatus === 'ok' || micTestStatus === 'error') && (
                <div className="flex gap-3">
                  <button onClick={() => setMicTestStatus('idle')}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl text-sm hover:bg-gray-50">
                    다시 테스트
                  </button>
                  <button onClick={() => setStep('setup')}
                    className="flex-1 py-3 text-white font-bold rounded-2xl text-sm"
                    style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
                    설정으로 돌아가기
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4 text-sm border" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
              <p className="font-bold mb-2 flex items-center gap-2" style={{ color: '#2e4f9f' }}>
                <i className="fas fa-lightbulb"></i> 마이크 설정 팁
              </p>
              <ul className="space-y-1 text-xs list-disc list-inside" style={{ color: '#3c5bbf' }}>
                <li>레벨 바가 30% 이상 올라오면 정상입니다</li>
                <li>브라우저 팝업에서 &apos;허용&apos;을 클릭하세요</li>
                <li>크롬/엣지: 주소창 왼쪽 자물쇠 → 마이크 허용</li>
                <li>마이크가 여러 개라면 시스템 기본 마이크를 확인하세요</li>
              </ul>
            </div>

            <button onClick={() => setStep('setup')}
              className="w-full py-3 border border-gray-200 text-gray-500 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-all">
              ← 설정 화면으로
            </button>
          </div>
        )}

        {/* ─── 녹음 단계 ─── */}
        {step === 'recording' && (
          <div className="space-y-5">
            <div className="rounded-3xl p-8 text-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #2e4f9f 0%, #1a3a7a 100%)', boxShadow: '0 20px 60px rgba(46,79,159,0.3)' }}>
              <div className="w-28 h-28 rounded-full mx-auto mb-5 flex items-center justify-center transition-all duration-300"
                style={{
                  background: isPaused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)',
                  border: `4px solid ${isPaused ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)'}`,
                  boxShadow: isPaused ? 'none' : '0 0 0 0 rgba(255,255,255,0.4)',
                  animation: !isPaused ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
                }}>
                <i className={`fas text-5xl text-white ${isPaused ? 'fa-pause' : 'fa-microphone'}`}></i>
              </div>
              <div className="text-6xl font-mono font-black text-white mb-3 tracking-tight">
                {formatTime(recordingTime)}
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full"
                style={{
                  background: isPaused ? 'rgba(241,194,24,0.25)' : 'rgba(255,255,255,0.15)',
                  color: isPaused ? '#f1c218' : 'white'
                }}>
                <span className="w-2 h-2 rounded-full"
                  style={{ background: isPaused ? '#f1c218' : '#ef4444', animation: !isPaused ? 'pulse 1s infinite' : 'none' }}></span>
                {isPaused ? '일시정지' : '녹음 중'}
              </div>
              {pauseCount > 0 && <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>일시정지 {pauseCount}회</p>}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eef2ff' }}>
                  <i className="fas fa-door-open" style={{ color: '#2e4f9f' }}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: '#3c3c3c' }}>{meetingTitle || `${selectedRoom?.name} 회의`}</p>
                  <p className="text-xs text-gray-400">{selectedRoom?.name} · 참석자 {selectedUserIds.size}명</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePause}
                className="py-4 rounded-2xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 text-white"
                style={{ background: isPaused ? '#10b981' : '#f1c218', color: isPaused ? 'white' : '#3c3c3c' }}>
                <i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
                <span>{isPaused ? '재개' : '일시정지'}</span>
              </button>
              <button onClick={handleStop}
                className="py-4 text-white font-bold rounded-2xl text-base shadow-lg flex items-center justify-center gap-2"
                style={{ background: '#dc2626', boxShadow: '0 8px 20px rgba(220,38,38,0.3)' }}>
                <i className="fas fa-stop"></i> <span>녹음 종료</span>
              </button>
            </div>

            <div className="rounded-xl px-4 py-3 text-xs flex items-start gap-2 border" style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#3c5bbf' }}>
              <i className="fas fa-info-circle mt-0.5"></i>
              <span>일시정지 후 재개하면 녹음이 이어집니다. 종료 시 발송 대상을 확인할 수 있습니다.</span>
            </div>
          </div>
        )}

        {/* ─── 발송자 확인 단계 ─── */}
        {step === 'send-confirm' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black" style={{ color: '#3c3c3c' }}>메일 발송 설정</h2>
              <p className="text-gray-400 text-sm mt-1">회의록을 받을 대상을 확인하고 수정하세요</p>
            </div>

            <div className="rounded-2xl p-4 flex items-center gap-4 shadow-md"
              style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <i className="fas fa-microphone text-white text-2xl"></i>
              </div>
              <div>
                <p className="text-white font-bold">{meetingTitle || `${selectedRoom?.name} 회의`}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>녹음 {formatTime(recordingTime)} · 일시정지 {pauseCount}회</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: '#3c3c3c' }}>
                  <i className="fas fa-envelope" style={{ color: '#2e4f9f' }}></i> 메일 발송 대상
                  <span className="text-white text-xs px-2 py-0.5 rounded-full" style={{ background: '#2e4f9f' }}>{sendUserIds.size}명</span>
                </h3>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setSendUserIds(new Set(users.map(u => u.id)))} className="font-semibold" style={{ color: '#2e4f9f' }}>전체</button>
                  <span className="text-gray-200">|</span>
                  <button onClick={() => setSendUserIds(new Set())} className="text-gray-400">초기화</button>
                </div>
              </div>
              <div className="relative mb-3">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                <input value={sendUserSearch} onChange={e => setSendUserSearch(e.target.value)}
                  placeholder="이름, 부서 검색..."
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredSendUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                    style={{ background: sendUserIds.has(user.id) ? '#eef2ff' : 'transparent' }}>
                    <input type="checkbox" checked={sendUserIds.has(user.id)} onChange={() => toggleSendUser(user.id)}
                      className="w-4 h-4 rounded" style={{ accentColor: '#2e4f9f' }} />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm" style={{ color: '#3c3c3c' }}>{user.name}</span>
                      {user.department && <span className="text-xs text-gray-400 ml-1.5">{user.department.name}</span>}
                      {selectedUserIds.has(user.id) && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full ml-1.5" style={{ background: '#d1fae5', color: '#065f46' }}>참석</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 truncate max-w-[90px]">{user.email}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: '#3c3c3c' }}>
                <i className="fas fa-user-plus" style={{ color: '#2e4f9f' }}></i> 외부 이메일 추가 <span className="text-gray-300 font-normal">(선택)</span>
              </h3>
              <textarea value={extraEmails} onChange={e => setExtraEmails(e.target.value)}
                placeholder="외부 수신자 이메일 (쉼표·줄바꿈으로 구분)&#10;예: kim@partner.com, lee@external.co.kr" rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none resize-none" />
            </div>

            {sendUserIds.size === 0 && extraEmails.trim() === '' && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 border" style={{ background: '#fffbea', borderColor: '#f1c218', color: '#92700a' }}>
                <i className="fas fa-exclamation-triangle"></i>
                발송 대상이 없으면 메일이 발송되지 않습니다.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { if (confirm('녹음을 취소하고 처음으로 돌아갈까요?')) { resetAll() } }}
                className="py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-all">
                <i className="fas fa-times mr-1"></i> 취소
              </button>
              <button onClick={handleConfirmSend} disabled={sendLoading}
                className="py-3.5 text-white font-bold rounded-2xl text-sm shadow-lg disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
                {sendLoading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i>업로드 중</> : <><i className="fas fa-paper-plane mr-2"></i>회의록 처리 시작</>}
              </button>
            </div>
          </div>
        )}

        {/* ─── 처리 중 ─── */}
        {step === 'processing' && (
          <div className="space-y-5">
            <div className="rounded-3xl p-8 text-center text-white shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #2e4f9f 0%, #1a3a7a 100%)', boxShadow: '0 20px 60px rgba(46,79,159,0.3)' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <i className="fas fa-cog fa-spin text-4xl"></i>
              </div>
              <h2 className="text-2xl font-black mb-1">처리 중...</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>회의록을 자동으로 생성하고 있습니다</p>

              {statusData && STATUS_STEPS[statusData.status] && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <span>{STATUS_STEPS[statusData.status].label}</span>
                    <span className="font-bold">{STATUS_STEPS[statusData.status].progress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${STATUS_STEPS[statusData.status].progress}%`, background: '#f1c218' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              {Object.entries(STATUS_STEPS).filter(([k]) => k !== 'failed').map(([key, val]) => {
                const current = statusData?.status
                const currentProgress = current ? (STATUS_STEPS[current]?.progress || 0) : 0
                const done = val.progress < currentProgress
                const active = key === current
                return (
                  <div key={key} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm transition-all ${
                    active ? '' : done ? 'opacity-50' : 'opacity-25'
                  }`} style={{ background: active ? '#eef2ff' : 'transparent' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{
                        background: done ? '#d1fae5' : active ? '#eef2ff' : '#f3f4f6',
                        color: done ? '#059669' : active ? '#2e4f9f' : '#9ca3af',
                      }}>
                      <i className={`fas ${done ? 'fa-check' : active ? 'fa-circle-notch fa-spin' : val.icon}`}></i>
                    </div>
                    <span style={{ color: active ? '#2e4f9f' : done ? '#374151' : '#9ca3af', fontWeight: active ? 700 : 400 }}>
                      {val.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── 완료 ─── */}
        {step === 'done' && (
          <div className="space-y-5">
            {/* 완료 헤더 */}
            <div className="text-center py-6">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ background: '#d1fae5', border: '4px solid #10b981', boxShadow: '0 12px 32px rgba(16,185,129,0.2)' }}>
                <i className="fas fa-check text-4xl" style={{ color: '#059669' }}></i>
              </div>
              <h2 className="text-2xl font-black" style={{ color: '#3c3c3c' }}>처리 완료!</h2>
              <p className="text-gray-400 text-sm mt-1">회의록이 생성되어 발송되었습니다</p>
            </div>

            {/* 발송 결과 */}
            {statusData && (
              <div className="rounded-2xl p-4 border" style={{ background: '#ecfdf5', borderColor: '#6ee7b7' }}>
                <p className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: '#065f46' }}>
                  <i className="fas fa-envelope-open-text"></i> 메일 발송 결과
                </p>
                <p className="text-sm" style={{ color: '#047857' }}>발송 성공 <strong>{statusData.emailSent}건</strong></p>
                {statusData.emailFailed > 0 && (
                  <p className="text-red-500 text-sm mt-1">발송 실패 {statusData.emailFailed}건</p>
                )}
              </div>
            )}

            {/* ★ 회의 내용 확인 버튼 ★ */}
            {summary && (
              <button
                onClick={() => setShowResult(v => !v)}
                className="w-full py-4 rounded-2xl font-bold text-base transition-all shadow-md flex items-center justify-center gap-3 border-2"
                style={{
                  background: showResult ? '#2e4f9f' : 'white',
                  borderColor: '#2e4f9f',
                  color: showResult ? 'white' : '#2e4f9f',
                }}>
                <i className={`fas ${showResult ? 'fa-chevron-up' : 'fa-file-alt'}`}></i>
                {showResult ? '회의 내용 접기' : '회의 내용 확인하기'}
              </button>
            )}

            {/* ★ 회의 결과 상세 뷰 ★ */}
            {showResult && summary && (
              <div className="space-y-4 animate-fadeIn">
                {/* 회의 기본 정보 */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-black text-base mb-3 flex items-center gap-2" style={{ color: '#2e4f9f' }}>
                    <i className="fas fa-clipboard-list"></i> 회의 정보
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-3">
                      <span className="w-16 text-gray-400 flex-shrink-0">회의명</span>
                      <span className="font-semibold" style={{ color: '#3c3c3c' }}>{summary.meetingTitle}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-16 text-gray-400 flex-shrink-0">일시</span>
                      <span style={{ color: '#3c3c3c' }}>{summary.dateTime}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-16 text-gray-400 flex-shrink-0">장소</span>
                      <span style={{ color: '#3c3c3c' }}>{summary.roomName}</span>
                    </div>
                  </div>
                </div>

                {/* 주요 내용 */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-black text-base mb-3 flex items-center gap-2" style={{ color: '#2e4f9f' }}>
                    <i className="fas fa-file-alt"></i> 주요 내용
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#3c3c3c' }}>{summary.mainContent}</p>
                </div>

                {/* 결정 사항 */}
                {summary.decisions && summary.decisions.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-black text-base mb-3 flex items-center gap-2" style={{ color: '#2e4f9f' }}>
                      <i className="fas fa-gavel"></i> 결정 사항
                    </h3>
                    <ul className="space-y-2">
                      {summary.decisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5 font-bold"
                            style={{ background: '#2e4f9f' }}>{i + 1}</span>
                          <span style={{ color: '#3c3c3c' }}>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 액션 아이템 */}
                {summary.actionItems && summary.actionItems.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-black text-base mb-3 flex items-center gap-2" style={{ color: '#2e4f9f' }}>
                      <i className="fas fa-tasks"></i> 액션 아이템
                    </h3>
                    <div className="space-y-3">
                      {summary.actionItems.map((item, i) => (
                        <div key={i} className="rounded-xl p-3 border" style={{ background: '#f8faff', borderColor: '#e0e7ff' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm" style={{ color: '#3c3c3c' }}>{item.task}</p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <i className="fas fa-user text-xs"></i> {item.assignee}
                                </span>
                                {item.dueDate && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <i className="fas fa-calendar text-xs"></i> {item.dueDate}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold"
                              style={{
                                background: item.status === 'done' ? '#d1fae5' : item.status === 'in_progress' ? '#fef3c7' : '#eef2ff',
                                color: item.status === 'done' ? '#065f46' : item.status === 'in_progress' ? '#92400e' : '#3730a3',
                              }}>
                              {item.status === 'done' ? '완료' : item.status === 'in_progress' ? '진행중' : '대기'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 다음 단계 */}
                {summary.nextSteps && summary.nextSteps.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-black text-base mb-3 flex items-center gap-2" style={{ color: '#2e4f9f' }}>
                      <i className="fas fa-arrow-right"></i> 다음 단계
                    </h3>
                    <ul className="space-y-2">
                      {summary.nextSteps.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <i className="fas fa-chevron-right text-xs mt-1 flex-shrink-0" style={{ color: '#f1c218' }}></i>
                          <span style={{ color: '#3c3c3c' }}>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 미결 이슈 */}
                {summary.pendingIssues && summary.pendingIssues.length > 0 && (
                  <div className="rounded-2xl p-5 border" style={{ background: '#fffbea', borderColor: '#f1c218' }}>
                    <h3 className="font-black text-base mb-3 flex items-center gap-2" style={{ color: '#92700a' }}>
                      <i className="fas fa-exclamation-circle"></i> 미결 이슈
                    </h3>
                    <ul className="space-y-2">
                      {summary.pendingIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <i className="fas fa-dot-circle text-xs mt-1 flex-shrink-0" style={{ color: '#c69e0a' }}></i>
                          <span style={{ color: '#7a5f08' }}>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 전사 원문 토글 */}
                {statusData?.transcriptText && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setShowTranscript(v => !v)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                      <h3 className="font-black text-base flex items-center gap-2" style={{ color: '#3c3c3c' }}>
                        <i className="fas fa-file-alt text-gray-400"></i> 전사 원문
                      </h3>
                      <i className={`fas fa-chevron-${showTranscript ? 'up' : 'down'} text-gray-400 text-sm`}></i>
                    </button>
                    {showTranscript && (
                      <div className="px-5 pb-5">
                        <div className="rounded-xl p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-64 overflow-y-auto"
                          style={{ background: '#f8faff', color: '#374151', border: '1px solid #e0e7ff' }}>
                          {statusData.transcriptText}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a href="/home"
                className="py-3.5 border-2 font-semibold rounded-2xl text-sm flex items-center justify-center gap-1 transition-all hover:bg-gray-50"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                <i className="fas fa-home text-xs"></i> 홈
              </a>
              <button onClick={resetAll}
                className="py-3.5 text-white font-bold rounded-2xl text-sm shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
                새 회의 시작
              </button>
            </div>
          </div>
        )}

        {/* ─── 오류 ─── */}
        {step === 'error' && (
          <div className="text-center py-8 space-y-5">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
              style={{ background: '#fef2f2', border: '4px solid #ef4444' }}>
              <i className="fas fa-exclamation-triangle text-4xl text-red-500"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black" style={{ color: '#3c3c3c' }}>처리 오류</h2>
              {error && <p className="text-red-500 text-sm mt-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <a href="/home" className="py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 flex items-center justify-center">
                홈으로
              </a>
              <button onClick={resetAll}
                className="py-3.5 text-white font-bold rounded-2xl text-sm"
                style={{ background: 'linear-gradient(135deg, #2e4f9f, #1a3a7a)' }}>
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  )
}
