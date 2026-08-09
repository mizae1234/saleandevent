import React from 'react'

interface LiffLoadingProps {
  label?: string
}

export function LiffLoading({ label = 'กำลังดึงข้อมูลรายงาน...' }: LiffLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      <p className="text-sm text-slate-500 font-medium font-sans">{label}</p>
    </div>
  )
}
