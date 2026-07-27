import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { SegTabs } from '#/components/ui/seg-tabs'
import { StatusChip } from '#/components/ui/status-chip'
import { formatDate } from '#/lib/format'

export const Route = createFileRoute('/$slug/tournaments/')({
  component: TournamentsPage,
})

type TournamentStatus = 'draft' | 'live' | 'completed' | 'registration_open' | 'in_progress' | 'archived' | 'published'

function normaliseStatus(state: TournamentStatus): 'draft' | 'live' | 'completed' {
  if (state === 'in_progress') return 'live'
  if (state === 'completed' || state === 'archived') return 'completed'
  return 'draft'
}

function TournamentsPage() {
  const { slug } = useParams({ from: '/$slug/tournaments/' })
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  // Look up org by slug
  const org = useQuery(api.organizations.getBySlug, { slug })

  // Fetch tournaments with venue + round progress
  const tournaments = useQuery(
    api.tournaments.listWithDetails,
    org ? { organizationId: org._id } : 'skip'
  )

  if (org === undefined || tournaments === undefined) {
    return <PageSkeleton />
  }

  if (org === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-mute">Organisation not found.</p>
      </div>
    )
  }

  const goNew = () => navigate({ to: `/${slug}/tournaments/new` })

  const counts = {
    all:       tournaments.length,
    live:      tournaments.filter(t => normaliseStatus(t.state as TournamentStatus) === 'live').length,
    draft:     tournaments.filter(t => normaliseStatus(t.state as TournamentStatus) === 'draft').length,
    completed: tournaments.filter(t => normaliseStatus(t.state as TournamentStatus) === 'completed').length,
  }

  const rows = tournaments.filter(t =>
    filter === 'all' || normaliseStatus(t.state as TournamentStatus) === filter
  )

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2 whitespace-nowrap capitalize">
            {org.name}
          </div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Tournaments</h1>
        </div>
        <Button variant="primary" size="lg" icon="plus" onClick={goNew}>New tournament</Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <Stat label="Live now"      value={counts.live}  accent sub={`across ${org.name}`} icon="bolt" />
        <Stat label="Total"         value={counts.all}   sub="tournaments"                  icon="trophy" />
        <Stat label="Completed"     value={counts.completed} sub="finished"                icon="check" />
      </div>

      {/* Filter + search row */}
      <div className="flex items-center justify-between mb-3">
        <SegTabs value={filter} onChange={setFilter} tabs={[
          { id: 'all',       label: 'All',       count: counts.all },
          { id: 'live',      label: 'Live',      count: counts.live },
          { id: 'draft',     label: 'Draft',     count: counts.draft },
          { id: 'completed', label: 'Completed', count: counts.completed },
        ]} />
        <div className="relative">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input placeholder="Search tournaments"
            className="h-9 w-60 pl-9 pr-3 rounded-xl bg-white ring-1 ring-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-dark/40" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_0.8fr_1fr_auto] gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
          <div>Tournament</div>
          <div>Format</div>
          <div>Courts</div>
          <div>Progress</div>
          <div className="w-28 text-right pr-2">Status</div>
        </div>

        {rows.length === 0 && (
          <div className="px-5 py-16 text-center text-ink-mute text-sm">
            {filter === 'all' ? 'No tournaments yet. Create one to get started.' : `No ${filter} tournaments.`}
          </div>
        )}

        {rows.map(t => {
          const chipStatus = normaliseStatus(t.state as TournamentStatus)
          return (
            <button key={t._id}
              onClick={() => navigate({ to: `/${slug}/tournaments/${t._id}` })}
              className="rowin w-full text-left grid grid-cols-[1.6fr_1fr_0.8fr_1fr_auto] gap-4 px-5 py-4 items-center border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors group">
              {/* Name + venue */}
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                  ${chipStatus === 'live' ? 'bg-accent text-ink' : chipStatus === 'completed' ? 'bg-ink text-paper' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Icon name={t.format === 'knockout' ? 'trophy' : 'shuffle'} className="w-[18px] h-[18px]" stroke={2.2} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">{t.name}</div>
                  <div className="text-[12.5px] text-ink-mute flex items-center gap-1.5">
                    <Icon name="cal" className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{formatDate(t.startsAt)}</span>
                  </div>
                </div>
              </div>
              {/* Format */}
              <div className="text-sm">
                <span className="font-medium capitalize">{t.format.replace(/_/g, ' ')}</span>
              </div>
              {/* Courts */}
              <div className="text-sm tnum font-medium text-ink-mute">
                {(t.courtCount ?? 0) > 0 ? t.courtCount : '—'}
              </div>
              {/* Progress */}
              <div className="pr-2">
                {t.totalRounds > 0 ? (() => {
                  const pct = Math.round((t.completedRounds / t.totalRounds) * 100)
                  return (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                        <div className="h-full rounded-full bg-accent-dark" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tnum text-[12px] text-ink-mute w-9 text-right">{pct}%</span>
                    </div>
                  )
                })() : (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-zinc-100" />
                    <span className="tnum text-[12px] text-ink-mute w-9 text-right">—</span>
                  </div>
                )}
              </div>
              {/* Status */}
              <div className="w-28 flex items-center justify-end gap-1 pr-1">
                <StatusChip status={chipStatus} />
                <Icon name="chevR" className="w-4 h-4 text-zinc-300 group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, icon, accent }: {
  label: string; value: number; sub: string; icon: string; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 shadow-card ${accent ? 'bg-ink text-paper ring-ink' : 'bg-white ring-zinc-200/80'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[12px] font-semibold uppercase tracking-wide whitespace-nowrap ${accent ? 'text-paper/60' : 'text-ink-mute'}`}>{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? 'bg-accent text-ink' : 'bg-zinc-100 text-zinc-400'}`}>
          <Icon name={icon as any} className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 font-display font-bold text-[30px] leading-none tnum">{value}</div>
      <div className={`text-[12.5px] mt-1 ${accent ? 'text-paper/55' : 'text-ink-mute'}`}>{sub}</div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8 animate-pulse">
      <div className="h-9 w-48 bg-zinc-100 rounded-xl mb-7" />
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[0,1,2].map(i => <div key={i} className="h-28 bg-zinc-100 rounded-2xl" />)}
      </div>
      <div className="h-12 bg-zinc-100 rounded-2xl" />
    </div>
  )
}
