"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { hasPermission, permissionDenied } from "@/lib/permissions";

export type ActionState = { error?: string };

export async function updateSettings(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "manageSettings")) return permissionDenied();

  const name = String(formData.get("name") || "").trim();
  const country = String(formData.get("country") || "").trim();
  const currency = String(formData.get("currency") || "").trim().toUpperCase();
  const vatPercent = Number(formData.get("vatPercent") || 0);

  if (!name) return { error: "Business name is required." };
  if (!country) return { error: "Country is required." };
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: "Currency must be a 3-letter code, e.g. USD." };
  }
  if (!(vatPercent >= 0 && vatPercent <= 100)) {
    return { error: "VAT % must be between 0 and 100." };
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: { name, country, currency, vatRate: vatPercent / 100 },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  return {};
}
