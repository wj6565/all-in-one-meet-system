'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface UserSession {
  user: { name: string; email: string; userType: string; loginId?: string }
}

export default function UserHomePage() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => { setSession(data); setLoading(false) })
  }, [])

  const handleLogout = async () => {
    const csrfRes = await fetch('/api/auth/csrf')
    const { csrfToken } = await csrfRes.json()
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken }),
    })
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const userType = session?.user?.userType
  const isAdmin = userType === 'admin'

  const menuItems = [
    {
      id: 'booking',
      icon: 'fas fa-calendar-alt',
      emoji: '🏢',
      title: '회의실 예약',
      desc: '회의실 현황 확인 및 예약',
      subDesc: '실시간 예약 · 현황 조회 · 즉시 사용',
      href: '/booking',
      gradient: 'from-emerald-500 to-teal-600',
      hoverBorder: 'hover:border-emerald-400',
      badge: '예약 시스템',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      btnGradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'meeting',
      icon: 'fas fa-microphone',
      emoji: '🎙️',
      title: '회의 녹음',
      desc: '회의 시작 · 녹음 · 회의록 자동 발송',
      subDesc: '음성 전사 · AI 요약 · 엑셀 메일 발송',
      href: '/meeting',
      gradient: 'from-blue-500 to-indigo-600',
      hoverBorder: 'hover:border-blue-400',
      badge: '녹음 시스템',
      badgeColor: 'bg-blue-100 text-blue-700',
      btnGradient: 'from-blue-500 to-indigo-600',
    },
    ...(isAdmin ? [{
      id: 'admin',
      icon: 'fas fa-cog',
      emoji: '⚙️',
      title: '관리자',
      desc: '시스템 통합 관리',
      subDesc: '예약 관리 · 녹음 이력 · 사용자 관리',
      href: '/admin/dashboard',
      gradient: 'from-slate-600 to-slate-700',
      hoverBorder: 'hover:border-slate-400',
      badge: '관리자 전용',
      badgeColor: 'bg-slate-100 text-slate-700',
      btnGradient: 'from-slate-600 to-slate-700',
    }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - 원본 스타일 */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/wonjin-logo.png" alt="WONJIN Group" width={130} height={36}
              style={{ objectFit: 'contain', height: '30px', width: 'auto' }} priority />
            <span className="text-gray-200 hidden sm:inline">|</span>
            <span className="text-gray-500 font-medium text-xs sm:text-sm hidden sm:inline">ALL IN ONE MEET SYSTEM</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {session?.user && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm text-gray-500 hidden xs:inline">
                  <i className="fas fa-user mr-1 text-gray-300"></i>
                  <span className="font-medium text-gray-700">{session.user.name}</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isAdmin ? '관리자' : '사용자'}
                </span>
              </div>
            )}
            <button onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1">
              <i className="fas fa-sign-out-alt"></i>
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="flex items-center justify-center min-h-[calc(100vh-57px)] p-4 sm:p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              안녕하세요, <span style={{ color: '#2f4394' }}>{session?.user?.name || ''}</span>님!
            </h1>
            <p className="text-gray-400 text-sm">이용하실 서비스를 선택하세요</p>
          </div>

          <div className={`grid gap-3 sm:gap-4 ${
            isAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
          }`}>
            {menuItems.map(item => (
              <a key={item.id} href={item.href}
                className={`bg-white border-2 border-gray-100 ${item.hoverBorder} rounded-2xl p-5 sm:p-6 text-center transition-all duration-200 cursor-pointer hover:shadow-lg group block`}>
                {/* 아이콘 */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg group-hover:scale-105 transition-transform duration-200`}>
                  <i className={`${item.icon} text-2xl sm:text-3xl text-white`}></i>
                </div>

                {/* 뱃지 */}
                <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mb-2 ${item.badgeColor}`}>
                  {item.badge}
                </span>

                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-1">{item.title}</h2>
                <p className="text-gray-500 text-xs sm:text-sm mb-1">{item.desc}</p>
                <p className="text-gray-400 text-xs hidden sm:block">{item.subDesc}</p>

                <div className="mt-3 sm:mt-4">
                  <span className={`inline-block bg-gradient-to-r ${item.btnGradient} text-white font-bold px-5 py-2 rounded-xl text-sm group-hover:opacity-90 transition-opacity`}>
                    이동하기 →
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-6 sm:mt-8 text-center text-xs text-gray-300">
            회의실 예약 · 녹음 · 전사 · 요약 · 엑셀 · 메일 자동 발송
          </div>
        </div>
      </main>
    </div>
  )
}
