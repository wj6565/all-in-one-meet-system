'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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

interface UploadResult {
  totalRows: number
  addedRows: number
  updatedRows: number
  errorRows: number
  errors: string[]
  preview: Array<{ name: string; email: string; department: string; position: string }>
}

type Tab = 'list' | 'upload'

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string; fa: string }> = {
  admin:  { label: '관리자', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '👑', fa: 'fas fa-crown' },
  user:   { label: '일반',   color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: '👤', fa: 'fas fa-user' },
  tablet: { label: '태블릿', color: 'bg-green-100 text-green-700 border-green-200',    icon: '📱', fa: 'fas fa-tablet-alt' },
}

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('list')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)

  // 모달 상태
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', departmentName: '', position: '',
    loginId: '', loginPassword: '', role: 'user',
  })
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 업로드 상태
  const [file, setFile] = useState<File | null>(null)
  const [uploadMode, setUploadMode] = useState<'upsert' | 'add-only'>('upsert')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&showAll=${showAll}`)
    const data = await res.json()
    setUsers(data)
    setSelectedIds(new Set())
    setLoading(false)
  }, [search, showAll])

  useEffect(() => { loadUsers() }, [loadUsers])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = () => setRoleDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => {
    setSelectedIds(selectedIds.size === users.length ? new Set() : new Set(users.map(u => u.id)))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`선택한 ${selectedIds.size}명을 삭제하시겠습니까?\n(회의 이력이 있는 사용자는 비활성화됩니다)`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    })
    const data = await res.json()
    alert(data.message)
    loadUsers()
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`"${user.name}"을 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.action === 'deactivated') alert('회의 이력이 있어 비활성화 처리되었습니다.')
    loadUsers()
  }

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', departmentName: '', position: '', loginId: '', loginPassword: '', role: 'user' })
    setShowPassword(false)
    setShowForm(true)
  }

  const openEdit = (user: User) => {
    setEditUser(user)
    setForm({
      name: user.name, email: user.email,
      departmentName: user.department?.name || '',
      position: user.position || '',
      loginId: user.loginId || '',
      loginPassword: '',
      role: user.role || 'user',
    })
    setShowPassword(false)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { alert('이름과 이메일은 필수입니다.'); return }
    setSaving(true)
    const url = editUser ? `/api/admin/users/${editUser.id}` : '/api/admin/users'
    const method = editUser ? 'PUT' : 'POST'
    const body: Record<string, string> = {
      name: form.name, email: form.email,
      departmentName: form.departmentName, position: form.position,
      role: form.role,
    }
    if (form.loginId) body.loginId = form.loginId
    if (form.loginPassword) body.loginPassword = form.loginPassword
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { setShowForm(false); loadUsers() }
    else { const err = await res.json(); alert(err.error || '저장 실패') }
    setSaving(false)
  }

  const handleToggleActive = async (user: User) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, email: user.email, isActive: !user.isActive }),
    })
    loadUsers()
  }

  const handleRoleChange = async (user: User, newRole: string) => {
    // confirm() 먼저 실행 (dropdown 닫기 전) → race condition 방지
    const label = ROLE_CONFIG[newRole]?.label || newRole
    if (!confirm(`"${user.name}"의 계정 유형을 "${label}"(으)로 변경하시겠습니까?`)) {
      setRoleDropdown(null)
      return
    }
    setRoleDropdown(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, email: user.email, role: newRole }),
    })
    if (res.ok) loadUsers()
    else alert('변경 실패')
  }

  // 업로드
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f); setUploadResult(null); setUploadError('')
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setUploadResult(null); setUploadError('') }
  }
  const handleUpload = async () => {
    if (!file) { setUploadError('파일을 선택하세요.'); return }
    setUploading(true); setUploadError(''); setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', uploadMode)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) setUploadError(data.error || '업로드 실패')
    else { setUploadResult(data); loadUsers() }
    setUploading(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-users text-blue-600" style={{ fontSize: '1.1rem' }}></i>
            사용자 관리
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">회의 참석자 등록 및 로그인 계정 관리</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap">
          <i className="fas fa-user-plus"></i> 사용자 추가
        </button>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-5">
        {([['list', 'fas fa-list', '사용자 목록'], ['upload', 'fas fa-file-excel', '엑셀 업로드']] as [Tab, string, string][]).map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            <i className={icon}></i> {label}
          </button>
        ))}
      </div>

      {/* ── 사용자 목록 탭 ── */}
      {tab === 'list' && (
        <>
          {/* 검색 + 필터 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
            <div className="relative flex-1 w-full">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="이름, 사번, 부서, 이메일 검색..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none whitespace-nowrap">
                <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
                비활성 포함
              </label>
              {selectedIds.size > 0 && (
                <button onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-2 rounded-xl text-sm transition-colors whitespace-nowrap">
                  <i className="fas fa-trash"></i> 삭제({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* PC 테이블 */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input type="checkbox"
                        checked={users.length > 0 && selectedIds.size === users.length}
                        onChange={toggleAll} className="rounded border-gray-300" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">성명</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">부서</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">이메일</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">사번/ID</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">구분</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">상태</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      로딩 중...
                    </td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16">
                      <i className="fas fa-user-slash text-5xl text-gray-300 mb-3 block"></i>
                      <p className="text-gray-400 mb-4">등록된 사용자가 없습니다</p>
                      <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                        <i className="fas fa-plus mr-1"></i>첫 사용자 추가
                      </button>
                    </td></tr>
                  ) : users.map(user => {
                    const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.user
                    return (
                      <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)} className="rounded border-gray-300" />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-gray-800 text-sm leading-tight">{user.name}</div>
                          {user.position && <div className="text-xs text-gray-400 mt-0.5">{user.position}</div>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[120px]">
                          <div className="text-sm text-gray-600 truncate" title={user.department?.name || ''}>
                            {user.department?.name || <span className="text-gray-300">-</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell max-w-[160px]">
                          <div className="text-xs text-gray-500 truncate" title={user.email}>{user.email}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          {user.loginId
                            ? <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{user.loginId}</code>
                            : <span className="text-gray-300 text-xs">미설정</span>}
                        </td>
                        {/* 구분(역할) - 클릭 드롭다운 */}
                        <td className="px-3 py-2.5">
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setRoleDropdown(roleDropdown === user.id ? null : user.id)}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border transition-all hover:shadow-sm ${roleConf.color}`}
                              title="클릭하여 역할 변경">
                              <i className={`${roleConf.fa} text-xs`}></i>
                              <span>{roleConf.label}</span>
                              <i className="fas fa-chevron-down text-xs opacity-60"></i>
                            </button>
                            {roleDropdown === user.id && (
                              <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-30 min-w-[130px]">
                                {(['admin', 'user', 'tablet'] as const).filter(r => r !== user.role).map(r => (
                                  <button key={r} onClick={() => handleRoleChange(user, r)}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors">
                                    <i className={`${ROLE_CONFIG[r].fa} text-xs`}></i>
                                    <span>{ROLE_CONFIG[r].label}(으)로 변경</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {user.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(user)} title="수정"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <i className="fas fa-edit text-sm"></i>
                            </button>
                            <button onClick={() => handleToggleActive(user)} title={user.isActive ? '비활성화' : '활성화'}
                              className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                              <i className={`fas ${user.isActive ? 'fa-lock' : 'fa-lock-open'} text-sm`}></i>
                            </button>
                            <button onClick={() => handleDelete(user)} title="삭제"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <i className="fas fa-trash text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {users.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400 flex justify-between">
                <span>총 {users.length}명</span>
                {selectedIds.size > 0 && <span className="text-blue-600 font-medium">{selectedIds.size}명 선택됨</span>}
              </div>
            )}
          </div>

          {/* 모바일 카드 목록 */}
          <div className="md:hidden space-y-2.5">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                로딩 중...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <i className="fas fa-user-slash text-4xl text-gray-300 mb-3 block"></i>
                <p className="text-gray-400">등록된 사용자가 없습니다</p>
              </div>
            ) : users.map(user => {
              const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.user
              return (
                <div key={user.id} className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm ${!user.isActive ? 'opacity-50' : ''}`}>
                  {/* 상단: 체크박스 + 이름 + 역할 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <input type="checkbox" checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)} className="rounded border-gray-300 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-800 text-sm leading-tight">
                          {user.name}
                          {user.position && <span className="text-xs text-gray-400 font-normal ml-1">({user.position})</span>}
                        </div>
                        {user.department?.name && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">{user.department.name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${roleConf.color}`}>
                        <i className={`${roleConf.fa} text-xs mr-1`}></i>{roleConf.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {user.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>
                  {/* 정보 */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {user.loginId && (
                      <span className="text-xs">
                        <i className="fas fa-id-card mr-1 text-gray-300"></i>
                        <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{user.loginId}</code>
                      </span>
                    )}
                    <span className="text-xs text-gray-400 truncate max-w-[180px]">
                      <i className="fas fa-envelope mr-1 text-gray-300"></i>{user.email}
                    </span>
                  </div>
                  {/* 버튼 행 */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={() => openEdit(user)}
                      className="flex items-center justify-center gap-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 col-span-1">
                      <i className="fas fa-edit"></i>
                    </button>
                    {/* 역할 변경 */}
                    <div className="relative col-span-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setRoleDropdown(roleDropdown === `m-${user.id}` ? null : `m-${user.id}`)}
                        className="w-full flex items-center justify-center gap-1 py-2 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600">
                        <i className="fas fa-user-shield"></i>
                      </button>
                      {roleDropdown === `m-${user.id}` && (
                        <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-gray-100 z-30 min-w-[130px]">
                          {(['admin', 'user', 'tablet'] as const).filter(r => r !== user.role).map(r => (
                            <button key={r} onClick={() => handleRoleChange(user, r)}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl">
                              <i className={`${ROLE_CONFIG[r].fa} text-xs`}></i>
                              {ROLE_CONFIG[r].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleToggleActive(user)}
                      className="flex items-center justify-center py-2 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600">
                      <i className={`fas ${user.isActive ? 'fa-lock' : 'fa-lock-open'}`}></i>
                    </button>
                    <button onClick={() => handleDelete(user)}
                      className="flex items-center justify-center py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              )
            })}
            {users.length > 0 && (
              <div className="text-center text-xs text-gray-400 py-2">총 {users.length}명</div>
            )}
          </div>
        </>
      )}

      {/* ── 엑셀 업로드 탭 ── */}
      {tab === 'upload' && (
        <div className="max-w-2xl">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
            <h3 className="font-bold text-blue-800 mb-3 text-sm flex items-center gap-2">
              <i className="fas fa-info-circle"></i> 업로드 규칙
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <div className="font-medium mb-1 text-xs text-blue-500 uppercase">필수</div>
                <div className="space-y-1 text-blue-600 text-xs">
                  <div>• <code className="bg-blue-100 px-1 rounded">성명</code> 또는 <code className="bg-blue-100 px-1 rounded">이름</code></div>
                  <div>• <code className="bg-blue-100 px-1 rounded">이메일</code></div>
                </div>
              </div>
              <div>
                <div className="font-medium mb-1 text-xs text-blue-500 uppercase">선택</div>
                <div className="space-y-1 text-blue-600 text-xs">
                  <div>• <code className="bg-blue-100 px-1 rounded">부서</code></div>
                  <div>• <code className="bg-blue-100 px-1 rounded">직급</code></div>
                </div>
              </div>
            </div>
            <button onClick={() => window.open('/api/download/sample/template', '_blank')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium">
              <i className="fas fa-download"></i> 샘플 템플릿 다운로드
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">업로드 방식</h3>
            <div className="space-y-2">
              {([
                ['upsert',    '신규 추가 + 기존 업데이트', '이미 등록된 이메일은 정보를 업데이트합니다'],
                ['add-only',  '신규 추가만',               '이미 등록된 이메일은 건너뜁니다'],
              ] as [string, string, string][]).map(([val, title, desc]) => (
                <label key={val} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                  <input type="radio" value={val} checked={uploadMode === val}
                    onChange={() => setUploadMode(val as 'upsert' | 'add-only')} className="mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-700 text-sm">{title}</div>
                    <div className="text-xs text-gray-400">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-4 ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
            }`}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div>
                <i className="fas fa-check-circle text-4xl text-green-500 mb-2 block"></i>
                <div className="font-semibold text-green-700 text-sm">{file.name}</div>
                <div className="text-green-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                <div className="text-gray-400 text-xs mt-2">클릭해서 다른 파일로 변경</div>
              </div>
            ) : (
              <div>
                <i className="fas fa-file-excel text-4xl text-gray-300 mb-2 block"></i>
                <div className="font-semibold text-gray-600 text-sm">엑셀 파일을 드래그하거나 클릭하세요</div>
                <div className="text-gray-400 text-xs mt-1">.xlsx, .xls 지원</div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i> {uploadError}
            </div>
          )}

          <button onClick={handleUpload} disabled={!file || uploading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-upload"></i>
            {uploading ? '업로드 중...' : '업로드 시작'}
          </button>

          {uploadResult && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-4 text-sm">업로드 결과</h3>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  ['전체',    uploadResult.totalRows,   'bg-gray-100 text-gray-700'],
                  ['신규',    uploadResult.addedRows,   'bg-green-100 text-green-700'],
                  ['업데이트', uploadResult.updatedRows, 'bg-blue-100 text-blue-700'],
                  ['오류',    uploadResult.errorRows,   'bg-red-100 text-red-700'],
                ].map(([label, value, cls]) => (
                  <div key={String(label)} className={`rounded-xl p-3 text-center ${cls}`}>
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-xs">{label}</div>
                  </div>
                ))}
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 max-h-28 overflow-y-auto">
                  {uploadResult.errors.map((e, i) => (
                    <div key={i} className="text-red-600 text-xs py-0.5">{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 사용자 추가/수정 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <i className={`fas ${editUser ? 'fa-user-edit' : 'fa-user-plus'} text-blue-600`}></i>
                {editUser ? '사용자 수정' : '사용자 추가'}
              </h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">성명 *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="홍길동" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">직급</label>
                  <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="과장" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">이메일 *</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  type="email"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="hong@company.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">부서</label>
                <input value={form.departmentName} onChange={e => setForm(f => ({ ...f, departmentName: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="개발팀" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase">로그인 계정 설정</div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">없으면 로그인 불가</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">로그인 ID (사번)</label>
                    <input value={form.loginId} onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="21000" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                      비밀번호 {editUser && <span className="text-gray-400 font-normal normal-case">(미입력시 유지)</span>}
                    </label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'}
                        value={form.loginPassword}
                        onChange={e => setForm(f => ({ ...f, loginPassword: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-10"
                        placeholder={editUser ? '변경시만 입력' : '비밀번호'} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 계정 유형 선택 */}
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">계정 유형</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['user',   'fas fa-user',       '일반 사용자', '회의 참석'],
                      ['admin',  'fas fa-crown',       '관리자',      '전체 관리'],
                      ['tablet', 'fas fa-tablet-alt',  '태블릿',      '회의실 전용'],
                    ] as [string, string, string, string][]).map(([val, icon, label, desc]) => (
                      <label key={val} className={`flex flex-col items-center gap-1 p-3 rounded-xl border cursor-pointer transition-colors text-center ${
                        form.role === val
                          ? val === 'admin' ? 'border-purple-400 bg-purple-50' : val === 'tablet' ? 'border-green-400 bg-green-50' : 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input type="radio" value={val} checked={form.role === val}
                          onChange={() => setForm(f => ({ ...f, role: val }))} className="sr-only" />
                        <i className={`${icon} text-lg ${
                          form.role === val
                            ? val === 'admin' ? 'text-purple-600' : val === 'tablet' ? 'text-green-600' : 'text-blue-600'
                            : 'text-gray-400'
                        }`}></i>
                        <div className={`font-semibold text-xs ${form.role === val ? 'text-gray-800' : 'text-gray-500'}`}>{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 text-sm">
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold text-sm transition-colors">
                {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i>저장 중...</> : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
