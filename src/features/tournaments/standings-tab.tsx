import { Avatar } from '#/components/ui/avatar'

export function StandingsTab({ leaderboard }: { leaderboard: any[] }) {
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
