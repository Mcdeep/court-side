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
