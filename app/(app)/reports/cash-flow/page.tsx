import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import Card from "@/components/ui/Card";

const CASH_ACCOUNT_CODES = ["1000", "1010", "531"];

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function CashFlowPage() {
  const { tenant } = await requireTenant();

  const cashAccounts = await db.account.findMany({
    where: { tenantId: tenant.id, code: { in: CASH_ACCOUNT_CODES } },
  });
  const cashAccountIds = cashAccounts.map((a) => a.id);

  const lines = await db.journalLine.findMany({
    where: { accountId: { in: cashAccountIds } },
    include: { account: true, journalEntry: true },
    orderBy: { journalEntry: { date: "asc" } },
  });

  const totalIn = lines.reduce((s, l) => s + l.debitCents, 0);
  const totalOut = lines.reduce((s, l) => s + l.creditCents, 0);
  const netCashFlow = totalIn - totalOut;

  let running = 0;
  const rows = lines.map((l) => {
    running += l.debitCents - l.creditCents;
    return { line: l, runningBalance: running };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/reports" className="text-sm text-muted hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Cash Flow</h1>
        <p className="text-muted">
          Money actually moving through Cash, Bank, and Whish.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Cash in</p>
          <p className="text-xl font-semibold">
            {formatCents(totalIn, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Cash out</p>
          <p className="text-xl font-semibold">
            {formatCents(totalOut, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Net cash flow</p>
          <p
            className={`text-xl font-semibold ${
              netCashFlow < 0 ? "text-danger" : ""
            }`}
          >
            {formatCents(netCashFlow, tenant.currency)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Account</th>
              <th className="px-5 py-3">Memo</th>
              <th className="px-5 py-3 text-right">In</th>
              <th className="px-5 py-3 text-right">Out</th>
              <th className="px-5 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, runningBalance }) => (
              <tr key={line.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-muted">
                  {line.journalEntry.date.toISOString().slice(0, 10)}
                </td>
                <td className="px-5 py-3">{line.account.name}</td>
                <td className="px-5 py-3 text-muted">{line.journalEntry.memo}</td>
                <td className="px-5 py-3 text-right tabular-nums text-success">
                  {line.debitCents ? formatCents(line.debitCents, tenant.currency) : ""}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-danger">
                  {line.creditCents ? formatCents(line.creditCents, tenant.currency) : ""}
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">
                  {formatCents(runningBalance, tenant.currency)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted">
                  No cash movement yet — this fills in once money moves
                  through Cash, Bank, or Whish (e.g. a POS sale paid by
                  Whish, or a manual cash journal entry).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
