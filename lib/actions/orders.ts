"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { expandSaleToStockDeductions } from "@/lib/inventory";
import { hasPermission } from "@/lib/permissions";

export async function refundOrder(formData: FormData): Promise<void> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "refundOrders")) return;
  const orderId = String(formData.get("orderId") || "");

  const order = await db.order.findFirst({
    where: { id: orderId, tenantId: tenant.id },
    include: {
      customer: true,
      items: true,
      journalEntry: { include: { lines: true } },
    },
  });
  if (!order || order.refundedAt) return;

  await db.$transaction(async (tx) => {
    await tx.journalEntry.create({
      data: {
        tenantId: tenant.id,
        date: new Date(),
        memo: `Refund — order for ${order.customer.name}`,
        source: "refund",
        lines: {
          // Exact reversal: swap every original line's debit and credit.
          create: order.journalEntry.lines.map((l) => ({
            accountId: l.accountId,
            debitCents: l.creditCents,
            creditCents: l.debitCents,
          })),
        },
      },
    });

    const restocks = new Map<string, number>();
    for (const line of order.items) {
      const sub = await expandSaleToStockDeductions(tx, line.itemId, line.quantity);
      for (const [id, qty] of sub) {
        restocks.set(id, (restocks.get(id) ?? 0) + qty);
      }
    }
    await tx.itemMovement.createMany({
      data: Array.from(restocks.entries()).map(([itemId, qty]) => ({
        tenantId: tenant.id,
        itemId,
        type: "ADJUSTMENT" as const,
        quantity: qty,
        note: `Refund — order for ${order.customer.name}`,
      })),
    });

    await tx.order.update({
      where: { id: order.id },
      data: { refundedAt: new Date() },
    });
  });

  revalidatePath("/reports/sales");
  revalidatePath("/reports/daily");
  revalidatePath("/reports/inventory");
  revalidatePath("/pos");
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/customers");
  revalidatePath(`/customers/${order.customerId}`);
  revalidatePath("/reports/trial-balance");
  revalidatePath("/reports/profit-loss");
  revalidatePath("/reports/balance-sheet");
  revalidatePath("/reports/cash-flow");
  revalidatePath("/dashboard");
}
