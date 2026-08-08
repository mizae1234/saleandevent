'use client'

import { useEffect, useState, useCallback } from 'react'

interface ChatLog {
  id: string
  sourceType: string
  sourceId: string | null
  userName: string | null
  userMessage: string
  botReply: string | null
  inputTokens: number | null
  outputTokens: number | null
  modelName: string | null
  responseTimeMs: number | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ChatLogsPage() {
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null)

  const fetchLogs = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/chat-logs?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(1, '')
  }, [fetchLogs])

  const handleSearch = () => {
    setSearch(searchInput)
    fetchLogs(1, searchInput)
  }

  const goToPage = (page: number) => {
    fetchLogs(page, search)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
  }

  const truncate = (text: string | null, maxLen: number) => {
    if (!text) return '—'
    return text.length > maxLen ? text.substring(0, maxLen) + '…' : text
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">💬 Chat Logs</h1>
          <p className="text-sm text-slate-500 mt-1">ประวัติการสนทนากับ Saran Bot — ทั้งหมด {pagination.total} รายการ</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ค้นหาชื่อ / ข้อความ..."
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-40">เวลา</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">ผู้ใช้</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">ข้อความ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">คำตอบ Bot</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">Tokens</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-20">เวลาตอบ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700 truncate max-w-[120px]">
                        {log.userName || 'ไม่ทราบชื่อ'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {log.sourceType === 'user' ? '👤 DM' : log.sourceType === 'group' ? '👥 Group' : '💬 ' + log.sourceType}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[250px]">
                      <div className="truncate">{truncate(log.userMessage, 80)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[300px]">
                      <div className="truncate">{truncate(log.botReply, 100)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                      {(log.inputTokens || 0) + (log.outputTokens || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                      <span className={`${(log.responseTimeMs || 0) > 5000 ? 'text-red-500' : 'text-slate-500'}`}>
                        {log.responseTimeMs ? `${(log.responseTimeMs / 1000).toFixed(1)}s` : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">
              หน้า {pagination.page} จาก {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-white"
              >
                ← ก่อนหน้า
              </button>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-white"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">💬 รายละเอียดการสนทนา</h2>
                <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">ผู้ใช้</div>
                  <div className="font-medium">{selectedLog.userName || 'ไม่ทราบชื่อ'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">เวลา</div>
                  <div className="font-medium">{formatDate(selectedLog.createdAt)}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Source</div>
                  <div className="font-medium">{selectedLog.sourceType} / {selectedLog.sourceId?.substring(0, 12)}...</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Token / เวลาตอบ</div>
                  <div className="font-medium">
                    {(selectedLog.inputTokens || 0) + (selectedLog.outputTokens || 0)} tokens
                    {selectedLog.responseTimeMs ? ` / ${(selectedLog.responseTimeMs / 1000).toFixed(1)}s` : ''}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-blue-600 mb-1">👤 ผู้ใช้ถาม:</div>
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedLog.userMessage}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-600 mb-1">🤖 Saran ตอบ:</div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedLog.botReply || '(ไม่มีคำตอบ)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
