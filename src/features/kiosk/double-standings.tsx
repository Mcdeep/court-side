import type { LeaderboardEntry } from "#/features/tournaments/types";
import { BoardList } from "./leaderboard-list";

export function DoubleStandings({ rows }: { rows: LeaderboardEntry[] }) {
  if (rows.every((row) => row.finalPlacement !== undefined)) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <p className="text-xs text-paper/45 mb-2">Points shown are from the group stage.</p>
        <BoardList
          rows={[...rows].sort((a, b) => (a.finalPlacement ?? 99) - (b.finalPlacement ?? 99))}
        />
      </div>
    );
  }
  return (
    <div className="grid grid-rows-2 gap-4 flex-1 min-h-0">
      {([1, 2] as const).map((group) => (
        <div key={group} className="flex flex-col min-h-0">
          <h3 className="text-sm font-bold text-paper/50 uppercase tracking-wider mb-2">
            Group {group}
          </h3>
          <BoardList
            rows={rows
              .filter((row) => row.group === group)
              .sort((a, b) => (a.groupRank ?? 99) - (b.groupRank ?? 99))}
          />
        </div>
      ))}
    </div>
  );
}
