"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { hasPermission, permissionDenied } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import type { Role } from "@prisma/client";

export type ActionState = { error?: string };

const ROLES: Role[] = ["OWNER", "ADMIN", "STAFF"];

export async function inviteTeamMember(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "manageTeam")) return permissionDenied();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "") as Role;

  if (!name || !email || !password) return { error: "All fields are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!ROLES.includes(role)) return { error: "Select a role." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    await tx.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role },
    });
  });

  revalidatePath("/team");
  return {};
}

export async function updateTeamMemberRole(formData: FormData): Promise<void> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "manageTeam")) return;

  const membershipId = String(formData.get("membershipId") || "");
  const role = String(formData.get("role") || "") as Role;
  if (!ROLES.includes(role)) return;

  const membership = await db.membership.findFirst({
    where: { id: membershipId, tenantId: tenant.id },
  });
  if (!membership) return;
  if (membership.userId === session.userId) return;

  if (membership.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await db.membership.count({
      where: { tenantId: tenant.id, role: "OWNER" },
    });
    if (ownerCount <= 1) return;
  }

  await db.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath("/team");
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "manageTeam")) return;

  const membershipId = String(formData.get("membershipId") || "");
  const membership = await db.membership.findFirst({
    where: { id: membershipId, tenantId: tenant.id },
  });
  if (!membership) return;
  if (membership.userId === session.userId) return;

  if (membership.role === "OWNER") {
    const ownerCount = await db.membership.count({
      where: { tenantId: tenant.id, role: "OWNER" },
    });
    if (ownerCount <= 1) return;
  }

  await db.membership.delete({ where: { id: membershipId } });
  revalidatePath("/team");
}
