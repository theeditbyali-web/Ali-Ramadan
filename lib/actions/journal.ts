"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";

export type ActionState = { error?: string };

function toCents(value: string): number {
  const n = Number(value || 0);
  return Math.round(n * 100);
}

export async function createJournalEntry(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { tenant } = await requireTenant();

  const date = String(formData.get("date") || "");
  const memo = String(formData.get("memo") || "").trim();
  const accountIds = formData.getAll("accountId").map(String);
  const debits = formData.getAll("debit").map((v) => toCents(String(v)));
  const credits = formData.getAll("credit").map((v) => toCents(String(v)));

  if (!date) return { error: "Date is required." };

  const lines = accountIds
    .map((accountId, i) => ({
      accountId,
      debitCents: debits[i] || 0,
      creditCents: credits[i] || 0,
    }))
    .filter((l) => l.accountId && (l.debitCents > 0 || l.creditCents > 0));

  if (lines.length < 2) {
    return { error: "Add at least two lines (one debit, one credit)." };
  }

  const totalDebits = lines.reduce((s, l) => s + l.debitCents, 0);
  const totalCredits = lines.reduce((s, l) => s + l.creditCents, 0);

  if (totalDebits !== totalCredits) {
    return {
      error: `Debits (${(totalDebits / 100).toFixed(2)}) must equal credits (${(
        totalCredits / 100
      ).toFixed(2)}).`,
    };
  }

  const accounts = await db.account.findMany({
    where: { tenantId: tenant.id, id: { in: lines.map((l) => l.accountId) } },
  });
  if (accounts.length !== new Set(lines.map((l) => l.accountId)).size) {
    return { error: "One or more accounts are invalid." };
  }

  await db.journalEntry.create({
    data: {
      tenantId: tenant.id,
      date: new Date(date),
      memo: memo || null,
      source: "manual",
      lines: { create: lines },
    },
  });

  revalidatePath("/journal");
  revalidatePath("/reports/trial-balance");
  revalidatePath("/dashboard");
  return {};
}
