import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { POINTS_TO_WIN, PRE_GENERATED_FORMATS } from '#/lib/constants'
import { ConfirmDialog } from './confirm-dialog'
import { GeneratorSettingsModal } from './generator-settings-modal'
import { MatchCell } from './match-cell'
import type { Participant, Round, Tournament } from './types'

// Mobile-first schedule view for the PIN-gated /manage page — courtside
// staff run this from a phone. Unlike ScheduleTab (the desktop admin
// dashboard), everything here is a single fluid column with no fixed
// pixel minimums, so it never overflows horizontally, and actions are
// full-width buttons sized for a thumb rather than a mouse.
export function ManageSchedule({ tournament, rounds, participants, onGenerate, onFinished, pin }: {
  tournament: Tournament; rounds: Round[]; participants: Participant[]
  onGenerate: () => void
  onFinished?: () => void
  pin?: string
}) {
  const [showSettings, setShowSettings] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const resetSchedule = useMutation(api.rounds.resetSchedule)
  const finishTournament = useMutation(api.tournaments.finish)
  const isPreGenerated = PRE_GENERATED_FORMATS.includes(tournament.format)
  const checkedInCount = participants.filter(p => p.checkedIn === true).length
  const lastRound = rounds[rounds.length - 1]
  const lastRoundScored = !lastRound || lastRound.state === 'completed'
  const canGenerate = isPreGenerated || (checkedInCount >= 4 && lastRoundScored)
  // Once the tournament isn't in_progress (already finished), hide the
  // admin-only controls -- settings/reset/finish/generate no longer apply.
  const locked = tournament.state !== 'in_progress'

  const finishDialog = showFinish && (
    <ConfirmDialog
      title="Finish tournament?"
      body="Scores will be locked and final standings calculated. This cannot be undone."
      confirmLabel="Finish"
      danger
      onConfirm={async () => {
        await finishTournament({ tournamentId: tournament._id, pin })
        setShowFinish(false)
        onFinished?.()
      }}
      onCancel={() => setShowFinish(false)}
    />
  )

  if (rounds.length === 0) {
    return (
      <div>
        {finishDialog}
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-8 flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
            <Icon name="shuffle" className="w-7 h-7" stroke={1.8} />
          </span>
          <h3 className="font-display font-bold text-[18px]">No rounds yet</h3>
          <p className="text-ink-mute text-sm mt-1">
            Generate the first round to auto-assign teams across courts.
          </p>
          {!isPreGenerated && (
            <p className="text-ink-mute text-[12.5px] mt-2 tnum">{checkedInCount} checked in</p>
          )}
          <Button variant="primary" size="lg" icon="bolt" className="w-full mt-5" onClick={onGenerate} disabled={!canGenerate}>
            Generate round 1
          </Button>
          {!canGenerate && (
            <p className="text-[12.5px] text-red-500 mt-2">Check in at least 4 players first</p>
          )}
        </div>
        {!locked && (
          <Button variant="outline" size="lg" icon="flag" className="w-full mt-4" onClick={() => setShowFinish(true)}>
            Finish tournament
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      {finishDialog}
      {showSettings && (
        <GeneratorSettingsModal tournament={tournament} onClose={() => setShowSettings(false)} />
      )}
      {showReset && (
        <ConfirmDialog
          title="Reset schedule?"
          body="All rounds, matches, and scores for this tournament will be permanently deleted. This cannot be undone."
          confirmLabel="Reset"
          danger
          onConfirm={async () => {
            await resetSchedule({ tournamentId: tournament._id })
            setShowReset(false)
          }}
          onCancel={() => setShowReset(false)}
        />
      )}
      <div className="flex items-center gap-3 mb-5 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-3.5">
        <span className="w-9 h-9 rounded-xl bg-accent text-ink flex items-center justify-center shrink-0">
          <Icon name="shuffle" className="w-4.5 h-4.5" stroke={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[14px] leading-tight truncate">Round generator</div>
          <div className="text-[12px] text-ink-mute capitalize truncate">
            {tournament.format.replace(/_/g, ' ')} ·{' '}
            {tournament.scoringMode === 'time_based'
              ? 'most points when time runs out'
              : `${tournament.scoringMode === 'shared_total' ? 'play' : 'first to'} ${tournament.pointsToWin ?? POINTS_TO_WIN} points`}
          </div>
        </div>
        {!locked && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="icon" aria-label="Generator settings" onClick={() => setShowSettings(true)}>
              <Icon name="gear" className="w-4.5 h-4.5" stroke={2.2} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Reset schedule" onClick={() => setShowReset(true)}>
              <Icon name="reset" className="w-4.5 h-4.5" stroke={2.2} />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {rounds.map((round) => (
          <ManageRoundCard
            key={round._id}
            round={round}
            pointsToWin={tournament.pointsToWin ?? POINTS_TO_WIN}
            scoringMode={tournament.scoringMode ?? 'first_to'}
            blocked={rounds.some(r => r.roundNumber < round.roundNumber && r.state !== 'completed')}
            pin={pin}
          />
        ))}
      </div>

      {!isPreGenerated && !locked && (
        <div className="flex flex-col items-center gap-2 mt-6 rounded-2xl border-2 border-dashed border-zinc-300 p-5">
          <Button variant="primary" size="lg" icon="plus" className="w-full" onClick={onGenerate} disabled={!canGenerate}>
            Generate round {rounds.length + 1}
          </Button>
          {checkedInCount < 4 && (
            <p className="text-[12.5px] text-ink-mute text-center">Check in at least 4 players before generating the next round</p>
          )}
          {checkedInCount >= 4 && !lastRoundScored && (
            <p className="text-[12.5px] text-ink-mute text-center">Score and end round {lastRound?.roundNumber} before generating the next</p>
          )}
        </div>
      )}
      {isPreGenerated && (
        <div className="flex items-center justify-center gap-1.5 mt-6 text-[12.5px] text-ink-mute font-medium">
          <Icon name="check" className="w-4 h-4 text-zinc-400" stroke={2.5} />
          All {rounds.length} rounds scheduled
        </div>
      )}

      {!locked && (
        <Button variant="outline" size="lg" icon="flag" className="w-full mt-6" onClick={() => setShowFinish(true)}>
          Finish tournament
        </Button>
      )}
    </div>
  )
}

function ManageRoundCard({ round, pointsToWin, scoringMode, blocked, pin }: {
  round: Round; pointsToWin: number; scoringMode: 'first_to' | 'shared_total' | 'time_based'; blocked: boolean
  pin?: string
}) {
  const matches = useQuery(api.matches.listByRound, { roundId: round._id })
  const startRound = useMutation(api.rounds.start)
  const completeRound = useMutation(api.rounds.complete)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [completeError, setCompleteError] = useState('')

  const doneCount = matches?.filter(m => m.state === 'completed' || m.state === 'disputed').length ?? 0
  const allDone = !!matches && doneCount === matches.length && matches.length > 0

  async function handleStart() {
    setWorking(true); setError('')
    try {
      await startRound({ roundId: round._id, pin })
    } catch (e) {
      setError((e as { data?: string })?.data ?? 'Score the previous round before starting this one')
    } finally { setWorking(false) }
  }

  async function handleComplete() {
    setWorking(true); setCompleteError('')
    try {
      await completeRound({ roundId: round._id, pin })
    } catch {
      setCompleteError('Could not end the round — try again')
    } finally { setWorking(false) }
  }

  useEffect(() => {
    if (round.state === 'in_progress' && allDone && !working && !completeError) {
      void handleComplete()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.state, allDone])

  if (!matches) return null

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <span className="font-display font-bold text-[15px]">Round {round.roundNumber}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 h-5 inline-flex items-center rounded-full
          ${round.state === 'in_progress' ? 'bg-accent text-ink' : 'bg-zinc-100 text-zinc-400'}`}>
          {round.state === 'in_progress' ? 'Playing' : round.state === 'completed' ? 'Done' : 'Queued'}
        </span>
        {round.state !== 'pending' && (
          <span className="text-[12px] text-ink-mute tnum ml-auto">{doneCount}/{matches.length} scored</span>
        )}
      </div>

      {round.state === 'pending' && blocked && (
        <p className="text-[12.5px] text-ink-mute font-medium flex items-center gap-1 mb-3">
          <Icon name="clock" className="w-3.5 h-3.5" /> Score previous round first
        </p>
      )}
      {round.state === 'pending' && !blocked && (
        <Button variant="outline" size="lg" icon="bolt" className="w-full mb-3" onClick={handleStart} disabled={working}>
          Start round
        </Button>
      )}
      {round.state === 'pending' && error && (
        <p className="text-[12.5px] font-medium text-red-500 mb-3">{error}</p>
      )}
      {round.state === 'in_progress' && completeError && (
        <Button variant="outline" size="lg" icon="check" className="w-full mb-3" onClick={handleComplete} disabled={working}>
          {completeError}
        </Button>
      )}
      {round.state === 'in_progress' && !completeError && allDone && (
        <p className="text-[12.5px] text-ink-mute font-medium flex items-center gap-1 mb-3">
          <Icon name="check" className="w-3.5 h-3.5" /> Finishing round…
        </p>
      )}
      {round.state === 'in_progress' && !completeError && !allDone && (
        <p className="text-[12.5px] text-ink-mute font-medium mb-3">
          {matches.length - doneCount} match{matches.length - doneCount !== 1 ? 'es' : ''} remaining
        </p>
      )}
      {round.state === 'completed' && (
        <p className="text-[12.5px] font-semibold text-zinc-300 flex items-center gap-1 mb-3">
          <Icon name="check" className="w-3.5 h-3.5" stroke={2.5} /> Complete
        </p>
      )}

      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCell key={match._id} match={match} pointsToWin={pointsToWin} scoringMode={scoringMode} pin={pin} />
        ))}
      </div>
    </div>
  )
}
