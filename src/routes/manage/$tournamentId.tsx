import { createFileRoute } from '@tanstack/react-router'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { SegTabs } from '#/components/ui/seg-tabs'
import { ManageSchedule } from '#/features/tournaments/manage-schedule'
import { StandingsTab } from '#/features/tournaments/standings-tab'
import { errorMessage } from '#/lib/utils'

export const Route = createFileRoute('/manage/$tournamentId')({
  component: ManagePage,
})

function pinStorageKey(tournamentId: string) {
  return `manage-pin-${tournamentId}`
}

function ManagePage() {
  const { tournamentId } = Route.useParams()
  const tid = tournamentId as Id<'tournaments'>

  const [pin, setPin] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(pinStorageKey(tournamentId))
  })
  const [tab, setTab] = useState<'schedule' | 'standings'>('schedule')

  const tournament = useQuery(
    api.tournaments.getForManage,
    pin ? { tournamentId: tid, pin } : 'skip',
  )
  const rounds = useQuery(api.rounds.list, tournament ? { tournamentId: tid } : 'skip')
  const participants = useQuery(api.participants.list, tournament ? { tournamentId: tid } : 'skip')
  const leaderboard = useQuery(api.leaderboard.get, tournament ? { tournamentId: tid } : 'skip')
  const generateRounds = useMutation(api.rounds.generate)

  const invalidPin = pin !== null && tournament === null

  useEffect(() => {
    if (invalidPin) {
      localStorage.removeItem(pinStorageKey(tournamentId))
    }
  }, [invalidPin, tournamentId])

  function handleUnlocked(candidate: string) {
    localStorage.setItem(pinStorageKey(tournamentId), candidate)
    setPin(candidate)
  }

  if (!pin || invalidPin) {
    return <PinGate tournamentId={tournamentId} wrongPin={invalidPin} onUnlocked={handleUnlocked} />
  }

  if (tournament === undefined || rounds === undefined || participants === undefined || leaderboard === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-200 border-t-zinc-600 animate-spin" />
      </div>
    )
  }
  if (!tournament) {
    // Unreachable in practice: pin === null or invalidPin (tournament === null)
    // already redirected to PinGate above. This just narrows the type below.
    return null
  }

  const notStarted = tournament.state === 'draft' || tournament.state === 'published' || tournament.state === 'registration_open'
  if (notStarted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">⏳</div>
          <h1 className="text-lg font-bold text-zinc-900 mb-2">Tournament hasn't started yet</h1>
          <p className="text-sm text-zinc-500 mb-5">Come back once the organiser starts the tournament.</p>
        </div>
      </div>
    )
  }

  const ended = tournament.state === 'completed' || tournament.state === 'archived'
  const currentRound = rounds.find(r => r.state === 'in_progress') ?? rounds.find(r => r.state === 'pending')
  const allRoundsDone = rounds.length > 0 && rounds.every(r => r.state === 'completed')

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display font-bold text-[17px] leading-tight truncate">{tournament.name}</div>
            <div className="text-[12.5px] text-ink-mute font-medium">
              {ended ? 'Tournament ended'
                : currentRound ? `Round ${currentRound.roundNumber}`
                : allRoundsDone ? 'All rounds complete' : 'Setting up…'}
            </div>
          </div>
          {ended ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 text-zinc-500 px-3 h-7 text-[12px] font-bold uppercase tracking-wide shrink-0">
              <Icon name="check" className="w-3.5 h-3.5" stroke={3} />
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 ring-1 ring-accent/30 text-accent px-3 h-7 text-[12px] font-bold uppercase tracking-wide shrink-0">
              <span className="relative inline-flex w-2 h-2 rounded-full bg-accent">
                <span className="absolute inset-0 rounded-full bg-accent animate-ping" />
              </span>
              Live
            </span>
          )}
        </div>
        <div className="mt-3">
          <SegTabs
            value={tab}
            onChange={id => setTab(id as 'schedule' | 'standings')}
            tabs={[{ id: 'schedule', label: 'Schedule' }, { id: 'standings', label: 'Standings' }]}
          />
        </div>
      </header>
      <main className="p-3">
        {tab === 'schedule' ? (
          <ManageSchedule
            tournament={tournament}
            rounds={rounds}
            participants={participants}
            pin={pin}
            onGenerate={async () => {
              await generateRounds({ tournamentId: tid, pin })
            }}
            onFinished={() => setTab('standings')}
          />
        ) : (
          <StandingsTab leaderboard={leaderboard} />
        )}
      </main>
    </div>
  )
}

function PinGate({ tournamentId, wrongPin, onUnlocked }: {
  tournamentId: string; wrongPin: boolean; onUnlocked: (pin: string) => void
}) {
  const convex = useConvex()
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(wrongPin ? 'Incorrect PIN — try again' : '')
  const publicInfo = useQuery(api.tournaments.getPublic, { tournamentId: tournamentId as Id<'tournaments'> })

  async function handleSubmit() {
    if (value.length !== 4) return
    setChecking(true)
    setError('')
    try {
      const result = await convex.query(api.tournaments.getForManage, {
        tournamentId: tournamentId as Id<'tournaments'>,
        pin: value,
      })
      if (result) {
        onUnlocked(value)
      } else {
        setError('Incorrect PIN — try again')
        setValue('')
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <span className="inline-flex w-12 h-12 rounded-2xl bg-accent text-ink items-center justify-center mb-3">
            <Icon name="gear" className="w-6 h-6" />
          </span>
          <h1 className="text-lg font-bold text-zinc-900 truncate">{publicInfo?.name ?? 'Manage tournament'}</h1>
          <p className="text-sm text-zinc-500 mt-1">Enter the 4-digit PIN from the organiser</p>
        </div>
        <input
          inputMode="numeric"
          autoFocus
          maxLength={4}
          value={value}
          onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full text-center text-3xl font-mono tnum tracking-[0.5em] py-3 rounded-xl bg-zinc-50 ring-1 ring-zinc-200 focus:ring-2 focus:ring-accent outline-none mb-3"
          placeholder="····"
        />
        {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}
        <Button variant="primary" size="lg" className="w-full" disabled={value.length !== 4 || checking} onClick={handleSubmit}>
          {checking ? 'Checking…' : 'Unlock'}
        </Button>
      </div>
    </div>
  )
}
