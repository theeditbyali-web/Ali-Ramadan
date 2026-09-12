"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { calculateTax } from "@/lib/tax";
import type { OrderType } from "@prisma/client";

export type ActionState = { error?: string };

const ORDER_TYPES: OrderType[] = ["DINE_IN", "TAKEAWAY", "DELIVERY"];

export async function createOrder(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const customerName = String(formData.get("customerName") || "").trim();
  const orderType = String(formData.get("orderType") || "") as OrderType;
  const cutleryItems = formData.getAll("cutlery").map(String);
  const cutlery =
    orderType !== "DINE_IN" && cutleryItems.length > 0
      ? cutleryItems.join(",")
      : null;
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData
    .getAll("quantity")
    .map((v) => Math.max(0, Math.floor(Number(v) || 0)));

  if (!customerName) return { error: "Customer name is required." };
  if (!ORDER_TYPES.includes(orderType)) {
    return { error: "Select an order type." };
  }

  const lineInputs = itemIds
    .map((itemId, i) => ({ itemId, quantity: quantities[i] || 0 }))
    .filter((l) => l.itemId && l.quantity > 0);

  if (lineInputs.length === 0) {
    return { error: "Add at least one item to the order." };
  }

  const catalogItems = await db.item.findMany({
    where: {
      tenantId: tenant.id,
      id: { in: lineInputs.map((l) => l.itemId) },
    },
  });
  const itemMap = new Map(catalogItems.map((p) => [p.id, p]));

  if (itemMap.size !== new Set(lineInputs.map((l) => l.itemId)).size) {
    return { error: "One or more items are invalid." };
  }

  const orderLines = lineInputs.map((l) => {
    const item = itemMap.get(l.itemId)!;
    return {
      itemId: item.id,
      quantity: l.quantity,
      priceCents: item.priceCents,
    };
  });

  const subtotalCents = orderLines.reduce(
    (s, i) => s + i.priceCents * i.quantity,
    0
  );
  const taxCents = calculateTax(subtotalCents);
  const totalCents = subtotalCents + taxCents;

  const [salesRevenue, vatPayable] = await Promise.all([
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "4000" } },
    }),
    db.account.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: "2100" } },
    }),
  ]);
  if (!salesRevenue || !vatPayable) {
    return { error: "Required accounts (Sales Revenue / VAT Payable) are missing." };
  }

  try {
    await db.$transaction(async (tx) => {
      const customer = await getOrCreateCustomerAccountTx(
        tx,
        tenant.id,
        customerName
      );

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: tenant.id,
          date: new Date(),
          memo: `${orderTypeLabel(orderType)} order — ${customerName}`,
          source: "pos",
          lines: {
            create: [
              { accountId: customer.accountId, debitCents: totalCents, creditCents: 0 },
              { accountId: salesRevenue.id, debitCents: 0, creditCents: subtotalCents },
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
          cutlery,
          subtotalCents,
          taxCents,
          totalCents,
          journalEntryId: journalEntry.id,
          items: { create: orderLines },
        },
      });

      await tx.itemMovement.createMany({
        data: orderLines.map((l) => ({
          tenantId: tenant.id,
          itemId: l.itemId,
          type: "SALE_OUT" as const,
          quantity: -l.quantity,
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
