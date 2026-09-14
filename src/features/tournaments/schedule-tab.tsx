import { GenerateRoundsButton } from './generate-rounds-button'
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

export function ScheduleTab({ tournament, rounds, participants, onGenerate, pin }: {
  tournament: Tournament; rounds: Round[]; participants: Participant[]
  onGenerate: () => Promise<void>
  pin?: string
}) {
  const [showSettings, setShowSettings] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [showResetFinals, setShowResetFinals] = useState(false)
  const resetSchedule = useMutation(api.rounds.resetSchedule)
  const resetFinals = useMutation(api.rounds.resetFinals)
  const isPreGenerated = PRE_GENERATED_FORMATS.includes(tournament.format)
  const isDouble = tournament.format === 'americano' && tournament.americanoVariant === 'double'
  const checkedInCount = participants.filter(p => p.checkedIn === true).length
  const lastRound = rounds[rounds.length - 1]
  const lastRoundScored = !lastRound || lastRound.state === 'completed'
  const groupRounds = rounds.filter(round => round.stage !== 'final')
  const finals = rounds.filter(round => round.stage === 'final')
  const groupPhaseComplete = groupRounds.length > 0 && groupRounds.every(round => round.state === 'completed')
  const groupsReady = participants.filter(p => p.group === 1).length === 8 && participants.filter(p => p.group === 2).length === 8
  const canGenerate = isDouble ? (rounds.length === 0 ? groupsReady : groupPhaseComplete && finals.length === 0) : isPreGenerated || (checkedInCount >= 4 && lastRoundScored)

  if (rounds.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-12 flex flex-col items-center text-center">
        <span className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
          <Icon name="shuffle" className="w-8 h-8" stroke={1.8} />
        </span>
        <h3 className="font-display font-bold text-[20px]">No rounds yet</h3>
        <p className="text-ink-mute text-sm mt-1 max-w-xs">
          {isDouble ? 'Assign two groups of eight on the Participants tab, then generate the group stage.' : 'Generate the first round to auto-assign teams across courts.'}
        </p>
        {!isPreGenerated && (
          <p className="text-ink-mute text-[12.5px] mt-2 tnum">{checkedInCount} checked in</p>
        )}
        <div className="mt-5">
          <GenerateRoundsButton size="lg" icon="bolt" onGenerate={onGenerate} disabled={!canGenerate}>
            {isDouble ? 'Generate group stage' : 'Generate round 1'}
          </GenerateRoundsButton>
        </div>
        {!canGenerate && (
          <p className="text-[12.5px] text-red-500 mt-2">{isDouble ? 'Assign exactly 8 players to each group first' : 'Check in at least 4 players first'}</p>
        )}
      </div>
    )
  }

  return (
    <div>
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
      {showResetFinals && <ConfirmDialog title="Reset crossover finals?" body="Final matches and scores will be deleted. Group results stay intact, so you can correct them and regenerate the finals." confirmLabel="Reset finals" danger onConfirm={async () => { await resetFinals({ tournamentId: tournament._id }); setShowResetFinals(false) }} onCancel={() => setShowResetFinals(false)} />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent text-ink flex items-center justify-center">
            <Icon name="shuffle" className="w-5 h-5" stroke={2.2} />
          </span>
          <div>
            <div className="font-semibold text-[15px] leading-tight">Round generator</div>
            <div className="text-[12.5px] text-ink-mute capitalize">
              {tournament.format.replace(/_/g, ' ')} ·{' '}
              {tournament.scoringMode === 'time_based'
                ? 'most points when time runs out'
                : `${tournament.scoringMode === 'shared_total' ? 'play' : 'first to'} ${tournament.pointsToWin ?? POINTS_TO_WIN} points`}
            </div>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="md" icon="gear" onClick={() => setShowSettings(true)}>Settings</Button>
          <Button variant="ghost" size="md" icon="reset" onClick={() => setShowReset(true)}>Reset</Button>
          {isDouble && finals.length > 0 && tournament.state !== 'completed' && tournament.state !== 'archived' && <Button variant="outline" size="md" icon="reset" onClick={() => setShowResetFinals(true)}>Reset finals</Button>}
        </div>
      </div>

      <div className="space-y-6">
        {rounds.map((round) => (
          <RoundRow
            key={round._id}
            round={round}
            pointsToWin={tournament.pointsToWin ?? POINTS_TO_WIN}
            scoringMode={tournament.scoringMode ?? 'first_to'}
            blocked={rounds.some(r => r.roundNumber < round.roundNumber && r.state !== 'completed')}
            pin={pin}
          />
        ))}
      </div>

      {(!isPreGenerated || (isDouble && finals.length === 0)) && (
        <div className="flex flex-col items-center justify-center gap-2 mt-6 rounded-2xl border-2 border-dashed border-zinc-300 p-6">
          <GenerateRoundsButton size="lg" icon="plus" onGenerate={onGenerate} disabled={!canGenerate}>
            {isDouble ? 'Generate crossover finals' : `Generate round ${rounds.length + 1}`}
          </GenerateRoundsButton>
          {!isDouble && checkedInCount < 4 && (
            <p className="text-[12.5px] text-ink-mute">Check in at least 4 players before generating the next round</p>
          )}
          {!isDouble && checkedInCount >= 4 && !lastRoundScored && (
            <p className="text-[12.5px] text-ink-mute">Score and end round {lastRound?.roundNumber} before generating the next</p>
          )}
        </div>
      )}
      {isPreGenerated && (!isDouble || finals.length > 0) && (
        <div className="flex items-center justify-center gap-1.5 mt-6 text-[12.5px] text-ink-mute font-medium">
          <Icon name="check" className="w-4 h-4 text-zinc-400" stroke={2.5} />
          All {rounds.length} rounds scheduled
        </div>
      )}
    </div>
  )
}

function RoundRow({ round, pointsToWin, scoringMode, blocked, pin }: {
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="font-display font-bold text-[15px]">{round.stage === 'final' ? `Crossover finals · Round ${round.roundNumber}` : round.stage === 'group' ? `Group stage · Round ${round.roundNumber}` : `Round ${round.roundNumber}`}</span>
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
          {round.state === 'in_progress' && completeError && (
            <Button variant="ghost" size="sm" icon="check" onClick={handleComplete} disabled={working}>
              {completeError}
            </Button>
          )}
          {round.state === 'in_progress' && !completeError && allDone && (
            <span className="text-[12px] text-ink-mute font-medium flex items-center gap-1">
              <Icon name="check" className="w-3.5 h-3.5" /> Finishing round…
            </span>
          )}
          {round.state === 'in_progress' && !completeError && !allDone && (
            <span className="text-[12px] text-ink-mute font-medium">
              {matches.length - doneCount} match{matches.length - doneCount !== 1 ? 'es' : ''} remaining
            </span>
          )}
          {round.state === 'completed' && (
            <span className="text-[12px] font-semibold text-zinc-300 flex items-center gap-1">
              <Icon name="check" className="w-3.5 h-3.5" stroke={2.5} /> Complete
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {matches.map((match) => (
          <MatchCell key={match._id} match={match} pointsToWin={pointsToWin} scoringMode={scoringMode} pin={pin} />
        ))}
      </div>
    </div>
  )
}
