'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * /liff page — จัดการ liff.state redirect
 * เมื่อ LIFF เปิด URL: /liff?liff.state=/channels/{id}
 * หน้านี้จะ redirect ไป /liff/channels/{id}
 */
export default function LiffRedirectPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const liffState = searchParams.get('liff.state')
    if (liffState) {
      // Redirect to /liff{liff.state} e.g. /liff/channels/{id}
      router.replace(`/liff${liffState}`)
    } else {
      // ไม่มี liff.state → redirect ไป sales page
      router.replace('/liff/sales')
    }
  }, [searchParams, router])

  const liffState = searchParams.get('liff.state')

  // ถ้าไม่มี liff.state → redirect ไป sales page
  if (!liffState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">กำลังเปลี่ยนหน้า...</p>
      </div>
    )
  }

  // กำลัง redirect
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6">
      <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
      <p className="text-slate-400 text-sm">กำลังเปลี่ยนหน้า...</p>
    </div>
  )
}
