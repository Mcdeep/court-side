import type { Doc } from "../../_generated/dataModel";
import type { Tiebreak } from "../tiebreaks";

// Normalised snapshot of a finished tournament that the pure award engine
// works on. Built by convex/awards.ts from the database.

export type Format = Doc<"tournaments">["format"];

export type EngineMatch = {
  roundNumber: number;
  // Non-double formats: always "group".
  stage: "group" | "final";
  // Double Americano finals: 0 = Final 1.
  finalIndex?: number;
  court: number;
  pairA: [string, string];
  pairB: [string, string];
  scoreA: number;
  scoreB: number;
};

export type EnginePlayer = { id: string; name: string; group?: 1 | 2; teamId?: string };

export type EngineStanding = { participantIds: string[]; rank: number; groupRank?: number };

export type EngineInput = {
  format: Format;
  double: boolean;
  scoringMode?: "first_to" | "shared_total" | "time_based";
  pointsToWin?: number;
  leaderboardScoringMode?: "accumulate" | "differential";
  // Tiebreak order the standings use (["points"] when not tiebreak-ranked).
  rankingOrder: readonly Tiebreak[];
  players: EnginePlayer[];
  // Scored matches only.
  matches: EngineMatch[];
  finalStandings: EngineStanding[];
};

export type Award = {
  id: string;
  title: string;
  emoji: string;
  winners: string[];
  detail: string;
  short: string;
};

export type AwardCandidate = Award & {
  priority: number;
  winnerIds: string[];
  listStyle?: boolean;
};
