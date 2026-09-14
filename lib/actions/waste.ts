"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { expandSaleToStockDeductions, getItemCost } from "@/lib/inventory";

export type ActionState = { error?: string };

export async function recordWaste(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const itemId = String(formData.get("itemId") || "");
  const quantity = Number(formData.get("quantity") || 0);
  const reason = String(formData.get("reason") || "").trim();

  if (!itemId) return { error: "Select an item." };
  if (!(quantity > 0)) return { error: "Quantity must be greater than 0." };

  const item = await db.item.findFirst({ where: { id: itemId, tenantId: tenant.id } });
  if (!item) return { error: "Item not found." };

  const inventory = await db.account.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: "1400" } },
  });
  if (!inventory) return { error: '"Inventory" (1400) account is missing.' };

  try {
    await db.$transaction(async (tx) => {
      let wasteExpense = await tx.account.findUnique({
        where: { tenantId_code: { tenantId: tenant.id, code: "5100" } },
      });
      if (!wasteExpense) {
        wasteExpense = await tx.account.create({
          data: { tenantId: tenant.id, code: "5100", name: "Waste & Spoilage", type: "EXPENSE" },
        });
      }

      const deductions = await expandSaleToStockDeductions(tx, itemId, quantity);

      let totalCostCents = 0;
      for (const [leafId, qty] of deductions) {
        const { costCents } = await getItemCost(leafId);
        totalCostCents += (costCents ?? 0) * qty;
      }
      totalCostCents = Math.round(totalCostCents);

      await tx.itemMovement.createMany({
        data: Array.from(deductions.entries()).map(([id, qty]) => ({
          tenantId: tenant.id,
          itemId: id,
          type: "WASTE_OUT" as const,
          quantity: -qty,
          note: reason ? `Waste — ${item.name} (${reason})` : `Waste — ${item.name}`,
        })),
      });

      if (totalCostCents > 0) {
        await tx.journalEntry.create({
          data: {
            tenantId: tenant.id,
            date: new Date(),
            memo: `Waste — ${quantity} ${item.unit} of ${item.name}${reason ? ` (${reason})` : ""}`,
            source: "waste",
            lines: {
              create: [
                { accountId: wasteExpense.id, debitCents: totalCostCents, creditCents: 0 },
                { accountId: inventory.id, debitCents: 0, creditCents: totalCostCents },
              ],
            },
          },
        });
      }
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not record waste.",
    };
  }

  revalidatePath("/waste");
  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/dashboard");
  return {};
}
