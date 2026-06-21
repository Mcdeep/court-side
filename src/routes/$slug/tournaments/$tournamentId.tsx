import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import React, { useEffect, useRef, useState } from 'react'
import type { Id } from '#/../convex/_generated/dataModel'
import { Avatar, Button, Icon, JoinQRButton, SegTabs, StatusChip, TeamMark } from '#/components/ui'

export const Route = createFileRoute('/$slug/tournaments/$tournamentId')({
  component: TournamentDetailPage,
})

const POINTS_TO_WIN = 24
const PRE_GENERATED_FORMATS = ['americano', 'round_robin']

function lastName(name: string) {
  return name.split(' ').slice(-1)[0]
}

/* ─── Page ────────────────────────────────────────────────────── */
function TournamentDetailPage() {
  const { slug, tournamentId } = useParams({ from: '/$slug/tournaments/$tournamentId' })
  const navigate = useNavigate()
  const [tab, setTab] = useState('schedule')
  const [scoreFor, setScoreFor] = useState<any>(null)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const tournament = useQuery(api.tournaments.get, { tournamentId: tournamentId as Id<'tournaments'> })
  const participants = useQuery(api.participants.list, { tournamentId: tournamentId as Id<'tournaments'> })
  const rounds = useQuery(api.rounds.list, { tournamentId: tournamentId as Id<'tournaments'> })
  const leaderboard = useQuery(api.leaderboard.get, { tournamentId: tournamentId as Id<'tournaments'> })
  const generateRounds = useMutation(api.rounds.generate)
  const updateState = useMutation(api.tournaments.updateState)
  const deleteTournament = useMutation(api.tournaments.deleteTournament)

  if (!tournament || !participants || !rounds || !leaderboard) {
    return <div className="p-10 animate-pulse"><div className="h-8 w-64 bg-zinc-100 rounded-xl" /></div>
  }

  const chipStatus = tournament.state === 'in_progress' ? 'live'
    : tournament.state === 'completed' || tournament.state === 'archived' ? 'completed'
    : 'draft'

  const tid = tournamentId as Id<'tournaments'>

  const handleGenerate = async () => {
    await generateRounds({ tournamentId: tid })
  }

  const canAddPlayer = tournament.state === 'draft' || tournament.state === 'registration_open'
  const canEdit = ['draft', 'published', 'registration_open'].includes(tournament.state)
  const canDelete = tournament.state === 'draft' && rounds.length === 0
  const canArchive = tournament.state !== 'archived'

  const handleConfirm = async () => {
    if (confirmAction === 'archive') {
      await updateState({ tournamentId: tid, state: 'archived' })
      setConfirmAction(null)
    } else if (confirmAction === 'delete') {
      await deleteTournament({ tournamentId: tid })
      navigate({ to: `/${slug}/tournaments` })
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-7">
      {showAddPlayer && (
        <AddPlayerModal
          tournamentId={tid}
          existingIds={participants.map(p => p.userId).filter(Boolean) as Id<'users'>[]}
          onClose={() => setShowAddPlayer(false)}
        />
      )}
      {showEdit && (
        <EditTournamentModal
          tournament={tournament}
          tournamentId={tid}
          onClose={() => setShowEdit(false)}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction === 'delete' ? 'Delete tournament?' : 'Archive tournament?'}
          body={confirmAction === 'delete'
            ? `"${tournament.name}" will be permanently deleted. This cannot be undone.`
            : `"${tournament.name}" will be archived and hidden from active views.`}
          confirmLabel={confirmAction === 'delete' ? 'Delete' : 'Archive'}
          danger={confirmAction === 'delete'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Back */}
      <button onClick={() => navigate({ to: `/${slug}/tournaments` })}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-mute hover:text-ink mb-4 group">
        <Icon name="back" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        All tournaments
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display font-bold text-[32px] leading-tight tracking-tight whitespace-nowrap">
              {tournament.name}
            </h1>
            <StatusChip status={chipStatus as any} />
          </div>
          <div className="flex items-center gap-4 text-[13px] text-ink-mute font-medium whitespace-nowrap">
            <span className="flex items-center gap-1.5">
              <Icon name="shuffle" className="w-4 h-4" />
              <span className="capitalize">{tournament.format.replace(/_/g, ' ')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="users" className="w-4 h-4" /> {participants.length} players
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="cal" className="w-4 h-4" />
              {new Date(tournament.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canAddPlayer && <JoinQRButton tournamentId={tournamentId} />}
          {canEdit && (
            <Button variant="outline" size="md" icon="pencil" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
          )}
          {tournament.state === 'draft' && (
            <Button variant="outline" size="md" icon="flag"
              onClick={() => updateState({ tournamentId: tid, state: 'registration_open' })}>
              Open registration
            </Button>
          )}
          {tournament.state === 'registration_open' && (
            <Button variant="ghost" size="md"
              onClick={() => updateState({ tournamentId: tid, state: 'draft' })}>
              Close registration
            </Button>
          )}
          {tournament.state === 'in_progress' && (
            <Button variant="ink" size="md" icon="flag"
              onClick={() => updateState({ tournamentId: tid, state: 'completed' })}>
              Finish tournament
            </Button>
          )}
          {(tournament.state === 'completed' || tournament.state === 'archived') && (
            <span className="text-[13px] font-semibold text-ink-mute flex items-center gap-1.5">
              <Icon name="check" className="w-4 h-4" /> Completed
            </span>
          )}
          {/* Overflow menu */}
          <OverflowMenu
            open={menuOpen}
            onToggle={() => setMenuOpen(o => !o)}
            onClose={() => setMenuOpen(false)}
            canArchive={canArchive}
            canDelete={canDelete}
            onArchive={() => { setMenuOpen(false); setConfirmAction('archive') }}
            onDelete={() => { setMenuOpen(false); setConfirmAction('delete') }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5">
        <SegTabs value={tab} onChange={setTab} tabs={[
          { id: 'schedule',     label: 'Schedule' },
          { id: 'participants', label: 'Participants', count: participants.length },
          { id: 'standings',    label: 'Standings' },
        ]} />
        <div className="text-[13px] text-ink-mute font-medium tnum">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''} generated
        </div>
      </div>

      {tab === 'schedule' && (
        <ScheduleTab
          tournament={tournament}
          tournamentId={tournamentId as Id<'tournaments'>}
          rounds={rounds}
          onGenerate={handleGenerate}
          onScore={setScoreFor}
        />
      )}
      {tab === 'participants' && (
        <ParticipantsTab
          participants={participants}
          tournamentId={tid}
          canAdd={canAddPlayer}
          onAdd={() => setShowAddPlayer(true)}
        />
      )}
      {tab === 'standings' && <StandingsTab leaderboard={leaderboard} />}

      {scoreFor && (
        <ScoreModal match={scoreFor} onClose={() => setScoreFor(null)} />
      )}
    </div>
  )
}

/* ─── Overflow menu ───────────────────────────────────────────── */
function OverflowMenu({ open, onToggle, onClose, canArchive, canDelete, onArchive, onDelete }: {
  open: boolean; onToggle: () => void; onClose: () => void
  canArchive: boolean; canDelete: boolean
  onArchive: () => void; onDelete: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button onClick={onToggle}
        className="w-9 h-9 flex items-center justify-center rounded-xl ring-1 ring-zinc-200 hover:bg-zinc-50 transition-colors">
        <Icon name="dots" className="w-4 h-4 text-ink-mute" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-pop ring-1 ring-zinc-200/80 py-1.5 z-30">
          {canArchive && (
            <button onClick={onArchive}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-ink hover:bg-zinc-50 transition-colors">
              <Icon name="archive" className="w-4 h-4 text-zinc-400" />
              Archive
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-red-500 hover:bg-red-50 transition-colors">
              <Icon name="trash" className="w-4 h-4" />
              Delete
            </button>
          )}
          {!canArchive && !canDelete && (
            <div className="px-3.5 py-2 text-[13px] text-ink-mute">No actions available</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Edit tournament modal ───────────────────────────────────── */
function toDatetimeLocal(ms: number) {
  const d = new Date(ms)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const INPUT_MODAL_CLS = 'w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all'

function EditTournamentModal({ tournament, tournamentId, onClose }: {
  tournament: any; tournamentId: Id<'tournaments'>; onClose: () => void
}) {
  const [name, setName] = useState(tournament.name)
  const [roundMinutes, setRoundMinutes] = useState(tournament.roundDurationMs ? String(tournament.roundDurationMs / 60_000) : '')
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(tournament.startsAt))
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(tournament.endsAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const updateTournament = useMutation(api.tournaments.update)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name required'); return }
    setSaving(true); setError('')
    try {
      await updateTournament({
        tournamentId,
        name: name.trim(),
        roundDurationMs: roundMinutes ? Number(roundMinutes) * 60_000 : undefined,
        startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(),
      })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] bg-paper rounded-2xl shadow-pop p-6 ring-1 ring-ink/8">
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display font-bold text-[22px] tracking-tight">Edit tournament</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-ink/6 text-ink-mute hover:text-ink transition-colors">
            <Icon name="x" className="w-4 h-4" stroke={2.5} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className={INPUT_MODAL_CLS} required />
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Round duration (minutes)</label>
            <input
              type="number" min={1} max={60}
              value={roundMinutes}
              onChange={e => setRoundMinutes(e.target.value)}
              placeholder="Leave empty for no timer"
              className={INPUT_MODAL_CLS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Starts</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={INPUT_MODAL_CLS} required />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Ends</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={INPUT_MODAL_CLS} required />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Confirm dialog ──────────────────────────────────────────── */
function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  const [working, setWorking] = useState(false)
  async function go() {
    setWorking(true)
    try { await onConfirm() } catch { setWorking(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-[380px] bg-paper rounded-2xl shadow-pop p-6 ring-1 ring-ink/8">
        <h2 className="font-display font-bold text-[20px] tracking-tight mb-2">{title}</h2>
        <p className="text-sm text-ink-mute mb-5">{body}</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={working}>Cancel</Button>
          <Button
            variant={danger ? 'ghost' : 'primary'}
            className={`flex-1 ${danger ? '!text-red-500 !ring-red-200 hover:!bg-red-50' : ''}`}
            onClick={go}
            disabled={working}>
            {working ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Schedule tab ────────────────────────────────────────────── */
function ScheduleTab({ tournament, tournamentId: _tid, rounds, onGenerate, onScore }: any) {
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
        <div className="mt-5">
          <Button variant="primary" size="lg" icon="bolt" onClick={onGenerate}>Generate round 1</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Generator bar */}
      <div className="flex items-center justify-between gap-4 mb-5 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent text-ink flex items-center justify-center">
            <Icon name="shuffle" className="w-5 h-5" stroke={2.2} />
          </span>
          <div>
            <div className="font-semibold text-[15px] leading-tight">Round generator</div>
            <div className="text-[12.5px] text-ink-mute capitalize">
              {tournament.format.replace(/_/g, ' ')} · first to {POINTS_TO_WIN}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon="gear">Settings</Button>
          {!PRE_GENERATED_FORMATS.includes(tournament.format) && (
            <Button variant="primary" size="md" icon="plus" onClick={onGenerate}>
              Generate round {rounds.length + 1}
            </Button>
          )}
          {PRE_GENERATED_FORMATS.includes(tournament.format) && (
            <span className="text-[12.5px] text-ink-mute font-medium flex items-center gap-1.5">
              <Icon name="check" className="w-4 h-4 text-zinc-400" stroke={2.5} />
              All {rounds.length} rounds scheduled
            </span>
          )}
        </div>
      </div>

      {/* Round list — matches fetched per round */}
      <div className="space-y-6">
        {rounds.map((round: any) => (
          <RoundRow key={round._id} round={round} onScore={onScore} />
        ))}
      </div>
    </div>
  )
}

function RoundRow({ round, onScore }: any) {
  const matches = useQuery(api.matches.listByRound, { roundId: round._id })
  const startRound = useMutation(api.rounds.start)
  const completeRound = useMutation(api.rounds.complete)
  const [working, setWorking] = useState(false)

  if (!matches) return null

  const doneCount = matches.filter((m: any) => m.state === 'completed' || m.state === 'disputed').length
  const allDone = doneCount === matches.length && matches.length > 0

  async function handleStart() {
    setWorking(true)
    try { await startRound({ roundId: round._id }) } finally { setWorking(false) }
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
            ${round.state === 'in_progress' ? 'bg-accent text-ink' :
              round.state === 'completed'   ? 'bg-zinc-100 text-zinc-400' :
                                              'bg-zinc-100 text-zinc-400'}`}>
            {round.state === 'in_progress' ? 'Playing' : round.state === 'completed' ? 'Done' : 'Queued'}
          </span>
          {round.state !== 'pending' && (
            <span className="text-[12px] text-ink-mute tnum">
              {doneCount}/{matches.length} scored
            </span>
          )}
        </div>
        <div>
          {round.state === 'pending' && (
            <Button variant="outline" size="sm" icon="bolt" onClick={handleStart} disabled={working}>
              Start round
            </Button>
          )}
          {round.state === 'in_progress' && (
            <Button
              variant={allDone ? 'ink' : 'ghost'}
              size="sm"
              icon="check"
              onClick={handleComplete}
              disabled={working}>
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
        {matches.map((match: any) => (
          <MatchCell key={match._id} match={match} onClick={onScore} />
        ))}
      </div>
    </div>
  )
}

function MatchCell({ match, onClick }: any) {
  const nameA1 = match.pairA?.participantA?.user?.name ?? match.pairA?.participantA?.walkInName ?? '?'
  const nameA2 = match.pairA?.participantB?.user?.name ?? match.pairA?.participantB?.walkInName ?? '?'
  const nameB1 = match.pairB?.participantA?.user?.name ?? match.pairB?.participantA?.walkInName ?? '?'
  const nameB2 = match.pairB?.participantB?.user?.name ?? match.pairB?.participantB?.walkInName ?? '?'

  const live  = match.state === 'in_progress'
  const final = match.state === 'completed'

  return (
    <button onClick={() => onClick(match)}
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
          <span className="font-mono tnum text-[15px] shrink-0">–</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-ink">
          <span className="text-[13.5px] truncate font-semibold min-w-0 flex-1">
            {lastName(nameB1)} <span className="text-zinc-300 font-normal">/</span> {lastName(nameB2)}
          </span>
          <span className="font-mono tnum text-[15px] shrink-0">–</span>
        </div>
      </div>
      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-[11px] text-ink-mute font-medium">
          {match.state === 'scheduled' ? 'Tap to start' : match.state === 'in_progress' ? 'Update score' : 'Edit result'}
        </span>
        <Icon name="pencil" className="w-3.5 h-3.5 text-zinc-300" />
      </div>
    </button>
  )
}

/* ─── Participants tab ────────────────────────────────────────── */
function ParticipantsTab({ participants, tournamentId: _tid, canAdd, onAdd }: any) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
        <div className="font-semibold text-[15px]">
          Participants <span className="text-ink-mute font-normal">· {participants.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon="filter">Sort</Button>
          {canAdd && (
            <Button variant="outline" size="sm" icon="plus" onClick={onAdd}>Add player</Button>
          )}
        </div>
      </div>
      {participants.length === 0 ? (
        <div className="px-5 py-12 text-center text-ink-mute text-sm">
          No participants yet. Add players to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {participants.map((p: any, i: number) => {
            const name = p.user?.name ?? p.walkInName ?? 'Walk-in'
            return (
              <div key={p._id}
                className={`flex items-center gap-3 px-5 py-3
                  ${i % 2 === 0 ? 'border-r border-zinc-100' : ''}
                  border-b border-zinc-100`}>
                <span className="tnum text-[12px] text-zinc-300 w-5 font-mono">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Avatar name={name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{name}</div>
                  <div className="text-[12px] text-ink-mute">
                    {p.isWalkIn ? 'Walk-in' : 'Member'}
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Add player modal ────────────────────────────────────────── */
const INPUT_CLS = 'w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all'

function AddPlayerModal({ tournamentId, existingIds, onClose }: {
  tournamentId: Id<'tournaments'>
  existingIds: Id<'users'>[]
  onClose: () => void
}) {
  const [mode, setMode] = useState<'walkin' | 'member'>('walkin')
  const [walkInName, setWalkInName] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const allUsers = useQuery(api.users.list)
  const addParticipant = useMutation(api.participants.add)

  const filtered = (allUsers ?? [])
    .filter(u => !existingIds.includes(u._id))
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))

  async function addWalkIn() {
    if (!walkInName.trim()) { setError('Enter a name'); return }
    setSaving(true); setError('')
    try {
      await addParticipant({ tournamentId, isWalkIn: true, walkInName: walkInName.trim(), entryType: 'solo' })
      setWalkInName('')
      onClose()
    } catch (e: any) { setError(e?.message ?? 'Failed'); setSaving(false) }
  }

  async function addMember(userId: Id<'users'>) {
    setSaving(true); setError('')
    try {
      await addParticipant({ tournamentId, userId, isWalkIn: false, entryType: 'solo' })
      onClose()
    } catch (e: any) { setError(e?.message ?? 'Failed'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] bg-paper rounded-2xl shadow-pop ring-1 ring-ink/8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-display font-bold text-[18px]">Add player</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-ink/6 text-ink-mute hover:text-ink transition-colors">
            <Icon name="x" className="w-4 h-4" stroke={2.5} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-3 pb-0">
          {(['walkin', 'member'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 h-8 rounded-lg text-[13px] font-semibold transition-all
                ${mode === m ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink'}`}>
              {m === 'walkin' ? 'Walk-in' : 'Member'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {mode === 'walkin' ? (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-mute">Enter the player's name. No account needed.</p>
              <input
                autoFocus
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addWalkIn()}
                placeholder="Player name"
                className={INPUT_CLS}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button variant="primary" className="flex-1" onClick={addWalkIn} disabled={saving}>
                  {saving ? 'Adding…' : 'Add walk-in'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search members…"
                className={INPUT_CLS}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="max-h-60 overflow-y-auto -mx-1 space-y-0.5">
                {allUsers === undefined ? (
                  <div className="text-center py-6 text-ink-mute text-sm animate-pulse">Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-6 text-ink-mute text-sm">
                    {search ? 'No members match.' : 'All members already added.'}
                  </div>
                ) : filtered.map(u => (
                  <button key={u._id} onClick={() => addMember(u._id)} disabled={saving}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent-soft transition-colors group text-left">
                    <Avatar name={u.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{u.name}</div>
                      <div className="text-[12px] text-ink-mute">{u.email}</div>
                    </div>
                    <Icon name="plus" className="w-4 h-4 text-zinc-300 group-hover:text-accent-dark" stroke={2.5} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Standings tab ───────────────────────────────────────────── */
function StandingsTab({ leaderboard }: any) {
  if (leaderboard.length === 0) {
    return (
      <div className="text-ink-mute text-sm bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-10 text-center">
        Standings appear once the first round is scored.
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
      <div className="grid grid-cols-[48px_1fr_70px_70px_70px] gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
        <div>#</div><div>Player</div>
        <div className="text-right">GP</div>
        <div className="text-right">Won</div>
        <div className="text-right">Pts</div>
      </div>
      {leaderboard.map((entry: any, i: number) => {
        const name = entry.user?.name ?? entry.participant?.walkInName ?? 'Unknown'
        return (
          <div key={entry._id}
            className={`grid grid-cols-[48px_1fr_70px_70px_70px] gap-2 px-5 py-2.5 items-center border-b border-zinc-100 last:border-0 ${i < 3 ? 'bg-accent-soft/40' : ''}`}>
            <div className="flex items-center">
              <span className={`tnum font-display font-bold text-[15px] w-7 h-7 rounded-lg flex items-center justify-center
                ${i === 0 ? 'bg-accent text-ink' : i < 3 ? 'bg-ink text-paper' : 'text-ink-mute'}`}>
                {i + 1}
              </span>
            </div>
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={name} size={28} />
              <span className="font-semibold text-sm whitespace-nowrap">{name}</span>
            </div>
            <div className="text-right tnum text-sm text-ink-mute">{entry.wins + entry.losses}</div>
            <div className="text-right tnum text-sm text-ink-mute">{entry.wins}</div>
            <div className="text-right tnum font-mono font-bold text-[15px]">{entry.points}</div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Score modal ─────────────────────────────────────────────── */
function ScoreModal({ match, onClose }: { match: any; onClose: () => void }) {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const saveResult = useMutation(api.scores.saveResult)

  const complete = a === POINTS_TO_WIN || b === POINTS_TO_WIN

  const handleSave = async () => {
    await saveResult({ matchId: match._id, scoreA: a, scoreB: b })
    onClose()
  }

  const nameA1 = match.pairA?.participantA?.user?.name ?? match.pairA?.participantA?.walkInName ?? '?'
  const nameA2 = match.pairA?.participantB?.user?.name ?? match.pairA?.participantB?.walkInName ?? '?'
  const nameB1 = match.pairB?.participantA?.user?.name ?? match.pairB?.participantA?.walkInName ?? '?'
  const nameB2 = match.pairB?.participantB?.user?.name ?? match.pairB?.participantB?.walkInName ?? '?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div onClick={e => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-pop w-full max-w-md overflow-hidden rowin">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-accent text-ink flex items-center justify-center">
              <Icon name="court" className="w-5 h-5" />
            </span>
            <div>
              <div className="font-display font-bold text-[16px] leading-tight whitespace-nowrap">
                Court {match.courtNumber} · Score
              </div>
              <div className="text-[12px] text-ink-mute whitespace-nowrap">Enter the result</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-ink-mute">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-stretch gap-3">
            <Stepper label={`${lastName(nameA1)} / ${lastName(nameA2)}`} names={[nameA1, nameA2]} val={a} set={setA} highlight={a > b} />
            <div className="flex items-center font-display font-bold text-zinc-300 text-lg">vs</div>
            <Stepper label={`${lastName(nameB1)} / ${lastName(nameB2)}`} names={[nameB1, nameB2]} val={b} set={setB} highlight={b > a} />
          </div>

          <div className="mt-4 flex items-center justify-between text-[12.5px]">
            <span className="text-ink-mute">First to <span className="font-bold text-ink tnum">{POINTS_TO_WIN}</span> points</span>
            <span className={`font-semibold tnum px-2.5 h-7 inline-flex items-center rounded-full whitespace-nowrap
              ${complete ? 'bg-accent text-ink' : 'bg-zinc-100 text-ink-mute'}`}>
              {complete ? 'Match point reached' : `${a + b} pts played`}
            </span>
          </div>

          <div className="mt-5 flex gap-2">
            <Button variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant={complete ? 'primary' : 'ink'} size="lg" className="flex-[1.4]"
              icon={complete ? 'check' : 'clock'} onClick={handleSave}>
              {complete ? 'Save final result' : 'Save as live'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stepper({ label, names, val, set, highlight }: any) {
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
