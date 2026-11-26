import type { LeaderboardEntry } from "#/features/tournaments/types";
import { Icon } from "#/components/ui/icon";
import { AwardsShowcase, type Award } from "./awards-showcase";
import { BoardList } from "./leaderboard-list";

export function FinishedView({
  leaderboard,
  awards,
}: {
  leaderboard: LeaderboardEntry[];
  awards: Award[];
}) {
  return (
    <main className="flex-1 grid grid-cols-[1fr_460px] gap-7 p-8 min-h-0 overflow-y-auto">
      <AwardsShowcase awards={awards} />
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
  );
}
