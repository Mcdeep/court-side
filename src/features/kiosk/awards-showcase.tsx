import { useEffect, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "#/../convex/_generated/api";

export type Award = FunctionReturnType<typeof api.awards.forTournament>[number];

const ROTATE_MS = 8000;
const CARD = "rounded-[28px] bg-white/[0.04] ring-1 ring-white/10";

function AwardCard({ award, large }: { award: Award; large?: boolean }) {
  return (
    <div className={`${CARD} ${large ? "p-10" : "p-6"} flex flex-col gap-2`}>
      <div className={large ? "text-[56px] leading-none" : "text-[32px] leading-none"}>
        {award.emoji}
      </div>
      <div className="text-paper/50 text-[12.5px] font-bold uppercase tracking-wider">
        {award.title}
      </div>
      <div
        className={`font-display font-bold leading-tight ${large ? "text-[44px]" : "text-[24px]"}`}
      >
        {award.winners.join(" & ")}
      </div>
      <div
        className={`font-mono tnum text-accent font-bold ${large ? "text-[20px]" : "text-[15px]"}`}
      >
        {award.detail}
      </div>
    </div>
  );
}

// End-of-tournament awards: one featured award that rotates every 8 seconds,
// with every award always visible in a strip below ("Spotlight + strip").
export function AwardsShowcase({ awards }: { awards: Award[] }) {
  const [index, setIndex] = useState(0);
  const rotating = awards.length >= 3;

  useEffect(() => {
    setIndex(0);
    if (!rotating) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % awards.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [awards.length, rotating]);

  if (awards.length === 0)
    return (
      <div className={`${CARD} p-10 flex items-center justify-center`}>
        <p className="font-display font-bold text-[28px] text-paper/70">Thanks for playing!</p>
      </div>
    );

  if (!rotating)
    return (
      <div className="grid grid-cols-2 gap-5 content-start">
        {awards.map((award) => (
          <AwardCard key={award.id} award={award} />
        ))}
      </div>
    );

  const featured = awards[index % awards.length];
  return (
    <div className="flex flex-col gap-5 min-h-0">
      <div data-testid="featured-award" data-award={featured.id} className="flex-1 min-h-0">
        <AwardCard award={featured} large />
      </div>
      <ul
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${awards.length}, minmax(0, 1fr))` }}
      >
        {awards.map((award, i) => {
          const current = i === index % awards.length;
          return (
            <li
              key={award.id}
              data-award={award.id}
              aria-current={current ? "true" : undefined}
              className={`rounded-2xl p-3 flex flex-col gap-1 min-w-0 transition-colors ${
                current ? "bg-accent/15 ring-2 ring-accent" : "bg-white/[0.04] ring-1 ring-white/10"
              }`}
            >
              <div className="text-[12px] font-bold uppercase tracking-wider text-paper/50 truncate">
                {award.emoji} {award.short}
              </div>
              <div className="font-semibold text-[14px] truncate">{award.winners.join(" & ")}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
