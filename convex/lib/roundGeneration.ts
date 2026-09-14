import { v } from "convex/values";
import type { Infer } from "convex/values";
import type { Doc, Id, TableNames } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requireOrgAdminOrPin } from "./auth";
import { generateAmericanoRounds } from "../formats/americano";
import { generateRoundRobinRounds } from "../formats/round_robin";
import { generateMexicanoRound } from "../formats/mexicano";
import { generateKnockoutFirstRound, generateKnockoutNextRound } from "../formats/knockout";
import { generateKingFirstRound, generateKingNextRound } from "../formats/king_of_the_court";
import { generateSnakesFirstRound, generateSnakesNextRound } from "../formats/snakes_and_ladders";

const pairValidator = v.array(v.id("participants"));
const initialFields = { participantIds: v.array(v.id("participants")), courtCount: v.number() };
const generationInputsValidator = v.union(
  v.object({ kind: v.literal("americano"), ...initialFields }),
  v.object({ kind: v.literal("round_robin"), ...initialFields }),
  v.object({ kind: v.literal("mexicano"), ...initialFields }),
  v.object({ kind: v.literal("knockout_first"), ...initialFields }),
  v.object({ kind: v.literal("king_first"), ...initialFields }),
  v.object({ kind: v.literal("snakes_first"), ...initialFields }),
  v.object({ kind: v.literal("knockout_next"), winnerPairs: v.array(pairValidator), courtCount: v.number() }),
  v.object({ kind: v.literal("king_next"), currentKings: v.array(pairValidator), challengers: v.array(pairValidator), courtCount: v.number() }),
  v.object({ kind: v.literal("snakes_next"), pairsWithLevel: v.array(v.object({ pair: pairValidator, level: v.number() })), courtCount: v.number() }),
);
type GenerationInputs = Infer<typeof generationInputsValidator>;
export const generationArgs = { tournamentId: v.id("tournaments"), pin: v.optional(v.string()) };
export const generationSnapshotValidator = v.object({ inputs: generationInputsValidator, snapshot: v.string(), roundCount: v.number() });
export const roundPlansValidator = v.array(v.array(v.object({ courtNumber: v.number(), pairA: pairValidator, pairB: pairValidator })));

export async function prepareRoundGeneration(ctx: QueryCtx, args: { tournamentId: Id<"tournaments">; pin?: string }): Promise<Infer<typeof generationSnapshotValidator>> {
  const sources = new Map<string, Doc<TableNames>>();
  async function read<T extends Doc<TableNames> | Doc<TableNames>[] | null>(operation: Promise<T>): Promise<T> {
    const result = await operation;
    for (const document of Array.isArray(result) ? result : [result]) {
      if (document) sources.set(document._id, document);
    }
    return result;
  }
  const FIXED_PAIR_FORMATS = ["round_robin", "knockout", "king_of_the_court", "snakes_and_ladders"];

  // These formats pair participants by consecutive array position
  // (ids[2i] with ids[2i+1]) for round 1. Order the array so that persisted
  // team pairing (set via teams.setPairs) lands on those consecutive slots;
  // anyone without a team is appended individually at the end.
  async function orderByTeamPairing(
    ctx: QueryCtx,
    tournamentId: Id<"tournaments">,
    participants: Doc<"participants">[]
  ): Promise<Id<"participants">[]> {
    const teams = await read(ctx.db
      .query("teams")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .take(200));

    const byTeam = new Map<string, Doc<"participants">[]>();
    const unpaired: Doc<"participants">[] = [];
    for (const p of participants) {
      if (p.teamId) {
        const arr = byTeam.get(p.teamId as string) ?? [];
        arr.push(p);
        byTeam.set(p.teamId as string, arr);
      } else {
        unpaired.push(p);
      }
    }

    const ordered: Id<"participants">[] = [];
    for (const team of teams) {
      const members = (byTeam.get(team._id) ?? [])
        .sort((a, b) => a._creationTime - b._creationTime);
      for (const m of members) ordered.push(m._id);
    }
    for (const p of unpaired) ordered.push(p._id);
    return ordered;
  }

  const tournament = await read(ctx.db.get(args.tournamentId));
  if (!tournament) throw new Error("Tournament not found");
  await requireOrgAdminOrPin(ctx, tournament, args.pin);

  let courtCount = tournament.courtCount;
  if (!courtCount) {
    const venue = await read(ctx.db.get(tournament.venueId));
    if (!venue) throw new Error("Venue not found");
    courtCount = venue.courtCount;
  }

  const supported = ["americano", "round_robin", "mexicano", "knockout", "king_of_the_court", "snakes_and_ladders"];
  if (!supported.includes(tournament.format)) {
    throw new Error(`Format "${tournament.format}" not yet supported`);
  }

  const PRE_GENERATED = ["americano", "round_robin"];
  const existingRounds = await read(ctx.db
    .query("rounds")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
    .order("asc")
    .take(200));

  if (PRE_GENERATED.includes(tournament.format) && existingRounds.length > 0) {
    throw new Error("Rounds already generated for this tournament");
  }
  if (["mexicano", "knockout", "king_of_the_court", "snakes_and_ladders"].includes(tournament.format) && existingRounds.length > 0) {
    const last = existingRounds[existingRounds.length - 1];
    if (last.state !== "completed") {
      throw new Error("Complete the current round before generating the next");
    }
  }

  const allParticipants = await read(ctx.db
    .query("participants")
    .withIndex("by_tournament", (q) =>
      q.eq("tournamentId", args.tournamentId)
    )
    .take(200));
  const isPreGenerated = PRE_GENERATED.includes(tournament.format);
  const participants = isPreGenerated
    ? allParticipants
    : allParticipants.filter((p) => p.checkedIn === true);

  if (participants.length < 4) {
    throw new Error(
      isPreGenerated
        ? "Need at least 4 participants to generate rounds"
        : "Need at least 4 checked-in participants to generate rounds"
    );
  }

  let participantIds = participants.map((p) => p._id);
  if (FIXED_PAIR_FORMATS.includes(tournament.format) && existingRounds.length === 0) {
    participantIds = await orderByTeamPairing(ctx, args.tournamentId, participants);
  }

  let inputs: GenerationInputs;
  if (tournament.format === "round_robin") {
    inputs = { kind: "round_robin", participantIds, courtCount };
  } else if (tournament.format === "mexicano") {
    const leaderboard = await read(ctx.db
      .query("leaderboard")
      .withIndex("by_tournament_points", (q) => q.eq("tournamentId", args.tournamentId))
      .order("desc")
      .take(200));
    const rankedIds = leaderboard.map((e) => e.participantId);
    const rankedSet = new Set(rankedIds);
    const unranked = participants.filter((p) => !rankedSet.has(p._id));

    // No in-tournament results yet for these participants (typically round 1) —
    // seed by admin-entered skill rating (e.g. Playtomic level) instead of arbitrary order.
    const skillRatings = new Map<string, number>();
    for (const p of unranked) {
      if (p.isWalkIn) {
        if (p.skillRating !== undefined) skillRatings.set(p._id, p.skillRating);
      } else if (p.userId) {
        const playerRating = await read(ctx.db
          .query("playerRatings")
          .withIndex("by_organization_and_user", (q) =>
            q.eq("organizationId", tournament.organizationId).eq("userId", p.userId!)
          )
          .unique());
        if (playerRating?.skillRating !== undefined) {
          skillRatings.set(p._id, playerRating.skillRating);
        }
      }
    }
    const unrankedIds = unranked
      .map((p) => p._id)
      .sort((a, b) => (skillRatings.get(b) ?? -1) - (skillRatings.get(a) ?? -1));

    inputs = { kind: "mexicano", participantIds: [...rankedIds, ...unrankedIds], courtCount };
  } else if (tournament.format === "knockout") {
    if (existingRounds.length === 0) {
      inputs = { kind: "knockout_first", participantIds, courtCount };
    } else {
      const lastRound = existingRounds[existingRounds.length - 1];
      const lastMatches = await read(ctx.db
        .query("matches")
        .withIndex("by_round", (q) => q.eq("roundId", lastRound._id))
        .take(50));
      lastMatches.sort((a, b) => a.courtNumber - b.courtNumber);

      const winnerPairs: [Id<"participants">, Id<"participants">][] = [];
      for (const match of lastMatches) {
        if (match.scoreA === undefined || match.scoreB === undefined) {
          throw new Error("Not all matches in the previous round have scores");
        }
        const winnerPairId = match.scoreA >= match.scoreB ? match.pairAId : match.pairBId;
        const pair = await read(ctx.db.get(winnerPairId));
        if (!pair) throw new Error("Pair not found");
        winnerPairs.push([pair.participantAId, pair.participantBId]);
      }
      inputs = { kind: "knockout_next", winnerPairs, courtCount };
    }
  } else if (tournament.format === "king_of_the_court") {
    if (existingRounds.length === 0) {
      inputs = { kind: "king_first", participantIds, courtCount };
    } else {
      // Track the last round each participant appeared in (for queue ordering).
      const lastRoundPlayed = new Map<string, number>();
      for (const round of existingRounds) {
        const matches = await read(ctx.db
          .query("matches")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .take(50));
        await Promise.all(matches.map(async (match) => {
          const [pA, pB] = await Promise.all([read(ctx.db.get(match.pairAId)), read(ctx.db.get(match.pairBId))]);
          for (const p of [pA, pB]) {
            if (!p) return;
            for (const pid of [p.participantAId as string, p.participantBId as string]) {
              if ((lastRoundPlayed.get(pid) ?? 0) < round.roundNumber) {
                lastRoundPlayed.set(pid, round.roundNumber);
              }
            }
          }
        }));
      }

      // Current kings = winners of last round (sorted by courtNumber).
      const lastRound = existingRounds[existingRounds.length - 1];
      const lastMatches = await read(ctx.db
        .query("matches")
        .withIndex("by_round", (q) => q.eq("roundId", lastRound._id))
        .take(50));
      lastMatches.sort((a, b) => a.courtNumber - b.courtNumber);

      const currentKings: [Id<"participants">, Id<"participants">][] = [];
      for (const match of lastMatches) {
        if (match.scoreA === undefined || match.scoreB === undefined) {
          throw new Error("Not all matches in the previous round have scores");
        }
        const [pA, pB] = await Promise.all([read(ctx.db.get(match.pairAId)), read(ctx.db.get(match.pairBId))]);
        if (!pA || !pB) throw new Error("Pair not found");
        const winner = match.scoreA >= match.scoreB
          ? [pA.participantAId, pA.participantBId]
          : [pB.participantAId, pB.participantBId];
        currentKings.push([winner[0], winner[1]]);
      }

      // Queue = non-kings, sorted by lastRoundPlayed ascending (longest waiting first).
      const kingIds = new Set(currentKings.flat());
      const queueIds = participantIds
        .filter((id) => !kingIds.has(id))
        .sort((a, b) => (lastRoundPlayed.get(a) ?? 0) - (lastRoundPlayed.get(b) ?? 0));

      const challengers: [Id<"participants">, Id<"participants">][] = [];
      for (let i = 0; i + 1 < queueIds.length && challengers.length < currentKings.length; i += 2) {
        challengers.push([queueIds[i], queueIds[i + 1]]);
      }

      inputs = { kind: "king_next", currentKings, challengers, courtCount };
    }
  } else if (tournament.format === "snakes_and_ladders") {
    if (existingRounds.length === 0) {
      inputs = { kind: "snakes_first", participantIds, courtCount };
    } else {
      type PK = string;
      const pKey = (a: string, b: string): PK => a < b ? `${a}:${b}` : `${b}:${a}`;
      const courtLevels = new Map<PK, number>();
      const pairById = new Map<PK, [Id<"participants">, Id<"participants">]>();

      for (const round of existingRounds) {
        const matches = await read(ctx.db
          .query("matches")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .take(50));

        const matchData = await Promise.all(matches.map(async (match) => {
          const [pA, pB] = await Promise.all([read(ctx.db.get(match.pairAId)), read(ctx.db.get(match.pairBId))]);
          return { match, pA, pB };
        }));

        // Set initial court level from first appearance
        for (const { match, pA, pB } of matchData) {
          if (!pA || !pB) continue;
          const keyA = pKey(pA.participantAId, pA.participantBId);
          const keyB = pKey(pB.participantAId, pB.participantBId);
          if (!courtLevels.has(keyA)) {
            courtLevels.set(keyA, match.courtNumber);
            pairById.set(keyA, [pA.participantAId, pA.participantBId]);
          }
          if (!courtLevels.has(keyB)) {
            courtLevels.set(keyB, match.courtNumber);
            pairById.set(keyB, [pB.participantAId, pB.participantBId]);
          }
        }

        // Update levels: winner moves up, loser moves down
        for (const { match, pA, pB } of matchData) {
          if (!pA || !pB || match.scoreA === undefined || match.scoreB === undefined) continue;
          const keyA = pKey(pA.participantAId, pA.participantBId);
          const keyB = pKey(pB.participantAId, pB.participantBId);
          const lA = courtLevels.get(keyA) ?? 1;
          const lB = courtLevels.get(keyB) ?? 1;
          const max = courtCount;
          if (match.scoreA >= match.scoreB) {
            courtLevels.set(keyA, Math.max(1, lA - 1));
            courtLevels.set(keyB, Math.min(max, lB + 1));
          } else {
            courtLevels.set(keyA, Math.min(max, lA + 1));
            courtLevels.set(keyB, Math.max(1, lB - 1));
          }
        }
      }

      const checkedInSet = new Set(participantIds);
      const pairsWithLevel = [...courtLevels.entries()]
        .map(([key, level]) => ({ level, pair: pairById.get(key)! }))
        .filter(({ pair }) => checkedInSet.has(pair[0]) && checkedInSet.has(pair[1]));
      inputs = { kind: "snakes_next", pairsWithLevel, courtCount };
    }
  } else {
    inputs = { kind: "americano", participantIds, courtCount };
  }


  // Queries and the final write use separate transactions. Include every source
  // document so unchanged winners cannot hide a score or roster edit.
  const documents = [...sources.values()].sort((a, b) => a._id < b._id ? -1 : a._id > b._id ? 1 : 0);
  const snapshot = JSON.stringify({ inputs, documents });
  return { inputs, snapshot, roundCount: existingRounds.length };
}

export function generateRoundPlans(inputs: GenerationInputs): Infer<typeof roundPlansValidator> {
  const pair = (ids: Id<"participants">[]): [string, string] => [ids[0], ids[1]];
  const courts = inputs.courtCount;
  const compute = () => {
    switch (inputs.kind) {
      case "americano": return generateAmericanoRounds(inputs.participantIds, courts);
      case "round_robin": return generateRoundRobinRounds(inputs.participantIds, courts);
      case "mexicano": return [generateMexicanoRound(inputs.participantIds, courts)];
      case "knockout_first": return [generateKnockoutFirstRound(inputs.participantIds, courts)];
      case "knockout_next": return [generateKnockoutNextRound(inputs.winnerPairs.map(pair), courts)];
      case "king_first": return [generateKingFirstRound(inputs.participantIds, courts)];
      case "king_next": return [generateKingNextRound(inputs.currentKings.map(pair), inputs.challengers.map(pair), courts)];
      case "snakes_first": return [generateSnakesFirstRound(inputs.participantIds, courts)];
      case "snakes_next": return [generateSnakesNextRound(inputs.pairsWithLevel.map(entry => ({ ...entry, pair: pair(entry.pair) })), courts)];
    }
  };
  return compute().map(round => round.map(match => ({
    courtNumber: match.courtNumber,
    pairA: match.pairA.map(id => id as Id<"participants">),
    pairB: match.pairB.map(id => id as Id<"participants">),
  })));
}
