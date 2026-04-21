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

export default function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // 라우트 변경 시 모바일 메뉴 닫기
  useEffect(() => { setOpen(false) }, [pathname])

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
      {/* 로고 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-center mb-2">
          <Image src="/wonjin-logo.png" alt="WONJIN Group" width={140} height={36}
            style={{ objectFit: 'contain', height: '34px', width: 'auto' }} priority />
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <i className="fas fa-cog text-gray-400 text-xs"></i>
          <div>
            <div className="text-gray-700 font-semibold text-xs leading-tight">ALL IN ONE MEET</div>
            <div className="text-gray-400 text-xs">통합 관리자 패널</div>
          </div>
        </div>
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
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}>
              <i className={`${item.icon} w-4 text-center text-sm ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}></i>
              <span className="text-sm">{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
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
        <Link href="/meeting"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150 group">
          <i className="fas fa-microphone w-4 text-center text-sm text-gray-400 group-hover:text-gray-600"></i>
          <span className="text-sm">회의 녹음</span>
        </Link>
        <Link href="/booking"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150 group">
          <i className="fas fa-calendar-alt w-4 text-center text-sm text-gray-400 group-hover:text-gray-600"></i>
          <span className="text-sm">회의실 예약</span>
        </Link>
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/wonjin-logo.png" alt="WONJIN" width={100} height={28}
              style={{ objectFit: 'contain', height: '26px', width: 'auto' }} priority />
            <span className="text-xs text-gray-400 font-medium">관리자</span>
          </div>
          <button onClick={() => setOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
            <i className={`fas ${open ? 'fa-times' : 'fa-bars'} text-base`}></i>
          </button>
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
