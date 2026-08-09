'use client'

import { useEffect, useState } from 'react'
import { useLiff } from '../layout'
import { Package, Search, Store, Layers, Building2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { LiffLoading } from '@/components/liff/LiffLoading'
import { LiffError } from '@/components/liff/LiffError'
import { LiffHeader } from '@/components/liff/LiffHeader'

export default function LiffStockPage() {
  const { user } = useLiff()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<'channels' | 'products'>('channels')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true)
      try {
        const { default: liff } = await import('@line/liff')
        const idToken = liff.getIDToken()
        if (!idToken) {
          throw new Error('Not authenticated')
        }

        const res = await fetch('/api/liff/stock-report', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch stock status')
        const stockData = await res.json()
        setData(stockData)
      } catch (err: any) {
        console.error(err)
        setError('ไม่สามารถดึงข้อมูลสต็อกสินค้าได้')
      } finally {
        setLoading(false)
      }
    }

    fetchStock()
  }, [])

  if (loading) {
    return <LiffLoading />
  }

  if (error || !data) {
    return <LiffError error={error} />
  }

  // Toggle accordion expansion
  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Extract all categories for filtering
  const categories = ['all']
  data.channels.forEach((ch: any) => {
    ch.items.forEach((item: any) => {
      if (item.category && !categories.includes(item.category)) {
        categories.push(item.category)
      }
    })
  })

  // Get aggregated products for the "Products" tab
  const getAggregatedProducts = () => {
    const prodMap: Record<string, {
      barcode: string
      name: string
      code: string
      size: string
      category: string
      price: number
      totalQty: number
      totalSold: number
      totalRemaining: number
      channels: Array<{ name: string; code: string; remaining: number }>
    }> = {}

    data.channels.forEach((ch: any) => {
      ch.items.forEach((item: any) => {
        const key = item.barcode
        if (!prodMap[key]) {
          prodMap[key] = {
            barcode: item.barcode,
            name: item.name,
            code: item.code,
            size: item.size,
            category: item.category,
            price: item.price,
            totalQty: 0,
            totalSold: 0,
            totalRemaining: 0,
            channels: []
          }
        }
        prodMap[key].totalQty += item.quantity
        prodMap[key].totalSold += item.sold
        prodMap[key].totalRemaining += item.remaining
        if (item.remaining > 0) {
          prodMap[key].channels.push({
            name: ch.name,
            code: ch.code,
            remaining: item.remaining
          })
        }
      })
    })

    return Object.values(prodMap).filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.barcode.includes(searchQuery)
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter
      return matchSearch && matchCategory
    }).sort((a, b) => b.totalRemaining - a.totalRemaining)
  }

  // Filtered channels for "Channels" tab
  const getFilteredChannels = () => {
    return data.channels.map((ch: any) => {
      const filteredItems = ch.items.filter((item: any) => {
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.barcode.includes(searchQuery)
        const matchCategory = categoryFilter === 'all' || item.category === categoryFilter
        return matchSearch && matchCategory
      })

      const remainingSum = filteredItems.reduce((sum: number, it: any) => sum + it.remaining, 0)

      return {
        ...ch,
        filteredItems,
        filteredRemaining: remainingSum
      }
    }).filter((ch: any) => ch.filteredItems.length > 0)
  }

  const filteredChannels = getFilteredChannels()
  const aggregatedProducts = getAggregatedProducts()

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      {/* Header Profile with gradient */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 text-white px-5 pt-8 pb-10 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0,transparent_60%)]"></div>
        
        <LiffHeader user={user} title="รายงานเช็คสต็อกสินค้า" />

        {/* Tab selection */}
        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-xl relative z-10 border border-white/10 mt-2">
          <button
            onClick={() => {
              setActiveTab('channels')
              setSearchQuery('')
              setExpandedItems({})
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'channels' ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:text-white'
            }`}
          >
            <Store className="h-3.5 w-3.5" /> ดูตามสาขา/บูธ
          </button>
          <button
            onClick={() => {
              setActiveTab('products')
              setSearchQuery('')
              setExpandedItems({})
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'products' ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> ดูตามรายการสินค้า
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 -mt-6 relative z-20 space-y-4">
        
        {/* Search & Category Filter Box */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative z-30 space-y-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 ค้นหารหัสสินค้า, ชื่อ หรือบาร์โค้ด..."
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

          {categories.length > 2 && (
            <div className="flex items-center justify-between gap-2.5 pt-1.5 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">หมวดหมู่:</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-none whitespace-nowrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-full transition-all border ${
                      categoryFilter === cat
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'all' ? 'ทั้งหมด' : cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Summary Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 grid grid-cols-3 gap-3 text-center">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สต็อกรวมหน้าร้าน</span>
            <span className="text-lg font-extrabold text-indigo-600 block">{data.summary.totalRemaining.toLocaleString()} ชิ้น</span>
          </div>
          <div className="space-y-0.5 border-x border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ขายแล้วสะสม</span>
            <span className="text-lg font-extrabold text-slate-800 block">{data.summary.totalSold.toLocaleString()} ชิ้น</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">จำนวนสาขา/บูธ</span>
            <span className="text-lg font-extrabold text-indigo-600 block">{data.summary.channelCount} สาขา</span>
          </div>
        </div>

        {/* Dynamic List Render */}
        {activeTab === 'channels' ? (
          <div className="space-y-3">
            {filteredChannels.map((ch: any) => {
              const isExpanded = !!expandedItems[ch.id]
              return (
                <div key={ch.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleExpand(ch.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-800 block leading-tight">{ch.code}</span>
                        <span className="text-sm font-bold text-slate-700 block mt-0.5">{ch.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">คงเหลือ</span>
                        <span className="text-sm font-extrabold text-indigo-600 block mt-0.5">{ch.filteredRemaining.toLocaleString()} ชิ้น</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="bg-slate-50/40 border-t border-slate-100 p-4 pt-1 divide-y divide-slate-100">
                      {ch.filteredItems.map((item: any) => (
                        <div key={item.barcode} className="py-3 flex justify-between items-center text-xs font-sans">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">
                              {item.code} ({item.size})
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Barcode: {item.barcode} | หมวดหมู่: {item.category || '-'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-800 block">
                              {item.remaining.toLocaleString()} ชิ้น
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              รับ {item.quantity} | ขาย {item.sold}
                            </span>
                          </div>
                        </div>
                      ))}
                      {ch.filteredItems.length === 0 && (
                        <div className="py-4 text-center text-xs text-slate-400 font-medium">ไม่พบสินค้าในสต็อกตรงกับคำค้นหา</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredChannels.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">ไม่พบสาขาหรือบูธที่ตรงตามคำค้นหา</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {aggregatedProducts.map((prod: any) => {
              const isExpanded = !!expandedItems[prod.barcode]
              return (
                <div key={prod.barcode} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleExpand(prod.barcode)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-800 block leading-tight">{prod.code} ({prod.size})</span>
                        <span className="text-sm font-bold text-slate-700 block mt-0.5">{prod.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">คงเหลือรวม</span>
                        <span className="text-sm font-extrabold text-indigo-600 block mt-0.5">{prod.totalRemaining.toLocaleString()} ชิ้น</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="bg-slate-50/40 border-t border-slate-100 p-4 pt-1 divide-y divide-slate-100">
                      <div className="py-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                        <span>ที่ตั้งบูธ / สาขา</span>
                        <span>จำนวนสินค้า</span>
                      </div>
                      {prod.channels.map((ch: any) => (
                        <div key={ch.code} className="py-2.5 flex justify-between items-center text-xs font-sans">
                          <span className="font-bold text-slate-700">
                            {ch.code} : {ch.name}
                          </span>
                          <span className="font-extrabold text-indigo-600">
                            {ch.remaining.toLocaleString()} ชิ้น
                          </span>
                        </div>
                      ))}
                      {prod.channels.length === 0 && (
                        <div className="py-4 text-center text-xs text-slate-400 font-medium">ไม่มีสินค้าคงเหลือในระบบหน้าร้าน</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {aggregatedProducts.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">ไม่พบรายการสินค้าที่ตรงตามคำค้นหา</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
