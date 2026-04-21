'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #2f4394 0%, #667eea 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-6">
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wonjin-logo.png" alt="WONJIN Group" style={{ height: '60px', width: 'auto' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#2f4394', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            ALL IN ONE MEET SYSTEM
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#6c757d', letterSpacing: '0.5px' }}>
            회의실 예약 · 녹음 · 전사 · 자동 메일 발송
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">아이디</label>
            <input
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="아이디 또는 관리자 이메일"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-3 rounded-lg text-white transition disabled:opacity-50"
            style={{ background: '#2f4394' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                로그인 중...
              </span>
            ) : '로그인'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold flex-shrink-0">A</span>
            <span>관리자: 이메일 주소로 로그인</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">U</span>
            <span>사용자: 관리자가 설정한 아이디로 로그인</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold flex-shrink-0">T</span>
            <span>태블릿: 태블릿 전용 아이디로 로그인</span>
          </div>
        </div>
      </div>
    </div>
  )
}
