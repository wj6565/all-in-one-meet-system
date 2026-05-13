'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface UserSession {
  user: { name: string; email: string; userType: string; loginId?: string; department?: { name: string } | null }
}

export default function UserHomePage() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => { setSession(data); setLoading(false) })
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #0d1b4b 0%, #1a2e6b 40%, #0a1533 100%)' }}>
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#f1c218' }} />
        <p className="text-sm tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading</p>
      </div>
    </div>
  )

  const isAdmin = session?.user?.userType === 'admin'
  const greeting = () => {
    const h = time.getHours()
    if (h < 12) return '좋은 아침입니다'
    if (h < 18) return '좋은 오후입니다'
    return '좋은 저녁입니다'
  }

  /* 로고 팔레트 기반 메뉴 카드 색상
     Primary blue : #2e4f9f
     Gold accent  : #f1c218
     Dark gray    : #3c3c3c
  */
  const menuItems = [
    {
      href: '/booking',
      icon: 'fa-calendar-check',
      title: '회의실 예약',
      desc: '실시간 현황 확인 및 즉시 예약',
      badge: 'Booking',
      accent: '#2e4f9f',
      accentLight: 'rgba(46,79,159,0.18)',
      accentGlow: 'rgba(46,79,159,0.35)',
    },
    {
      href: '/meeting',
      icon: 'fa-microphone',
      title: '회의 녹음',
      desc: '음성 전사 · AI 요약 · 자동 메일',
      badge: 'Recording',
      accent: '#f1c218',
      accentLight: 'rgba(241,194,24,0.15)',
      accentGlow: 'rgba(241,194,24,0.3)',
    },
    ...(isAdmin ? [{
      href: '/admin',
      icon: 'fa-shield-alt',
      title: '관리자',
      desc: '시스템 통합 관리 · 사용자 · 예약',
      badge: 'Admin',
      accent: '#94a3b8',
      accentLight: 'rgba(148,163,184,0.12)',
      accentGlow: 'rgba(148,163,184,0.2)',
    }] : []),
  ]

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #0d1b4b 0%, #1a2e6b 45%, #0a1533 100%)' }}>

      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: '#2e4f9f' }}></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: '#f1c218' }}></div>
        <div className="absolute top-1/2 -left-20 w-64 h-64 rounded-full opacity-6 blur-2xl"
          style={{ background: '#2e4f9f' }}></div>
        {/* 격자 패턴 */}
        <div className="absolute inset-0 opacity-3"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>
      </div>

      {/* 헤더 */}
      <header className="relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-4">
          <Image src="/wonjin-logo.png" alt="WONJIN" width={120} height={32}
            style={{ objectFit: 'contain', height: '26px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.9 }} priority />
          <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.15)' }}></div>
          <span className="text-xs font-medium tracking-wide hidden sm:block"
            style={{ color: 'rgba(255,255,255,0.4)' }}>ALL IN ONE MEET SYSTEM</span>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {session?.user && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{session.user.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {session.user.department?.name || (isAdmin ? '관리자' : '일반 사용자')}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: 'rgba(241,194,24,0.2)', color: '#f1c218' }}>
                  {session.user.name?.charAt(0) || 'U'}
                </div>
              </div>
            )}
            {isAdmin && (
              <a href="/admin"
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'white' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
                title="관리자">
                <i className="fas fa-cog text-sm"></i>
              </a>
            )}
            <button onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLElement).style.color = '#fca5a5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
              title="로그아웃">
              <i className="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

        {/* 인사 + 시계 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 sm:mb-14">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
              style={{ background: 'rgba(241,194,24,0.1)', border: '1px solid rgba(241,194,24,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f1c218' }}></div>
              <span className="text-xs font-semibold" style={{ color: '#f1c218' }}>{greeting()}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              {session?.user?.name || ''}
              <span style={{ color: 'rgba(255,255,255,0.35)' }}> 님</span>
            </h2>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>이용하실 서비스를 선택해 주세요</p>
          </div>
          <div className="text-right sm:text-right">
            <div className="text-3xl sm:text-5xl font-mono font-black text-white tabular-nums tracking-tight">
              {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {time.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
        </div>

        {/* 메뉴 카드 */}
        <div className={`grid gap-4 sm:gap-6 ${
          menuItems.length === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
        }`}>
          {menuItems.map(item => (
            <a key={item.href} href={item.href}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl block cursor-pointer transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = item.accentLight
                ;(e.currentTarget as HTMLElement).style.borderColor = item.accent + '60'
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${item.accentGlow}`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}>

              {/* 상단 강조선 */}
              <div className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)`, opacity: 0.6 }}></div>

              {/* 카드 내용 */}
              <div className="relative p-6 sm:p-8">
                {/* 배지 */}
                <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4"
                  style={{ color: item.accent, opacity: 0.7 }}>
                  {item.badge}
                </span>

                {/* 아이콘 */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg transition-transform duration-300 group-hover:scale-110"
                  style={{ background: item.accentLight, border: `1px solid ${item.accent}40` }}>
                  <i className={`fas ${item.icon} text-xl`} style={{ color: item.accent }}></i>
                </div>

                {/* 텍스트 */}
                <h3 className="text-xl font-black text-white mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.desc}</p>

                {/* 화살표 */}
                <div className="mt-6 flex items-center gap-2 transition-all duration-300"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <span className="text-xs font-semibold tracking-wide group-hover:text-white/60 transition-colors">시작하기</span>
                  <i className="fas fa-arrow-right text-xs group-hover:translate-x-1.5 transition-transform duration-300"
                    style={{ color: item.accent }}></i>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* 하단 상태 바 */}
        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }}></span>
            <span>시스템 정상 운영 중</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {['회의실 예약', '음성 전사', 'AI 요약', '자동 메일'].map((t, i, arr) => (
              <span key={t} className="flex items-center gap-3">
                <span>{t}</span>
                {i < arr.length - 1 && <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
