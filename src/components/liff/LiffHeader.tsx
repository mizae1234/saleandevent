import React from 'react'

interface UserProfile {
  displayName: string | null
  pictureUrl: string | null
  role?: string
}

interface LiffHeaderProps {
  user: UserProfile | null
  title: string
}

export function LiffHeader({ user, title }: LiffHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-3 relative z-10 mb-6">
        {user?.pictureUrl ? (
          <img src={user.pictureUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/20" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm">👤</div>
        )}
        <div>
          <div className="text-xs text-white/70">สวัสดีคุณ</div>
          <div className="font-semibold text-sm">{user?.displayName || 'พนักงาน'} 👋</div>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-wide mb-5 relative z-10">{title}</h1>
    </>
  )
}
