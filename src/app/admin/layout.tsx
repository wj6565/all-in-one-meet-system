'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminUser { name: string; email: string; userType: string }

const NAV_ITEMS = [
  { href: '/admin',          icon: 'fas fa-tachometer-alt', label: '대시보드',    exact: true  },
  { href: '/admin/users',    icon: 'fas fa-users',          label: '사용자 관리', exact: false },
  { href: '/admin/rooms',    icon: 'fas fa-door-open',      label: '회의실 관리', exact: false },
  { href: '/admin/bookings', icon: 'fas fa-calendar-check', label: '예약 관리',   exact: false },
  { href: '/admin/meetings', icon: 'fas fa-microphone',     label: '회의 기록',   exact: false },
  { href: '/admin/settings', icon: 'fas fa-cog',            label: '설정',        exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [admin, setAdmin]       = useState<AdminUser | null>(null)
  const [loading, setLoading]   = useState(true)
  const [sideOpen, setSideOpen] = useState(false)

  // /admin/login 은 레이아웃 제외
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return }
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data?.user || data.user.userType !== 'admin') {
          router.replace('/login')
          return
        }
        setAdmin(data.user)
        setLoading(false)
      })
      .catch(() => router.replace('/login'))
  }, [isLoginPage, router])

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.replace('/login')
  }

  // 로그인 페이지
  if (isLoginPage) return <>{children}</>

  // 인증 로딩
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="text-center text-white">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm opacity-80">관리자 인증 중...</p>
        </div>
      </div>
    )
  }

  const isActive = (item: typeof NAV_ITEMS[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── 상단 헤더 ── */}
      <header className="shadow-md flex-shrink-0 z-30" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-5 py-3 flex items-center gap-3">
          {/* 모바일 햄버거 */}
          <button onClick={() => setSideOpen(o => !o)}
            className="lg:hidden w-9 h-9 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
            <i className="fas fa-bars text-base"></i>
          </button>

          {/* 로고 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wonjin-logo.png" alt="WONJIN" className="flex-shrink-0"
            style={{ height: '34px', width: 'auto', filter: 'brightness(0) invert(1)' }} />

          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">관리자 시스템</h1>
          </div>

          {/* 우측 버튼 그룹 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {admin && (
              <span className="hidden md:block text-white/80 text-xs mr-2 truncate max-w-[120px]">
                {admin.name}
              </span>
            )}
            <Link href="/booking" title="예약 시스템"
              className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors">
              <i className="fas fa-calendar-alt text-sm"></i>
            </Link>
            <Link href="/home" title="메인으로"
              className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors">
              <i className="fas fa-home text-sm"></i>
            </Link>
            <button onClick={handleLogout} title="로그아웃"
              className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors">
              <i className="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── 모바일 오버레이 ── */}
        {sideOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSideOpen(false)} />
        )}

        {/* ── 사이드바 ── */}
        <aside className={`
          fixed top-0 left-0 h-full w-56 bg-white shadow-xl z-30 flex flex-col
          transform transition-transform duration-200
          ${sideOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:w-52 lg:shadow-none lg:border-r lg:border-gray-100 lg:z-auto
        `} style={{ paddingTop: sideOpen ? '0' : undefined }}>
          {/* 모바일: 사이드바 내 로고 */}
          <div className="lg:hidden px-4 py-4 border-b border-gray-100 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wonjin-logo.png" alt="WONJIN" style={{ height: '28px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
            <button onClick={() => setSideOpen(false)} className="text-white w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const active = isActive(item)
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setSideOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                  style={active ? { color: '#2f4394', background: '#eff3ff' } : {}}>
                  <i className={`${item.icon} w-4 text-center text-sm ${active ? '' : 'text-gray-400'}`}
                    style={active ? { color: '#2f4394' } : {}}></i>
                  <span>{item.label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#2f4394' }} />}
                </Link>
              )
            })}
          </nav>

          {/* 사이드바 하단: 예약/홈 바로가기 */}
          <div className="border-t border-gray-100 p-3 space-y-1">
            <Link href="/booking" onClick={() => setSideOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <i className="fas fa-calendar-plus text-gray-300 text-sm w-4 text-center"></i>
              예약 시스템
            </Link>
            <Link href="/meeting" onClick={() => setSideOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <i className="fas fa-microphone text-gray-300 text-sm w-4 text-center"></i>
              회의 시작
            </Link>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
              <i className="fas fa-sign-out-alt text-sm w-4 text-center"></i>
              로그아웃
            </button>
          </div>
        </aside>

        {/* ── 메인 콘텐츠 ── */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-screen-xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
