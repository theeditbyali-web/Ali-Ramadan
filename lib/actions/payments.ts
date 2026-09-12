"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import type { SettlementMethod } from "@prisma/client";

export type ActionState = { error?: string };

const SETTLEMENT_METHODS: SettlementMethod[] = ["CASH", "BANK", "WHISH"];
const METHOD_ACCOUNT_CODE: Record<SettlementMethod, string> = {
  CASH: "1000",
  BANK: "1010",
  WHISH: "531",
};

export async function recordCustomerPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const customerId = String(formData.get("customerId") || "");
  const method = String(formData.get("method") || "") as SettlementMethod;
  const amount = Number(formData.get("amount") || 0);
  const note = String(formData.get("note") || "").trim();

  if (!customerId) return { error: "Missing customer." };
  if (!SETTLEMENT_METHODS.includes(method)) {
    return { error: "Select a payment method." };
  }
  if (!(amount > 0)) return { error: "Amount must be greater than 0." };

  const amountCents = Math.round(amount * 100);

  const [customer, settlementAccount] = await Promise.all([
    db.customer.findFirst({ where: { id: customerId, tenantId: tenant.id } }),
    db.account.findUnique({
      where: {
        tenantId_code: { tenantId: tenant.id, code: METHOD_ACCOUNT_CODE[method] },
      },
    }),
  ]);
  if (!customer) return { error: "Customer not found." };
  if (!settlementAccount) {
    return { error: `Required account (${METHOD_ACCOUNT_CODE[method]}) is missing.` };
  }

  await db.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        tenantId: tenant.id,
        date: new Date(),
        memo: `Payment received from ${customer.name}`,
        source: "payment",
        lines: {
          create: [
            { accountId: settlementAccount.id, debitCents: amountCents, creditCents: 0 },
            { accountId: customer.accountId, debitCents: 0, creditCents: amountCents },
          ],
        },
      },
    });

    await tx.payment.create({
      data: {
        tenantId: tenant.id,
        direction: "CUSTOMER_RECEIPT",
        customerId: customer.id,
        method,
        amountCents,
        note: note || null,
        journalEntryId: journalEntry.id,
      },
    });
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/reports/cash-flow");
  revalidatePath("/reports/balance-sheet");
  revalidatePath("/dashboard");
  return {};
}

export async function recordSupplierPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const supplierId = String(formData.get("supplierId") || "");
  const method = String(formData.get("method") || "") as SettlementMethod;
  const amount = Number(formData.get("amount") || 0);
  const note = String(formData.get("note") || "").trim();

  if (!supplierId) return { error: "Missing supplier." };
  if (!SETTLEMENT_METHODS.includes(method)) {
    return { error: "Select a payment method." };
  }
  if (!(amount > 0)) return { error: "Amount must be greater than 0." };

  const amountCents = Math.round(amount * 100);

  const [supplier, settlementAccount] = await Promise.all([
    db.supplier.findFirst({ where: { id: supplierId, tenantId: tenant.id } }),
    db.account.findUnique({
      where: {
        tenantId_code: { tenantId: tenant.id, code: METHOD_ACCOUNT_CODE[method] },
      },
    }),
  ]);
  if (!supplier) return { error: "Supplier not found." };
  if (!settlementAccount) {
    return { error: `Required account (${METHOD_ACCOUNT_CODE[method]}) is missing.` };
  }

  await db.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        tenantId: tenant.id,
        date: new Date(),
        memo: `Payment made to ${supplier.name}`,
        source: "payment",
        lines: {
          create: [
            { accountId: supplier.accountId, debitCents: amountCents, creditCents: 0 },
            { accountId: settlementAccount.id, debitCents: 0, creditCents: amountCents },
          ],
        },
      },
    });

    await tx.payment.create({
      data: {
        tenantId: tenant.id,
        direction: "SUPPLIER_PAYMENT",
        supplierId: supplier.id,
        method,
        amountCents,
        note: note || null,
        journalEntryId: journalEntry.id,
      },
    });
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/journal");
  revalidatePath("/accounts");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/reports/cash-flow");
  revalidatePath("/reports/balance-sheet");
  revalidatePath("/dashboard");
  return {};
}
