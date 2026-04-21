'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ────────── 타입 정의 ──────────
interface AdminUser {
  name: string
  email: string
  userType: string
}

interface User {
  id: string
  name: string
  email: string
  position: string | null
  loginId: string | null
  role: string
  isActive: boolean
  createdAt: string
  department: { id: string; name: string } | null
}

interface Room {
  id: string
  name: string
  code: string | null
  location: string | null
  description: string | null
  capacity: number
  isActive: boolean
  isTabletMode: boolean
  tabletPinCode: string | null
  _count: { meetings: number }
  createdAt: string
}

interface Booking {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  status: string
  room: { id: string; name: string; location: string | null }
  user: { id: string; name: string; department: { name: string } | null }
}

type Tab = 'users' | 'rooms' | 'bookings'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:  { label: '예약확정', color: 'bg-blue-100 text-blue-700' },
  checked_in: { label: '사용중',   color: 'bg-green-100 text-green-700' },
  completed:  { label: '완료',     color: 'bg-gray-100 text-gray-600' },
  cancelled:  { label: '취소',     color: 'bg-red-100 text-red-600' },
  no_show:    { label: '노쇼',     color: 'bg-orange-100 text-orange-700' },
}

// ────────── 유틸 ──────────
function showToast(msg: string, type: 'success'|'error'|'info' = 'info') {
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' }
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;top:1rem;right:1rem;background:${colors[type]};color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2)`
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// ────────── 메인 컴포넌트 ──────────
export default function AdminPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [tab, setTab] = useState<Tab>('users')
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(data => {
      if (!data?.user || data.user.userType !== 'admin') {
        window.location.href = '/login'
        return
      }
      setAdmin(data.user)
      setAuthLoading(false)
    })
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 헤더 (레퍼런스 동일) ── */}
      <div className="shadow-md" style={{ background: 'linear-gradient(135deg, #2f4394 0%, #4169e1 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 md:gap-6">
            {/* 로고 */}
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wonjin-logo.png" alt="WONJIN Group"
                style={{ height: '40px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
            {/* 타이틀 */}
            <div className="flex-1 flex items-center min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight">관리자 페이지</h1>
            </div>
            {/* 사용자 정보 + 버튼 */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {admin && (
                <div className="hidden md:flex items-center gap-3 text-white">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{admin.name}</p>
                    <p className="text-xs opacity-80">관리자</p>
                  </div>
                  <div className="w-px h-8 bg-white opacity-30"></div>
                </div>
              )}
              <button onClick={() => window.location.href = '/home'}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="메인으로">
                <i className="fas fa-home text-base md:text-lg"></i>
              </button>
              <button onClick={handleLogout}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all" title="로그아웃">
                <i className="fas fa-sign-out-alt text-base md:text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 탭 네비게이션 (레퍼런스 동일) ── */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 md:gap-2 overflow-x-auto">
            {([
              ['users',    'fas fa-users',         '사용자'],
              ['rooms',    'fas fa-door-open',      '회의실'],
              ['bookings', 'fas fa-calendar-check', '예약'],
            ] as [Tab, string, string][]).map(([t, icon, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-3 font-medium text-sm md:text-base whitespace-nowrap border-b-2 transition-all"
                style={{
                  color: tab === t ? '#2f4394' : '#6b7280',
                  borderBottomColor: tab === t ? '#2f4394' : 'transparent',
                }}>
                <i className={icon}></i>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        {tab === 'users'    && <UsersTab />}
        {tab === 'rooms'    && <RoomsTab />}
        {tab === 'bookings' && <BookingsTab />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// ── 사용자 탭 ──
// ══════════════════════════════════════════════
const ROLE_CONFIG: Record<string, { label: string; color: string; fa: string }> = {
  admin:  { label: '관리자', color: 'bg-purple-100 text-purple-800', fa: 'fas fa-crown' },
  user:   { label: '일반',   color: 'bg-gray-100 text-gray-800',     fa: 'fas fa-user' },
  tablet: { label: '태블릿', color: 'bg-green-100 text-green-800',   fa: 'fas fa-tablet-alt' },
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', departmentName: '', position: '', loginId: '', loginPassword: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&showAll=${showAll}`)
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search, showAll])

  useEffect(() => { load() }, [load])

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = () => setRoleDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', departmentName: '', position: '', loginId: '', loginPassword: '', role: 'user' })
    setShowForm(true)
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, departmentName: u.department?.name || '', position: u.position || '', loginId: u.loginId || '', loginPassword: '', role: u.role || 'user' })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { alert('이름과 이메일은 필수입니다.'); return }
    setSaving(true)
    const url = editUser ? `/api/admin/users/${editUser.id}` : '/api/admin/users'
    const body: Record<string, string> = { name: form.name, email: form.email, departmentName: form.departmentName, position: form.position, role: form.role }
    if (form.loginId) body.loginId = form.loginId
    if (form.loginPassword) body.loginPassword = form.loginPassword
    const res = await fetch(url, { method: editUser ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { setShowForm(false); load(); showToast(editUser ? '사용자가 수정되었습니다' : '사용자가 추가되었습니다', 'success') }
    else { const err = await res.json(); alert(err.error || '저장 실패') }
    setSaving(false)
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`"${u.name}"을 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    showToast(data.action === 'deactivated' ? '회의 이력이 있어 비활성화 처리되었습니다.' : '사용자가 삭제되었습니다.', 'success')
    load()
  }

  const handleToggleActive = async (u: User) => {
    await fetch(`/api/admin/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }) })
    load()
  }

  const handleRoleChange = async (u: User, newRole: string) => {
    setRoleDropdown(null)
    if (!confirm(`"${u.name}"의 권한을 "${ROLE_CONFIG[newRole]?.label}"(으)로 변경하시겠습니까?`)) return
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) })
    if (res.ok) { load(); showToast('권한이 변경되었습니다', 'success') }
    else { showToast('변경 실패', 'error') }
  }

  const handleUploadFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', 'upsert')
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (res.ok) {
      showToast(`${data.addedRows}명 추가, ${data.updatedRows}명 업데이트 완료`, 'success')
      setShowUpload(false)
      load()
    } else {
      showToast(data.error || '업로드 실패', 'error')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 헤더 */}
      <div className="p-4 md:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold">사용자 목록</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowUpload(true)}
            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
            <i className="fas fa-file-excel mr-1.5"></i>엑셀 업로드
          </button>
          <button onClick={openCreate}
            className="px-3 py-2 text-white rounded-lg text-sm" style={{ background: '#2f4394' }}>
            <i className="fas fa-plus mr-1.5"></i>사용자 추가
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="p-4 border-b flex flex-col sm:flex-row gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이름, 이메일 검색..."
          className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
          비활성 포함
        </label>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />로딩 중...
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">등록된 사용자가 없습니다</p>
        ) : (
          <>
            {/* 모바일: 카드 레이아웃 */}
            <div className="block md:hidden space-y-3">
              {users.map(u => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.user
                return (
                  <div key={u.id} className={`border rounded-lg p-4 bg-white shadow-sm ${!u.isActive ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{u.name}</h3>
                        <p className="text-sm text-gray-500">{u.position || ''}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${rc.color}`}>
                        <i className={`${rc.fa} mr-1`}></i>{rc.label}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm mb-3">
                      <p><i className="fas fa-building text-gray-400 w-4 mr-2"></i>{u.department?.name || '-'}</p>
                      <p><i className="fas fa-envelope text-gray-400 w-4 mr-2"></i>{u.email}</p>
                      {u.loginId && <p><i className="fas fa-id-card text-gray-400 w-4 mr-2"></i><code className="bg-gray-100 px-1 rounded text-xs">{u.loginId}</code></p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                        <i className="fas fa-edit mr-1"></i>수정
                      </button>
                      {/* 권한변경 드롭다운 */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setRoleDropdown(roleDropdown === `m-${u.id}` ? null : `m-${u.id}`)}
                          className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">
                          <i className="fas fa-user-shield"></i>
                        </button>
                        {roleDropdown === `m-${u.id}` && (
                          <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border z-30 min-w-[130px]">
                            {(['admin', 'user', 'tablet'] as const).filter(r => r !== u.role).map(r => (
                              <button key={r} onClick={() => handleRoleChange(u, r)}
                                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl">
                                <i className={`${ROLE_CONFIG[r].fa} text-xs`}></i>{ROLE_CONFIG[r].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleToggleActive(u)}
                        className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                        <i className={`fas ${u.isActive ? 'fa-lock' : 'fa-lock-open'}`}></i>
                      </button>
                      <button onClick={() => handleDelete(u)}
                        className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                        <i className="fas fa-trash mr-1"></i>삭제
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 데스크톱: 테이블 레이아웃 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">이름</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">부서</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">이메일</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">사번/ID</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">권한</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">상태</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(u => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.user
                    return (
                      <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{u.name}</div>
                          {u.position && <div className="text-xs text-gray-400">{u.position}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">{u.department?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm max-w-[160px] truncate">{u.email}</td>
                        <td className="px-4 py-3">
                          {u.loginId ? <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{u.loginId}</code> : <span className="text-gray-300 text-xs">미설정</span>}
                        </td>
                        {/* 권한 클릭 드롭다운 */}
                        <td className="px-4 py-3">
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setRoleDropdown(roleDropdown === u.id ? null : u.id)}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border cursor-pointer ${rc.color}`}
                              title="클릭하여 권한 변경">
                              <i className={`${rc.fa} text-xs`}></i>
                              {rc.label}
                              <i className="fas fa-chevron-down text-xs opacity-60"></i>
                            </button>
                            {roleDropdown === u.id && (
                              <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border z-30 min-w-[140px]">
                                {(['admin', 'user', 'tablet'] as const).filter(r => r !== u.role).map(r => (
                                  <button key={r} onClick={() => handleRoleChange(u, r)}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl">
                                    <i className={`${ROLE_CONFIG[r].fa} text-xs`}></i>
                                    <span>{ROLE_CONFIG[r].label}(으)로 변경</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {u.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(u)} title="수정"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <i className="fas fa-edit text-sm"></i>
                            </button>
                            <button onClick={() => handleToggleActive(u)} title={u.isActive ? '비활성화' : '활성화'}
                              className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg">
                              <i className={`fas ${u.isActive ? 'fa-lock' : 'fa-lock-open'} text-sm`}></i>
                            </button>
                            <button onClick={() => handleDelete(u)} title="삭제"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <i className="fas fa-trash text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t text-xs text-gray-400">총 {users.length}명</div>
            </div>
          </>
        )}
      </div>

      {/* 사용자 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-bold">{editUser ? '사용자 수정' : '사용자 추가'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="홍길동" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                  <input value={form.departmentName} onChange={e => setForm(f => ({ ...f, departmentName: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="개발팀" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                  <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="대리" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">로그인 ID</label>
                  <input value={form.loginId} onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호{editUser ? ' (변경시만)' : ' *'}</label>
                  <input type="password" value={form.loginPassword} onChange={e => setForm(f => ({ ...f, loginPassword: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="최소 6자" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">권한</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="user">일반 사용자</option>
                  <option value="admin">관리자</option>
                  <option value="tablet">태블릿</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border rounded-xl text-gray-700 font-medium hover:bg-gray-50 text-sm">취소</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                style={{ background: '#2f4394' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로드 모달 */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">사용자 엑셀 업로드</h3>
            <p className="text-sm text-gray-600 mb-4">엑셀 파일 형식: 성명, 이메일, 부서, 직급, 비밀번호</p>
            <form onSubmit={handleUploadFile}>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" required
                className="w-full mb-4 p-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">취소</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg text-sm" style={{ background: '#2f4394' }}>업로드</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// ── 회의실 탭 ──
// ══════════════════════════════════════════════
function RoomsTab() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [form, setForm] = useState({ name: '', location: '', description: '', capacity: 10, isTabletMode: false, tabletPinCode: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/rooms')
    const data = await res.json()
    setRooms(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditRoom(null)
    setForm({ name: '', location: '', description: '', capacity: 10, isTabletMode: false, tabletPinCode: '' })
    setShowForm(true)
  }

  const openEdit = (r: Room) => {
    setEditRoom(r)
    setForm({ name: r.name, location: r.location || '', description: r.description || '', capacity: r.capacity || 10, isTabletMode: r.isTabletMode, tabletPinCode: r.tabletPinCode || '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('회의실 이름을 입력하세요.'); return }
    setSaving(true)
    const url = editRoom ? `/api/admin/rooms/${editRoom.id}` : '/api/admin/rooms'
    const res = await fetch(url, { method: editRoom ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowForm(false); load(); showToast(editRoom ? '회의실이 수정되었습니다' : '회의실이 추가되었습니다', 'success') }
    else { alert('저장에 실패했습니다.') }
    setSaving(false)
  }

  const handleDelete = async (r: Room) => {
    if (!confirm(`"${r.name}" 회의실을 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/rooms/${r.id}`, { method: 'DELETE' })
    showToast('회의실이 삭제되었습니다', 'success')
    load()
  }

  const handleToggleActive = async (r: Room) => {
    await fetch(`/api/admin/rooms/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r, isActive: !r.isActive }) })
    load()
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 md:p-6 border-b flex items-center justify-between">
        <h2 className="text-lg font-bold">회의실 목록</h2>
        <button onClick={openCreate}
          className="px-4 py-2 text-white rounded-lg text-sm" style={{ background: '#2f4394' }}>
          <i className="fas fa-plus mr-1.5"></i>회의실 추가
        </button>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />로딩 중...
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">등록된 회의실이 없습니다</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(r => (
              <div key={r.id} className={`border rounded-lg p-4 ${!r.isActive ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: '#2f4394' }}>{r.name}</h3>
                    <p className="text-sm text-gray-500">{r.code}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {r.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm mb-3">
                  {r.location && <p><i className="fas fa-map-marker-alt text-gray-400 w-4 mr-1.5"></i>{r.location}</p>}
                  <p><i className="fas fa-users text-gray-400 w-4 mr-1.5"></i>{r.capacity}인</p>
                  {r.description && <p className="text-gray-500 text-xs">{r.description}</p>}
                </div>
                {/* 태블릿 바로가기 버튼 - 항상 표시 (활성 회의실만) */}
                {r.isActive && (
                  <button onClick={() => window.open(`/tablet/${r.code || r.id}`, '_blank')}
                    className="w-full px-3 py-2 text-white rounded-lg text-sm mb-2 flex items-center justify-center gap-1.5"
                    style={{ background: '#2f4394' }}>
                    <i className="fas fa-tablet-alt"></i>태블릿 화면
                    <i className="fas fa-external-link-alt text-xs opacity-60"></i>
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                    <i className="fas fa-edit mr-1"></i>수정
                  </button>
                  <button onClick={() => handleToggleActive(r)}
                    className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                    <i className={`fas ${r.isActive ? 'fa-lock' : 'fa-lock-open'}`}></i>
                  </button>
                  <button onClick={() => handleDelete(r)}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                    <i className="fas fa-trash mr-1"></i>삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 회의실 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-bold">{editRoom ? '회의실 수정' : '회의실 추가'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">회의실 이름 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 1층 대회의실" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 3층" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수용인원</label>
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 10 }))}
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" min={1} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2} placeholder="회의실 설명" />
              </div>
              <div className="border rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isTabletMode} onChange={e => setForm(f => ({ ...f, isTabletMode: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600" />
                  <div>
                    <div className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <i className="fas fa-tablet-alt text-purple-500 text-xs"></i>태블릿 고정 모드
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">회의실 태블릿에서 PIN으로 접근</div>
                  </div>
                </label>
                {form.isTabletMode && (
                  <div className="mt-3 pl-7">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">태블릿 PIN (4자리)</label>
                    <input value={form.tabletPinCode} onChange={e => setForm(f => ({ ...f, tabletPinCode: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1234" maxLength={4} type="text" inputMode="numeric" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border rounded-xl text-gray-700 font-medium hover:bg-gray-50 text-sm">취소</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                style={{ background: '#2f4394' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// ── 예약 탭 ──
// ══════════════════════════════════════════════
function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [filterRoom, setFilterRoom] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ date })
    if (filterRoom) params.set('roomId', filterRoom)
    if (filterStatus !== 'all') params.set('status', filterStatus)
    const data = await fetch(`/api/admin/bookings?${params}`).then(r => r.json())
    setBookings(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [date, filterRoom, filterStatus])

  useEffect(() => { fetch('/api/rooms').then(r => r.json()).then(d => setRooms(Array.isArray(d) ? d : [])) }, [])
  useEffect(() => { load() }, [load])

  const handleCancel = async (id: string) => {
    if (!confirm('이 예약을 취소하시겠습니까?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    showToast('예약이 취소되었습니다', 'success')
    load()
  }

  const filtered = bookings.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return b.title.toLowerCase().includes(q) || b.user.name.toLowerCase().includes(q) || b.room.name.toLowerCase().includes(q)
  })

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 md:p-6 border-b flex items-center justify-between">
        <h2 className="text-lg font-bold">전체 예약 목록</h2>
      </div>

      {/* 필터 */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">모든 회의실</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">모든 상태</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load}
            className="px-4 py-2 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
            style={{ background: '#2f4394' }}>
            <i className="fas fa-sync-alt"></i>새로고침
          </button>
        </div>
        <div className="mt-2">
          <input type="text" placeholder="회의명·예약자·회의실 검색..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />로딩 중...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8">조건에 맞는 예약이 없습니다</p>
        ) : (
          <>
            {/* 모바일: 카드 레이아웃 */}
            <div className="block md:hidden space-y-3">
              {filtered.map(b => (
                <div key={b.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold">{b.title}</h3>
                      <p className="text-xs text-gray-500">{b.room.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[b.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[b.status]?.label || b.status}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm mb-3">
                    <p><i className="fas fa-user text-gray-400 w-4 mr-1.5"></i>{b.user.name}</p>
                    <p><i className="fas fa-clock text-gray-400 w-4 mr-1.5"></i>{fmtTime(b.startTime)} ~ {fmtTime(b.endTime)}</p>
                  </div>
                  {b.status === 'confirmed' && (
                    <button onClick={() => handleCancel(b.id)}
                      className="w-full px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                      <i className="fas fa-times mr-1"></i>취소
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 데스크톱: 테이블 레이아웃 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">사용자</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">회의실</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">주제</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">시작 시간</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">종료 시간</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">상태</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{b.user.name}</td>
                      <td className="px-4 py-3">{b.room.name}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate">{b.title}</td>
                      <td className="px-4 py-3 text-sm">{fmtDateTime(b.startTime)}</td>
                      <td className="px-4 py-3 text-sm">{fmtDateTime(b.endTime)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[b.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[b.status]?.label || b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.status === 'confirmed' && (
                          <button onClick={() => handleCancel(b.id)}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium">
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t text-xs text-gray-400">총 {filtered.length}건</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
