"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { hasPermission, permissionDenied } from "@/lib/permissions";

export type ActionState = { error?: string };

// Records what was ordered. No accounting or stock impact — that happens
// when it's received (see receivePurchaseOrder), in full or in part.
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

  const totalCents = lineInputs.reduce((s, l) => s + l.unitCostCents * l.quantity, 0);

  const payablesParent = await db.account.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: "411" } },
  });
  if (!payablesParent) {
    return { error: 'No "Suppliers" (411) account found.' };
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

      await tx.purchaseOrder.create({
        data: {
          tenantId: tenant.id,
          supplierId: supplier.id,
          totalCents,
          lines: { create: lineInputs },
        },
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save the purchase order.",
    };
  }

  revalidatePath("/purchases");
  revalidatePath("/suppliers");
  return {};
}

// Records goods actually received against a PurchaseOrder — in full or in
// part. This is what debits Inventory, credits the supplier, and moves
// stock; the order itself does neither.
export async function receivePurchaseOrder(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "managePurchases")) return permissionDenied();

  const purchaseOrderId = String(formData.get("purchaseOrderId") || "");
  const lineIds = formData.getAll("lineId").map(String);
  const receiveQuantities = formData.getAll("receiveQuantity").map((v) => Number(v) || 0);

  const order = await db.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, tenantId: tenant.id },
    include: { lines: true, supplier: true },
  });
  if (!order) return { error: "Purchase order not found." };

  const receiveByLineId = new Map<string, number>();
  lineIds.forEach((id, i) => {
    if (id && receiveQuantities[i] > 0) receiveByLineId.set(id, receiveQuantities[i]);
  });
  if (receiveByLineId.size === 0) {
    return { error: "Enter a quantity to receive for at least one line." };
  }

  const toReceive: { line: (typeof order.lines)[number]; qty: number }[] = [];
  for (const line of order.lines) {
    const qty = receiveByLineId.get(line.id);
    if (!qty) continue;
    const remaining = line.quantity - line.receivedQuantity;
    if (qty > remaining + 1e-9) {
      return {
        error: `Can't receive ${qty} — only ${remaining} remaining on that line.`,
      };
    }
    toReceive.push({ line, qty });
  }
  if (toReceive.length === 0) {
    return { error: "Nothing to receive." };
  }

  const totalCents = Math.round(
    toReceive.reduce((s, r) => s + r.qty * r.line.unitCostCents, 0)
  );

  const inventory = await db.account.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: "1400" } },
  });
  if (!inventory) return { error: '"Inventory" (1400) account is missing.' };

  try {
    await db.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: tenant.id,
          date: new Date(),
          memo: `Received from ${order.supplier.name}`,
          source: "purchase",
          lines: {
            create: [
              { accountId: inventory.id, debitCents: totalCents, creditCents: 0 },
              { accountId: order.supplier.accountId, debitCents: 0, creditCents: totalCents },
            ],
          },
        },
      });

      await tx.purchaseReceipt.create({
        data: {
          tenantId: tenant.id,
          purchaseOrderId: order.id,
          totalCents,
          journalEntryId: journalEntry.id,
          lines: {
            create: toReceive.map(({ line, qty }) => ({
              itemId: line.itemId,
              quantity: qty,
              unitCostCents: line.unitCostCents,
            })),
          },
        },
      });

      for (const { line, qty } of toReceive) {
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQuantity: { increment: qty } },
        });
      }

      await tx.itemMovement.createMany({
        data: toReceive.map(({ line, qty }) => ({
          tenantId: tenant.id,
          itemId: line.itemId,
          type: "PURCHASE_IN" as const,
          quantity: qty,
          note: `Received from ${order.supplier.name}`,
        })),
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not record the receipt.",
    };
  }

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseOrderId}`);
  revalidatePath("/items");
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/dashboard");
  return {};
}
