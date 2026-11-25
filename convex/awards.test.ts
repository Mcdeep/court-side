/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { EIGHT, eightPlayerRounds } from "./lib/awards/fixtures";

const modules = import.meta.glob(["./**/*.ts", "./_generated/*.js", "!./**/*.test.ts"]);

type State = "in_progress" | "completed" | "archived";

// Seeds an 8-player Americano with every match played and scored. Player
// "a"'s side always wins 15–5; everything else is 12–8.
async function seed(state: State, opts: { unscoredMatch?: boolean } = {}) {
  const t = convexTest(schema, modules);
  const tournamentId = await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "club",
      name: "Club",
      slug: "club",
      status: "active",
    });
    const venueId = await ctx.db.insert("venues", {
      organizationId,
      name: "Courts",
      courtCount: 2,
    });
    const tournamentId = await ctx.db.insert("tournaments", {
      organizationId,
      venueId,
      name: "Americano",
      format: "americano",
      state,
      scoringMode: "shared_total",
      pointsToWin: 20,
      tiebreakOrder: ["points", "wins", "point_diff", "head_to_head"],
      startsAt: 0,
      endsAt: 1000,
    });
    const ids = new Map<string, Id<"participants">>();
    for (const name of EIGHT)
      ids.set(
        name,
        await ctx.db.insert("participants", {
          tournamentId,
          entryType: "solo",
          isWalkIn: true,
          walkInName: name.toUpperCase(),
        }),
      );
    const rounds = eightPlayerRounds(EIGHT, () => [12, 8]);
    for (const [r, games] of rounds.entries()) {
      const roundId = await ctx.db.insert("rounds", {
        tournamentId,
        roundNumber: r + 1,
        state: "completed",
      });
      for (const [c, [a1, a2, b1, b2, sA, sB]] of games.entries()) {
        const aHasA = a1 === "a" || a2 === "a";
        const bHasA = b1 === "a" || b2 === "a";
        const [scoreA, scoreB] = aHasA ? [15, 5] : bHasA ? [5, 15] : [sA, sB];
        const pairAId = await ctx.db.insert("pairs", {
          tournamentId,
          participantAId: ids.get(a1)!,
          participantBId: ids.get(a2)!,
        });
        const pairBId = await ctx.db.insert("pairs", {
          tournamentId,
          participantAId: ids.get(b1)!,
          participantBId: ids.get(b2)!,
        });
        const unscored = opts.unscoredMatch && r === 0 && c === 0;
        await ctx.db.insert("matches", {
          roundId,
          courtNumber: c + 1,
          pairAId,
          pairBId,
          state: "completed",
          ...(unscored ? {} : { scoreA, scoreB }),
        });
      }
    }
    return tournamentId;
  });
  return { t, tournamentId };
}

describe("awards.forTournament", () => {
  test("returns no awards unless completed", async () => {
    for (const state of ["in_progress", "archived"] as const) {
      const { t, tournamentId } = await seed(state);
      expect(await t.query(api.awards.forTournament, { tournamentId })).toEqual([]);
    }
  });

  test("completed americano returns awards", async () => {
    const { t, tournamentId } = await seed("completed");
    const awards = await t.query(api.awards.forTournament, { tournamentId });
    expect(awards.length).toBeGreaterThan(0);
    expect(awards.length).toBeLessThanOrEqual(8);
    expect(awards.every((a) => a.winners.length > 0)).toBe(true);
    const invincible = awards.find((a) => a.id === "invincible");
    expect(invincible?.winners).toEqual(["A"]);
    expect(invincible?.detail).toBe("Unbeaten in 7 matches");
    const demolition = awards.find((a) => a.id === "demolitionJob");
    expect(demolition?.detail).toBe("15–5 · Round 1");
  });

  test("skips matches without a recorded score", async () => {
    const { t, tournamentId } = await seed("completed", { unscoredMatch: true });
    const awards = await t.query(api.awards.forTournament, { tournamentId });
    // a's round-1 match has no score, so a played 6 scored matches.
    expect(awards.find((a) => a.id === "invincible")?.detail).toBe("Unbeaten in 6 matches");
    expect(awards.find((a) => a.id === "demolitionJob")?.detail).toBe("15–5 · Round 1");
  });
});
