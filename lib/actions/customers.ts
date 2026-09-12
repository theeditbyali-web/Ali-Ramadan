"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";

export type ActionState = { error?: string };

export async function updateCustomer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const id = String(formData.get("id") || "");
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!id) return { error: "Missing customer id." };

  const existing = await db.customer.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!existing) return { error: "Customer not found." };

  await db.customer.update({
    where: { id },
    data: {
      phone: phone || null,
      email: email || null,
      address: address || null,
    },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return {};
}
