'use client'

import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  // 메인 /admin 페이지는 자체 레이아웃 (탭 기반) 사용
  // 기존 하위 페이지들 (dashboard, users, rooms 등)은 직접 접근 시 /admin으로 리다이렉트
  return <>{children}</>
}
