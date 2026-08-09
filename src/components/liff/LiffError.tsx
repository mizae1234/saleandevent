import React from 'react'

interface LiffErrorProps {
  error?: string | null
  onReload?: () => void
}

export function LiffError({ error, onReload }: LiffErrorProps) {
  const handleReload = onReload || (() => window.location.reload())

  return (
    <div className="p-6 text-center space-y-4">
      <div className="text-red-500 text-5xl">⚠️</div>
      <p className="text-slate-700 font-semibold font-sans">{error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}</p>
      <button
        onClick={handleReload}
        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium font-sans hover:bg-indigo-700 transition-colors"
      >
        โหลดใหม่
      </button>
    </div>
  )
}
