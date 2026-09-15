import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewReports");

  const accounts = await db.account.findMany({
    where: { tenantId: tenant.id },
    orderBy: { code: "asc" },
    include: { lines: true },
  });

  const rows: (string | number)[][] = [["Section", "Code", "Account", "Amount"]];

  let totalAssets = 0;
  for (const a of accounts.filter((a) => a.type === "ASSET")) {
    const amount = a.lines.reduce((s, l) => s + l.debitCents - l.creditCents, 0);
    if (amount === 0) continue;
    totalAssets += amount;
    rows.push(["Assets", a.code, a.name, (amount / 100).toFixed(2)]);
  }
  rows.push(["Assets", "", "Total assets", (totalAssets / 100).toFixed(2)]);

  let totalLiabilities = 0;
  for (const a of accounts.filter((a) => a.type === "LIABILITY")) {
    const amount = a.lines.reduce((s, l) => s + l.creditCents - l.debitCents, 0);
    if (amount === 0) continue;
    totalLiabilities += amount;
    rows.push(["Liabilities", a.code, a.name, (amount / 100).toFixed(2)]);
  }
  rows.push(["Liabilities", "", "Total liabilities", (totalLiabilities / 100).toFixed(2)]);

  let equityAccounts = 0;
  for (const a of accounts.filter((a) => a.type === "EQUITY")) {
    const amount = a.lines.reduce((s, l) => s + l.creditCents - l.debitCents, 0);
    if (amount === 0) continue;
    equityAccounts += amount;
    rows.push(["Equity", a.code, a.name, (amount / 100).toFixed(2)]);
  }
  const revenue = accounts
    .filter((a) => a.type === "REVENUE")
    .reduce((s, a) => s + a.lines.reduce((ls, l) => ls + l.creditCents - l.debitCents, 0), 0);
  const expenses = accounts
    .filter((a) => a.type === "EXPENSE")
    .reduce((s, a) => s + a.lines.reduce((ls, l) => ls + l.debitCents - l.creditCents, 0), 0);
  const currentEarnings = revenue - expenses;
  rows.push(["Equity", "", "Current earnings", (currentEarnings / 100).toFixed(2)]);
  rows.push(["Equity", "", "Total equity", ((equityAccounts + currentEarnings) / 100).toFixed(2)]);

  return csvResponse("balance-sheet.csv", rows);
}
