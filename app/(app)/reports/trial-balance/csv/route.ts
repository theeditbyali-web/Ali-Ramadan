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

  const rows: (string | number)[][] = [["Code", "Account", "Type", "Debit", "Credit"]];
  let totalDebits = 0;
  let totalCredits = 0;
  for (const a of accounts) {
    const totalDebit = a.lines.reduce((s, l) => s + l.debitCents, 0);
    const totalCredit = a.lines.reduce((s, l) => s + l.creditCents, 0);
    const net = totalDebit - totalCredit;
    const debit = net > 0 ? net : 0;
    const credit = net < 0 ? -net : 0;
    totalDebits += debit;
    totalCredits += credit;
    rows.push([a.code, a.name, a.type, (debit / 100).toFixed(2), (credit / 100).toFixed(2)]);
  }
  rows.push(["", "", "Total", (totalDebits / 100).toFixed(2), (totalCredits / 100).toFixed(2)]);

  return csvResponse("trial-balance.csv", rows);
}
