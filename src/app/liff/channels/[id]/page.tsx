'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLiff } from '../../layout'
import { MapPin, User, Phone, CheckCircle2, XCircle, ChevronLeft, Target, TrendingUp, Users } from 'lucide-react'

export default function LiffChannelDetailsPage() {
  const { id } = useParams()
  const { user } = useLiff()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      setLoading(true)
      try {
        const { default: liff } = await import('@line/liff')
        const idToken = liff.getIDToken()
        if (!idToken) {
          throw new Error('Not authenticated')
        }

        const res = await fetch(`/api/liff/channels/${id}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch event details')
        const resData = await res.json()
        setData(resData)
      } catch (err: any) {
        console.error(err)
        setError('ไม่สามารถดึงข้อมูลอีเว้นท์/สาขานี้ได้')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-sm text-slate-500 font-medium font-sans">กำลังดึงข้อมูลอีเว้นท์...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-red-500 text-5xl">⚠️</div>
        <p className="text-slate-700 font-semibold font-sans">{error || 'เกิดข้อผิดพลาด'}</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium font-sans hover:bg-indigo-700 transition-colors"
        >
          กลับย้อนหลัง
        </button>
      </div>
    )
  }

  const { channel, staff, sales } = data
  const todaySales = Number(sales?.summary?.totalAmount) || 0
  const salesTarget = channel.salesTarget || 0
  const progressPct = salesTarget > 0 ? Math.min((todaySales / salesTarget) * 100, 100) : 0

  const fmt = (val: number) => {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 text-white px-5 pt-6 pb-12 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-white/80 hover:text-white mb-5 transition-all text-xs font-semibold font-sans"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
          <span>ย้อนกลับ</span>
        </button>

        <div className="flex items-center gap-2 mb-2 relative z-10">
          <span className="text-[10px] font-mono text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-300/20 uppercase font-sans">
            {channel.type}
          </span>
          <span className="text-[10px] font-mono text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-300/20 font-sans">
            {channel.code}
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-wide mb-1 relative z-10 leading-tight font-sans">
          {channel.name}
        </h1>
        
        <div className="flex items-center gap-1 text-xs text-teal-100/90 relative z-10 font-sans">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{channel.location || 'ไม่ระบุสถานที่'}</span>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-20 space-y-5">
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ความคืบหน้าเป้าหมาย</div>
            <Target className="h-4 w-4 text-teal-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-slate-400">ยอดขายวันนี้</div>
              <div className="text-xl font-extrabold text-slate-800 mt-0.5">฿ {fmt(todaySales)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">เป้าหมายสะสม</div>
              <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                ฿ {channel.salesTarget ? fmt(channel.salesTarget) : '-'}
              </div>
            </div>
          </div>

          {salesTarget > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">คิดเป็น</span>
                <span className="font-bold text-teal-600">{progressPct.toFixed(1)}% ของเป้าหมาย</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">พนักงานประจำบูธ/สาขา</h3>
            <Users className="h-4 w-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {staff.map((st: any) => (
              <div key={st.id} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0 font-sans">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    st.isCheckedIn ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {st.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{st.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{st.position || st.role}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {st.phone && (
                    <a 
                      href={`tel:${st.phone}`} 
                      className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    st.isCheckedIn 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {st.isCheckedIn ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>เข้างานแล้ว</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        <span>ยังไม่เข้างาน</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-6">ไม่มีพนักงานประจำบูธนี้</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ข้อมูลทั่วไป</h3>
          
          <div className="space-y-3.5 text-xs text-slate-600 font-sans">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-700">สถานที่</div>
                <div className="mt-0.5 leading-relaxed">{channel.location || 'ไม่ระบุ'}</div>
              </div>
            </div>

            {channel.responsiblePersonName && (
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-700">ผู้รับผิดชอบ</div>
                  <div className="mt-0.5">{channel.responsiblePersonName}</div>
                </div>
              </div>
            )}

            {channel.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-700">เบอร์ติดต่อสาขา</div>
                  <div className="mt-0.5">
                    <a href={`tel:${channel.phone}`} className="text-teal-600 hover:underline">
                      {channel.phone}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
