'use client'

import { useEffect, useState, Suspense } from 'react'
import { useLiff } from '../layout'
import { useSearchParams } from 'next/navigation'
import { Truck, ClipboardList, Calendar, Store } from 'lucide-react'
import { LiffLoading } from '@/components/liff/LiffLoading'
import { LiffError } from '@/components/liff/LiffError'
import { LiffHeader } from '@/components/liff/LiffHeader'

function OperationsPageContent() {
  const { user } = useLiff()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'channels' | 'shipments' | 'restocking'>('channels')

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('ALL')

  useEffect(() => {
    if (tabParam === 'shipments' || tabParam === 'restocking' || tabParam === 'channels') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Reset filters when changing tabs
  useEffect(() => {
    setSearchQuery('')
    setFilterType('ALL')
  }, [activeTab])

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

  // Define tab specific styles
  const tabStyles = {
    channels: {
      bgGradient: 'from-indigo-700 via-indigo-600 to-violet-800',
      activeTabBg: 'bg-indigo-600 text-white shadow-sm font-extrabold',
      title: 'จุดขายที่เปิดอยู่',
      accentColor: 'emerald-500'
    },
    shipments: {
      bgGradient: 'from-emerald-700 via-teal-600 to-cyan-700',
      activeTabBg: 'bg-teal-600 text-white shadow-sm font-extrabold',
      title: 'รายงานการส่งสินค้า',
      accentColor: 'sky-500'
    },
    restocking: {
      bgGradient: 'from-orange-600 via-amber-600 to-orange-700',
      activeTabBg: 'bg-orange-600 text-white shadow-sm font-extrabold',
      title: 'คิวเบิกสินค้า / Top-up',
      accentColor: 'amber-500'
    }
  }

  // Filter lists based on inputs
  const filteredChannels = (report.activeChannelsCount.list || []).filter((ch: any) => {
    const matchesSearch = 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ch.location || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'ALL' || ch.type === filterType
    return matchesSearch && matchesFilter
  })

  const filteredShipments = (report.shipments || []).filter((ship: any) => {
    const matchesSearch = 
      ship.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ship.channelCode.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'ALL' || ship.status === filterType
    return matchesSearch && matchesFilter
  })

  const filteredRestocking = (report.restockingRequests || []).filter((req: any) => {
    const matchesSearch = 
      req.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.channelCode.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'ALL' || req.status === filterType
    return matchesSearch && matchesFilter
  })

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      {/* Header Profile */}
      <div className={`bg-gradient-to-br ${tabStyles[activeTab].bgGradient} text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg relative overflow-hidden transition-all duration-500`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <LiffHeader user={user} title={tabStyles[activeTab].title} />
      </div>

      {/* Tabs navigation */}
      <div className="px-4 -mt-6 relative z-30 mb-4">
        <div className="flex bg-white/90 backdrop-blur p-1 rounded-2xl border border-slate-200/80 shadow-md">
          {(['channels', 'shipments', 'restocking'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab 
                  ? tabStyles[activeTab].activeTabBg
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'channels' ? 'จุดขาย' : tab === 'shipments' ? 'การส่งสินค้า' : 'คิวเบิกสินค้า'}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filter bar */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={
                activeTab === 'channels' ? '🔍 ค้นหาชื่อจุดขาย รหัส หรือสถานที่...' :
                activeTab === 'shipments' ? '🔍 ค้นหาชื่อ หรือรหัสจุดขาย...' :
                '🔍 ค้นหาชื่อ หรือรหัสจุดขาย...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-200/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/25 focus:border-emerald-500 font-medium font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 font-sans"
              >
                ✕
              </button>
            )}
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-2 text-[11px] bg-slate-50 border border-slate-200/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/25 focus:border-emerald-500 font-semibold text-slate-600 font-sans"
          >
            {activeTab === 'channels' && (
              <>
                <option value="ALL">ประเภท: ทั้งหมด</option>
                <option value="EVENT">🎪 อีเว้นท์</option>
                <option value="BRANCH">🏢 สาขาหลัก</option>
              </>
            )}
            {activeTab === 'shipments' && (
              <>
                <option value="ALL">สถานะ: ทั้งหมด</option>
                <option value="shipped">🚚 Shipped</option>
                <option value="received">✅ Received</option>
              </>
            )}
            {activeTab === 'restocking' && (
              <>
                <option value="ALL">สถานะ: ทั้งหมด</option>
                <option value="submitted">SUBMITTED</option>
                <option value="approved">APPROVED</option>
                <option value="allocated">ALLOCATED</option>
                <option value="packed">PACKED</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="px-4 relative z-20 space-y-4">
        
        {/* Active Point of Sales Summary */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">สรุปจำนวนจุดขาย</div>
                <Store className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">จำนวนจุดขายรวม Active ทั้งหมด</div>
                <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {report.activeChannelsCount.totalActive} <span className="text-lg font-medium text-slate-500 font-sans">จุดขาย</span>
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

            {/* List of Active Channels */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                รายชื่อจุดขายที่เปิดอยู่ ({filteredChannels.length})
              </h3>
              
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
                {filteredChannels.map((ch: any) => (
                  <div key={ch.id} className="py-3 first:pt-0 last:pb-0 space-y-1 font-sans">
                    <div className="flex justify-between items-start">
                      <div className="max-w-[70%]">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {ch.type === 'EVENT' ? '🎪' : '🏢'} {ch.code} : {ch.name}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5 block truncate">
                          📍 {ch.location || '-'} {ch.responsiblePersonName ? `| 👤 ${ch.responsiblePersonName}` : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                          ch.type === 'EVENT' 
                            ? 'bg-sky-50 text-sky-600 border border-sky-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {ch.type === 'EVENT' ? 'EVENT' : 'BRANCH'}
                        </span>
                        {ch.startDate && (
                          <span className="text-[8px] text-slate-400 block mt-1">
                            {new Date(ch.startDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredChannels.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่พบจุดขายตรงตามเงื่อนไขการค้นหา</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Goods Shipment (การส่งสินค้า) Card */}
        {activeTab === 'shipments' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-sky-500" /> รายการจัดส่งล่าสุด ({filteredShipments.length})
              </h3>
              <span className="text-[10px] font-semibold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">
                ส่งแล้ว {report.shipmentStats.totalChannelsWithShipments} จุดขาย
              </span>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredShipments.map((ship: any) => (
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
              {filteredShipments.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่พบประวัติการส่งสินค้าตรงตามเงื่อนไข</div>
              )}
            </div>
          </div>
        )}

        {/* Restocking Requests (การเบิกสินค้า/Top-up) Card */}
        {activeTab === 'restocking' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-amber-500" /> คิวคำขอค้างส่งสินค้า ({filteredRestocking.length})
              </h3>
              <span className="text-[9px] font-medium text-slate-400">เรียงตาม Priority</span>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredRestocking.map((req: any) => (
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
              {filteredRestocking.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-4 font-sans">ไม่พบคิวเบิกสินค้าตามเงื่อนไข</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function LiffOperationsPage() {
  return (
    <Suspense fallback={<LiffLoading />}>
      <OperationsPageContent />
    </Suspense>
  )
}
