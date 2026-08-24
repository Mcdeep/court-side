import type { ReactNode } from 'react'
import type { LeaderboardEntry } from '#/features/tournaments/types'
import { Icon, type IconName } from '#/components/ui/icon'
import type { KioskStats } from './stats'
import { BoardList } from './leaderboard-list'

function StatCard({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="rounded-[28px] bg-white/[0.04] ring-1 ring-white/10 p-6 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-paper/50 text-[12.5px] font-bold uppercase tracking-wider">
        <Icon name={icon} className="w-4 h-4" />
        {label}
      </div>
      {children}
    </div>
  )
}

export function FinishedView({ leaderboard, stats }: { leaderboard: LeaderboardEntry[]; stats: KioskStats }) {
  return (
    <main className="flex-1 grid grid-cols-[1fr_460px] gap-7 p-8 min-h-0 overflow-y-auto">
      <div className="grid grid-cols-2 auto-rows-min gap-5 content-start">
        <StatCard icon="bolt" label="Longest win streak">
          {stats.longestStreak ? (
            <div>
              <div className="font-display font-bold text-[24px] leading-tight">{stats.longestStreak.name}</div>
              <div className="font-mono tnum text-accent text-[15px] font-bold mt-1">{stats.longestStreak.length} wins in a row</div>
            </div>
          ) : (
            <div className="text-paper/30 text-sm">Not enough matches</div>
          )}
        </StatCard>

        <StatCard icon="trophy" label="Biggest win">
          {stats.biggestWin ? (
            <div>
              <div className="font-display font-bold text-[19px] leading-tight">{stats.biggestWin.winners.join(' / ')}</div>
              <div className="text-paper/40 text-[13px] mt-0.5">beat {stats.biggestWin.losers.join(' / ')}</div>
              <div className="font-mono tnum text-accent text-[15px] font-bold mt-1">
                {Math.max(stats.biggestWin.scoreA, stats.biggestWin.scoreB)}–{Math.min(stats.biggestWin.scoreA, stats.biggestWin.scoreB)} · Round {stats.biggestWin.roundNumber}
              </div>
            </div>
          ) : (
            <div className="text-paper/30 text-sm">No completed matches</div>
          )}
        </StatCard>

        <StatCard icon="medal" label="Undefeated">
          {stats.perfectRuns.length > 0 ? (
            <div className="flex flex-col gap-2">
              {stats.perfectRuns.slice(0, 4).map(p => (
                <div key={p.name} className="flex items-center justify-between">
                  <span className="font-semibold text-[15px]">{p.name}</span>
                  <span className="font-mono tnum text-paper/50 text-[13px]">{p.games}-0</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-paper/30 text-sm">Nobody went unbeaten</div>
          )}
        </StatCard>
      </div>

      <aside className="min-h-0">
        <section className="rounded-[28px] bg-white/[0.04] ring-1 ring-white/10 p-6 flex flex-col h-full min-h-0">
          <h2 className="font-display font-bold text-[19px] tracking-tight flex items-center gap-2 mb-2 shrink-0 whitespace-nowrap">
            <Icon name="trophy" className="w-5 h-5 text-accent shrink-0" />
            Final standings
          </h2>
          <BoardList rows={leaderboard} />
        </section>
      </aside>
    </main>
  )
}
