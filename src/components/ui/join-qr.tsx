import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from './icon'

export function JoinQR({ tournamentId, size = 180, tone = 'paper' }: {
  tournamentId: string
  size?: number
  tone?: 'paper' | 'dark'
}) {
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${tournamentId}`
  return (
    <div className={`inline-flex flex-col items-center gap-3 p-4 rounded-2xl ${tone === 'dark' ? 'bg-white/10' : 'bg-zinc-50 ring-1 ring-zinc-200/80'}`}>
      <QRCodeSVG
        value={url}
        size={size}
        bgColor={tone === 'dark' ? '#18181b' : '#ffffff'}
        fgColor={tone === 'dark' ? '#ffffff' : '#09090b'}
        level="M"
      />
      <span className={`text-xs font-medium ${tone === 'dark' ? 'text-white/50' : 'text-zinc-400'}`}>
        Scan to join
      </span>
    </div>
  )
}

export function JoinQRButton({ tournamentId }: { tournamentId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-semibold text-ink transition-colors"
      >
        <Icon name="grid" className="w-4 h-4" />
        QR Code
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 mb-1">Join Tournament</h3>
            <p className="text-sm text-zinc-400 mb-5">Players scan this to join</p>
            <div className="flex justify-center">
              <JoinQR tournamentId={tournamentId} size={200} />
            </div>
            <button onClick={() => setOpen(false)} className="mt-5 text-sm text-zinc-400 hover:text-zinc-600 font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
