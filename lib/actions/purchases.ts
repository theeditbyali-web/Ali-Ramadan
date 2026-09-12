"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";

export type ActionState = { error?: string };

export async function createPurchaseOrder(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const supplierName = String(formData.get("supplierName") || "").trim();
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData.getAll("quantity").map((v) => Number(v) || 0);
  const unitCosts = formData.getAll("unitCost").map((v) => Number(v) || 0);

  if (!supplierName) return { error: "Supplier name is required." };

  const lineInputs = itemIds
    .map((itemId, i) => ({
      itemId,
      quantity: quantities[i] || 0,
      unitCostCents: Math.round((unitCosts[i] || 0) * 100),
    }))
    .filter((l) => l.itemId && l.quantity > 0 && l.unitCostCents > 0);

  if (lineInputs.length === 0) {
    return { error: "Add at least one item with a quantity and cost." };
  }

  const items = await db.item.findMany({
    where: { tenantId: tenant.id, id: { in: lineInputs.map((l) => l.itemId) } },
  });
  if (items.length !== new Set(lineInputs.map((l) => l.itemId)).size) {
    return { error: "One or more items are invalid." };
  }

  const totalCents = lineInputs.reduce(
    (s, l) => s + l.unitCostCents * l.quantity,
    0
  );

  const [inventory, accountsPayable] = await Promise.all([
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "1400" } },
    }),
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "2000" } },
    }),
  ]);
  if (!inventory || !accountsPayable) {
    return { error: "Required accounts (Inventory / Accounts Payable) are missing." };
  }

  try {
    await db.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: tenant.id,
          date: new Date(),
          memo: `Purchase from ${supplierName}`,
          source: "purchase",
          lines: {
            create: [
              { accountId: inventory.id, debitCents: totalCents, creditCents: 0 },
              { accountId: accountsPayable.id, debitCents: 0, creditCents: totalCents },
            ],
          },
        },
      });

      await tx.purchaseOrder.create({
        data: {
          tenantId: tenant.id,
          supplierName,
          totalCents,
          journalEntryId: journalEntry.id,
          lines: { create: lineInputs },
        },
      });

      await tx.itemMovement.createMany({
        data: lineInputs.map((l) => ({
          tenantId: tenant.id,
          itemId: l.itemId,
          type: "PURCHASE_IN" as const,
          quantity: l.quantity,
          note: `Purchased from ${supplierName}`,
        })),
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save the purchase order.",
    };
  }

  revalidatePath("/purchases");
  revalidatePath("/items");
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/dashboard");
  return {};
}
