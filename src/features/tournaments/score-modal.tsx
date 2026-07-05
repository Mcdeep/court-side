import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { TeamMark } from '#/components/ui/team-mark'
import { lastName, pairNames } from '#/lib/names'
import { POINTS_TO_WIN } from '#/lib/constants'

export function ScoreModal({ match, onClose }: { match: any; onClose: () => void }) {
  const [a, setA] = useState(match.scoreA ?? 0)
  const [b, setB] = useState(match.scoreB ?? 0)
  const saveResult = useMutation(api.scores.saveResult)

  const complete = a === POINTS_TO_WIN || b === POINTS_TO_WIN
  const [nA1, nA2] = pairNames(match.pairA)
  const [nB1, nB2] = pairNames(match.pairB)

  const handleSave = async () => {
    await saveResult({ matchId: match._id, scoreA: a, scoreB: b })
    onClose()
  }

  return (
    <AppDialog
      open
      onOpenChange={o => !o && onClose()}
      maxWidth="sm:max-w-md"
      title={
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-accent text-ink flex items-center justify-center">
            <Icon name="court" className="w-5 h-5" />
          </span>
          <div>
            <div className="font-display font-bold text-[16px] leading-tight">Court {match.courtNumber} · Score</div>
            <div className="text-[12px] text-ink-mute font-normal">Enter the result</div>
          </div>
        </div>
      }
    >
      <div className="flex items-stretch gap-3">
        <Stepper label={`${lastName(nA1)} / ${lastName(nA2)}`} names={[nA1, nA2]} val={a} set={setA} highlight={a > b} />
        <div className="flex items-center font-display font-bold text-zinc-300 text-lg">vs</div>
        <Stepper label={`${lastName(nB1)} / ${lastName(nB2)}`} names={[nB1, nB2]} val={b} set={setB} highlight={b > a} />
      </div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="text-ink-mute">First to <span className="font-bold text-ink tnum">{POINTS_TO_WIN}</span> points</span>
        <span className={`font-semibold tnum px-2.5 h-7 inline-flex items-center rounded-full whitespace-nowrap
          ${complete ? 'bg-accent text-ink' : 'bg-zinc-100 text-ink-mute'}`}>
          {complete ? 'Match point reached' : `${a + b} pts played`}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button variant={complete ? 'primary' : 'ink'} size="lg" className="flex-[1.4]"
          icon={complete ? 'check' : 'clock'} onClick={handleSave}>
          {complete ? 'Save final result' : 'Save as live'}
        </Button>
      </div>
    </AppDialog>
  )
}

function Stepper({ label, names, val, set, highlight }: {
  label: string; names: string[]; val: number; set: (v: number) => void; highlight: boolean
}) {
  return (
    <div className={`flex-1 rounded-2xl p-4 ring-1 ${highlight ? 'bg-accent-soft ring-accent-dark/30' : 'bg-zinc-50 ring-zinc-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <TeamMark names={names} size={28} />
        <div className="text-[13px] font-bold leading-tight truncate">{label}</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => set(Math.max(0, val - 1))}
          className="w-10 h-10 rounded-xl bg-white ring-1 ring-zinc-200 flex items-center justify-center hover:ring-zinc-300 active:scale-95 transition-all text-xl font-bold">–</button>
        <div className="font-mono tnum font-bold text-[40px] leading-none w-16 text-center">{val}</div>
        <button onClick={() => set(Math.min(POINTS_TO_WIN, val + 1))}
          className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center hover:bg-ink-soft active:scale-95 transition-all text-xl font-bold">+</button>
      </div>
    </div>
  )
}
