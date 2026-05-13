'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-gray-400">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">이동 중...</p>
      </div>
    </div>
  )
}
