'use client'

import { useState, useEffect } from 'react'

interface Room {
  id: string
  name: string
  location: string | null
  description: string | null
  capacity: number
  code: string | null
  isActive: boolean
  isTabletMode: boolean
  tabletPinCode: string | null
  _count: { meetings: number }
  createdAt: string
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [form, setForm] = useState({
    name: '', location: '', description: '',
    capacity: 10, isTabletMode: false, tabletPinCode: '',
  })
  const [saving, setSaving] = useState(false)

  const loadRooms = async () => {
    const res = await fetch('/api/admin/rooms')
    const data = await res.json()
    setRooms(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadRooms() }, [])

  const openCreate = () => {
    setEditRoom(null)
    setForm({ name: '', location: '', description: '', capacity: 10, isTabletMode: false, tabletPinCode: '' })
    setShowForm(true)
  }

  const openEdit = (room: Room) => {
    setEditRoom(room)
    setForm({
      name: room.name,
      location: room.location || '',
      description: room.description || '',
      capacity: room.capacity || 10,
      isTabletMode: room.isTabletMode,
      tabletPinCode: room.tabletPinCode || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('회의실 이름을 입력하세요.'); return }
    setSaving(true)
    const url = editRoom ? `/api/admin/rooms/${editRoom.id}` : '/api/admin/rooms'
    const method = editRoom ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowForm(false); loadRooms() }
    else { alert('저장에 실패했습니다.') }
    setSaving(false)
  }

  const handleToggleActive = async (room: Room) => {
    await fetch(`/api/admin/rooms/${room.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...room, isActive: !room.isActive }),
    })
    loadRooms()
  }

  const handleDelete = async (room: Room) => {
    if (!confirm(`"${room.name}" 회의실을 비활성화하시겠습니까?`)) return
    await fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
    loadRooms()
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-door-open text-blue-600" style={{ fontSize: '1.1rem' }}></i>
            회의실 관리
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">회의실을 등록하고 관리합니다</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap">
          <i className="fas fa-plus"></i> 회의실 추가
        </button>
      </div>

      {/* 회의실 목록 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          로딩 중...
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <i className="fas fa-door-open text-5xl text-slate-200 mb-3 block"></i>
          <p className="text-slate-500 mb-4">등록된 회의실이 없습니다</p>
          <button onClick={openCreate} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium text-sm">
            <i className="fas fa-plus mr-1"></i> 첫 번째 회의실 추가
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map(room => (
            <div key={room.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${
                !room.isActive ? 'opacity-60 border-slate-200' : 'border-slate-200'
              }`}>
              {/* 카드 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-base" style={{ color: '#2f4394' }}>
                      {room.name}
                    </h3>
                    {room.isTabletMode && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        <i className="fas fa-tablet-alt text-xs"></i> 태블릿
                      </span>
                    )}
                    {!room.isActive && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">비활성</span>
                    )}
                  </div>
                  {room.location && (
                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                      <i className="fas fa-map-marker-alt text-slate-400"></i>
                      <span className="truncate">{room.location}</span>
                    </p>
                  )}
                  {room.description && (
                    <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{room.description}</p>
                  )}
                </div>
                {/* 액션 버튼 */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button onClick={() => openEdit(room)} title="수정"
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <i className="fas fa-edit text-sm"></i>
                  </button>
                  <button onClick={() => handleToggleActive(room)} title={room.isActive ? '비활성화' : '활성화'}
                    className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                    <i className={`fas ${room.isActive ? 'fa-lock' : 'fa-lock-open'} text-sm`}></i>
                  </button>
                  <button onClick={() => handleDelete(room)} title="삭제"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>
              </div>

              {/* 정보 행 */}
              <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 pt-3 mb-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <i className="fas fa-users text-slate-300"></i> {room.capacity || 10}명
                </span>
                <span className="flex items-center gap-1">
                  <i className="fas fa-video text-slate-300"></i> 회의 {room._count.meetings}건
                </span>
                {room.tabletPinCode && (
                  <span className="flex items-center gap-1">
                    <i className="fas fa-key text-slate-300"></i> PIN: {room.tabletPinCode}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <i className="fas fa-calendar text-slate-300"></i>
                  {new Date(room.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>

              {/* 태블릿 바로가기 버튼 - 항상 표시 (레퍼런스 시스템과 동일) */}
              {room.isActive && (
                <button
                  onClick={() => window.open(`/tablet/${room.code || room.id}`, '_blank')}
                  className="w-full py-2 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ background: '#2f4394' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#263580')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#2f4394')}>
                  <i className="fas fa-tablet-alt"></i>
                  태블릿 화면
                  <i className="fas fa-external-link-alt text-xs opacity-60"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 회의실 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <i className={`fas ${editRoom ? 'fa-edit' : 'fa-plus-circle'} text-blue-600`}></i>
                {editRoom ? '회의실 수정' : '회의실 추가'}
              </h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  회의실 이름 *
                </label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="예: 1층 대회의실" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">위치</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="예: 본관 3층" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">수용인원</label>
                  <input type="number" value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 10 }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min={1} max={200} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">설명</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2} placeholder="회의실 설명 (선택)" />
              </div>

              <div className="border border-slate-100 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" id="tabletMode"
                    checked={form.isTabletMode}
                    onChange={e => setForm(f => ({ ...f, isTabletMode: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <i className="fas fa-tablet-alt text-purple-500 text-xs"></i>
                      태블릿 고정 모드
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">회의실 태블릿에서 PIN으로 접근</div>
                  </div>
                </label>
                {form.isTabletMode && (
                  <div className="mt-3 pl-7">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                      <i className="fas fa-key mr-1"></i>태블릿 PIN (4자리)
                    </label>
                    <input value={form.tabletPinCode}
                      onChange={e => setForm(f => ({ ...f, tabletPinCode: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="예: 1234" maxLength={4} type="text" pattern="[0-9]*"
                      inputMode="numeric" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 text-sm">
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
