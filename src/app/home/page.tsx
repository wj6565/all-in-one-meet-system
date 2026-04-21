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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const userType = session?.user?.userType
  const isAdmin = userType === 'admin'

  const menuItems = [
    {
      id: 'booking',
      icon: '🏢',
      title: '회의실 예약',
      desc: '회의실 현황 확인 및 예약',
      subDesc: '실시간 예약 · 현황 조회 · 즉시 사용',
      href: '/booking',
      color: 'from-emerald-500 to-teal-600',
      hoverBorder: 'hover:border-emerald-400',
      badge: '예약 시스템',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      available: true,
    },
    {
      id: 'meeting',
      icon: '🎙️',
      title: '회의 녹음',
      desc: '회의 시작 · 녹음 · 회의록 자동 발송',
      subDesc: '음성 전사 · AI 요약 · 엑셀 메일 발송',
      href: '/meeting',
      color: 'from-blue-500 to-indigo-600',
      hoverBorder: 'hover:border-blue-400',
      badge: '녹음 시스템',
      badgeColor: 'bg-blue-100 text-blue-700',
      available: true,
    },
    ...(isAdmin ? [{
      id: 'admin',
      icon: '⚙️',
      title: '관리자',
      desc: '시스템 통합 관리',
      subDesc: '예약 관리 · 녹음 이력 · 사용자 관리',
      href: '/admin/dashboard',
      color: 'from-slate-600 to-slate-700',
      hoverBorder: 'hover:border-slate-400',
      badge: '관리자 전용',
      badgeColor: 'bg-slate-100 text-slate-700',
      available: true,
    }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Image src="/wonjin-logo.png" alt="WONJIN Group" width={130} height={36}
            style={{ objectFit: 'contain', height: '32px', width: 'auto' }} priority />
          <span className="text-gray-300">|</span>
          <span className="text-gray-600 font-semibold text-sm">ALL IN ONE MEET SYSTEM</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                👤 <span className="font-medium text-gray-700">{session.user.name}</span>
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isAdmin ? '관리자' : '사용자'}
              </span>
            </div>
          )}
          <button onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 */}
      <main className="flex items-center justify-center min-h-[calc(100vh-73px)] p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              안녕하세요, {session?.user?.name || ''}님!
            </h1>
            <p className="text-gray-400 text-sm">이용하실 서비스를 선택하세요</p>
          </div>

          <div className={`grid gap-4 ${isAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {menuItems.map(item => (
              <a key={item.id} href={item.href}
                className={`bg-white border-2 border-gray-100 ${item.hoverBorder} rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer hover:shadow-lg group block`}>
                {/* 아이콘 */}
                <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-200`}>
                  <span className="text-3xl">{item.icon}</span>
                </div>

                {/* 뱃지 */}
                <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mb-2 ${item.badgeColor}`}>
                  {item.badge}
                </span>

                <h2 className="text-lg font-bold text-gray-800 mb-1">{item.title}</h2>
                <p className="text-gray-500 text-sm mb-1">{item.desc}</p>
                <p className="text-gray-400 text-xs">{item.subDesc}</p>

                <div className="mt-4">
                  <span className={`inline-block bg-gradient-to-r ${item.color} text-white font-bold px-6 py-2 rounded-xl text-sm group-hover:opacity-90 transition-opacity`}>
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
      </main>
    </div>
  )
}
