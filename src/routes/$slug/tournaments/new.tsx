import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { useState, useRef } from 'react'
import { Icon } from '#/components/ui/icon'
import { Avatar } from '#/components/ui/avatar'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '#/components/ui/carousel'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { toDatetimeLocal } from '#/lib/format'
import { useAsyncAction } from '#/hooks/use-async-action'

export const Route = createFileRoute('/$slug/tournaments/new')({
  component: NewTournamentPage,
})

// ─── Types ───────────────────────────────────────────────────────────────────

type TournamentFormat =
  | 'americano' | 'mexicano' | 'round_robin' | 'knockout'
  | 'king_of_the_court' | 'snakes_and_ladders' | 'team_clash'

type WizardPlayer = { id: string; name: string }
type WizardTeam   = [WizardPlayer | null, WizardPlayer | null]

type WizardData = {
  format: TournamentFormat
  name: string
  venueId: string
  courts: number
  points: number
  roundMinutes: string
  startsAt: string
  endsAt: string
  duration: DurationPreset
  players: WizardPlayer[]
  teams: WizardTeam[]
}

type DurationPreset = '1' | '1.5' | '2' | '3' | 'custom'

const DURATION_PRESETS: { id: DurationPreset; label: string }[] = [
  { id: '1',      label: '1H' },
  { id: '1.5',    label: '1.5H' },
  { id: '2',      label: '2H' },
  { id: '3',      label: '3H' },
  { id: 'custom', label: 'Custom' },
]

// ─── Format definitions ───────────────────────────────────────────────────────

const FORMATS: { id: TournamentFormat; name: string; icon: 'shuffle'|'court'|'trophy'|'users'|'medal'|'link'; desc: string; tag: string }[] = [
  { id: 'americano',          name: 'Americano',         icon: 'shuffle', desc: 'Partners rotate every round. Everyone plays with everyone — pure individual ranking.',   tag: 'Auto-pairs each round' },
  { id: 'mexicano',           name: 'Mexicano',          icon: 'medal',   desc: 'Partners are assigned by ranking — top players with top players each round.',           tag: 'Ranking-based rotation' },
  { id: 'round_robin',        name: 'Round Robin',       icon: 'court',   desc: 'Lock in teams for the whole event. Every team plays every other team once.',            tag: 'Fixed pairs, full schedule' },
  { id: 'knockout',           name: 'Knockout',          icon: 'trophy',  desc: 'Locked teams, single elimination bracket. Lose once and you\'re out.',                  tag: 'Single elimination' },
  { id: 'king_of_the_court',  name: 'King of the Court', icon: 'trophy',  desc: 'Winners stay on the king court, challengers rotate in from the queue.',                tag: 'Winner stays on' },
  { id: 'snakes_and_ladders', name: 'Snakes & Ladders',  icon: 'shuffle', desc: 'Win and move up a court, lose and move down. Social but competitive.',                  tag: 'Court-level promotion' },
  { id: 'team_clash',         name: 'Team Clash',        icon: 'users',   desc: 'Fixed teams battle it out in a league format across multiple rounds.',                  tag: 'Fixed teams, league' },
]

const AUTO_PAIR: TournamentFormat[] = ['americano', 'mexicano']

const STEPS = [
  { id: 'format',  label: 'Format & rules' },
  { id: 'players', label: 'Players' },
  { id: 'pairing', label: 'Pairing' },
  { id: 'review',  label: 'Review' },
]

const INPUT_CLS = 'w-full h-11 px-3.5 rounded-xl bg-zinc-50 ring-1 ring-zinc-200 text-[14.5px] focus:outline-none focus:ring-2 focus:ring-accent-dark/40 focus:bg-white'
const SELECT_CLS = `${INPUT_CLS} appearance-none`

// ─── Step rail ────────────────────────────────────────────────────────────────

function StepRail({ active, furthest, onGoto }: { active: number; furthest: number; onGoto: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < active
        const isActive = i === active
        const reachable = i <= furthest
        return (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => reachable && onGoto(i)}
              disabled={!reachable}
              className={`flex items-center gap-2.5 ${reachable ? 'cursor-pointer' : 'opacity-40 cursor-default'}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors
                ${done ? 'bg-ink text-paper' : isActive ? 'bg-accent text-ink' : 'bg-zinc-100 text-zinc-400'}`}>
                {done ? <Icon name="check" className="w-4 h-4" stroke={3} /> : i + 1}
              </span>
              <span className={`text-[13.5px] font-semibold whitespace-nowrap hidden sm:inline ${isActive ? 'text-ink' : 'text-ink-mute'}`}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && <span className="w-8 sm:w-14 h-px bg-zinc-200 shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Format & rules ───────────────────────────────────────────────────

function StepFormat({ data, set, orgId }: { data: WizardData; set: (p: Partial<WizardData>) => void; orgId: Id<'organizations'> }) {
  const venues = useQuery(api.venues.listByOrg, { organizationId: orgId })
  const fmt = data.format

  const handleVenueChange = (venueId: string) => {
    const venue = venues?.find(v => v._id === venueId)
    set({ venueId, courts: venue?.courtCount ?? data.courts })
  }

  return (
    <div>
      <h2 className="font-display font-bold text-[26px] tracking-tight">Choose a format</h2>
      <p className="text-ink-mute text-[15px] mt-1.5">This decides how pairing and scoring work — you can't change it after players check in.</p>

      <Carousel opts={{ align: 'start', dragFree: true }} className="mt-6">
        <CarouselContent className="-ml-2 py-2">
          {FORMATS.map(f => {
            const sel = fmt === f.id
            return (
              <CarouselItem key={f.id} className="pl-4 basis-auto">
                <button onClick={() => set({ format: f.id })}
                  className={`text-left rounded-2xl p-5 ring-1 transition-all hover:-translate-y-0.5 hover:shadow-card w-[236px]
                    ${sel ? 'bg-accent-soft ring-accent-dark/40 ring-2' : 'bg-white ring-zinc-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${sel ? 'bg-accent text-ink' : 'bg-zinc-100 text-zinc-400'}`}>
                      <Icon name={f.icon} className="w-5 h-5" stroke={2.2} />
                    </span>
                    {sel && (
                      <span className="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center">
                        <Icon name="check" className="w-3.5 h-3.5" stroke={3} />
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-[15px]">{f.name}</div>
                  <div className="text-[12.5px] text-ink-mute mt-1 leading-relaxed">{f.desc}</div>
                  <div className="mt-3 inline-flex text-[11px] font-bold uppercase tracking-wide text-accent-dark bg-accent/25 rounded-full px-2 h-6 items-center whitespace-nowrap">{f.tag}</div>
                </button>
              </CarouselItem>
            )
          })}
          <CarouselItem className="pl-4 basis-auto" aria-hidden>
            <div className="w-2 h-1" />
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious className="-left-4" />
        <CarouselNext className="-right-4" />
      </Carousel>

      <div className="mt-8 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-6">
        <div className="font-bold text-[15px] mb-4">Basics</div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-ink-mute mb-1.5 block">Tournament name</span>
            <input value={data.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Summer Americano"
              className={INPUT_CLS} />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-ink-mute mb-1.5 block">Venue</span>
            {venues === undefined ? (
              <div className={`${INPUT_CLS} text-ink-mute animate-pulse`}>Loading…</div>
            ) : venues.length === 0 ? (
              <div className={`${INPUT_CLS} text-red-500 text-sm flex items-center`}>No venues — add one in Courts first.</div>
            ) : (
              <select value={data.venueId || venues[0]?._id} onChange={e => handleVenueChange(e.target.value)} className={SELECT_CLS}>
                {venues.map(v => (
                  <option key={v._id} value={v._id}>{v.name} ({v.courtCount} courts)</option>
                ))}
              </select>
            )}
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-ink-mute mb-1.5 block">Starts</span>
            <input type="datetime-local" value={data.startsAt}
              onChange={e => {
                const startsAt = e.target.value
                if (data.duration === 'custom') { set({ startsAt }); return }
                const endMs = new Date(startsAt).getTime() + Number(data.duration) * 60 * 60 * 1000
                set({ startsAt, endsAt: toDatetimeLocal(endMs) })
              }}
              className={INPUT_CLS} />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-ink-mute mb-1.5 block">Duration</span>
            <ToggleGroup
              type="single"
              variant="outline"
              value={data.duration}
              onValueChange={(v: string) => {
                if (!v) return
                const preset = v as DurationPreset
                if (preset === 'custom') { set({ duration: preset }); return }
                const startMs = new Date(data.startsAt).getTime()
                const endMs = startMs + Number(preset) * 60 * 60 * 1000
                set({ duration: preset, endsAt: toDatetimeLocal(endMs) })
              }}
              className="w-full"
            >
              {DURATION_PRESETS.map(p => (
                <ToggleGroupItem key={p.id} value={p.id} className="flex-1 h-11 text-[13.5px] font-semibold">
                  {p.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {data.duration === 'custom' && (
              <input type="datetime-local" value={data.endsAt}
                onChange={e => set({ endsAt: e.target.value })}
                className={`${INPUT_CLS} mt-2`} />
            )}
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-ink-mute mb-1.5 block">Courts available</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => set({ courts: Math.max(1, data.courts - 1) })}
                className="w-11 h-11 rounded-xl bg-zinc-50 ring-1 ring-zinc-200 hover:ring-zinc-300 font-bold text-lg">–</button>
              <div className="flex-1 h-11 rounded-xl bg-zinc-50 ring-1 ring-zinc-200 flex items-center justify-center font-mono font-bold text-[16px] tabular-nums">{data.courts}</div>
              <button type="button" onClick={() => set({ courts: Math.min(12, data.courts + 1) })}
                className="w-11 h-11 rounded-xl bg-ink text-paper hover:bg-ink-soft font-bold text-lg">+</button>
            </div>
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-ink-mute mb-1.5 block">Round duration (min)</span>
            <input type="number" min={1} max={60} value={data.roundMinutes}
              onChange={e => set({ roundMinutes: e.target.value })}
              placeholder="e.g. 4 (leave empty for no timer)"
              className={INPUT_CLS} />
          </label>
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-100 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-ink-mute">Points to win a match</div>
            <div className="text-[12px] text-ink-mute/70">Standard padel scoring</div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100">
            {[16, 21, 24, 32].map(p => (
              <button key={p} onClick={() => set({ points: p })}
                className={`h-9 px-4 rounded-lg text-[14px] font-bold tabular-nums transition-all
                  ${data.points === p ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Players ──────────────────────────────────────────────────────────

function StepPlayers({ data, set, orgId }: { data: WizardData; set: (p: Partial<WizardData>) => void; orgId: Id<'organizations'> }) {
  const [name, setName] = useState('')
  const allUsers = useQuery(api.users.list)
  const orgParticipants = useQuery(api.participants.listByOrg, { organizationId: orgId })

  const add = (nm?: string) => {
    const n = (nm ?? name).trim()
    if (!n) return
    set({
      players: data.players.some(p => p.name.toLowerCase() === n.toLowerCase())
        ? data.players
        : [...data.players, { id: `p${Date.now()}${Math.random()}`, name: n }],
    })
    if (!nm) setName('')
  }

  const remove = (id: string) => set({ players: data.players.filter(p => p.id !== id) })

  const memberSuggestions = (allUsers ?? [])
    .filter(u => !data.players.some(p => p.name === u.name))
    .slice(0, 8)

  const walkInSuggestions = (orgParticipants?.walkIns ?? [])
    .filter(w => !data.players.some(p => p.name === w.name))
    .slice(0, 6)

  const isOdd = data.players.length % 2 === 1

  return (
    <div>
      <h2 className="font-display font-bold text-[26px] tracking-tight">Add players</h2>
      <p className="text-ink-mute text-[15px] mt-1.5">Type a name and hit enter, or quick-add from your club roster below.</p>

      <div className="mt-6 flex items-center gap-2.5">
        <div className="relative flex-1">
          <Icon name="users" className="w-[18px] h-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Player name…"
            className="w-full h-12 pl-11 pr-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent-dark/40" />
        </div>
        <button onClick={() => add()}
          className="h-12 px-5 rounded-xl bg-ink text-paper font-bold text-[15px] whitespace-nowrap flex items-center gap-1.5 hover:bg-ink-soft transition-all">
          <Icon name="plus" className="w-[18px] h-[18px]" stroke={2.4} /> Add
        </button>
      </div>

      {(memberSuggestions.length > 0 || walkInSuggestions.length > 0) && (
        <div className="mt-4">
          <div className="text-[12px] font-semibold text-ink-mute mb-2">Quick-add from club roster</div>
          <div className="flex flex-wrap gap-2">
            {memberSuggestions.map(u => (
              <button key={u._id} onClick={() => add(u.name)}
                className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full bg-white ring-1 ring-zinc-200 hover:ring-accent-dark/40 hover:bg-accent-soft/50 transition-all text-[13px] font-semibold whitespace-nowrap">
                <Avatar name={u.name} size={22} /> {u.name} <Icon name="plus" className="w-3.5 h-3.5 text-zinc-400" stroke={2.6} />
              </button>
            ))}
            {walkInSuggestions.map(w => (
              <button key={w.name} onClick={() => add(w.name)}
                className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full bg-white ring-1 ring-zinc-200 hover:ring-accent-dark/40 hover:bg-accent-soft/50 transition-all text-[13px] font-semibold whitespace-nowrap">
                <Avatar name={w.name} size={22} /> {w.name} <Icon name="plus" className="w-3.5 h-3.5 text-zinc-400" stroke={2.6} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div className="font-bold text-[15px] whitespace-nowrap">
            Roster <span className="text-ink-mute font-normal">· {data.players.length} players</span>
          </div>
          {isOdd && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-3 h-7 whitespace-nowrap">
              Odd number — add one more for even teams
            </span>
          )}
        </div>
        {data.players.length === 0 ? (
          <div className="py-14 text-center text-ink-mute text-sm">No players yet. Add your first one above.</div>
        ) : (
          <div className="grid grid-cols-2">
            {data.players.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-5 py-2.5 border-b border-zinc-100 ${i % 2 === 0 ? 'border-r' : ''}`}>
                <span className="tabular-nums text-[12px] text-zinc-300 w-5 font-mono">{String(i + 1).padStart(2, '0')}</span>
                <Avatar name={p.name} size={30} />
                <span className="font-semibold text-sm flex-1 truncate">{p.name}</span>
                <button onClick={() => remove(p.id)}
                  className="w-7 h-7 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Icon name="x" className="w-4 h-4" stroke={2.4} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 3: Pairing ──────────────────────────────────────────────────────────

type DragRef = { player: WizardPlayer; from?: { team: number; seat: 0 | 1 } }

function StepPairing({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  const dragRef = useRef<DragRef | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [overSlot, setOverSlot] = useState<string | null>(null)
  const [overPool, setOverPool] = useState(false)

  if (AUTO_PAIR.includes(data.format)) {
    const fmtObj = FORMATS.find(f => f.id === data.format)!
    return (
      <div>
        <h2 className="font-display font-bold text-[26px] tracking-tight">Pairing</h2>
        <p className="text-ink-mute text-[15px] mt-1.5">{fmtObj.name} manages partners automatically — nothing to configure here.</p>
        <div className="mt-6 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-10 flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-2xl bg-accent text-ink flex items-center justify-center mb-4">
            <Icon name={fmtObj.icon} className="w-7 h-7" stroke={2} />
          </span>
          <div className="font-bold text-[16px]">Partners assigned automatically</div>
          <p className="text-ink-mute text-sm mt-1 max-w-sm">
            All {data.players.length} players will be paired by the round generator — you'll see this on the tournament's Schedule tab.
          </p>
        </div>
      </div>
    )
  }

  const nTeams = Math.max(1, Math.floor(data.players.length / 2))
  const teams: WizardTeam[] = data.teams.length === nTeams
    ? data.teams
    : Array.from({ length: nTeams }, (_, i) => data.teams[i] ?? [null, null])

  const assignedIds = new Set(teams.flat().filter(Boolean).map(p => p!.id))
  const pool = data.players.filter(p => !assignedIds.has(p.id))

  const onDragStart = (e: React.DragEvent, player: WizardPlayer, from?: DragRef['from']) => {
    dragRef.current = { player, from }
    setDragging(player.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const clearFrom = (t: WizardTeam[], from: DragRef['from']): WizardTeam[] => {
    if (!from) return t
    const next = t.map(seats => [...seats] as WizardTeam)
    next[from.team][from.seat] = null
    return next
  }

  const dropInSlot = (teamIdx: number, seatIdx: 0 | 1) => {
    if (!dragRef.current) return
    const { player, from } = dragRef.current
    let next = teams.map(seats => [...seats] as WizardTeam)
    const displaced = next[teamIdx][seatIdx]
    next[teamIdx][seatIdx] = player
    if (from) {
      next = clearFrom(next, from)
      if (displaced) next[from.team][from.seat] = displaced
    }
    set({ teams: next })
    dragRef.current = null; setDragging(null)
  }

  const dropInPool = () => {
    if (!dragRef.current) return
    const { from } = dragRef.current
    if (from) set({ teams: clearFrom(teams, from) })
    dragRef.current = null; setDragging(null); setOverPool(false)
  }

  const autoPair = () => {
    const shuffled = [...data.players].sort(() => Math.random() - 0.5)
    set({ teams: Array.from({ length: nTeams }, (_, i) => [shuffled[i * 2] ?? null, shuffled[i * 2 + 1] ?? null]) })
  }

  const resetPairs = () => set({ teams: Array.from({ length: nTeams }, () => [null, null]) })

  const pairedCount = teams.filter(t => t[0] && t[1]).length

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-[26px] tracking-tight">Pair up teams</h2>
          <p className="text-ink-mute text-[15px] mt-1.5">Drag players from the pool into a team slot. Drag a paired player back to swap.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={resetPairs} className="h-10 px-4 rounded-xl bg-white ring-1 ring-zinc-200 hover:ring-zinc-300 font-semibold text-[13.5px] whitespace-nowrap">Clear all</button>
          <button onClick={autoPair} className="h-10 px-4 rounded-xl bg-ink text-paper font-bold text-[13.5px] whitespace-nowrap flex items-center gap-1.5 hover:bg-ink-soft">
            <Icon name="shuffle" className="w-4 h-4" stroke={2.4} /> Auto-pair randomly
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2.5 text-[13px] font-semibold text-ink-mute">
        <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden max-w-xs">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(pairedCount / nTeams) * 100}%` }} />
        </div>
        <span className="tabular-nums whitespace-nowrap">{pairedCount} of {nTeams} teams paired</span>
      </div>

      <div className="mt-5 grid grid-cols-[240px_1fr] gap-5 items-start">
        {/* Pool */}
        <div
          onDragOver={e => { e.preventDefault(); setOverPool(true) }}
          onDragLeave={() => setOverPool(false)}
          onDrop={e => { e.preventDefault(); dropInPool() }}
          className={`rounded-2xl p-4 ring-1 min-h-[200px] sticky top-4 transition-all ${overPool ? 'ring-2 ring-accent-dark bg-accent-soft' : 'bg-white ring-zinc-200/80 shadow-card'}`}>
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink-mute mb-3 flex items-center justify-between">
            <span>Unpaired</span><span className="tabular-nums">{pool.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {pool.length === 0 ? (
              <div className="text-[12.5px] text-zinc-400 text-center py-8">Everyone's paired!</div>
            ) : pool.map(p => (
              <div key={p.id} draggable onDragStart={e => onDragStart(e, p)}
                className={`flex items-center gap-2 pl-1.5 pr-3 h-10 rounded-full bg-white ring-1 ring-zinc-200 cursor-grab active:cursor-grabbing select-none transition-all
                  ${dragging === p.id ? 'opacity-30 scale-95' : 'hover:ring-accent-dark/40 hover:shadow-card'}`}>
                <Avatar name={p.name} size={26} />
                <span className="text-[13.5px] font-semibold whitespace-nowrap flex-1 truncate">{p.name}</span>
                <Icon name="grip" className="w-3.5 h-3.5 text-zinc-300 ml-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Teams grid */}
        <div className="grid grid-cols-3 gap-3.5">
          {teams.map((team, teamIdx) => (
            <div key={teamIdx} className={`rounded-2xl p-3.5 ring-1 transition-all ${team[0] && team[1] ? 'bg-accent-soft/50 ring-accent-dark/30' : 'bg-zinc-50 ring-zinc-200'}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center justify-between">
                <span>Team {teamIdx + 1}</span>
                {team[0] && team[1] && <Icon name="check" className="w-3.5 h-3.5 text-accent-dark" stroke={3} />}
              </div>
              <div className="space-y-2">
                {([0, 1] as const).map(seatIdx => {
                  const player = team[seatIdx]
                  const key = `${teamIdx}-${seatIdx}`
                  const isOver = overSlot === key
                  return (
                    <div key={seatIdx}
                      onDragOver={e => { e.preventDefault(); setOverSlot(key) }}
                      onDragLeave={() => setOverSlot(s => s === key ? null : s)}
                      onDrop={e => { e.preventDefault(); dropInSlot(teamIdx, seatIdx); setOverSlot(null) }}
                      className={`h-12 rounded-xl flex items-center transition-all ${isOver ? 'ring-2 ring-accent-dark bg-accent-soft' : player ? '' : 'ring-1 ring-dashed ring-zinc-300'}`}>
                      {player ? (
                        <div draggable onDragStart={e => onDragStart(e, player, { team: teamIdx, seat: seatIdx })}
                          className={`w-full flex items-center gap-2 pl-1.5 pr-2.5 h-full rounded-xl bg-white ring-1 ring-zinc-200 cursor-grab active:cursor-grabbing ${dragging === player.id ? 'opacity-30' : ''}`}>
                          <Avatar name={player.name} size={26} />
                          <span className="text-[13px] font-semibold truncate flex-1">{player.name}</span>
                          <Icon name="grip" className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                        </div>
                      ) : (
                        <span className="text-[12.5px] text-zinc-400 pl-3 font-medium">Drop a player here</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({ data, venues }: { data: WizardData; venues: { _id: string; name: string; courtCount: number }[] | undefined }) {
  const fmt = FORMATS.find(f => f.id === data.format)!
  const venue = venues?.find(v => v._id === (data.venueId || venues[0]?._id))
  const pairedTeams = data.teams.filter(t => t[0] && t[1])
  const needsPairing = !AUTO_PAIR.includes(data.format)

  return (
    <div>
      <h2 className="font-display font-bold text-[26px] tracking-tight">Review & create</h2>
      <p className="text-ink-mute text-[15px] mt-1.5">Double-check the details — you can edit everything after creating.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-accent text-ink flex items-center justify-center">
              <Icon name={fmt.icon} className="w-5 h-5" stroke={2.2} />
            </span>
            <div>
              <div className="font-bold text-[16px]">{data.name || 'Untitled tournament'}</div>
              <div className="text-[12.5px] text-ink-mute">{fmt.name}</div>
            </div>
          </div>
          <dl className="space-y-2 text-[13.5px]">
            <div className="flex justify-between"><dt className="text-ink-mute">Venue</dt><dd className="font-semibold">{venue?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-mute">Courts</dt><dd className="font-semibold tabular-nums">{data.courts}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-mute">Points to win</dt><dd className="font-semibold tabular-nums">{data.points}</dd></div>
            {data.roundMinutes && <div className="flex justify-between"><dt className="text-ink-mute">Round duration</dt><dd className="font-semibold tabular-nums">{data.roundMinutes} min</dd></div>}
          </dl>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-5">
          <div className="font-bold text-[15px] mb-3">Players <span className="text-ink-mute font-normal">· {data.players.length}</span></div>
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-auto">
            {data.players.length === 0 ? (
              <span className="text-[13px] text-ink-mute">No players added yet.</span>
            ) : data.players.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full bg-zinc-50 ring-1 ring-zinc-200 text-[12.5px] font-semibold whitespace-nowrap">
                <Avatar name={p.name} size={20} /> {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {needsPairing && data.teams.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-5">
          <div className="font-bold text-[15px] mb-3">
            Teams <span className="text-ink-mute font-normal">· {pairedTeams.length} of {data.teams.length} paired</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {data.teams.map((t, i) => (
              <div key={i} className={`rounded-xl px-3 py-2.5 ring-1 ${t[0] && t[1] ? 'bg-accent-soft/50 ring-accent-dark/30' : 'bg-zinc-50 ring-zinc-200'}`}>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Team {i + 1}</div>
                <div className="text-[12.5px] font-semibold truncate">{t[0]?.name ?? '—'}</div>
                <div className="text-[12.5px] font-semibold truncate">{t[1]?.name ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function NewTournamentPage() {
  const { slug } = useParams({ from: '/$slug/tournaments/new' })
  const navigate = useNavigate()
  const org = useQuery(api.organizations.getBySlug, { slug })
  const venues = useQuery(api.venues.listByOrg, org ? { organizationId: org._id } : 'skip')
  const createTournament = useMutation(api.tournaments.create)
  const addParticipant = useMutation(api.participants.add)
  const { working, error, setError, run } = useAsyncAction()

  const now = Date.now()
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [created, setCreated] = useState(false)
  const [data, setData] = useState<WizardData>({
    format: 'americano',
    name: '',
    venueId: '',
    courts: 4,
    points: 24,
    roundMinutes: '',
    startsAt: toDatetimeLocal(now + 60 * 60 * 1000),
    endsAt: toDatetimeLocal(now + 4 * 60 * 60 * 1000),
    duration: '3',
    players: [],
    teams: [],
  })

  const set = (patch: Partial<WizardData>) => setData(d => ({ ...d, ...patch }))

  const isOdd = data.players.length % 2 === 1
  const canNext = [
    !!data.format && !!data.name.trim(),
    data.players.length >= 4 && !isOdd,
    true,
    true,
  ][step] ?? false

  const goto = (i: number) => { if (i <= furthest) setStep(i) }

  const next = () => {
    if (!canNext) return
    const n = Math.min(STEPS.length - 1, step + 1)
    setStep(n)
    setFurthest(f => Math.max(f, n))
  }

  const back = () => setStep(s => Math.max(0, s - 1))

  const handleCreate = async () => {
    if (!org) return
    const resolvedVenueId = (data.venueId || venues?.[0]?._id) as Id<'venues'> | undefined
    if (!resolvedVenueId) { setError('Select a venue'); return }
    if (!data.name.trim()) { setError('Tournament name is required'); return }

    await run(async () => {
      const tournamentId = await createTournament({
        organizationId: org._id,
        venueId: resolvedVenueId,
        name: data.name.trim(),
        format: data.format,
        courtCount: data.courts,
        roundDurationMs: data.roundMinutes ? Number(data.roundMinutes) * 60_000 : undefined,
        pointsToWin: data.points,
        startsAt: new Date(data.startsAt).getTime(),
        endsAt: new Date(data.endsAt).getTime(),
      })

      // Build ordered player list: for fixed-pair formats, use team order
      const orderedPlayers: WizardPlayer[] = []
      if (!AUTO_PAIR.includes(data.format) && data.teams.length > 0) {
        const inTeam = new Set<string>()
        for (const team of data.teams) {
          for (const p of team) {
            if (p) { orderedPlayers.push(p); inTeam.add(p.id) }
          }
        }
        for (const p of data.players) {
          if (!inTeam.has(p.id)) orderedPlayers.push(p)
        }
      } else {
        orderedPlayers.push(...data.players)
      }

      for (const player of orderedPlayers) {
        await addParticipant({
          tournamentId,
          isWalkIn: true,
          walkInName: player.name,
          entryType: 'solo',
        })
      }

      setCreated(true)
      setTimeout(() => navigate({ to: `/${slug}/tournaments/${tournamentId}` }), 1800)
    })
  }

  if (org === undefined) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent-dark border-t-transparent animate-spin" />
      </div>
    )
  }

  if (created) {
    const fmt = FORMATS.find(f => f.id === data.format)!
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <span className="w-16 h-16 rounded-2xl bg-accent text-ink inline-flex items-center justify-center mb-5">
            <Icon name="check" className="w-8 h-8" stroke={2.6} />
          </span>
          <h1 className="font-display font-bold text-[28px] tracking-tight">{data.name} is live</h1>
          <p className="text-ink-mute text-[15px] mt-2">
            {fmt.name} · {data.players.length} players · {data.courts} courts. Redirecting to dashboard…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-zinc-200/80">
        <div className="max-w-[980px] mx-auto px-8 h-[76px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-ink text-paper flex items-center justify-center font-display font-bold text-[17px]">C</span>
            <span className="font-display font-bold text-[18px] tracking-tight hidden md:inline whitespace-nowrap">New tournament</span>
          </div>
          <StepRail active={step} furthest={furthest} onGoto={goto} />
          <button onClick={() => navigate({ to: `/${slug}/tournaments` })}
            className="w-9 h-9 rounded-lg text-zinc-400 hover:text-ink hover:bg-zinc-100 flex items-center justify-center shrink-0">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[980px] mx-auto w-full px-8 py-9">
        {step === 0 && org && <StepFormat data={data} set={set} orgId={org._id} />}
        {step === 1 && org && <StepPlayers data={data} set={set} orgId={org._id} />}
        {step === 2 && <StepPairing data={data} set={set} />}
        {step === 3 && <StepReview data={data} venues={venues} />}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-paper/95 backdrop-blur border-t border-zinc-200/80">
        <div className="max-w-[980px] mx-auto px-8 h-20 flex items-center justify-between">
          <button onClick={back} disabled={step === 0}
            className="h-11 px-4 rounded-xl font-semibold text-[14.5px] text-ink-mute hover:text-ink hover:bg-zinc-100 disabled:opacity-0 inline-flex items-center gap-1.5 whitespace-nowrap transition-all">
            <Icon name="back" className="w-4 h-4" /> Back
          </button>

          <div className="text-[13px] text-ink-mute font-medium whitespace-nowrap">
            {step === 0 && !data.name.trim() && <span>Enter a tournament name to continue</span>}
            {step === 1 && isOdd && <span className="text-amber-700">Add one more player for even teams</span>}
            {step === 1 && !isOdd && data.players.length < 4 && <span>Add at least 4 players</span>}
            {step === 3 && error && <span className="text-red-500">{error}</span>}
          </div>

          {step < STEPS.length - 1 ? (
            <button onClick={next} disabled={!canNext}
              className="h-11 px-5 rounded-xl bg-accent text-ink font-bold text-[14.5px] whitespace-nowrap inline-flex items-center gap-1.5 shadow-[0_1px_0_oklch(0.6_0.16_140)] hover:brightness-105 active:translate-y-px disabled:opacity-40 disabled:pointer-events-none transition-all">
              Continue <Icon name="chevR" className="w-4 h-4" stroke={2.4} />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={working}
              className="h-11 px-5 rounded-xl bg-accent text-ink font-bold text-[14.5px] whitespace-nowrap inline-flex items-center gap-1.5 shadow-[0_1px_0_oklch(0.6_0.16_140)] hover:brightness-105 active:translate-y-px disabled:opacity-40 disabled:pointer-events-none transition-all">
              <Icon name="bolt" className="w-4 h-4" stroke={2.4} />
              {working ? 'Creating…' : 'Create tournament'}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
