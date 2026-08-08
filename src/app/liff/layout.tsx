'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'

interface UserProfile {
  displayName: string | null
  pictureUrl: string | null
  role: string
}

interface LiffContextType {
  isInitialized: boolean
  isLoggedIn: boolean
  user: UserProfile | null
  error: string | null
}

const LiffContext = createContext<LiffContextType>({
  isInitialized: false,
  isLoggedIn: false,
  user: null,
  error: null
})

export const useLiff = () => useContext(LiffContext)

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    import('@line/liff')
      .then(async ({ default: liff }) => {
        try {
          const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID
          if (!liffId) {
            throw new Error('NEXT_PUBLIC_LINE_LIFF_ID is not configured in environment variables.')
          }

          await liff.init({ liffId })
          setIsInitialized(true)

          if (!liff.isLoggedIn()) {
            liff.login()
            return
          }

          setIsLoggedIn(true)
          const idToken = liff.getIDToken()
          if (!idToken) {
            throw new Error('Could not retrieve LINE ID Token.')
          }

          // Verify token against backend
          const res = await fetch('/api/auth/liff-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idToken })
          })

          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.error || 'Authentication failed')
          }

          setUser({
            displayName: data.user.displayName,
            pictureUrl: data.user.pictureUrl,
            role: data.user.role
          })
        } catch (err: any) {
          console.error('[LIFF Layout Error]', err)
          setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ LINE')
        }
      })
      .catch(err => {
        console.error('[LIFF Import Error]', err)
        setError('ไม่สามารถโหลด LINE SDK ได้')
      })
  }, [])

  // ─── Loading Screen ───────────────────────────────────────────────
  if (!isInitialized || (isLoggedIn && !user && !error)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0,transparent_100%)]"></div>
        <div className="relative flex flex-col items-center text-center space-y-6 max-w-sm">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-400/20 shadow-[0_0_50px_rgba(99,102,241,0.15)] backdrop-blur-md">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-wide text-slate-100 font-sans">กำลังเชื่อมต่อ LINE Platform</h2>
            <p className="text-sm text-slate-400 font-sans">กรุณารอสักครู่ ระบบกำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Error Screen ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0,transparent_100%)]"></div>
        <div className="relative flex flex-col items-center text-center space-y-6 max-w-sm bg-slate-900/40 border border-slate-700/30 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-red-200 font-sans">ปฏิเสธการเข้าใช้งาน</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-all font-sans"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    )
  }

  return (
    <LiffContext.Provider value={{ isInitialized, isLoggedIn, user, error }}>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </div>
    </LiffContext.Provider>
  )
}
