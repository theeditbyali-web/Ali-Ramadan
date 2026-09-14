"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  clearSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_ACCOUNTS } from "@/lib/default-accounts";

export type ActionState = { error?: string };

export async function signup(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const businessName = String(formData.get("businessName") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !businessName || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const { user, tenant } = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: businessName, country: "LB", currency: "USD" },
    });
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });
    await tx.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
    });
    await tx.account.createMany({
      data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, tenantId: tenant.id })),
    });
    return { user, tenant };
  });

  await createSession({ userId: user.id, tenantId: tenant.id, role: "OWNER" });
  redirect("/dashboard");
}

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  const membership = user.memberships[0];
  if (!membership) {
    return { error: "This account isn't linked to a business yet." };
  }

  await createSession({
    userId: user.id,
    tenantId: membership.tenantId,
    role: membership.role,
  });
  redirect(membership.role === "STAFF" ? "/pos" : "/dashboard");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}
