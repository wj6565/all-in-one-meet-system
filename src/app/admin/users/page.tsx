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

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: '일반', color: 'bg-blue-100 text-blue-700' },
  tablet: { label: '태블릿', color: 'bg-purple-100 text-purple-700' },
}

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('list')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  // ── 체크박스 ──────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selectedIds.size === users.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(users.map(u => u.id)))
  }

  // ── 선택 삭제 ──────────────────────────────────────
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

  // ── 개별 삭제 ──────────────────────────────────────
  const handleDelete = async (user: User) => {
    if (!confirm(`"${user.name}"을 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.action === 'deactivated') alert('회의 이력이 있어 비활성화 처리되었습니다.')
    loadUsers()
  }

  // ── 폼 열기 ──────────────────────────────────────
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

  // ── 저장 ──────────────────────────────────────
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

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
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

  // ── 엑셀 업로드 ──────────────────────────────────────
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
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">사용자 관리</h1>
          <p className="text-gray-400 mt-0.5 text-sm">회의 참석자 등록 및 로그인 계정 관리</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          + 사용자 추가
        </button>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6">
        {([['list', '👥 사용자 목록'], ['upload', '📤 엑셀 업로드']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ───── 사용자 목록 탭 ───── */}
      {tab === 'list' && (
        <>
          {/* 검색 + 필터 */}
          <div className="flex items-center gap-3 mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름, 이메일, 부서, 아이디 검색..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
              비활성 포함
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-1.5"
              >
                🗑️ 선택 삭제 ({selectedIds.size}명)
              </button>
            )}
          </div>

          {/* 테이블 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedIds.size === users.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">성명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">부서 / 직급</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">이메일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">로그인 ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">구분</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">액션</th>
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
                    <div className="text-5xl mb-3">👤</div>
                    <p className="text-gray-400 mb-4">등록된 사용자가 없습니다</p>
                    <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                      첫 사용자 추가
                    </button>
                  </td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-sm">{user.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{user.department?.name || <span className="text-gray-300">-</span>}</div>
                      <div className="text-xs text-gray-400">{user.position || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.loginId
                        ? <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{user.loginId}</code>
                        : <span className="text-gray-300 text-xs">미설정</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ROLE_LABELS[user.role]?.color || 'bg-gray-100 text-gray-500'
                      }`}>
                        {ROLE_LABELS[user.role]?.label || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {user.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(user)}
                          className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="수정">
                          ✏️
                        </button>
                        <button onClick={() => handleToggleActive(user)}
                          className="p-1.5 text-gray-300 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title={user.isActive ? '비활성화' : '활성화'}>
                          {user.isActive ? '🔒' : '🔓'}
                        </button>
                        <button onClick={() => handleDelete(user)}
                          className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400 flex justify-between">
                <span>총 {users.length}명</span>
                {selectedIds.size > 0 && <span className="text-blue-600 font-medium">{selectedIds.size}명 선택됨</span>}
              </div>
            )}
          </div>
        </>
      )}

      {/* ───── 엑셀 업로드 탭 ───── */}
      {tab === 'upload' && (
        <div className="max-w-2xl">
          {/* 안내 */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
            <h3 className="font-bold text-blue-800 mb-3 text-sm">📋 업로드 규칙</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700 mb-4">
              <div>
                <div className="font-medium mb-1.5 text-xs text-blue-500 uppercase">필수</div>
                <div className="space-y-1 text-blue-600 text-xs">
                  <div>• <code className="bg-blue-100 px-1 rounded">성명</code> 또는 <code className="bg-blue-100 px-1 rounded">이름</code></div>
                  <div>• <code className="bg-blue-100 px-1 rounded">이메일</code></div>
                </div>
              </div>
              <div>
                <div className="font-medium mb-1.5 text-xs text-blue-500 uppercase">선택</div>
                <div className="space-y-1 text-blue-600 text-xs">
                  <div>• <code className="bg-blue-100 px-1 rounded">부서</code></div>
                  <div>• <code className="bg-blue-100 px-1 rounded">직급</code></div>
                </div>
              </div>
            </div>
            <button onClick={() => window.open('/api/download/sample/template', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium">
              📥 샘플 템플릿 다운로드
            </button>
          </div>

          {/* 업로드 방식 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">업로드 방식</h3>
            <div className="space-y-2">
              {([
                ['upsert', '신규 추가 + 기존 업데이트', '이미 등록된 이메일은 정보를 업데이트합니다'],
                ['add-only', '신규 추가만', '이미 등록된 이메일은 건너뜁니다'],
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

          {/* 드롭존 */}
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-4 ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
            }`}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">✅</div>
                <div className="font-semibold text-green-700 text-sm">{file.name}</div>
                <div className="text-green-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                <div className="text-gray-400 text-xs mt-2">클릭해서 다른 파일로 변경</div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📊</div>
                <div className="font-semibold text-gray-600 text-sm">엑셀 파일을 드래그하거나 클릭하세요</div>
                <div className="text-gray-400 text-xs mt-1">.xlsx, .xls 지원</div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">⚠️ {uploadError}</div>
          )}

          <button onClick={handleUpload} disabled={!file || uploading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-colors">
            {uploading ? '업로드 중...' : '📤 업로드 시작'}
          </button>

          {/* 결과 */}
          {uploadResult && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-4 text-sm">업로드 결과</h3>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[['전체', uploadResult.totalRows, 'bg-gray-100 text-gray-700'],
                  ['신규', uploadResult.addedRows, 'bg-green-100 text-green-700'],
                  ['업데이트', uploadResult.updatedRows, 'bg-blue-100 text-blue-700'],
                  ['오류', uploadResult.errorRows, 'bg-red-100 text-red-700']].map(([label, value, cls]) => (
                  <div key={String(label)} className={`rounded-xl p-3 text-center ${cls}`}>
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-xs">{label}</div>
                  </div>
                ))}
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 max-h-28 overflow-y-auto">
                  {uploadResult.errors.map((e, i) => <div key={i} className="text-red-600 text-xs py-0.5">{e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───── 사용자 추가/수정 모달 ───── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              {editUser ? '사용자 수정' : '사용자 추가'}
            </h2>

            <div className="space-y-4">
              {/* 기본 정보 */}
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

              {/* 로그인 계정 구분선 */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase">로그인 계정 설정</div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">없으면 로그인 불가</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">로그인 ID</label>
                    <input value={form.loginId} onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="hong123" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                      비밀번호 {editUser && <span className="text-gray-400 font-normal normal-case">(미입력시 유지)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.loginPassword}
                        onChange={e => setForm(f => ({ ...f, loginPassword: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-10"
                        placeholder={editUser ? '변경시만 입력' : '비밀번호'} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">계정 유형</label>
                  <div className="flex gap-2">
                    {[['user', '일반 사용자', '회의 참석 전용'], ['tablet', '태블릿', '회의실 전용 계정']].map(([val, label, desc]) => (
                      <label key={val} className={`flex-1 flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                        form.role === val ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input type="radio" value={val} checked={form.role === val}
                          onChange={() => setForm(f => ({ ...f, role: val }))} className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm text-gray-700">{label}</div>
                          <div className="text-xs text-gray-400">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 text-sm">
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold text-sm transition-colors">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
