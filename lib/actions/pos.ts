"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { calculateTax } from "@/lib/tax";
import { expandSaleToStockDeductions } from "@/lib/inventory";
import { MILK_ITEM_NAMES } from "@/lib/milk";
import { hasPermission, permissionDenied } from "@/lib/permissions";
import type { OrderType, PaymentMethod } from "@prisma/client";

export type ActionState = { error?: string };

const ORDER_TYPES: OrderType[] = ["DINE_IN", "TAKEAWAY", "DELIVERY"];
const PAYMENT_METHODS: PaymentMethod[] = ["ON_ACCOUNT", "WHISH"];

export async function createOrder(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, tenant } = await requireTenant();
  if (!hasPermission(session.role, "useSell")) return permissionDenied();

  const customerName = String(formData.get("customerName") || "").trim();
  const orderType = String(formData.get("orderType") || "") as OrderType;
  const paymentMethod = (String(formData.get("paymentMethod") || "") ||
    "ON_ACCOUNT") as PaymentMethod;
  const cutleryItems = formData.getAll("cutlery").map(String);
  const cutlery =
    orderType !== "DINE_IN" && cutleryItems.length > 0
      ? cutleryItems.join(",")
      : null;
  const discountPercent = Math.min(
    100,
    Math.max(0, Number(formData.get("discountPercent") || 0))
  );
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData
    .getAll("quantity")
    .map((v) => Math.max(0, Math.floor(Number(v) || 0)));
  const milkItemIds = formData.getAll("milkItemId").map(String);

  if (!customerName) return { error: "Customer name is required." };
  if (!ORDER_TYPES.includes(orderType)) {
    return { error: "Select an order type." };
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return { error: "Select a payment method." };
  }

  const lineInputs = itemIds
    .map((itemId, i) => ({
      itemId,
      quantity: quantities[i] || 0,
      milkItemId: milkItemIds[i] || null,
    }))
    .filter((l) => l.itemId && l.quantity > 0);

  if (lineInputs.length === 0) {
    return { error: "Add at least one item to the order." };
  }

  const [catalogItems, milkItems] = await Promise.all([
    db.item.findMany({
      where: {
        tenantId: tenant.id,
        id: { in: lineInputs.map((l) => l.itemId) },
      },
      include: { category: true },
    }),
    db.item.findMany({
      where: { tenantId: tenant.id, name: { in: MILK_ITEM_NAMES } },
      select: { id: true },
    }),
  ]);
  const itemMap = new Map(catalogItems.map((p) => [p.id, p]));
  const validMilkIds = new Set(milkItems.map((m) => m.id));

  if (itemMap.size !== new Set(lineInputs.map((l) => l.itemId)).size) {
    return { error: "One or more items are invalid." };
  }

  const orderLines = lineInputs.map((l) => {
    const item = itemMap.get(l.itemId)!;
    return {
      itemId: item.id,
      quantity: l.quantity,
      priceCents: item.priceCents,
      revenueAccountId: item.category?.accountId ?? null,
      milkItemId: l.milkItemId && validMilkIds.has(l.milkItemId) ? l.milkItemId : null,
    };
  });

  const grossSubtotalCents = orderLines.reduce(
    (s, i) => s + i.priceCents * i.quantity,
    0
  );
  const discountCents = Math.round((grossSubtotalCents * discountPercent) / 100);
  const subtotalCents = grossSubtotalCents - discountCents;
  const taxCents = calculateTax(subtotalCents);
  const totalCents = subtotalCents + taxCents;

  const [fallbackSalesRevenue, vatPayable, whishAccount] = await Promise.all([
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "4000" } },
    }),
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "2100" } },
    }),
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "531" } },
    }),
  ]);
  if (!fallbackSalesRevenue || !vatPayable) {
    return { error: "Required accounts (Sales Revenue / VAT Payable) are missing." };
  }
  if (paymentMethod === "WHISH" && !whishAccount) {
    return { error: 'No "Whish" (531) account found.' };
  }

  // Split the sale across each item's category revenue account (701-series);
  // items with no category, or whose category has no linked account yet,
  // fall back to the generic Sales Revenue (4000) account.
  const grossRevenueByAccount = new Map<string, number>();
  for (const line of orderLines) {
    const accountId = line.revenueAccountId ?? fallbackSalesRevenue.id;
    const lineTotal = line.priceCents * line.quantity;
    grossRevenueByAccount.set(
      accountId,
      (grossRevenueByAccount.get(accountId) ?? 0) + lineTotal
    );
  }
  // Spread the discount proportionally across each account's share, so the
  // credited amounts still add up exactly to the post-discount subtotal.
  const revenueByAccount = new Map<string, number>();
  if (discountCents > 0 && grossSubtotalCents > 0) {
    const entries = Array.from(grossRevenueByAccount.entries());
    let allocated = 0;
    for (const [accountId, amount] of entries) {
      const scaled = Math.floor((amount * subtotalCents) / grossSubtotalCents);
      revenueByAccount.set(accountId, scaled);
      allocated += scaled;
    }
    let remainder = subtotalCents - allocated;
    for (let i = 0; i < entries.length && remainder > 0; i++) {
      const [accountId] = entries[i];
      revenueByAccount.set(accountId, (revenueByAccount.get(accountId) ?? 0) + 1);
      remainder -= 1;
    }
  } else {
    for (const [accountId, amount] of grossRevenueByAccount) {
      revenueByAccount.set(accountId, amount);
    }
  }

  try {
    await db.$transaction(async (tx) => {
      const customer = await getOrCreateCustomerAccountTx(
        tx,
        tenant.id,
        customerName
      );

      const settlementAccountId =
        paymentMethod === "WHISH" ? whishAccount!.id : customer.accountId;

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: tenant.id,
          date: new Date(),
          memo: `${orderTypeLabel(orderType)} order — ${customerName}${
            paymentMethod === "WHISH" ? " (paid via Whish)" : ""
          }`,
          source: "pos",
          lines: {
            create: [
              { accountId: settlementAccountId, debitCents: totalCents, creditCents: 0 },
              ...Array.from(revenueByAccount.entries()).map(
                ([accountId, cents]) => ({
                  accountId,
                  debitCents: 0,
                  creditCents: cents,
                })
              ),
              ...(taxCents > 0
                ? [{ accountId: vatPayable.id, debitCents: 0, creditCents: taxCents }]
                : []),
            ],
          },
        },
      });

      await tx.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          type: orderType,
          paymentMethod,
          cutlery,
          discountCents,
          subtotalCents,
          taxCents,
          totalCents,
          journalEntryId: journalEntry.id,
          items: {
            create: orderLines.map((l) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              priceCents: l.priceCents,
              milkItemId: l.milkItemId,
            })),
          },
        },
      });

      // Deduct stock from whatever is actually stocked: items with a
      // recipe aren't stocked themselves, so their sale is expanded down
      // into deductions of their raw-material sub-items instead.
      const deductions = new Map<string, number>();
      for (const l of orderLines) {
        const sub = await expandSaleToStockDeductions(tx, l.itemId, l.quantity);
        // Swap the recipe's default milk ingredient for whatever the
        // customer chose, keeping the same quantity — same drink, different
        // milk, no accounting impact (price doesn't change).
        if (l.milkItemId) {
          const originalMilkId = Array.from(sub.keys()).find(
            (id) => validMilkIds.has(id) && id !== l.milkItemId
          );
          if (originalMilkId) {
            const qty = sub.get(originalMilkId)!;
            sub.delete(originalMilkId);
            sub.set(l.milkItemId, (sub.get(l.milkItemId) ?? 0) + qty);
          }
        }
        for (const [id, qty] of sub) {
          deductions.set(id, (deductions.get(id) ?? 0) + qty);
        }
      }
      await tx.itemMovement.createMany({
        data: Array.from(deductions.entries()).map(([itemId, qty]) => ({
          tenantId: tenant.id,
          itemId,
          type: "SALE_OUT" as const,
          quantity: -qty,
          note: `${orderTypeLabel(orderType)} order — ${customerName}`,
        })),
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save the order.",
    };
  }

  revalidatePath("/pos");
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/customers");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/dashboard");
  return {};
}

function orderTypeLabel(type: OrderType): string {
  switch (type) {
    case "DINE_IN":
      return "Dine-in";
    case "TAKEAWAY":
      return "Takeaway";
    case "DELIVERY":
      return "Delivery";
  }
}

// Same logic as getOrCreateCustomerAccount, but runs inside the caller's
// transaction so account/customer creation and the journal entry commit or
// roll back together.
async function getOrCreateCustomerAccountTx(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  tenantId: string,
  name: string
) {
  const existing = await tx.customer.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (existing) return existing;

  const receivablesParent = await tx.account.findUnique({
    where: { tenantId_code: { tenantId, code: "401" } },
  });
  if (!receivablesParent) {
    throw new Error(
      'No "Customers" (401) account found — it should have been seeded when your business was created.'
    );
  }

  const customerCount = await tx.customer.count({ where: { tenantId } });
  const accountCode = `401-${customerCount + 1}`;
  const customerCode = `CUST-${String(customerCount + 1).padStart(4, "0")}`;

  const account = await tx.account.create({
    data: {
      tenantId,
      code: accountCode,
      name,
      type: "ASSET",
      parentId: receivablesParent.id,
    },
  });

  return tx.customer.create({
    data: { tenantId, name, code: customerCode, accountId: account.id },
  });
}
