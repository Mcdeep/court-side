/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { requireOrgAdmin, requireOrgAdminOrPin, requireOrgMember, requireSuperAdmin } from "./auth";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!../**/*.test.ts"]);

async function setup() {
  const t = convexTest(schema, modules);
  const data = await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: "Club",
      slug: "club",
      status: "active",
    });
    const memberId = await ctx.db.insert("users", { name: "Member", email: "m@example.test" });
    await ctx.db.insert("memberships", { userId: memberId, organizationId, role: "member" });
    const adminId = await ctx.db.insert("users", { name: "Admin", email: "a@example.test" });
    await ctx.db.insert("memberships", { userId: adminId, organizationId, role: "admin" });
    const outsiderId = await ctx.db.insert("users", {
      name: "Outsider",
      email: "o@example.test",
    });
    const superAdminId = await ctx.db.insert("users", {
      name: "Super",
      email: "s@example.test",
      isSuperAdmin: true,
    });
    return { organizationId, memberId, adminId, outsiderId, superAdminId };
  });
  return { t, ...data };
}

test("requireSuperAdmin throws for non-super-admins and succeeds for super admins", async () => {
  const { t, memberId, superAdminId } = await setup();
  await expect(
    t.withIdentity({ subject: memberId }).run((ctx) => requireSuperAdmin(ctx)),
  ).rejects.toThrow("Super admin access required");
  const user = await t.withIdentity({ subject: superAdminId }).run((ctx) => requireSuperAdmin(ctx));
  expect(user._id).toBe(superAdminId);
});

test("requireSuperAdmin throws when there is no identity at all", async () => {
  const { t } = await setup();
  await expect(t.run((ctx) => requireSuperAdmin(ctx))).rejects.toThrow("Not authenticated");
});

test("requireOrgMember throws for a user with no membership row", async () => {
  const { t, organizationId, outsiderId } = await setup();
  await expect(
    t.withIdentity({ subject: outsiderId }).run((ctx) => requireOrgMember(ctx, organizationId)),
  ).rejects.toThrow("Not a member of this organisation");
});

test("requireOrgMember succeeds with the caller's actual role", async () => {
  const { t, organizationId, memberId, adminId } = await setup();
  const memberResult = await t
    .withIdentity({ subject: memberId })
    .run((ctx) => requireOrgMember(ctx, organizationId));
  expect(memberResult.role).toBe("member");
  expect(memberResult.user._id).toBe(memberId);

  const adminResult = await t
    .withIdentity({ subject: adminId })
    .run((ctx) => requireOrgMember(ctx, organizationId));
  expect(adminResult.role).toBe("admin");
});

test("requireOrgMember lets a super admin bypass the membership check entirely", async () => {
  const { t, organizationId, superAdminId } = await setup();
  const result = await t
    .withIdentity({ subject: superAdminId })
    .run((ctx) => requireOrgMember(ctx, organizationId));
  expect(result.role).toBe("admin");
});

test("requireOrgAdmin allows any org member today, not just admins", async () => {
  const { t, organizationId, memberId } = await setup();
  const result = await t
    .withIdentity({ subject: memberId })
    .run((ctx) => requireOrgAdmin(ctx, organizationId));
  expect(result.role).toBe("member");
});

test("requireOrgAdminOrPin: a valid PIN bypasses auth with zero identity needed", async () => {
  const { t, organizationId } = await setup();
  const tournament = { organizationId, managePin: "1234" };
  await expect(t.run((ctx) => requireOrgAdminOrPin(ctx, tournament, "1234"))).resolves.toBeNull();
});

test("requireOrgAdminOrPin: an invalid PIN throws even with no identity", async () => {
  const { t, organizationId } = await setup();
  const tournament = { organizationId, managePin: "1234" };
  await expect(t.run((ctx) => requireOrgAdminOrPin(ctx, tournament, "9999"))).rejects.toThrow(
    "Invalid PIN",
  );
});

test("requireOrgAdminOrPin: missing PIN and no identity throws", async () => {
  const { t, organizationId } = await setup();
  const tournament = { organizationId, managePin: "1234" };
  await expect(t.run((ctx) => requireOrgAdminOrPin(ctx, tournament))).rejects.toThrow(
    "Not authenticated",
  );
});

test("requireOrgAdminOrPin: a valid identity with membership succeeds without a PIN", async () => {
  const { t, organizationId, memberId } = await setup();
  const tournament = { organizationId, managePin: "1234" };
  await expect(
    t.withIdentity({ subject: memberId }).run((ctx) => requireOrgAdminOrPin(ctx, tournament)),
  ).resolves.toBeNull();
});
