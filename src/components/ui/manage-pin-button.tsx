import { useState } from 'react'
import { Icon } from './icon'

export function ManagePinButton({ tournamentId, pin }: { tournamentId: string; pin: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/manage/${tournamentId}`

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-semibold text-ink transition-colors"
      >
        <Icon name="gear" className="w-4 h-4" />
        Manage PIN
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 mb-1">Manage this tournament</h3>
            <p className="text-sm text-zinc-400 mb-5">Share this PIN with courtside staff</p>
            <div className="font-mono tnum text-4xl font-bold tracking-[0.3em] text-ink mb-5">{pin}</div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-semibold text-ink transition-colors"
            >
              <Icon name="copy" className="w-4 h-4" />
              {copied ? 'Link copied!' : 'Copy manage link'}
            </button>
            <button onClick={() => setOpen(false)} className="mt-5 text-sm text-zinc-400 hover:text-zinc-600 font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
