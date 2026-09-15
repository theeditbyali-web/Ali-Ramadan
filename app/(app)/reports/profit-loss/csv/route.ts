import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import { csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewReports");

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const date: { gte?: Date; lte?: Date } = {};
  if (from) date.gte = new Date(`${from}T00:00:00`);
  if (to) date.lte = new Date(`${to}T23:59:59.999`);

  const accounts = await db.account.findMany({
    where: { tenantId: tenant.id, type: { in: ["REVENUE", "EXPENSE"] } },
    orderBy: { code: "asc" },
    include: { lines: from || to ? { where: { journalEntry: { date } } } : true },
  });

  const rows: (string | number)[][] = [["Section", "Code", "Account", "Amount"]];
  let totalRevenue = 0;
  for (const a of accounts.filter((a) => a.type === "REVENUE")) {
    const amount = a.lines.reduce((s, l) => s + l.creditCents - l.debitCents, 0);
    if (amount === 0) continue;
    totalRevenue += amount;
    rows.push(["Revenue", a.code, a.name, (amount / 100).toFixed(2)]);
  }
  rows.push(["Revenue", "", "Total revenue", (totalRevenue / 100).toFixed(2)]);

  let totalExpenses = 0;
  for (const a of accounts.filter((a) => a.type === "EXPENSE")) {
    const amount = a.lines.reduce((s, l) => s + l.debitCents - l.creditCents, 0);
    if (amount === 0) continue;
    totalExpenses += amount;
    rows.push(["Expenses", a.code, a.name, (amount / 100).toFixed(2)]);
  }
  rows.push(["Expenses", "", "Total expenses", (totalExpenses / 100).toFixed(2)]);
  rows.push(["", "", "Net income", ((totalRevenue - totalExpenses) / 100).toFixed(2)]);

  return csvResponse("profit-and-loss.csv", rows);
}
