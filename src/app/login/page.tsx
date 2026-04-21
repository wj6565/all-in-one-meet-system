'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function LoginPage() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const csrfRes = await fetch('/api/auth/csrf')
      const { csrfToken } = await csrfRes.json()

      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ loginId, password, csrfToken, callbackUrl: '/' }),
        redirect: 'manual',
      })

      if (res.status === 302 || res.status === 200 || res.status === 0) {
        let session = null
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 400))
          const sessionRes = await fetch('/api/auth/session')
          const data = await sessionRes.json()
          if (data?.user?.userType) { session = data; break }
        }

        if (session?.user) {
          const userType = session.user.userType
          if (userType === 'tablet') {
            window.location.href = '/tablet'
          } else {
            window.location.href = '/home'
          }
          return
        }
      }

      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 왼쪽 브랜드 패널 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />

        <div className="relative z-10 text-center">
          <div className="bg-white rounded-2xl px-8 py-4 inline-block mb-8 shadow-2xl">
            <Image src="/wonjin-logo.png" alt="WONJIN Group" width={180} height={48}
              style={{ objectFit: 'contain', height: '44px', width: 'auto' }} priority />
          </div>

          <h1 className="text-white text-3xl font-bold mb-2 tracking-tight">ALL IN ONE MEET SYSTEM</h1>
          <p className="text-blue-200 text-sm mb-2">회의 자동화의 모든 것을 하나로</p>

          {/* 예약 시스템 뱃지 */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-white/90 text-xs font-medium">회의실 예약 시스템 통합</span>
          </div>

          <div className="space-y-3 text-left">
            {[
              { icon: '🏢', title: '회의실 예약', desc: '실시간 예약 · 현황 확인 · 즉시 사용' },
              { icon: '🎙️', title: '회의 녹음', desc: '자동 녹음 · 음성 전사 · AI 요약' },
              { icon: '📝', title: '회의록 자동 생성', desc: '엑셀 파일 · 자동 메일 발송' },
              { icon: '📊', title: '통합 관리', desc: '예약 현황 · 녹음 이력 · 사용자 관리' },
            ].map(item => (
              <div key={item.title} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{item.title}</div>
                  <div className="text-blue-200 text-xs">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오른쪽 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* 모바일 로고 */}
          <div className="lg:hidden text-center mb-8">
            <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-md mb-3">
              <Image src="/wonjin-logo.png" alt="WONJIN Group" width={140} height={38}
                style={{ objectFit: 'contain', height: '36px', width: 'auto' }} priority />
            </div>
            <h1 className="text-gray-800 text-lg font-bold">ALL IN ONE MEET SYSTEM</h1>
            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 mt-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-blue-700 text-xs">회의실 예약 시스템 통합</span>
            </div>
          </div>

          {/* 로그인 카드 */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="mb-7">
              <h2 className="text-gray-900 text-2xl font-bold">로그인</h2>
              <p className="text-gray-400 text-sm mt-1">계정 정보를 입력하세요</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">아이디</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 bg-gray-50 text-sm transition-all"
                    placeholder="아이디 또는 관리자 이메일" required autoComplete="username" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">비밀번호</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 bg-gray-50 text-sm transition-all"
                    placeholder="비밀번호를 입력하세요" required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    {showPassword ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-blue-200 hover:shadow-blue-300 mt-2 flex items-center justify-center gap-2">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />로그인 중...</>
                ) : (
                  <>로그인<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-xs flex-shrink-0 font-bold">A</span>
                <span>관리자: 이메일 주소로 로그인</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 text-xs flex-shrink-0 font-bold">U</span>
                <span>사용자: 관리자가 설정한 아이디로 로그인</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-5 h-5 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 text-xs flex-shrink-0 font-bold">T</span>
                <span>태블릿: 태블릿 전용 아이디로 로그인</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 WONJIN Group · ALL IN ONE MEET SYSTEM
          </p>
        </div>
      </div>
    </div>
  )
}
