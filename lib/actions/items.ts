"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { resolveCategory } from "@/lib/categories";

export type ActionState = { error?: string };

export async function createItem(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const name = String(formData.get("name") || "").trim();
  const categoryName = String(formData.get("category") || "").trim();
  const unit = String(formData.get("unit") || "unit").trim() || "unit";
  const price = Number(formData.get("price") || 0);
  const sellable = formData.get("sellable") === "on";

  if (!name) return { error: "Name is required." };
  if (!(price > 0)) return { error: "Price must be greater than 0." };

  try {
    await db.$transaction(async (tx) => {
      const category = categoryName
        ? await resolveCategory(tx, tenant.id, categoryName, sellable)
        : null;

      await tx.item.create({
        data: {
          tenantId: tenant.id,
          name,
          categoryId: category?.id ?? null,
          unit,
          priceCents: Math.round(price * 100),
          sellable,
        },
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save the item.",
    };
  }

  revalidatePath("/items");
  revalidatePath("/pos");
  revalidatePath("/accounts");
  return {};
}

export async function updateItem(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const categoryName = String(formData.get("category") || "").trim();
  const unit = String(formData.get("unit") || "unit").trim() || "unit";
  const price = Number(formData.get("price") || 0);
  const sellable = formData.get("sellable") === "on";

  if (!id) return { error: "Missing item id." };
  if (!name) return { error: "Name is required." };
  if (!(price > 0)) return { error: "Price must be greater than 0." };

  const existing = await db.item.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!existing) return { error: "Item not found." };

  try {
    await db.$transaction(async (tx) => {
      const category = categoryName
        ? await resolveCategory(tx, tenant.id, categoryName, sellable)
        : null;

      await tx.item.update({
        where: { id },
        data: {
          name,
          categoryId: category?.id ?? null,
          unit,
          priceCents: Math.round(price * 100),
          sellable,
        },
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save the item.",
    };
  }

  revalidatePath("/items");
  revalidatePath(`/items/${id}`);
  revalidatePath("/pos");
  revalidatePath("/accounts");
  return {};
}

export async function addComponent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const parentItemId = String(formData.get("parentItemId") || "");
  const componentItemId = String(formData.get("componentItemId") || "");
  const quantity = Number(formData.get("quantity") || 0);

  if (!parentItemId || !componentItemId) {
    return { error: "Select a sub-item." };
  }
  if (parentItemId === componentItemId) {
    return { error: "An item can't be a sub-item of itself." };
  }
  if (!(quantity > 0)) {
    return { error: "Quantity must be greater than 0." };
  }

  const [parent, component] = await Promise.all([
    db.item.findFirst({ where: { id: parentItemId, tenantId: tenant.id } }),
    db.item.findFirst({ where: { id: componentItemId, tenantId: tenant.id } }),
  ]);
  if (!parent || !component) return { error: "Item not found." };

  await db.itemComponent.upsert({
    where: {
      parentItemId_componentItemId: { parentItemId, componentItemId },
    },
    create: { parentItemId, componentItemId, quantity },
    update: { quantity },
  });

  revalidatePath(`/items/${parentItemId}`);
  revalidatePath("/items");
  return {};
}

export async function removeComponent(formData: FormData): Promise<void> {
  const { tenant } = await requireTenant();

  const componentId = String(formData.get("componentId") || "");
  const parentItemId = String(formData.get("parentItemId") || "");

  const component = await db.itemComponent.findFirst({
    where: { id: componentId, parentItem: { tenantId: tenant.id } },
  });
  if (!component) return;

  await db.itemComponent.delete({ where: { id: componentId } });
  revalidatePath(`/items/${parentItemId}`);
  revalidatePath("/items");
}
