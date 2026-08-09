'use client'

import { useEffect, useState } from 'react'
import { useLiff } from '../layout'
import { Truck, RefreshCw, ClipboardList, CheckCircle2, AlertCircle, Calendar, Store, ArrowUpRight } from 'lucide-react'
import { LiffLoading } from '@/components/liff/LiffLoading'
import { LiffError } from '@/components/liff/LiffError'
import { LiffHeader } from '@/components/liff/LiffHeader'

export default function LiffOperationsPage() {
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

        const res = await fetch('/api/liff/operations-report', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch operations report')
        const data = await res.json()
        setReport(data)
      } catch (err: any) {
        console.error(err)
        setError('ไม่สามารถดึงข้อมูลรายงานการดำเนินงานได้')
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

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      {/* Header Profile */}
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <LiffHeader user={user} title="รายงานการดำเนินงาน" />
      </div>

      {/* Main Content Cards */}
      <div className="px-4 -mt-6 relative z-20 space-y-5">
        
        {/* Active Point of Sales Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">จุดขายที่เปิดอยู่ทั้งหมด</div>
            <Store className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-slate-400 text-xs">จำนวนจุดขายรวม Active</div>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
              {report.activeChannelsCount.totalActive} <span className="text-lg font-medium text-slate-500">จุดขาย</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="bg-sky-50/50 rounded-xl p-3 text-center">
              <div className="text-[10px] font-bold text-sky-600 uppercase">🎪 อีเว้นท์ (Event)</div>
              <div className="text-lg font-extrabold text-sky-800 mt-1">{report.activeChannelsCount.totalEvents} จุด</div>
            </div>
            
            <div className="bg-indigo-50/50 rounded-xl p-3 text-center">
              <div className="text-[10px] font-bold text-indigo-600 uppercase">🏢 สาขา (Branch)</div>
              <div className="text-lg font-extrabold text-indigo-800 mt-1">{report.activeChannelsCount.totalBranches} จุด</div>
            </div>
          </div>
        </div>

        {/* Goods Shipment (การส่งสินค้า) Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-sky-500" /> การส่งสินค้า (ล่าสุดในระบบ)
            </h3>
            <span className="text-[10px] font-semibold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">
              ส่งของแล้ว {report.shipmentStats.totalChannelsWithShipments} จุดขาย
            </span>
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
            {report.shipments.map((ship: any) => (
              <div key={ship.id} className="py-3 first:pt-0 last:pb-0 space-y-1 font-sans">
                <div className="flex justify-between items-start">
                  <div className="max-w-[70%]">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {ship.channelCode} : {ship.channelName}
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> อัปเดต {formatDateTime(ship.updatedAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                      ship.status === 'received' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {ship.status === 'received' ? '✅ Received' : '🚚 Shipped'}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {ship.requestType === 'INITIAL' ? 'เบิกเริ่มต้น' : 'เบิกเพิ่ม (Top-up)'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {report.shipments.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่มีประวัติการส่งสินค้าล่าสุด</div>
            )}
          </div>
        </div>

        {/* Restocking Requests (การเบิกสินค้า/Top-up) Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-amber-500" /> คำขอเบิกจ่ายสินค้าค้างส่ง ({report.restockingRequests.length})
            </h3>
            <span className="text-[9px] font-medium text-slate-400">เรียงตาม Priority</span>
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
            {report.restockingRequests.map((req: any) => (
              <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2 font-sans">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.25 rounded-md ${
                        req.priorityGroup === 'EVENT' 
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                      }`}>
                        {req.priorityGroup === 'EVENT' ? 'P1: EVENT' : 'P2: BRANCH'}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {req.channelCode} : {req.channelName}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" /> ยื่นเมื่อ {formatDateTime(req.createdAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">
                      จำนวน {req.requestedQty.toLocaleString()} ชิ้น
                    </span>
                    <span className={`text-[9px] font-semibold mt-1 inline-block px-1.5 py-0.25 rounded ${
                      req.status === 'submitted' ? 'bg-amber-50 text-amber-600' :
                      req.status === 'approved' ? 'bg-blue-50 text-blue-600' :
                      req.status === 'allocated' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {report.restockingRequests.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่มีใบเบิกสินค้าค้างดำเนินการอยู่ในขณะนี้</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
