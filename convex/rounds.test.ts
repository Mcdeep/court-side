/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import type { Doc } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "./_generated/*.js", "!./**/*.test.ts"]);

async function setup(format: Doc<"tournaments">["format"] = "americano", count = 8) {
  const t = convexTest(schema, modules);
  const data = await t.run(async (ctx) => {
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
    const userId = await ctx.db.insert("users", {
      clerkUserId: "organizer",
      name: "Organizer",
      email: "organizer@example.test",
    });
    const tournamentId = await ctx.db.insert("tournaments", {
      organizationId,
      venueId,
      name: "Tournament",
      format,
      startsAt: 0,
      endsAt: 1000,
      state: "registration_open",
      courtCount: 2,
      managePin: "1234",
    });
    const participants = [];
    for (let i = 0; i < count; i++)
      participants.push(
        await ctx.db.insert("participants", {
          tournamentId,
          isWalkIn: true,
          walkInName: String(i),
          entryType: "solo",
          checkedIn: true,
        }),
      );
    return { organizationId, venueId, userId, tournamentId, participants };
  });
  const organizer = t.withIdentity({
    tokenIdentifier: "organizer",
    org_id: "club",
    org_role: "org:admin",
  });
  const roundPlans = [
    [
      {
        courtNumber: 1,
        pairA: data.participants.slice(0, 2),
        pairB: data.participants.slice(2, 4),
      },
    ],
  ];
  return { t, organizer, roundPlans, ...data };
}

test("generates and persists a complete Americano schedule through an action", async () => {
  const { t, organizer, tournamentId } = await setup();
  expect(await organizer.action(api.rounds.generate, { tournamentId })).toBe(7);
  const rounds = await t.query(api.rounds.list, { tournamentId });
  expect(rounds.map((round) => round.roundNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(await t.run((ctx) => ctx.db.get(tournamentId))).toMatchObject({ state: "in_progress" });
  expect(await t.query(api.matches.listByRound, { roundId: rounds[0]._id })).toHaveLength(2);
});

test("rejects a plan if the roster changed while computing it", async () => {
  const { t, organizer, tournamentId, participants, roundPlans } = await setup();
  const { snapshot } = await organizer.query(internal.rounds.prepareGeneration, { tournamentId });
  await organizer.mutation(api.participants.remove, { participantId: participants[7] });
  await expect(
    organizer.mutation(internal.rounds.commitRoundPlans, { tournamentId, snapshot, roundPlans }),
  ).rejects.toThrow("changed");
  expect(await t.query(api.rounds.list, { tournamentId })).toEqual([]);
});

async function completeLatest(fixture: Awaited<ReturnType<typeof setup>>) {
  const { t, tournamentId } = fixture;
  const rounds = await t.query(api.rounds.list, { tournamentId });
  const last = rounds[rounds.length - 1];
  const matches = await t.query(api.matches.listByRound, { roundId: last._id });
  await t.run(async (ctx) => {
    for (const match of matches)
      await ctx.db.patch(match._id, { state: "completed", scoreA: 10, scoreB: 8 });
    await ctx.db.patch(last._id, { state: "completed" });
  });
  return { last, matches };
}

test.each([
  "round_robin",
  "mexicano",
  "knockout",
  "king_of_the_court",
  "snakes_and_ladders",
] as const)("generates the first %s round with the existing format behavior", async (format) => {
  const { t, organizer, tournamentId, participants } = await setup(format);
  expect(await organizer.action(api.rounds.generate, { tournamentId })).toBe(
    format === "round_robin" ? 3 : 1,
  );
  const rounds = await t.query(api.rounds.list, { tournamentId });
  const matches = await t.query(api.matches.listByRound, { roundId: rounds[0]._id });
  expect(matches.map((match) => match.courtNumber)).toEqual([1, 2]);
  const pairs = await t.run((ctx) =>
    ctx.db
      .query("pairs")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect(),
  );
  const used = new Set(pairs.flatMap((pair) => [pair.participantAId, pair.participantBId]));
  expect(used).toEqual(new Set(participants));
});

test.each(["mexicano", "knockout", "king_of_the_court", "snakes_and_ladders"] as const)(
  "preserves %s next-round inputs and numbering",
  async (format) => {
    const fixture = await setup(format);
    const { t, organizer, tournamentId, participants } = fixture;
    await organizer.action(api.rounds.generate, { tournamentId });
    await expect(organizer.action(api.rounds.generate, { tournamentId })).rejects.toThrow(
      "Complete the current round",
    );
    await completeLatest(fixture);
    if (format === "mexicano")
      await t.run(async (ctx) => {
        for (const [index, participantId] of [...participants].reverse().entries())
          await ctx.db.insert("leaderboard", {
            tournamentId,
            participantId,
            points: 100 - index,
            wins: 1,
            losses: 0,
          });
      });
    expect(await organizer.action(api.rounds.generate, { tournamentId })).toBe(1);
    const rounds = await t.query(api.rounds.list, { tournamentId });
    expect(rounds.map((round) => round.roundNumber)).toEqual([1, 2]);
    const matches = await t.query(api.matches.listByRound, { roundId: rounds[1]._id });
    expect(matches).toHaveLength(format === "knockout" ? 1 : 2);
    const pairs = await t.run(async (ctx) =>
      Promise.all(
        matches.flatMap((match) => [ctx.db.get(match.pairAId), ctx.db.get(match.pairBId)]),
      ),
    );
    if (format === "knockout")
      expect(pairs.map((pair) => [pair!.participantAId, pair!.participantBId])).toEqual([
        participants.slice(0, 2),
        participants.slice(4, 6),
      ]);
    if (format === "king_of_the_court")
      expect([pairs[0]!.participantAId, pairs[2]!.participantAId]).toEqual([
        participants[0],
        participants[4],
      ]);
  },
);

test.each(["round_robin", "knockout", "king_of_the_court", "snakes_and_ladders"] as const)(
  "retains saved team pairing for %s",
  async (format) => {
    const { t, organizer, tournamentId, participants } = await setup(format);
    const expected = [
      [participants[0], participants[4]],
      [participants[1], participants[5]],
      [participants[2], participants[6]],
      [participants[3], participants[7]],
    ];
    await t.run(async (ctx) => {
      for (const [index, members] of expected.entries()) {
        const teamId = await ctx.db.insert("teams", { tournamentId, name: String(index) });
        for (const member of members) await ctx.db.patch(member, { teamId });
      }
    });
    await organizer.action(api.rounds.generate, { tournamentId });
    const pairs = await t.run((ctx) =>
      ctx.db
        .query("pairs")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect(),
    );
    expect(
      new Set(pairs.map((pair) => [pair.participantAId, pair.participantBId].sort().join(":"))),
    ).toEqual(new Set(expected.map((pair) => pair.sort().join(":"))));
  },
);

test.each([
  "court count",
  "venue court count",
  "participant added",
  "check-in",
  "team pairing",
  "tournament state",
] as const)("rejects a plan after a change to %s", async (change) => {
  const { t, organizer, tournamentId, venueId, participants, roundPlans } =
    await setup("round_robin");
  if (change === "venue court count")
    await t.run((ctx) => ctx.db.patch(tournamentId, { courtCount: undefined }));
  const { snapshot } = await organizer.query(internal.rounds.prepareGeneration, { tournamentId });
  await t.run(async (ctx) => {
    if (change === "court count") await ctx.db.patch(tournamentId, { courtCount: 1 });
    if (change === "venue court count") await ctx.db.patch(venueId, { courtCount: 1 });
    if (change === "participant added")
      await ctx.db.insert("participants", {
        tournamentId,
        isWalkIn: true,
        walkInName: "Late",
        entryType: "solo",
      });
    if (change === "check-in") await ctx.db.patch(participants[7], { checkedIn: false });
    if (change === "team pairing") {
      const teamId = await ctx.db.insert("teams", { tournamentId, name: "Changed" });
      await ctx.db.patch(participants[7], { teamId });
    }
    if (change === "tournament state") await ctx.db.patch(tournamentId, { state: "completed" });
  });
  await expect(
    organizer.mutation(internal.rounds.commitRoundPlans, { tournamentId, snapshot, roundPlans }),
  ).rejects.toThrow("changed");
  expect(await t.query(api.rounds.list, { tournamentId })).toEqual([]);
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("pairs")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect(),
    ),
  ).toEqual([]);
});

test("rejects a score correction even when the winning pair is unchanged", async () => {
  const fixture = await setup("knockout");
  const { t, organizer, tournamentId, roundPlans } = fixture;
  await organizer.action(api.rounds.generate, { tournamentId });
  const { matches } = await completeLatest(fixture);
  const { snapshot } = await organizer.query(internal.rounds.prepareGeneration, { tournamentId });
  await t.run((ctx) => ctx.db.patch(matches[0]._id, { scoreA: 11 }));
  await expect(
    organizer.mutation(internal.rounds.commitRoundPlans, { tournamentId, snapshot, roundPlans }),
  ).rejects.toThrow("changed");
  expect(await t.query(api.rounds.list, { tournamentId })).toHaveLength(1);
});

test("only one of two generations from the same snapshot can commit", async () => {
  const { t, organizer, tournamentId, roundPlans } = await setup();
  const [first, second] = await Promise.all([
    organizer.query(internal.rounds.prepareGeneration, { tournamentId }),
    organizer.query(internal.rounds.prepareGeneration, { tournamentId }),
  ]);
  expect(first.snapshot).toBe(second.snapshot);
  await organizer.mutation(internal.rounds.commitRoundPlans, {
    tournamentId,
    snapshot: first.snapshot,
    roundPlans,
  });
  await expect(
    organizer.mutation(internal.rounds.commitRoundPlans, {
      tournamentId,
      snapshot: second.snapshot,
      roundPlans,
    }),
  ).rejects.toThrow("already generated");
  expect(await t.query(api.rounds.list, { tournamentId })).toHaveLength(1);
});

test("rejects a stale next-round plan even when a newer round is already complete", async () => {
  const fixture = await setup("mexicano");
  const { t, organizer, tournamentId, roundPlans } = fixture;
  await organizer.action(api.rounds.generate, { tournamentId });
  await completeLatest(fixture);
  const { snapshot } = await organizer.query(internal.rounds.prepareGeneration, { tournamentId });
  await organizer.action(api.rounds.generate, { tournamentId });
  await completeLatest(fixture);
  await expect(
    organizer.mutation(internal.rounds.commitRoundPlans, { tournamentId, snapshot, roundPlans }),
  ).rejects.toThrow("changed");
  expect(await t.query(api.rounds.list, { tournamentId })).toHaveLength(2);
});

test("enforces organization and PIN authorization before computing", async () => {
  const { t, tournamentId } = await setup();
  await expect(t.action(api.rounds.generate, { tournamentId })).rejects.toThrow(
    "Not authenticated",
  );
  await expect(t.action(api.rounds.generate, { tournamentId, pin: "9999" })).rejects.toThrow(
    "Invalid PIN",
  );
  const outsider = t.withIdentity({
    tokenIdentifier: "organizer",
    org_id: "other",
    org_role: "org:admin",
  });
  await expect(outsider.action(api.rounds.generate, { tournamentId })).rejects.toThrow(
    "Not a member",
  );
  expect(await t.query(api.rounds.list, { tournamentId })).toEqual([]);
});

test("rechecks the PIN at commit and lets an authorized PIN generate", async () => {
  const { t, tournamentId, roundPlans } = await setup();
  const { snapshot } = await t.query(internal.rounds.prepareGeneration, {
    tournamentId,
    pin: "1234",
  });
  await t.run((ctx) => ctx.db.patch(tournamentId, { managePin: "5678" }));
  await expect(
    t.mutation(internal.rounds.commitRoundPlans, {
      tournamentId,
      pin: "1234",
      snapshot,
      roundPlans,
    }),
  ).rejects.toThrow("Invalid PIN");
  expect(await t.action(api.rounds.generate, { tournamentId, pin: "5678" })).toBe(7);
});

test("rechecks organizer access at commit", async () => {
  const { t, organizer, tournamentId, userId, roundPlans } = await setup();
  const { snapshot } = await organizer.query(internal.rounds.prepareGeneration, { tournamentId });
  await t.run((ctx) => ctx.db.delete(userId));
  await expect(
    organizer.mutation(internal.rounds.commitRoundPlans, { tournamentId, snapshot, roundPlans }),
  ).rejects.toThrow("User profile not found");
  expect(await t.query(api.rounds.list, { tournamentId })).toEqual([]);
});

test("rejects unsupported formats and too few participants without writes", async () => {
  const unsupported = await setup("team_clash");
  await expect(
    unsupported.organizer.action(api.rounds.generate, { tournamentId: unsupported.tournamentId }),
  ).rejects.toThrow("not yet supported");
  const small = await setup("americano", 3);
  await expect(
    small.organizer.action(api.rounds.generate, { tournamentId: small.tournamentId }),
  ).rejects.toThrow("at least 4");
  expect(await small.t.query(api.rounds.list, { tournamentId: small.tournamentId })).toEqual([]);
});
