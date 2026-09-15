"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { expandSaleToStockDeductions } from "@/lib/inventory";
import { hasPermission, permissionDenied } from "@/lib/permissions";

export type ActionState = { error?: string };

export async function recordProduction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "recordProduction")) return permissionDenied();

  const itemId = String(formData.get("itemId") || "");
  const quantity = Number(formData.get("quantity") || 0);
  const note = String(formData.get("note") || "").trim();

  if (!itemId) return { error: "Select an item to produce." };
  if (!(quantity > 0)) return { error: "Quantity must be greater than 0." };

  const item = await db.item.findFirst({ where: { id: itemId, tenantId: tenant.id } });
  if (!item) return { error: "Item not found." };

  const recipeSize = await db.itemComponent.count({ where: { parentItemId: itemId } });
  if (recipeSize === 0) {
    return { error: `${item.name} has no recipe — add sub-items on its Items page first.` };
  }

  try {
    await db.$transaction(async (tx) => {
      const consumed = await expandSaleToStockDeductions(tx, itemId, quantity);

      await tx.productionRun.create({
        data: {
          tenantId: tenant.id,
          itemId: item.id,
          quantity,
          note: note || null,
          lines: {
            create: Array.from(consumed.entries()).map(([id, qty]) => ({
              itemId: id,
              quantity: qty,
            })),
          },
        },
      });

      await tx.itemMovement.createMany({
        data: Array.from(consumed.entries()).map(([id, qty]) => ({
          tenantId: tenant.id,
          itemId: id,
          type: "PRODUCTION_OUT" as const,
          quantity: -qty,
          note: `Used to produce ${quantity} ${item.unit} of ${item.name}${note ? ` — ${note}` : ""}`,
        })),
      });

      await tx.itemMovement.create({
        data: {
          tenantId: tenant.id,
          itemId: item.id,
          type: "PRODUCTION_IN",
          quantity,
          note: note ? `Produced — ${note}` : "Produced from recipe",
        },
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not record production.",
    };
  }

  revalidatePath("/production");
  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/dashboard");
  return {};
}
