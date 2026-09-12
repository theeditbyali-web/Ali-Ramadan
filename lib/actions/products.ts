"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";

export type ActionState = { error?: string };

export async function createProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);

  if (!name) return { error: "Name is required." };
  if (!(price > 0)) return { error: "Price must be greater than 0." };

  await db.product.create({
    data: { tenantId: tenant.id, name, priceCents: Math.round(price * 100) },
  });

  revalidatePath("/products");
  revalidatePath("/pos");
  return {};
}
