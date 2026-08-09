'use client'

import { useEffect, useState } from 'react'
import { useLiff } from '../layout'
import { Store, Search, MapPin, Calendar, Target, User, Phone, ArrowRight, AlertCircle } from 'lucide-react'
import { LiffLoading } from '@/components/liff/LiffLoading'
import { LiffError } from '@/components/liff/LiffError'
import { LiffHeader } from '@/components/liff/LiffHeader'
import Link from 'next/link'

export default function LiffChannelsListPage() {
  const { user } = useLiff()
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EVENT' | 'BRANCH'>('ALL')

  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true)
      try {
        const { default: liff } = await import('@line/liff')
        const idToken = liff.getIDToken()
        if (!idToken) {
          throw new Error('Not authenticated')
        }

        const res = await fetch('/api/liff/channels-list', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch active channels')
        const data = await res.json()
        setChannels(data)
      } catch (err: any) {
        console.error(err)
        setError('ไม่สามารถดึงข้อมูลบูธ/สาขาได้')
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()
  }, [])

  if (loading) {
    return <LiffLoading />
  }

  if (error) {
    return <LiffError error={error} />
  }

  const fmtDate = (dStr: string | null) => {
    if (!dStr) return '-'
    const d = new Date(dStr)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  const filteredChannels = channels.filter(ch => {
    const matchSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (ch.location || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchType = typeFilter === 'ALL' || ch.type === typeFilter
    return matchSearch && matchType
  })

  const eventCount = channels.filter(ch => ch.type === 'EVENT').length
  const branchCount = channels.filter(ch => ch.type === 'BRANCH').length

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      {/* Header Profile */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <LiffHeader user={user} title="งานอีเว้นท์และสาขาที่เปิดอยู่" />

        {/* Tab selection */}
        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-xl relative z-10 border border-white/10 mt-2">
          {(['ALL', 'EVENT', 'BRANCH'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTypeFilter(tab)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === tab ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'ทั้งหมด' : tab === 'EVENT' ? '📍 อีเว้นท์' : '🏬 สาขาหลัก'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Card list */}
      <div className="px-4 -mt-6 relative z-20 space-y-4">
        
        {/* Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative z-30">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อบูธ, รหัส หรือสถานที่จัดงาน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-200/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/25 focus:border-indigo-500 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 grid grid-cols-2 gap-4 text-center">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📍 อีเว้นท์ทั้งหมด</span>
            <span className="text-lg font-extrabold text-indigo-600 block">{eventCount} บูธ</span>
          </div>
          <div className="space-y-0.5 border-l border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🏬 สาขาหลัก</span>
            <span className="text-lg font-extrabold text-slate-800 block">{branchCount} สาขา</span>
          </div>
        </div>

        {/* Channels listing */}
        <div className="space-y-3.5">
          {filteredChannels.map((ch) => (
            <div key={ch.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
              {/* Header card info */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">{ch.code}</span>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    {ch.type === 'EVENT' ? '📍' : '🏬'} {ch.name}
                  </h3>
                </div>
                <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full ${
                  ch.type === 'EVENT' 
                    ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}>
                  {ch.type === 'EVENT' ? 'อีเว้นท์' : 'สาขา'}
                </span>
              </div>

              {/* Detail fields */}
              <div className="grid grid-cols-1 gap-2.5 pt-3 border-t border-slate-100/60 text-xs text-slate-600 font-sans">
                {ch.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>สถานที่: {ch.location}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    ระยะเวลา: {fmtDate(ch.startDate)} {ch.type === 'EVENT' ? `ถึง ${fmtDate(ch.endDate)}` : 'เปิดบริการ'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>เป้ายอดขาย: {ch.salesTarget ? `฿${ch.salesTarget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}</span>
                </div>
                {ch.responsiblePersonName && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>ผู้รับผิดชอบ: {ch.responsiblePersonName}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  href={`/liff/channels/${ch.id}`}
                  className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100/80 active:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  📊 ดูข้อมูลดำเนินงานและยอดขาย <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {filteredChannels.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">ไม่พบบูธหรือสาขาที่ตรงตามคำค้นหา</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
