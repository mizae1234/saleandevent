'use client'

import { useEffect, useState, useCallback } from 'react'

interface LineUser {
  id: string
  lineUserId: string
  displayName: string | null
  pictureUrl: string | null
  role: string
  isActive: boolean
  lastActiveAt: string
  createdAt: string
  updatedAt: string
}

const ROLE_OPTIONS = ['ADMIN', 'USER', 'BLOCKED'] as const
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  USER: 'bg-blue-100 text-blue-700 border-blue-200',
  BLOCKED: 'bg-red-100 text-red-700 border-red-200',
}

export default function LineUsersPage() {
  const [users, setUsers] = useState<LineUser[]>([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchUsers = useCallback(async (searchTerm: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/line-users?${params}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers('')
  }, [fetchUsers])

  const handleSearch = () => {
    setSearch(searchInput)
    fetchUsers(searchInput)
  }

  const updateRole = async (lineUserId: string, newRole: string) => {
    setUpdating(lineUserId)
    try {
      await fetch('/api/line-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, role: newRole }),
      })
      fetchUsers(search)
    } catch (err) {
      console.error(err)
      alert('เปลี่ยน role ไม่สำเร็จ')
    } finally {
      setUpdating(null)
    }
  }

  const toggleActive = async (lineUserId: string, currentActive: boolean) => {
    setUpdating(lineUserId)
    try {
      await fetch('/api/line-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, isActive: !currentActive }),
      })
      fetchUsers(search)
    } catch (err) {
      console.error(err)
      alert('เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'เมื่อสักครู่'
    if (mins < 60) return `${mins} นาทีที่แล้ว`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ชม.ที่แล้ว`
    const days = Math.floor(hours / 24)
    return `${days} วันที่แล้ว`
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">👤 Line Users</h1>
          <p className="text-sm text-slate-500 mt-1">
            ผู้ใช้งาน Line OA Bot — ทั้งหมด {users.length} คน
            {' · '}
            <span className="text-purple-600">{users.filter(u => u.role === 'ADMIN').length} Admin</span>
            {' · '}
            <span className="text-blue-600">{users.filter(u => u.role === 'USER').length} User</span>
            {' · '}
            <span className="text-red-600">{users.filter(u => u.role === 'BLOCKED').length} Blocked</span>
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ค้นหาชื่อ / Line ID..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            ค้นหา
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-slate-400">ไม่พบข้อมูลผู้ใช้</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <div
              key={user.id}
              className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
                !user.isActive ? 'opacity-50 border-slate-300' : 'border-slate-200 hover:shadow-md'
              }`}
            >
              {/* User Header */}
              <div className="flex items-center gap-3 mb-3">
                {user.pictureUrl ? (
                  <img
                    src={user.pictureUrl}
                    alt={user.displayName || ''}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xl">
                    👤
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate">
                    {user.displayName || 'ไม่ทราบชื่อ'}
                  </div>
                  <div className="text-xs text-slate-400 truncate font-mono">
                    {user.lineUserId.substring(0, 16)}...
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.USER}`}>
                  {user.role}
                </span>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                <div>
                  <span className="text-slate-400">เข้าใช้ล่าสุด: </span>
                  <span className="font-medium">{timeAgo(user.lastActiveAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400">สมัครเมื่อ: </span>
                  <span className="font-medium">{formatDate(user.createdAt).split(' ')[0]}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <select
                  value={user.role}
                  onChange={e => updateRole(user.lineUserId, e.target.value)}
                  disabled={updating === user.lineUserId}
                  className="flex-1 px-2 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <button
                  onClick={() => toggleActive(user.lineUserId, user.isActive)}
                  disabled={updating === user.lineUserId}
                  className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                    user.isActive
                      ? 'text-red-600 border-red-200 hover:bg-red-50'
                      : 'text-green-600 border-green-200 hover:bg-green-50'
                  }`}
                >
                  {user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
