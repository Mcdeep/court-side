import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { lastName, pairNames } from '#/lib/names'
import { POINTS_TO_WIN } from '#/lib/constants'
import type { Match } from './types'

export function MatchCell({ match, pointsToWin = POINTS_TO_WIN }: { match: Match; pointsToWin?: number }) {
  const [editing, setEditing] = useState(false)
  const [a, setA] = useState(match.scoreA ?? 0)
  const [b, setB] = useState(match.scoreB ?? 0)
  const [saving, setSaving] = useState(false)
  const saveResult = useMutation(api.scores.saveResult)

  const [nameA1, nameA2] = pairNames(match.pairA)
  const [nameB1, nameB2] = pairNames(match.pairB)

  const live  = match.state === 'in_progress'
  const final = match.state === 'completed'

  function startEditing() {
    setA(match.scoreA ?? 0)
    setB(match.scoreB ?? 0)
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveResult({ matchId: match._id, scoreA: a, scoreB: b })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {editing && (
        <AppDialog
          open
          onOpenChange={o => !o && setEditing(false)}
          maxWidth="sm:max-w-md"
          title={
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-accent text-ink flex items-center justify-center">
                <Icon name="court" className="w-5 h-5" />
              </span>
              <div>
                <div className="font-display font-bold text-[16px] leading-tight">Court {match.courtNumber} · Score</div>
                <div className="text-[12px] text-ink-mute font-normal">Tap each side's score</div>
              </div>
            </div>
          }
        >
          <NumberGrid label={`${lastName(nameA1)} / ${lastName(nameA2)}`} value={a} onChange={setA} max={pointsToWin} highlight={a > b} />
          <NumberGrid label={`${lastName(nameB1)} / ${lastName(nameB2)}`} value={b} onChange={setB} max={pointsToWin} highlight={b > a} />
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" size="lg" className="flex-[1.4]" icon="check" onClick={handleSave} disabled={saving}>Save</Button>
          </div>
        </AppDialog>
      )}
      <button onClick={startEditing}
        className={`text-left w-full rounded-xl p-3 ring-1 transition-all hover:shadow-card hover:-translate-y-px
          ${live  ? 'bg-accent-soft ring-accent-dark/30' :
            final ? 'bg-white ring-zinc-200' :
                    'bg-zinc-50 ring-zinc-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Court {match.courtNumber}</span>
          {live  && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink"><span className="relative inline-block w-1.5 h-1.5 rounded-full bg-ink live-ping" style={{ color: 'oklch(0.19 0.012 264)' }} />Live</span>}
          {final && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><Icon name="check" className="w-3 h-3" stroke={3} />Final</span>}
          {!live && !final && <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Scheduled</span>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-ink">
            <span className="text-[13.5px] truncate font-semibold min-w-0 flex-1">
              {lastName(nameA1)} <span className="text-zinc-300 font-normal">/</span> {lastName(nameA2)}
            </span>
            <span className={`font-mono tnum text-[15px] shrink-0 font-bold
              ${match.scoreA === undefined ? 'text-zinc-300 font-normal' :
                match.scoreA > (match.scoreB ?? 0) ? '' : 'text-ink-mute'}`}>
              {match.scoreA ?? '–'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-ink">
            <span className="text-[13.5px] truncate font-semibold min-w-0 flex-1">
              {lastName(nameB1)} <span className="text-zinc-300 font-normal">/</span> {lastName(nameB2)}
            </span>
            <span className={`font-mono tnum text-[15px] shrink-0 font-bold
              ${match.scoreB === undefined ? 'text-zinc-300 font-normal' :
                match.scoreB > (match.scoreA ?? 0) ? '' : 'text-ink-mute'}`}>
              {match.scoreB ?? '–'}
            </span>
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-[11px] text-ink-mute font-medium">
            {match.state === 'scheduled' ? 'Tap to start' : match.state === 'in_progress' ? 'Update score' : 'Edit result'}
          </span>
          <Icon name="pencil" className="w-3.5 h-3.5 text-zinc-300" />
        </div>
      </button>
    </>
  )
}

function NumberGrid({ label, value, onChange, max, highlight }: {
  label: string; value: number; onChange: (n: number) => void; max: number; highlight: boolean
}) {
  return (
    <div className={`rounded-2xl p-3 ring-1 ${highlight ? 'bg-accent-soft ring-accent-dark/30' : 'bg-zinc-50 ring-zinc-200'}`}>
      <div className="text-[13px] font-bold text-ink-mute mb-2 truncate">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max + 1 }, (_, n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-[14px] font-bold tnum flex items-center justify-center transition-all active:scale-95
              ${value === n ? 'bg-accent text-ink' : 'bg-white text-ink-mute ring-1 ring-zinc-200 hover:bg-zinc-100'}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
