import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { POINTS_TO_WIN, PRE_GENERATED_FORMATS } from '#/lib/constants'
import { GeneratorSettingsModal } from './generator-settings-modal'
import { MatchCell } from './match-cell'
import type { Participant, Round, Tournament } from './types'

export function ScheduleTab({ tournament, rounds, participants, onGenerate }: {
  tournament: Tournament; rounds: Round[]; participants: Participant[]
  onGenerate: () => void
}) {
  const [showSettings, setShowSettings] = useState(false)
  const isPreGenerated = PRE_GENERATED_FORMATS.includes(tournament.format)
  const checkedInCount = participants.filter(p => p.checkedIn === true).length
  const canGenerate = isPreGenerated || checkedInCount >= 4

  if (rounds.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-12 flex flex-col items-center text-center">
        <span className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
          <Icon name="shuffle" className="w-8 h-8" stroke={1.8} />
        </span>
        <h3 className="font-display font-bold text-[20px]">No rounds yet</h3>
        <p className="text-ink-mute text-sm mt-1 max-w-xs">
          Generate the first round to auto-assign teams across courts.
        </p>
        {!isPreGenerated && (
          <p className="text-ink-mute text-[12.5px] mt-2 tnum">{checkedInCount} checked in</p>
        )}
        <div className="mt-5">
          <Button variant="primary" size="lg" icon="bolt" onClick={onGenerate} disabled={!canGenerate}>
            Generate round 1
          </Button>
        </div>
        {!canGenerate && (
          <p className="text-[12.5px] text-red-500 mt-2">Check in at least 4 players first</p>
        )}
      </div>
    )
  }

  return (
    <div>
      {showSettings && (
        <GeneratorSettingsModal tournament={tournament} onClose={() => setShowSettings(false)} />
      )}
      <div className="flex items-center justify-between gap-4 mb-5 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent text-ink flex items-center justify-center">
            <Icon name="shuffle" className="w-5 h-5" stroke={2.2} />
          </span>
          <div>
            <div className="font-semibold text-[15px] leading-tight">Round generator</div>
            <div className="text-[12.5px] text-ink-mute capitalize">
              {tournament.format.replace(/_/g, ' ')} · first to {tournament.pointsToWin ?? POINTS_TO_WIN}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon="gear" onClick={() => setShowSettings(true)}>Settings</Button>
          {!isPreGenerated && (
            <>
              <span className="text-[12.5px] text-ink-mute font-medium tnum">{checkedInCount} checked in</span>
              <Button variant="primary" size="md" icon="plus" onClick={onGenerate} disabled={!canGenerate}>
                Generate round {rounds.length + 1}
              </Button>
            </>
          )}
          {isPreGenerated && (
            <span className="text-[12.5px] text-ink-mute font-medium flex items-center gap-1.5">
              <Icon name="check" className="w-4 h-4 text-zinc-400" stroke={2.5} />
              All {rounds.length} rounds scheduled
            </span>
          )}
        </div>
      </div>
      {!isPreGenerated && !canGenerate && (
        <p className="text-[12.5px] text-red-500 -mt-3 mb-5">Check in at least 4 players before generating the next round</p>
      )}

      <div className="space-y-6">
        {rounds.map((round) => (
          <RoundRow
            key={round._id}
            round={round}
            pointsToWin={tournament.pointsToWin ?? POINTS_TO_WIN}
            blocked={rounds.some(r => r.roundNumber < round.roundNumber && r.state !== 'completed')}
          />
        ))}
      </div>
    </div>
  )
}

function RoundRow({ round, pointsToWin, blocked }: { round: Round; pointsToWin: number; blocked: boolean }) {
  const matches = useQuery(api.matches.listByRound, { roundId: round._id })
  const startRound = useMutation(api.rounds.start)
  const completeRound = useMutation(api.rounds.complete)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  if (!matches) return null

  const doneCount = matches.filter(m => m.state === 'completed' || m.state === 'disputed').length
  const allDone = doneCount === matches.length && matches.length > 0

  async function handleStart() {
    setWorking(true); setError('')
    try {
      await startRound({ roundId: round._id })
    } catch (e) {
      setError((e as { data?: string })?.data ?? 'Score the previous round before starting this one')
    } finally { setWorking(false) }
  }

  async function handleComplete() {
    setWorking(true)
    try { await completeRound({ roundId: round._id }) } finally { setWorking(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-display font-bold text-[15px]">Round {round.roundNumber}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 h-5 inline-flex items-center rounded-full
            ${round.state === 'in_progress' ? 'bg-accent text-ink' : 'bg-zinc-100 text-zinc-400'}`}>
            {round.state === 'in_progress' ? 'Playing' : round.state === 'completed' ? 'Done' : 'Queued'}
          </span>
          {round.state !== 'pending' && (
            <span className="text-[12px] text-ink-mute tnum">{doneCount}/{matches.length} scored</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {round.state === 'pending' && error && (
            <span className="text-[12px] font-medium text-red-500">{error}</span>
          )}
          {round.state === 'pending' && blocked && (
            <span className="text-[12px] text-ink-mute font-medium flex items-center gap-1">
              <Icon name="clock" className="w-3.5 h-3.5" /> Score previous round first
            </span>
          )}
          {round.state === 'pending' && !blocked && (
            <Button variant="outline" size="sm" icon="bolt" onClick={handleStart} disabled={working}>
              Start round
            </Button>
          )}
          {round.state === 'in_progress' && (
            <Button variant={allDone ? 'ink' : 'ghost'} size="sm" icon="check" onClick={handleComplete} disabled={working}>
              {allDone ? 'End round' : `End round (${matches.length - doneCount} pending)`}
            </Button>
          )}
          {round.state === 'completed' && (
            <span className="text-[12px] font-semibold text-zinc-300 flex items-center gap-1">
              <Icon name="check" className="w-3.5 h-3.5" stroke={2.5} /> Complete
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(matches.length, 1)}, minmax(0,1fr))` }}>
        {matches.map((match) => (
          <MatchCell key={match._id} match={match} pointsToWin={pointsToWin} />
        ))}
      </div>
    </div>
  )
}
