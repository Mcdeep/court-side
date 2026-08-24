import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '#/../convex/_generated/dataModel'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { JoinQRButton } from '#/components/ui/join-qr'
import { SegTabs } from '#/components/ui/seg-tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { StatusChip } from '#/components/ui/status-chip'
import { AddPlayerModal } from '#/features/tournaments/add-player-modal'
import { ConfirmDialog } from '#/features/tournaments/confirm-dialog'
import { EditTournamentModal } from '#/features/tournaments/edit-tournament-modal'
import { OverflowMenu } from '#/features/tournaments/overflow-menu'
import { ParticipantsTab } from '#/features/tournaments/participants-tab'
import { ScheduleTab } from '#/features/tournaments/schedule-tab'
import { StandingsTab } from '#/features/tournaments/standings-tab'
import { TeamsEditor } from '#/features/tournaments/teams-editor'
import { formatDate } from '#/lib/format'
import { FIXED_PAIR_FORMATS } from '#/lib/constants'

export const Route = createFileRoute('/$slug/tournaments/$tournamentId')({
  component: TournamentDetailPage,
})

function TournamentDetailPage() {
  const { slug, tournamentId } = useParams({ from: '/$slug/tournaments/$tournamentId' })
  const navigate = useNavigate()
  const [tab, setTab] = useState('schedule')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const tournament = useQuery(api.tournaments.get, { tournamentId: tournamentId as Id<'tournaments'> })
  const participants = useQuery(api.participants.list, { tournamentId: tournamentId as Id<'tournaments'> })
  const rounds = useQuery(api.rounds.list, { tournamentId: tournamentId as Id<'tournaments'> })
  const leaderboard = useQuery(api.leaderboard.get, { tournamentId: tournamentId as Id<'tournaments'> })
  const generateRounds = useMutation(api.rounds.generate)
  const updateState = useMutation(api.tournaments.updateState)
  const deleteTournament = useMutation(api.tournaments.deleteTournament)
  const duplicateTournament = useMutation(api.tournaments.duplicate)

  if (!tournament || !participants || !rounds || !leaderboard) {
    return <div className="p-10 animate-pulse"><div className="h-8 w-64 bg-zinc-100 rounded-xl" /></div>
  }

  const chipStatus = tournament.state === 'in_progress' ? 'live'
    : tournament.state === 'completed' || tournament.state === 'archived' ? 'completed'
    : 'draft'

  const tid = tournamentId as Id<'tournaments'>

  const handleGenerate = async () => {
    if (participants.length < 4) { setShowAddPlayer(true); return }
    await generateRounds({ tournamentId: tid })
  }

  const canAddPlayer = tournament.state === 'draft' || tournament.state === 'registration_open'
  const canEdit = ['draft', 'published', 'registration_open'].includes(tournament.state)
  const canDelete = tournament.state === 'draft' && rounds.length === 0
  const canArchive = tournament.state !== 'archived'

  const handleDuplicate = async () => {
    setMenuOpen(false)
    const newId = await duplicateTournament({ tournamentId: tid })
    navigate({ to: `/${slug}/tournaments/${newId}` })
  }

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
    <div className="w-full px-4 sm:px-10 py-5 sm:py-7">
      {showAddPlayer && (
        <AddPlayerModal
          tournamentId={tid}
          existingIds={participants.map(p => p.userId).filter(Boolean) as Id<'users'>[]}
          onClose={() => setShowAddPlayer(false)}
        />
      )}
      {showEdit && (
        <EditTournamentModal tournament={tournament} tournamentId={tid} onClose={() => setShowEdit(false)} />
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

      <button onClick={() => navigate({ to: `/${slug}/tournaments` })}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-mute hover:text-ink mb-4 group">
        <Icon name="back" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        All tournaments
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <h1 className="font-display font-bold text-[26px] sm:text-[32px] leading-tight tracking-tight truncate">
              {tournament.name}
            </h1>
            <StatusChip status={chipStatus as any} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-mute font-medium">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Icon name="shuffle" className="w-4 h-4" />
              <span className="capitalize">{tournament.format.replace(/_/g, ' ')}</span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Icon name="users" className="w-4 h-4" /> {participants.length} players
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Icon name="cal" className="w-4 h-4" />
              {formatDate(tournament.startsAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="md" icon="trophy" onClick={() => setShowLeaderboard(true)}>Leaderboard</Button>
          {canAddPlayer && <JoinQRButton tournamentId={tournamentId} />}
          {canEdit && (
            <Button variant="outline" size="md" icon="pencil" onClick={() => setShowEdit(true)}>Edit</Button>
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
            <>
              <Button variant="outline" size="md" icon="screen" asChild>
                <a href={`/kiosk/${tournamentId}`} target="_blank" rel="noreferrer">Kiosk</a>
              </Button>
              <Button variant="ink" size="md" icon="flag"
                onClick={() => updateState({ tournamentId: tid, state: 'completed' })}>
                Finish tournament
              </Button>
            </>
          )}
          {(tournament.state === 'completed' || tournament.state === 'archived') && (
            <span className="text-[13px] font-semibold text-ink-mute flex items-center gap-1.5">
              <Icon name="check" className="w-4 h-4" /> Completed
            </span>
          )}
          <OverflowMenu
            open={menuOpen}
            onToggle={() => setMenuOpen(o => !o)}
            onClose={() => setMenuOpen(false)}
            canArchive={canArchive}
            canDelete={canDelete}
            onArchive={() => { setMenuOpen(false); setConfirmAction('archive') }}
            onDelete={() => { setMenuOpen(false); setConfirmAction('delete') }}
            onDuplicate={handleDuplicate}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
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
          rounds={rounds}
          participants={participants}
          onGenerate={handleGenerate}
        />
      )}
      {tab === 'participants' && (
        <>
          {FIXED_PAIR_FORMATS.includes(tournament.format) && (
            <TeamsEditor
              participants={participants}
              tournamentId={tid}
              locked={rounds.length > 0}
              canEdit={canAddPlayer}
            />
          )}
          <ParticipantsTab
            participants={participants}
            tournamentId={tid}
            format={tournament.format}
            canAdd={canAddPlayer}
            onAdd={() => setShowAddPlayer(true)}
          />
        </>
      )}
      {tab === 'standings' && <StandingsTab leaderboard={leaderboard} />}

      <Sheet open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display font-bold text-[20px] tracking-tight">Leaderboard</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            <StandingsTab leaderboard={leaderboard} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
