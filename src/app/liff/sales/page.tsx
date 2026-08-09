'use client'

import { useEffect, useState } from 'react'
import { useLiff } from '../layout'
import { Calendar, TrendingUp, Receipt, CreditCard, ChevronRight, BarChart3 } from 'lucide-react'
import { LiffLoading } from '@/components/liff/LiffLoading'
import { LiffError } from '@/components/liff/LiffError'
import { LiffHeader } from '@/components/liff/LiffHeader'

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
    return <LiffLoading />
  }

  if (error || !summary) {
    return <LiffError error={error} />
  }

  const fmt = (val: number) => {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <LiffHeader user={user} title="รายงานสรุปยอดขาย" />

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
              ฿ {fmt(Number(summary.summary.totalAmount))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Receipt className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">จำนวนบิล</div>
                <div className="text-sm font-bold text-slate-700">{summary.summary.totalBills} บิล</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">เฉลี่ย/บิล</div>
                <div className="text-sm font-bold text-slate-700">
                  ฿ {Math.round(Number(summary.summary.totalAmount) / (summary.summary.totalBills || 1)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ช่องทางการชำระเงิน</h3>
          
          <div className="space-y-3.5">
            {(summary.byPaymentMethod || []).map((data: any) => {
              const amount = Number(data.amount)
              const totalAmount = Number(summary.summary.totalAmount)
              const pct = totalAmount > 0 ? (amount / totalAmount) * 100 : 0
              const label = data.method === 'cash' ? '💵 เงินสด' : data.method === 'transfer' ? '📱 โอนเงิน' : '💳 บัตรเครดิต'
              const color = data.method === 'cash' ? 'bg-amber-500' : data.method === 'transfer' ? 'bg-sky-500' : 'bg-violet-500'
              
              return (
                <div key={data.method} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <div className="space-x-1.5">
                      <span className="text-slate-400">({pct.toFixed(0)}%)</span>
                      <span className="font-bold text-slate-800">฿ {fmt(amount)}</span>
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
            {(summary.byChannel || []).map((ch: any) => (
              <div key={ch.name} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 font-sans">
                <div>
                  <div className="text-xs font-bold text-slate-800">{ch.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{ch.count} บิล</div>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  ฿ {fmt(ch.amount)}
                </div>
              </div>
            ))}
            {(summary.byChannel || []).length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่มีข้อมูลยอดขายแยกสาขา</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
