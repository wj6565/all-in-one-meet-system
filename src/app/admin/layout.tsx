'use client'

import { usePathname } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminNav />
      {/* PC: ml-64, 모바일: ml-0 + 상단바 높이만큼 pt */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 pt-16 md:pt-6 min-h-screen w-full min-w-0">
        {children}
      </main>
    </div>
  )
}
