import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { pairNames } from '#/lib/names'
import { POINTS_TO_WIN, TIME_BASED_MAX_SCORE } from '#/lib/constants'
import type { Match } from './types'

export function MatchCell({ match, pointsToWin = POINTS_TO_WIN, scoringMode = 'first_to', pin }: {
  match: Match; pointsToWin?: number; scoringMode?: 'first_to' | 'shared_total' | 'time_based'; pin?: string
}) {
  const [editing, setEditing] = useState(false)
  const [a, setA] = useState(match.scoreA ?? 0)
  const [b, setB] = useState(match.scoreB ?? 0)
  const [saving, setSaving] = useState(false)
  const saveResult = useMutation(api.scores.saveResult)
  const shared = scoringMode === 'shared_total'
  const timeBased = scoringMode === 'time_based'
  const entryMax = timeBased ? TIME_BASED_MAX_SCORE : pointsToWin

  function handleChangeA(n: number) {
    setA(n)
    if (shared) setB(pointsToWin - n)
  }

  function handleChangeB(n: number) {
    setB(n)
    if (shared) setA(pointsToWin - n)
  }

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
      await saveResult({ matchId: match._id, scoreA: a, scoreB: b, pin })
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
                <div className="text-[12px] text-ink-mute font-normal">
                  {shared ? `Tap one side — the other fills to ${pointsToWin}` :
                    timeBased ? "Time's up — enter each side's points, most wins" : "Tap each side's score"}
                </div>
              </div>
            </div>
          }
        >
          <NumberGrid label={`${nameA1} / ${nameA2}`} value={a} onChange={handleChangeA} max={entryMax} highlight={a > b} />
          <NumberGrid label={`${nameB1} / ${nameB2}`} value={b} onChange={handleChangeB} max={entryMax} highlight={b > a} />
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
              {nameA1} <span className="text-zinc-300 font-normal">/</span> {nameA2}
            </span>
            <span className={`font-mono tnum text-[15px] shrink-0 font-bold
              ${match.scoreA === undefined ? 'text-zinc-300 font-normal' :
                match.scoreA > (match.scoreB ?? 0) ? '' : 'text-ink-mute'}`}>
              {match.scoreA ?? '–'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-ink">
            <span className="text-[13.5px] truncate font-semibold min-w-0 flex-1">
              {nameB1} <span className="text-zinc-300 font-normal">/</span> {nameB2}
            </span>
            <span className={`font-mono tnum text-[15px] shrink-0 font-bold
              ${match.scoreB === undefined ? 'text-zinc-300 font-normal' :
                match.scoreB > (match.scoreA ?? 0) ? '' : 'text-ink-mute'}`}>
              {match.scoreB ?? '–'}
            </span>
          </div>
        </div>
      </button>
    </>
  )
}

function NumberGrid({ label, value, onChange, max, highlight }: {
  label: string; value: number; onChange: (n: number) => void; max: number; highlight: boolean
}) {
  return (
    <div className={`rounded-2xl p-3 ring-1 min-w-0 ${highlight ? 'bg-accent-soft ring-accent-dark/30' : 'bg-zinc-50 ring-zinc-200'}`}>
      <div className="text-[13px] font-bold text-ink-mute mb-2 truncate">{label}</div>
      <div className="flex flex-wrap gap-1.5 max-[450px]:grid max-[450px]:grid-rows-2 max-[450px]:grid-flow-col max-[450px]:auto-cols-[36px] max-[450px]:overflow-x-auto max-[450px]:scrollbar-none max-[450px]:w-full max-[450px]:min-w-0 max-[450px]:-mx-3 max-[450px]:px-3 max-[450px]:pb-0.5">
        {Array.from({ length: max + 1 }, (_, n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-[14px] font-bold tnum flex items-center justify-center transition-all active:scale-95 shrink-0
              ${value === n ? 'bg-accent text-ink' : 'bg-white text-ink-mute ring-1 ring-zinc-200 hover:bg-zinc-100'}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
