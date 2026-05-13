'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '로그인에 실패했습니다.'); return }
      window.location.href = data.redirect || '/home'
    } catch { setError('서버 연결에 실패했습니다.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'linear-gradient(145deg, #0d1b4b 0%, #1a2e6b 40%, #0a1533 100%)' }}>

      {/* ── 좌측 브랜드 패널 (lg 이상에서만 표시) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-1/2 p-10 xl:p-14 relative overflow-hidden flex-shrink-0">
        {/* 배경 장식 원 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #4f72d4, transparent)' }}></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #f1c218, transparent)' }}></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #fff, transparent)' }}></div>
        </div>

        {/* 로고 */}
        <div className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wonjin-logo.png" alt="WONJIN"
            style={{ height: '38px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
        </div>

        {/* 중앙 카피 */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(241,194,24,0.15)', border: '1px solid rgba(241,194,24,0.3)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f1c218' }}></div>
            <span className="text-xs font-semibold" style={{ color: '#f1c218' }}>통합 회의 관리 플랫폼</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
            ALL IN ONE<br />
            <span style={{
              background: 'linear-gradient(90deg, #f1c218, #fcd34d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              MEET SYSTEM
            </span>
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            회의실 예약부터 녹음 · 전사 · AI 요약<br />
            자동 메일 발송까지 하나의 플랫폼에서.
          </p>

          {/* 기능 목록 */}
          <div className="space-y-3">
            {[
              { icon: 'fa-calendar-check', label: '실시간 회의실 예약', color: '#4f8ef7' },
              { icon: 'fa-microphone',     label: '회의 자동 녹음 · 전사', color: '#818cf8' },
              { icon: 'fa-robot',          label: 'AI 기반 회의록 요약', color: '#34d399' },
              { icon: 'fa-envelope',       label: '참석자 자동 메일 발송', color: '#f1c218' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: f.color + '22' }}>
                  <i className={`fas ${f.icon} text-sm`} style={{ color: f.color }}></i>
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © 2026 WONJIN GROUP. All rights reserved.
        </div>
      </div>

      {/* 좌우 구분선 (lg 이상) */}
      <div className="hidden lg:block w-px flex-shrink-0"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)' }}></div>

      {/* ── 우측 로그인 폼 ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 min-h-screen lg:min-h-0">
        <div className="w-full max-w-[380px]">

          {/* 모바일 전용 로고 + 타이틀 */}
          <div className="lg:hidden text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wonjin-logo.png" alt="WONJIN"
              style={{ height: '30px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.9, margin: '0 auto 10px' }} />
            <h2 className="text-lg font-black text-white">ALL IN ONE MEET SYSTEM</h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>통합 회의 관리 플랫폼</p>
          </div>

          {/* 폼 카드 */}
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}>
            <div className="p-6 sm:p-8">
              {/* 카드 헤더 */}
              <div className="mb-7">
                <h2 className="text-xl sm:text-2xl font-black text-white mb-1">로그인</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>계속하려면 로그인하세요</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* 아이디 */}
                <div>
                  <label className="block text-xs font-semibold mb-2 tracking-widest uppercase"
                    style={{ color: 'rgba(255,255,255,0.45)' }}>아이디</label>
                  <div className="relative">
                    <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: 'rgba(255,255,255,0.25)' }}></i>
                    <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)}
                      required autoComplete="username"
                      placeholder="아이디 또는 이메일"
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm text-white transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        caretColor: '#f1c218',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(241,194,24,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(241,194,24,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.boxShadow = 'none' }} />
                  </div>
                </div>

                {/* 비밀번호 */}
                <div>
                  <label className="block text-xs font-semibold mb-2 tracking-widest uppercase"
                    style={{ color: 'rgba(255,255,255,0.45)' }}>비밀번호</label>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: 'rgba(255,255,255,0.25)' }}></i>
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      required autoComplete="current-password"
                      placeholder="비밀번호 입력"
                      className="w-full rounded-xl pl-11 pr-12 py-3 text-sm text-white transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        caretColor: '#f1c218',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(241,194,24,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(241,194,24,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.boxShadow = 'none' }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                    <span>{error}</span>
                  </div>
                )}

                {/* 로그인 버튼 */}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 font-black text-sm rounded-xl shadow-lg disabled:opacity-50 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-2"
                  style={{
                    background: loading ? '#2e4f9f' : 'linear-gradient(135deg, #f1c218, #e6b000)',
                    color: '#1a2e6b',
                    boxShadow: '0 8px 24px rgba(241,194,24,0.3)',
                  }}>
                  {loading ? (
                    <><i className="fas fa-circle-notch fa-spin" style={{ color: 'white' }}></i>
                    <span style={{ color: 'white' }}>로그인 중...</span></>
                  ) : (
                    <><i className="fas fa-sign-in-alt"></i> 로그인</>
                  )}
                </button>
              </form>

              {/* 계정 유형 안내 */}
              <div className="mt-6 pt-5 space-y-2.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>계정 유형 안내</p>
                {[
                  { abbr: 'A', label: '관리자', desc: '이메일 주소로 로그인', bg: 'rgba(241,194,24,0.15)', color: '#f1c218' },
                  { abbr: 'U', label: '사용자', desc: '관리자가 설정한 아이디', bg: 'rgba(78,118,210,0.2)', color: '#7da4ff' },
                  { abbr: 'T', label: '태블릿', desc: '태블릿 전용 아이디', bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
                ].map(t => (
                  <div key={t.abbr} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: t.bg, color: t.color }}>{t.abbr}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{t.label}</span> — {t.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
