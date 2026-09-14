import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewReports");
  const { from, to } = await searchParams;

  const date: { gte?: Date; lte?: Date } = {};
  if (from) date.gte = new Date(`${from}T00:00:00`);
  if (to) date.lte = new Date(`${to}T23:59:59.999`);

  const accounts = await db.account.findMany({
    where: {
      tenantId: tenant.id,
      type: { in: ["REVENUE", "EXPENSE"] },
    },
    orderBy: { code: "asc" },
    include: {
      lines: from || to ? { where: { journalEntry: { date } } } : true,
    },
  });

  const revenueAccounts = accounts
    .filter((a) => a.type === "REVENUE")
    .map((a) => ({
      account: a,
      amount: a.lines.reduce((s, l) => s + l.creditCents - l.debitCents, 0),
    }))
    .filter((r) => r.amount !== 0);

  const expenseAccounts = accounts
    .filter((a) => a.type === "EXPENSE")
    .map((a) => ({
      account: a,
      amount: a.lines.reduce((s, l) => s + l.debitCents - l.creditCents, 0),
    }))
    .filter((r) => r.amount !== 0);

  const totalRevenue = revenueAccounts.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenseAccounts.reduce((s, r) => s + r.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/reports" className="text-sm text-muted hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Profit & Loss</h1>
        <p className="text-muted">
          Revenue minus expenses{from || to ? "" : ", all-time"}.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Filter
        </button>
        {(from || to) && (
          <Link
            href="/reports/profit-loss"
            className="text-sm text-muted hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      <Card className="p-5">
        <p className="text-sm text-muted">Net income</p>
        <p className={`text-2xl font-semibold ${netIncome < 0 ? "text-danger" : ""}`}>
          {formatCents(netIncome, tenant.currency)}
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Account</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50">
              <td className="px-5 py-2 font-semibold" colSpan={2}>
                Revenue
              </td>
            </tr>
            {revenueAccounts.map(({ account, amount }) => (
              <tr key={account.id} className="border-b border-border">
                <td className="px-5 py-2 pl-8 text-muted">
                  {account.code} · {account.name}
                </td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {formatCents(amount, tenant.currency)}
                </td>
              </tr>
            ))}
            <tr className="border-b border-border font-medium">
              <td className="px-5 py-2 pl-8">Total revenue</td>
              <td className="px-5 py-2 text-right tabular-nums">
                {formatCents(totalRevenue, tenant.currency)}
              </td>
            </tr>

            <tr className="bg-slate-50">
              <td className="px-5 py-2 font-semibold" colSpan={2}>
                Expenses
              </td>
            </tr>
            {expenseAccounts.map(({ account, amount }) => (
              <tr key={account.id} className="border-b border-border">
                <td className="px-5 py-2 pl-8 text-muted">
                  {account.code} · {account.name}
                </td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {formatCents(amount, tenant.currency)}
                </td>
              </tr>
            ))}
            <tr className="border-b border-border font-medium">
              <td className="px-5 py-2 pl-8">Total expenses</td>
              <td className="px-5 py-2 text-right tabular-nums">
                {formatCents(totalExpenses, tenant.currency)}
              </td>
            </tr>

            <tr className="border-t-2 border-foreground/10 bg-slate-50 font-semibold">
              <td className="px-5 py-3">Net income</td>
              <td
                className={`px-5 py-3 text-right tabular-nums ${
                  netIncome < 0 ? "text-danger" : ""
                }`}
              >
                {formatCents(netIncome, tenant.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
