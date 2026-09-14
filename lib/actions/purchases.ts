"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { hasPermission, permissionDenied } from "@/lib/permissions";

export type ActionState = { error?: string };

export async function createPurchaseOrder(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "managePurchases")) return permissionDenied();

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

  const [inventory, payablesParent] = await Promise.all([
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "1400" } },
    }),
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "411" } },
    }),
  ]);
  if (!inventory || !payablesParent) {
    return { error: 'Required accounts (Inventory / "Suppliers" 411) are missing.' };
  }

  try {
    await db.$transaction(async (tx) => {
      let supplier = await tx.supplier.findUnique({
        where: { tenantId_name: { tenantId: tenant.id, name: supplierName } },
      });
      if (!supplier) {
        const supplierCount = await tx.supplier.count({
          where: { tenantId: tenant.id },
        });
        const account = await tx.account.create({
          data: {
            tenantId: tenant.id,
            code: `411-${supplierCount + 1}`,
            name: supplierName,
            type: "LIABILITY",
            parentId: payablesParent.id,
          },
        });
        supplier = await tx.supplier.create({
          data: {
            tenantId: tenant.id,
            name: supplierName,
            code: `SUP-${String(supplierCount + 1).padStart(4, "0")}`,
            accountId: account.id,
          },
        });
      }

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: tenant.id,
          date: new Date(),
          memo: `Purchase from ${supplierName}`,
          source: "purchase",
          lines: {
            create: [
              { accountId: inventory.id, debitCents: totalCents, creditCents: 0 },
              { accountId: supplier.accountId, debitCents: 0, creditCents: totalCents },
            ],
          },
        },
      });

      await tx.purchaseOrder.create({
        data: {
          tenantId: tenant.id,
          supplierId: supplier.id,
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
  revalidatePath("/suppliers");
  revalidatePath("/items");
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/dashboard");
  return {};
}
