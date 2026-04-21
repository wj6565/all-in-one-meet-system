'use client'

import { useState, useEffect } from 'react'

interface Room {
  id: string
  name: string
  location: string | null
  description: string | null
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
  const [form, setForm] = useState({ name: '', location: '', description: '', isTabletMode: false, tabletPinCode: '' })
  const [saving, setSaving] = useState(false)

  const loadRooms = async () => {
    const res = await fetch('/api/admin/rooms')
    const data = await res.json()
    setRooms(data)
    setLoading(false)
  }

  useEffect(() => { loadRooms() }, [])

  const openCreate = () => {
    setEditRoom(null)
    setForm({ name: '', location: '', description: '', isTabletMode: false, tabletPinCode: '' })
    setShowForm(true)
  }

  const openEdit = (room: Room) => {
    setEditRoom(room)
    setForm({
      name: room.name,
      location: room.location || '',
      description: room.description || '',
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

    if (res.ok) {
      setShowForm(false)
      loadRooms()
    } else {
      alert('저장에 실패했습니다.')
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">회의실 관리</h1>
          <p className="text-slate-500 mt-1">회의실을 등록하고 관리합니다</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          + 회의실 추가
        </button>
      </div>

      {/* 회의실 목록 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">로딩 중...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="text-5xl mb-3">🏢</div>
          <p className="text-slate-500 mb-4">등록된 회의실이 없습니다</p>
          <button onClick={openCreate} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium">
            첫 번째 회의실 추가
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map(room => (
            <div key={room.id} className={`bg-white border rounded-2xl p-6 ${!room.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-lg">{room.name}</h3>
                    {room.isTabletMode && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">태블릿모드</span>
                    )}
                    {!room.isActive && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">비활성</span>
                    )}
                  </div>
                  {room.location && <p className="text-slate-500 text-sm mt-0.5">📍 {room.location}</p>}
                  {room.description && <p className="text-slate-400 text-xs mt-1">{room.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(room)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="수정"
                  >✏️</button>
                  <button
                    onClick={() => handleToggleActive(room)}
                    className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    title={room.isActive ? '비활성화' : '활성화'}
                  >{room.isActive ? '🔒' : '🔓'}</button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
                <span>회의 {room._count.meetings}건</span>
                {room.tabletPinCode && <span>PIN: {room.tabletPinCode}</span>}
                <span>등록: {new Date(room.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 회의실 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editRoom ? '회의실 수정' : '회의실 추가'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">회의실 이름 *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 1층 대회의실"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">위치</label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 본관 3층"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="회의실 설명 (선택)"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tabletMode"
                  checked={form.isTabletMode}
                  onChange={e => setForm(f => ({ ...f, isTabletMode: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="tabletMode" className="text-sm font-medium text-slate-700">
                  태블릿 고정 모드
                </label>
              </div>

              {form.isTabletMode && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">태블릿 PIN (4자리)</label>
                  <input
                    value={form.tabletPinCode}
                    onChange={e => setForm(f => ({ ...f, tabletPinCode: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 1234"
                    maxLength={4}
                    type="number"
                  />
                  <p className="text-xs text-slate-400 mt-1">태블릿에서 이 회의실에 접근할 때 사용할 PIN</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-medium transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
