/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "./_generated/*.js", "!./**/*.test.ts"]);

async function setup() {
  const t = convexTest(schema, modules);
  const data = await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: "club",
      name: "Club",
      slug: "club",
      status: "active",
    });
    const otherOrgId = await ctx.db.insert("organizations", {
      clerkOrgId: "other",
      name: "Other",
      slug: "other",
      status: "active",
    });
    const venueId = await ctx.db.insert("venues", {
      organizationId,
      name: "Courts",
      courtCount: 4,
    });
    await ctx.db.insert("users", {
      clerkUserId: "organizer",
      name: "Organizer",
      email: "organizer@example.test",
    });
    await ctx.db.insert("users", {
      clerkUserId: "outsider",
      name: "Outsider",
      email: "outsider@example.test",
    });
    return { organizationId, otherOrgId, venueId };
  });
  const organizer = t.withIdentity({
    tokenIdentifier: "organizer",
    org_id: "club",
    org_role: "org:admin",
  });
  const outsider = t.withIdentity({
    tokenIdentifier: "outsider",
    org_id: "other",
    org_role: "org:admin",
  });
  const insertTournament = (seriesId?: Id<"series">, name = "Americano") =>
    t.run((ctx) =>
      ctx.db.insert("tournaments", {
        organizationId: data.organizationId,
        venueId: data.venueId,
        name,
        format: "americano",
        state: "completed",
        startsAt: 0,
        endsAt: 1000,
        seriesId,
      }),
    );
  return { t, ...data, organizer, outsider, insertTournament };
}

describe("series CRUD", () => {
  test("create and list", async () => {
    const { t, organizer, organizationId } = await setup();
    await organizer.mutation(api.series.create, { organizationId, name: "Tuesday Americano" });
    await organizer.mutation(api.series.create, { organizationId, name: "Summer League" });
    const list = await t.query(api.series.list, { organizationId });
    expect(list.map((s) => s.name)).toEqual(["Summer League", "Tuesday Americano"]);
  });

  test("create trims and rejects blank or duplicate", async () => {
    const { t, organizer, organizationId } = await setup();
    const id = await organizer.mutation(api.series.create, {
      organizationId,
      name: "  Tuesday  ",
    });
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc?.name).toBe("Tuesday");
    await expect(
      organizer.mutation(api.series.create, { organizationId, name: "   " }),
    ).rejects.toThrow(/name/i);
    await expect(
      organizer.mutation(api.series.create, { organizationId, name: "tuesday" }),
    ).rejects.toThrow(/already exists/i);
  });

  test("rename", async () => {
    const { t, organizer, organizationId } = await setup();
    const a = await organizer.mutation(api.series.create, { organizationId, name: "Tuesday" });
    await organizer.mutation(api.series.create, { organizationId, name: "Summer" });
    await organizer.mutation(api.series.rename, { seriesId: a, name: "Tuesday Night" });
    expect((await t.run((ctx) => ctx.db.get(a)))?.name).toBe("Tuesday Night");
    await expect(
      organizer.mutation(api.series.rename, { seriesId: a, name: "summer" }),
    ).rejects.toThrow(/already exists/i);
    await organizer.mutation(api.series.rename, { seriesId: a, name: "TUESDAY NIGHT" });
    expect((await t.run((ctx) => ctx.db.get(a)))?.name).toBe("TUESDAY NIGHT");
  });

  test("remove clears seriesId on tournaments", async () => {
    const { t, organizer, organizationId, insertTournament } = await setup();
    const seriesId = await organizer.mutation(api.series.create, {
      organizationId,
      name: "Tuesday",
    });
    const t1 = await insertTournament(seriesId);
    const t2 = await insertTournament(seriesId);
    const historyId = await t.run(async (ctx) => {
      const memberId = await ctx.db.insert("members", { organizationId, name: "A" });
      return ctx.db.insert("ratingHistory", {
        organizationId,
        memberId,
        tournamentId: t1,
        placement: 1,
        pointsEarned: 10,
      });
    });
    await organizer.mutation(api.series.remove, { seriesId });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(t1))?.seriesId).toBeUndefined();
      expect((await ctx.db.get(t2))?.seriesId).toBeUndefined();
      expect(await ctx.db.get(historyId)).not.toBeNull();
      expect(await ctx.db.get(seriesId)).toBeNull();
    });
  });

  test("requires org admin", async () => {
    const { outsider, organizationId } = await setup();
    await expect(
      outsider.mutation(api.series.create, { organizationId, name: "Tuesday" }),
    ).rejects.toThrow();
  });
});

describe("tournaments in a series", () => {
  async function seriesSetup() {
    const ctx = await setup();
    const seriesId = await ctx.organizer.mutation(api.series.create, {
      organizationId: ctx.organizationId,
      name: "Tuesday",
    });
    const foreignSeriesId = await ctx.t.run((db) =>
      db.db.insert("series", { organizationId: ctx.otherOrgId, name: "Elsewhere" }),
    );
    const getTournament = (id: Id<"tournaments">) => ctx.t.run((db) => db.db.get(id));
    return { ...ctx, seriesId, foreignSeriesId, getTournament };
  }

  test("create with seriesId stores it", async () => {
    const { organizer, organizationId, venueId, seriesId, getTournament } = await seriesSetup();
    const id = await organizer.mutation(api.tournaments.create, {
      organizationId,
      venueId,
      name: "Tuesday #1",
      format: "americano",
      startsAt: 0,
      endsAt: 1000,
      seriesId,
    });
    expect((await getTournament(id))?.seriesId).toBe(seriesId);
  });

  test("rejects series from another org", async () => {
    const { organizer, organizationId, venueId, foreignSeriesId, insertTournament } =
      await seriesSetup();
    await expect(
      organizer.mutation(api.tournaments.create, {
        organizationId,
        venueId,
        name: "X",
        format: "americano",
        startsAt: 0,
        endsAt: 1000,
        seriesId: foreignSeriesId,
      }),
    ).rejects.toThrow(/series not found/i);
    const tournamentId = await insertTournament();
    await expect(
      organizer.mutation(api.tournaments.update, { tournamentId, seriesId: foreignSeriesId }),
    ).rejects.toThrow(/series not found/i);
    await expect(
      organizer.mutation(api.tournaments.setSeries, {
        organizationId,
        tournamentIds: [tournamentId],
        seriesId: foreignSeriesId,
      }),
    ).rejects.toThrow(/series not found/i);
  });

  test("update clears seriesId with null", async () => {
    const { organizer, seriesId, insertTournament, getTournament } = await seriesSetup();
    const tournamentId = await insertTournament(seriesId);
    await organizer.mutation(api.tournaments.update, { tournamentId, name: "Renamed" });
    expect((await getTournament(tournamentId))?.seriesId).toBe(seriesId);
    await organizer.mutation(api.tournaments.update, { tournamentId, seriesId: null });
    expect((await getTournament(tournamentId))?.seriesId).toBeUndefined();
  });

  test("duplicate copies seriesId", async () => {
    const { organizer, seriesId, insertTournament, getTournament } = await seriesSetup();
    const tournamentId = await insertTournament(seriesId);
    const copyId = await organizer.mutation(api.tournaments.duplicate, { tournamentId });
    expect((await getTournament(copyId))?.seriesId).toBe(seriesId);
  });

  test("setSeries assigns and clears in bulk", async () => {
    const { organizer, organizationId, seriesId, insertTournament, getTournament } =
      await seriesSetup();
    const [a, b, c] = [
      await insertTournament(),
      await insertTournament(),
      await insertTournament(),
    ];
    await organizer.mutation(api.tournaments.setSeries, {
      organizationId,
      tournamentIds: [a, b],
      seriesId,
    });
    expect((await getTournament(a))?.seriesId).toBe(seriesId);
    expect((await getTournament(b))?.seriesId).toBe(seriesId);
    expect((await getTournament(c))?.seriesId).toBeUndefined();
    await organizer.mutation(api.tournaments.setSeries, {
      organizationId,
      tournamentIds: [a],
      seriesId: null,
    });
    expect((await getTournament(a))?.seriesId).toBeUndefined();
  });

  test("setSeries rejects tournaments from another org", async () => {
    const { t, organizer, organizationId, otherOrgId, venueId, seriesId } = await seriesSetup();
    const foreign = await t.run((ctx) =>
      ctx.db.insert("tournaments", {
        organizationId: otherOrgId,
        venueId,
        name: "Foreign",
        format: "americano",
        state: "draft",
        startsAt: 0,
        endsAt: 1000,
      }),
    );
    await expect(
      organizer.mutation(api.tournaments.setSeries, {
        organizationId,
        tournamentIds: [foreign],
        seriesId,
      }),
    ).rejects.toThrow(/tournament not found/i);
  });

  test("listWithDetails filters by series", async () => {
    const { t, organizationId, seriesId, insertTournament } = await seriesSetup();
    const a = await insertTournament(seriesId);
    const b = await insertTournament(seriesId);
    await insertTournament();
    const inSeries = await t.query(api.tournaments.listWithDetails, { organizationId, seriesId });
    expect(inSeries.map((x) => x._id).sort()).toEqual([a, b].sort());
    const all = await t.query(api.tournaments.listWithDetails, { organizationId });
    expect(all).toHaveLength(3);
  });
});
