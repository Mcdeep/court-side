import { buildModel, type Model } from "./model";
import type { Award, AwardCandidate, EngineInput, Format } from "./types";
import { clutchPlayer, demolitionJob, invincible, onFire, unluckyOne, warrior } from "./general";
import { comebackKing, consistent, giantSlayer, strongFinisher } from "./americano";
import { dominator, finalsUpset, flawless, redemption } from "./double";
import { biggestClimb, dreamTeam, longestReign, roadToGlory, summit } from "./fixedPairs";

export type { Award, EngineInput } from "./types";

export const MAX_AWARDS = 8;

type AwardFn = (m: Model) => AwardCandidate | null;

const GENERAL: AwardFn[] = [invincible, onFire, clutchPlayer, unluckyOne, demolitionJob, warrior];
const AMERICANO_FAMILY: AwardFn[] = [comebackKing, giantSlayer, consistent, strongFinisher];
const DOUBLE: AwardFn[] = [flawless, finalsUpset, redemption, dominator];

export function eligibleAwards(format: Format, double: boolean): AwardFn[] {
  switch (format) {
    case "team_clash":
      return [];
    case "americano":
      return [...GENERAL, ...AMERICANO_FAMILY, ...(double ? DOUBLE : [])];
    case "mexicano":
      return [...GENERAL, ...AMERICANO_FAMILY];
    case "king_of_the_court":
      return [...GENERAL, longestReign];
    case "snakes_and_ladders":
      return [...GENERAL, summit, biggestClimb];
    case "round_robin":
      return [...GENERAL, dreamTeam];
    case "knockout":
      return [...GENERAL, roadToGlory];
  }
}

// Keeps up to `max` awards in priority order. Beyond the cap, awards that
// recognise someone without an award yet win over ones that don't.
export function selectAwards(candidates: AwardCandidate[], max = MAX_AWARDS): Award[] {
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority);
  const taken: AwardCandidate[] = [];
  const awarded = new Set<string>();
  const skipped: AwardCandidate[] = [];
  for (const c of sorted) {
    if (taken.length >= max) break;
    if (c.winnerIds.some((id) => !awarded.has(id))) {
      taken.push(c);
      for (const id of c.winnerIds) awarded.add(id);
    } else skipped.push(c);
  }
  for (const c of skipped) {
    if (taken.length >= max) break;
    taken.push(c);
  }
  return taken
    .sort((a, b) => a.priority - b.priority)
    .map(({ priority: _p, winnerIds: _w, listStyle: _l, ...award }) => award);
}

export function computeAwards(input: EngineInput): Award[] {
  const fns = eligibleAwards(input.format, input.double);
  if (fns.length === 0 || input.matches.length === 0) return [];
  const model = buildModel(input);
  const candidates = fns.map((fn) => fn(model)).filter((c): c is AwardCandidate => c !== null);
  return selectAwards(candidates);
}
