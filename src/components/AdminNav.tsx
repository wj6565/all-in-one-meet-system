'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/admin/dashboard', icon: 'fas fa-tachometer-alt', label: '대시보드' },
  { href: '/admin/bookings',  icon: 'fas fa-calendar-check', label: '예약 관리' },
  { href: '/admin/rooms',     icon: 'fas fa-door-open',       label: '회의실 관리' },
  { href: '/admin/users',     icon: 'fas fa-users',           label: '사용자 관리' },
  { href: '/admin/meetings',  icon: 'fas fa-file-alt',        label: '회의 기록' },
  { href: '/admin/email-logs',icon: 'fas fa-envelope',        label: '메일 이력' },
  { href: '/admin/settings',  icon: 'fas fa-cog',             label: '설정' },
]

interface AdminUser {
  name: string
  email: string
  userType: string
}

export default function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)

  useEffect(() => { setOpen(false) }, [pathname])

  // 관리자 세션 정보 로드
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data?.user) setAdminUser(data.user)
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    const csrfRes = await fetch('/api/auth/csrf').catch(() => null)
    const { csrfToken } = csrfRes ? await csrfRes.json() : { csrfToken: '' }
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken }),
    }).catch(() => {})
    window.location.href = '/login'
  }

  const NavContent = () => (
    <>
      {/* 로고 영역 - 레퍼런스 시스템과 동일한 gradient */}
      <div className="flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="p-4 pb-3">
          <div className="flex justify-center mb-2">
            <Image src="/wonjin-logo.png" alt="WONJIN Group" width={140} height={36}
              style={{ objectFit: 'contain', height: '34px', width: 'auto', filter: 'brightness(0) invert(1)' }} priority />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-sm tracking-tight">관리자 페이지</div>
          </div>
        </div>

        {/* 관리자 정보 */}
        {adminUser && (
          <div className="px-4 pb-3 flex items-center gap-2.5 border-t border-white/10 pt-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-user-shield text-white text-xs"></i>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-xs truncate">{adminUser.name}</p>
              <p className="text-white/60 text-xs">관리자</p>
            </div>
          </div>
        )}
      </div>

      {/* 메뉴 */}
      <div className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 group ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
              style={isActive ? { background: 'linear-gradient(to right, #2f4394, #4169e1)' } : {}}>
              <i className={`${item.icon} w-4 text-center text-sm ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}></i>
              <span className="text-sm">{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80 flex-shrink-0" />}
            </Link>
          )
        })}
      </div>

      {/* 하단 바로가기 */}
      <div className="p-2.5 border-t border-gray-100 space-y-0.5">
        <Link href="/home"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150 group">
          <i className="fas fa-home w-4 text-center text-sm text-gray-400 group-hover:text-gray-600"></i>
          <span className="text-sm">메인 메뉴</span>
        </Link>
        <Link href="/booking"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150 group">
          <i className="fas fa-calendar-alt w-4 text-center text-sm text-gray-400 group-hover:text-gray-600"></i>
          <span className="text-sm">회의실 예약</span>
        </Link>
        <Link href="/meeting"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150 group">
          <i className="fas fa-microphone w-4 text-center text-sm text-gray-400 group-hover:text-gray-600"></i>
          <span className="text-sm">회의 녹음</span>
        </Link>
        {/* 태블릿 바로가기 - 레퍼런스 시스템 스타일 */}
        <button
          onClick={() => window.open('/tablet/MAIN', '_blank')}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-all duration-150 group">
          <i className="fas fa-tablet-alt w-4 text-center text-sm text-gray-400 group-hover:text-purple-500"></i>
          <span className="text-sm">태블릿 화면</span>
        </button>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 group">
          <i className="fas fa-sign-out-alt w-4 text-center text-sm text-gray-400 group-hover:text-red-500"></i>
          <span className="text-sm">로그아웃</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* 모바일 상단 바 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b shadow-sm" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/wonjin-logo.png" alt="WONJIN" width={100} height={28}
              style={{ objectFit: 'contain', height: '26px', width: 'auto', filter: 'brightness(0) invert(1)' }} priority />
            <span className="text-xs text-white/70 font-medium">관리자</span>
          </div>
          <div className="flex items-center gap-2">
            {adminUser && (
              <span className="text-white/80 text-xs font-medium hidden sm:block">{adminUser.name}</span>
            )}
            <button onClick={() => setOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-colors">
              <i className={`fas ${open ? 'fa-times' : 'fa-bars'} text-base`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 오버레이 */}
      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40"
          onClick={() => setOpen(false)} />
      )}

      {/* 모바일 슬라이드 사이드바 */}
      <nav className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-30 flex flex-col shadow-2xl transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <NavContent />
      </nav>

      {/* PC 고정 사이드바 */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex-col z-10 shadow-sm">
        <NavContent />
      </nav>
    </>
  )
}
