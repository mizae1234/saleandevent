'use client'

import { useEffect, useState } from 'react'
import { useLiff } from '../layout'
import { Calendar, TrendingUp, Receipt, ChevronRight, BarChart3, Clock, AlertTriangle, Store } from 'lucide-react'
import { LiffLoading } from '@/components/liff/LiffLoading'
import { LiffError } from '@/components/liff/LiffError'
import { LiffHeader } from '@/components/liff/LiffHeader'

export default function LiffOverviewPage() {
  const { user } = useLiff()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      try {
        const { default: liff } = await import('@line/liff')
        const idToken = liff.getIDToken()
        if (!idToken) {
          throw new Error('Not authenticated')
        }

        const res = await fetch('/api/liff/overview-report', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch overview report')
        const data = await res.json()
        setReport(data)
      } catch (err: any) {
        console.error(err)
        setError('ไม่สามารถดึงข้อมูลรายงานภาพรวมได้')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [])

  if (loading) {
    return <LiffLoading />
  }

  if (error || !report) {
    return <LiffError error={error} />
  }

  const fmt = (val: number) => {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      {/* Header Profile */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <LiffHeader user={user} title="สรุปภาพรวมธุรกิจ" />
      </div>

      {/* Main Content Cards */}
      <div className="px-4 -mt-6 relative z-20 space-y-5">
        
        {/* Sales Overview Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ภาพรวมยอดขายรวมระบบ</div>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-slate-400 text-xs">ยอดขายรวมสุทธิทั้งหมด</div>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
              ฿ {fmt(report.totalSales)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Receipt className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">จำนวนบิลทั้งหมด</div>
                <div className="text-sm font-bold text-slate-700">{report.totalBills} บิล</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">เฉลี่ยต่อบิล</div>
                <div className="text-sm font-bold text-slate-700">
                  ฿ {Math.round(report.totalSales / (report.totalBills || 1)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ongoing Events Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="h-4 w-4 text-sky-500" /> งานที่กำลังดำเนินการ ({report.ongoingEvents.length})
            </h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            {report.ongoingEvents.map((ev: any) => (
              <div key={ev.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5 font-sans">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {ev.code} : {ev.name}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> {ev.startDate} ถึง {ev.endDate}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-indigo-600 block">
                      ฿ {fmt(ev.salesAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {report.ongoingEvents.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่มีงานอีเว้นท์ที่กำลังจัดรายการอยู่ในขณะนี้</div>
            )}
          </div>
        </div>

        {/* Past Due Events Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" /> งานที่เลยกำหนดแต่ยังไม่ปิดงาน ({report.pastDueEvents.length})
            </h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            {report.pastDueEvents.map((ev: any) => (
              <div key={ev.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5 font-sans">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {ev.code} : {ev.name}
                    </span>
                    <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-red-400" /> เลยกำหนดเมื่อ {ev.endDate}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-600 block">
                      ฿ {fmt(ev.salesAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {report.pastDueEvents.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่มีงานอีเว้นท์ที่เลยกำหนดค้างปิดงาน</div>
            )}
          </div>
        </div>

        {/* Top 5 Branches Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5 อันดับสาขาหลักมียอดขายสูงสุด</h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            {report.topBranches.map((br: any, index: number) => (
              <div key={br.id} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0 font-sans">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-slate-100 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {br.code} : {br.name}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  ฿ {fmt(br.salesAmount)}
                </div>
              </div>
            ))}
            {report.topBranches.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่มีข้อมูลยอดขายแยกสาขา</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
