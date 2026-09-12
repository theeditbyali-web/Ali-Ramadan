"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";

export type ActionState = { error?: string };

export async function createSupplier(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!name) return { error: "Name is required." };

  const existing = await db.supplier.findUnique({
    where: { tenantId_name: { tenantId: tenant.id, name } },
  });
  if (existing) return { error: "A supplier with that name already exists." };

  const payablesParent = await db.account.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: "411" } },
  });
  if (!payablesParent) {
    return {
      error:
        'No "Suppliers" (411) account found — it should have been seeded when your business was created.',
    };
  }

  const count = await db.supplier.count({ where: { tenantId: tenant.id } });

  await db.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        tenantId: tenant.id,
        code: `411-${count + 1}`,
        name,
        type: "LIABILITY",
        parentId: payablesParent.id,
      },
    });

    await tx.supplier.create({
      data: {
        tenantId: tenant.id,
        name,
        code: `SUP-${String(count + 1).padStart(4, "0")}`,
        phone: phone || null,
        email: email || null,
        address: address || null,
        accountId: account.id,
      },
    });
  });

  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  revalidatePath("/accounts");
  return {};
}

export async function updateSupplier(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const id = String(formData.get("id") || "");
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!id) return { error: "Missing supplier id." };

  const existing = await db.supplier.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!existing) return { error: "Supplier not found." };

  await db.supplier.update({
    where: { id },
    data: {
      phone: phone || null,
      email: email || null,
      address: address || null,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  return {};
}
