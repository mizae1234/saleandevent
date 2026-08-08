'use client'

import { useEffect, useState } from 'react'
import { useLiff } from '../layout'
import { Calendar, TrendingUp, Receipt, CreditCard, ChevronRight, BarChart3 } from 'lucide-react'

export default function LiffSalesPage() {
  const { user } = useLiff()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week'>('today')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { default: liff } = await import('@line/liff')
        const idToken = liff.getIDToken()
        if (!idToken) {
          throw new Error('Not authenticated')
        }

        let url = '/api/liff/sales-summary'
        const today = new Date().toISOString().split('T')[0]
        
        if (dateRange === 'today') {
          url += `?startDate=${today}&endDate=${today}`
        } else if (dateRange === 'yesterday') {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          url += `?startDate=${yesterdayStr}&endDate=${yesterdayStr}`
        } else if (dateRange === 'week') {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          const weekAgoStr = weekAgo.toISOString().split('T')[0]
          url += `?startDate=${weekAgoStr}&endDate=${today}`
        }

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch sales summary')
        const data = await res.json()
        setSummary(data)
      } catch (err: any) {
        console.error(err)
        setError('ไม่สามารถดึงข้อมูลยอดขายได้')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-sm text-slate-500 font-medium font-sans">กำลังดึงข้อมูลรายงาน...</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-red-500 text-5xl">⚠️</div>
        <p className="text-slate-700 font-semibold font-sans">{error || 'เกิดข้อผิดพลาด'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium font-sans hover:bg-indigo-700 transition-colors"
        >
          โหลดใหม่
        </button>
      </div>
    )
  }

  const fmt = (val: number) => {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <div className="flex items-center gap-3 relative z-10 mb-6">
          {user?.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm">👤</div>
          )}
          <div>
            <div className="text-xs text-white/70">สวัสดีคุณ</div>
            <div className="font-semibold text-sm">{user?.displayName || 'พนักงาน'} 👋</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-wide mb-5 relative z-10">รายงานสรุปยอดขาย</h1>

        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-xl relative z-10 border border-white/10">
          {(['today', 'yesterday', 'week'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setDateRange(tab)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                dateRange === tab ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:text-white'
              }`}
            >
              {tab === 'today' ? 'วันนี้' : tab === 'yesterday' ? 'เมื่อวาน' : '7 วันที่ผ่านมา'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-20 space-y-5">
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ภาพรวมยอดขาย</div>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-slate-400 text-xs">ยอดขายรวมสุทธิ</div>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
              ฿ {fmt(summary.totalAmount)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Receipt className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">จำนวนบิล</div>
                <div className="text-sm font-bold text-slate-700">{summary.totalSales} บิล</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">เฉลี่ย/บิล</div>
                <div className="text-sm font-bold text-slate-700">
                  ฿ {Math.round(summary.totalAmount / (summary.totalSales || 1)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ช่องทางการชำระเงิน</h3>
          
          <div className="space-y-3.5">
            {Object.entries(summary.byPayment).map(([method, data]: any) => {
              const pct = summary.totalAmount > 0 ? (data.amount / summary.totalAmount) * 100 : 0
              const label = method === 'cash' ? '💵 เงินสด' : method === 'transfer' ? '📱 โอนเงิน' : '💳 บัตรเครดิต'
              const color = method === 'cash' ? 'bg-amber-500' : method === 'transfer' ? 'bg-sky-500' : 'bg-violet-500'
              
              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <div className="space-x-1.5">
                      <span className="text-slate-400">({pct.toFixed(0)}%)</span>
                      <span className="font-bold text-slate-800">฿ {fmt(data.amount)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ยอดขายรายช่องทาง/อีเว้นท์</h3>
          
          <div className="divide-y divide-slate-100">
            {Object.values(summary.byChannel).map((ch: any) => (
              <div key={ch.name} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-xs font-bold text-slate-800">{ch.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{ch.count} บิล</div>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  ฿ {fmt(ch.amount)}
                </div>
              </div>
            ))}
            {Object.keys(summary.byChannel).length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4">ไม่มีข้อมูลยอดขายแยกสาขา</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
