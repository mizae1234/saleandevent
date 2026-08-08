'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLiff } from '../../layout'
import {
  MapPin, User, Phone, CheckCircle2, XCircle, ChevronLeft,
  Target, TrendingUp, Users, Package, Star, ChevronDown, ChevronUp
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChannelInfo {
  id: string; code: string; name: string; type: string
  location: string | null; startDate: string | null; endDate: string | null
  status: string; salesTarget: number
  responsiblePersonName: string | null; phone: string | null
}

interface StaffMember {
  id: string; code: string; name: string
  role: string; position: string | null; phone: string | null
  isCheckedIn: boolean
}

interface StockItem {
  barcode: string; name: string; code: string; size: string
  received: number; sold: number; returned: number; remaining: number
}

interface StockSummary {
  received: number; sold: number; returned: number; remaining: number
  detail: StockItem[]
}

interface TopProduct {
  barcode: string; name: string; code: string; size: string
  price: number; totalQty: number; totalAmount: number
}

interface ChannelData {
  channel: ChannelInfo
  staff: StaffMember[]
  sales: { summary: { totalAmount: number } } | null
  totalSales: { amount: number; billCount: number } | null
  stock: StockSummary | null
  topProducts: TopProduct[]
}

// ─── Utility ────────────────────────────────────────────────────────────────

const fmt = (val: number) =>
  val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const RANK_STYLES = [
  'bg-yellow-100 text-yellow-700',
  'bg-slate-100 text-slate-600',
  'bg-orange-100 text-orange-700',
  'bg-slate-50 text-slate-500',
  'bg-slate-50 text-slate-500',
] as const

// ─── Reusable Card ──────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
      {icon}
    </div>
  )
}

// ─── Section Components ─────────────────────────────────────────────────────

function SalesTargetCard({ todaySales, salesTarget }: { todaySales: number; salesTarget: number }) {
  const progressPct = salesTarget > 0 ? Math.min((todaySales / salesTarget) * 100, 100) : 0

  return (
    <Card>
      <CardHeader title="ความคืบหน้าเป้าหมาย" icon={<Target className="h-4 w-4 text-teal-500" />} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-slate-400">ยอดขายวันนี้</div>
          <div className="text-xl font-extrabold text-slate-800 mt-0.5">฿ {fmt(todaySales)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">เป้าหมายสะสม</div>
          <div className="text-xl font-extrabold text-slate-800 mt-0.5">
            ฿ {salesTarget ? fmt(salesTarget) : '-'}
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
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function TotalSalesCard({ totalSales }: { totalSales: { amount: number; billCount: number } }) {
  return (
    <Card>
      <CardHeader title="ยอดขายรวมทั้งหมด" icon={<TrendingUp className="h-4 w-4 text-blue-500" />} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-slate-400">ยอดขายสะสม</div>
          <div className="text-xl font-extrabold text-blue-600 mt-0.5">฿ {fmt(totalSales.amount)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">จำนวนบิล</div>
          <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totalSales.billCount)} บิล</div>
        </div>
      </div>
    </Card>
  )
}

function StockCard({ stock }: { stock: StockSummary }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <Card>
      <CardHeader title="สต็อกสินค้า" icon={<Package className="h-4 w-4 text-orange-500" />} />
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'รับเข้า', value: stock.received, color: 'text-slate-800' },
          { label: 'ขายแล้ว', value: stock.sold, color: 'text-emerald-600' },
          { label: 'คืนแล้ว', value: stock.returned, color: 'text-amber-600' },
          { label: 'คงเหลือ', value: stock.remaining, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="text-[10px] text-slate-400">{label}</div>
            <div className={`text-base font-bold ${color} mt-0.5`}>{fmt(value)}</div>
          </div>
        ))}
      </div>

      {stock.detail?.length > 0 && (
        <div>
          <button
            onClick={() => setShowDetail(prev => !prev)}
            className="flex items-center gap-1 text-xs text-teal-600 font-semibold w-full justify-center py-1"
          >
            {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showDetail ? 'ซ่อนรายละเอียด' : `ดูรายละเอียด (${stock.detail.length} รายการ)`}
          </button>
          {showDetail && (
            <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto">
              {stock.detail.map((item) => (
                <div key={item.barcode} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="font-medium text-slate-700 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.size} | {item.code}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-blue-600">{item.remaining}</span>
                    <span className="text-slate-400 ml-1">ชิ้น</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function TopProductsCard({ products }: { products: TopProduct[] }) {
  return (
    <Card>
      <CardHeader title="🏆 สินค้าขายดี Top 5" icon={<Star className="h-4 w-4 text-yellow-500" />} />
      <div className="space-y-2">
        {products.map((p, i) => (
          <div key={p.barcode} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${RANK_STYLES[i] || RANK_STYLES[4]}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-700 truncate">{p.name}</div>
              <div className="text-[10px] text-slate-400">{p.size} | ฿{fmt(p.price)}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold text-slate-800">{p.totalQty} ชิ้น</div>
              <div className="text-[10px] text-emerald-600">฿{fmt(p.totalAmount)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function StaffCard({ staff }: { staff: StaffMember[] }) {
  return (
    <Card>
      <CardHeader title="พนักงานประจำบูธ/สาขา" icon={<Users className="h-4 w-4 text-slate-400" />} />
      <div className="divide-y divide-slate-100">
        {staff.map((st) => (
          <div key={st.id} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0">
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
                <a href={`tel:${st.phone}`} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                st.isCheckedIn
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {st.isCheckedIn ? (
                  <><CheckCircle2 className="h-3 w-3" /><span>เข้างานแล้ว</span></>
                ) : (
                  <><XCircle className="h-3 w-3" /><span>ยังไม่เข้างาน</span></>
                )}
              </span>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-6">ไม่มีพนักงานประจำบูธนี้</div>
        )}
      </div>
    </Card>
  )
}

function ChannelInfoCard({ channel }: { channel: ChannelInfo }) {
  return (
    <Card>
      <CardHeader title="ข้อมูลทั่วไป" icon={<MapPin className="h-4 w-4 text-slate-400" />} />
      <div className="space-y-3.5 text-xs text-slate-600">
        <InfoRow icon={<MapPin className="h-4 w-4 text-slate-400" />} label="สถานที่" value={channel.location || 'ไม่ระบุ'} />
        {channel.responsiblePersonName && (
          <InfoRow icon={<User className="h-4 w-4 text-slate-400" />} label="ผู้รับผิดชอบ" value={channel.responsiblePersonName} />
        )}
        {channel.phone && (
          <div className="flex items-start gap-2.5">
            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-700">เบอร์ติดต่อสาขา</div>
              <div className="mt-0.5">
                <a href={`tel:${channel.phone}`} className="text-teal-600 hover:underline">{channel.phone}</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-semibold text-slate-700">{label}</div>
        <div className="mt-0.5 leading-relaxed">{value}</div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LiffChannelDetailsPage() {
  const { id } = useParams()
  const { user } = useLiff()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ChannelData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      setLoading(true)
      try {
        const { default: liff } = await import('@line/liff')
        const idToken = liff.getIDToken()
        if (!idToken) throw new Error('Not authenticated')

        const res = await fetch(`/api/liff/channels/${id}`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        })

        if (!res.ok) throw new Error('Failed to fetch event details')
        setData(await res.json())
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-500 font-medium">กำลังดึงข้อมูลอีเว้นท์...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-red-500 text-5xl">⚠️</div>
        <p className="text-slate-700 font-semibold">{error || 'เกิดข้อผิดพลาด'}</p>
        <button onClick={() => window.history.back()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          กลับย้อนหลัง
        </button>
      </div>
    )
  }

  const { channel, staff, sales, totalSales, stock, topProducts } = data
  const todaySales = Number(sales?.summary?.totalAmount) || 0

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 text-white px-5 pt-6 pb-12 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]" />
        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-white/80 hover:text-white mb-5 transition-all text-xs font-semibold relative z-10">
          <ChevronLeft className="h-4.5 w-4.5" /><span>ย้อนกลับ</span>
        </button>
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <span className="text-[10px] font-mono text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-300/20 uppercase">{channel.type}</span>
          <span className="text-[10px] font-mono text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-300/20">{channel.code}</span>
        </div>
        <h1 className="text-xl font-bold tracking-wide mb-1 relative z-10 leading-tight">{channel.name}</h1>
        <div className="flex items-center gap-1 text-xs text-teal-100/90 relative z-10">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{channel.location || 'ไม่ระบุสถานที่'}</span>
        </div>
      </div>

      {/* ── Content Cards ── */}
      <div className="px-4 -mt-6 relative z-20 space-y-5">
        <SalesTargetCard todaySales={todaySales} salesTarget={channel.salesTarget} />
        {totalSales && <TotalSalesCard totalSales={totalSales} />}
        {stock && <StockCard stock={stock} />}
        {topProducts?.length > 0 && <TopProductsCard products={topProducts} />}
        <StaffCard staff={staff} />
        <ChannelInfoCard channel={channel} />
      </div>
    </div>
  )
}
