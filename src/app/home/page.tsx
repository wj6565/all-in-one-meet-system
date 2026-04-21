'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface UserSession {
  user: { name: string; email: string; userType: string; loginId?: string; department?: { name: string } | null }
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
      title: '회의실 예약',
      desc: '회의실 현황 확인 및 예약',
      subDesc: '실시간 예약 · 현황 조회 · 즉시 사용',
      href: '/booking',
      color: '#10b981',
      colorLight: '#d1fae5',
      colorText: '#065f46',
      badge: '예약 시스템',
    },
    {
      id: 'meeting',
      icon: 'fas fa-microphone',
      title: '회의 녹음',
      desc: '회의 시작 · 녹음 · 회의록 자동 발송',
      subDesc: '음성 전사 · AI 요약 · 엑셀 메일 발송',
      href: '/meeting',
      color: '#3b82f6',
      colorLight: '#dbeafe',
      colorText: '#1e40af',
      badge: '녹음 시스템',
    },
    ...(isAdmin ? [{
      id: 'admin',
      icon: 'fas fa-cog',
      title: '관리자',
      desc: '시스템 통합 관리',
      subDesc: '예약 관리 · 녹음 이력 · 사용자 관리',
      href: '/admin',
      color: '#6366f1',
      colorLight: '#e0e7ff',
      colorText: '#3730a3',
      badge: '관리자 전용',
    }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - 참조 시스템 동일 스타일 */}
      <div className="shadow-md" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            {/* 로고 (흰색 처리) */}
            <div className="flex-shrink-0">
              <Image src="/wonjin-logo.png" alt="WONJIN Group" width={140} height={40}
                style={{ objectFit: 'contain', height: '40px', width: 'auto', filter: 'brightness(0) invert(1)' }} priority />
            </div>
            {/* 타이틀 */}
            <div className="flex-1 flex items-center min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">ALL IN ONE MEET SYSTEM</h1>
            </div>
            {/* 우측: 사용자 정보 + 버튼 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {session?.user && (
                <div className="hidden md:flex items-center gap-3 text-white">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{session.user.name}</p>
                    <p className="text-xs opacity-80">
                      {isAdmin ? '관리자' : '일반 사용자'}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-white opacity-30"></div>
                </div>
              )}
              <button onClick={() => window.location.href = '/booking'}
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="회의실 예약">
                <i className="fas fa-calendar-alt text-lg"></i>
              </button>
              {isAdmin && (
                <button onClick={() => window.location.href = '/admin'}
                  className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="관리자">
                  <i className="fas fa-cog text-lg"></i>
                </button>
              )}
              <button onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="로그아웃">
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* 인사말 */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            안녕하세요, <span style={{ color: '#2f4394' }}>{session?.user?.name || ''}</span>님!
          </h2>
          <p className="text-gray-400 text-sm">이용하실 서비스를 선택하세요</p>
        </div>

        {/* 메뉴 카드 */}
        <div className={`grid gap-4 sm:gap-6 mx-auto max-w-3xl ${
          isAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
        }`}>
          {menuItems.map(item => (
            <a key={item.id} href={item.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center hover:shadow-lg transition-all duration-200 cursor-pointer group block hover:-translate-y-1">
              {/* 아이콘 원 */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-md group-hover:scale-110 transition-transform duration-200"
                style={{ background: item.color }}>
                <i className={`${item.icon} text-2xl sm:text-3xl text-white`}></i>
              </div>
              {/* 뱃지 */}
              <span className="inline-block text-xs px-3 py-1 rounded-full font-medium mb-3"
                style={{ background: item.colorLight, color: item.colorText }}>
                {item.badge}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm mb-1">{item.desc}</p>
              <p className="text-gray-400 text-xs hidden sm:block">{item.subDesc}</p>
              <div className="mt-4 sm:mt-5">
                <span className="inline-block text-white font-bold px-6 py-2 rounded-xl text-sm transition-opacity group-hover:opacity-90"
                  style={{ background: item.color }}>
                  이동하기 →
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-gray-300">
          회의실 예약 · 녹음 · 전사 · 요약 · 엑셀 · 메일 자동 발송
        </div>
      </div>
    </div>
  )
}
