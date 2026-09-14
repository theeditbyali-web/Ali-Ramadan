"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { hasPermission, permissionDenied } from "@/lib/permissions";
import type { AccountType } from "@prisma/client";

export type ActionState = { error?: string };

const VALID_TYPES: AccountType[] = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
];

export async function createAccount(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "manageAccounts")) return permissionDenied();

  const code = String(formData.get("code") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "") as AccountType;

  if (!code || !name || !VALID_TYPES.includes(type)) {
    return { error: "All fields are required." };
  }

  const existing = await db.account.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code } },
  });
  if (existing) {
    return { error: `An account with code ${code} already exists.` };
  }

  await db.account.create({
    data: { tenantId: tenant.id, code, name, type },
  });

  revalidatePath("/accounts");
  return {};
}
