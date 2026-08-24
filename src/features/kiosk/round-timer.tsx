import { useEffect, useRef, useState } from 'react'
import { Icon } from '#/components/ui/icon'
import { playFinalPointAlert } from './sound'

function FinalPointOverlay({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-center animate-pulse">
        <div className="text-[120px] leading-none font-display font-bold tracking-tight text-red-500 drop-shadow-[0_0_60px_rgba(239,68,68,0.5)]">
          FINAL POINT
        </div>
        <div className="text-paper/40 text-[18px] mt-4 font-medium">
          Finish your rally — this is the last point
        </div>
      </div>
    </div>
  )
}

export function RoundTimer({ durationMs, startedAt }: { durationMs: number; startedAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, durationMs - (Date.now() - startedAt)))
  const [showOverlay, setShowOverlay] = useState(false)
  const beeped = useRef(false)

  useEffect(() => {
    const tick = setInterval(() => {
      const left = Math.max(0, durationMs - (Date.now() - startedAt))
      setRemaining(left)
      if (left <= 0 && !beeped.current) {
        beeped.current = true
        playFinalPointAlert()
        setShowOverlay(true)
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [durationMs, startedAt])

  useEffect(() => {
    beeped.current = false
    setShowOverlay(false)
  }, [startedAt])

  const totalSec = Math.ceil(remaining / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const expired = remaining <= 0
  const warning = remaining > 0 && remaining <= 30_000

  return (
    <>
      <div className="hidden md:flex items-center gap-3 rounded-full bg-white/[0.06] ring-1 ring-white/10 pl-3 pr-4 h-10 shrink-0">
        <Icon name="clock" className="w-4 h-4 text-accent shrink-0" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-paper/40 whitespace-nowrap">Round ends in</span>
        <span className={`font-mono tnum font-bold text-[18px] whitespace-nowrap ${expired ? 'text-red-400 animate-pulse' : warning ? 'text-amber-400' : ''}`}>
          {expired ? 'TIME' : `${min}:${String(sec).padStart(2, '0')}`}
        </span>
      </div>
      {showOverlay && <FinalPointOverlay onDismiss={() => setShowOverlay(false)} />}
    </>
  )
}
