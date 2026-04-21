'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin/dashboard', icon: '📊', label: '대시보드' },
  { href: '/admin/bookings', icon: '🏢', label: '예약 관리' },
  { href: '/admin/rooms', icon: '🚪', label: '회의실 관리' },
  { href: '/admin/users', icon: '👥', label: '사용자 관리' },
  { href: '/admin/meetings', icon: '📋', label: '회의 기록' },
  { href: '/admin/email-logs', icon: '📧', label: '메일 이력' },
  { href: '/admin/settings', icon: '⚙️', label: '설정' },
]

export default function AdminNav() {
  const pathname = usePathname()

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

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex flex-col z-10 shadow-sm">
      {/* 로고 영역 */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex justify-center mb-3">
          <Image
            src="/wonjin-logo.png"
            alt="WONJIN Group"
            width={160}
            height={42}
            style={{ objectFit: 'contain', height: '38px', width: 'auto' }}
            priority
          />
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-base">⚙️</span>
          <div>
            <div className="text-gray-700 font-semibold text-xs leading-tight">ALL IN ONE MEET</div>
            <div className="text-gray-400 text-xs">통합 관리자 패널</div>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </Link>
          )
        })}
      </div>

      {/* 하단 */}
      <div className="p-3 border-t border-gray-100 space-y-0.5">
        <Link
          href="/home"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150"
        >
          <span className="text-base w-5 text-center">🏠</span>
          <span className="text-sm">메인 메뉴</span>
        </Link>
        <Link
          href="/meeting"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150"
        >
          <span className="text-base w-5 text-center">🎙️</span>
          <span className="text-sm">회의 녹음</span>
        </Link>
        <Link
          href="/booking"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150"
        >
          <span className="text-base w-5 text-center">📅</span>
          <span className="text-sm">회의실 예약</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <span className="text-base w-5 text-center">🚪</span>
          <span className="text-sm">로그아웃</span>
        </button>
      </div>
    </nav>
  )
}
