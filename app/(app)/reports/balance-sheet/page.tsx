import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function BalanceSheetPage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewReports");

  const accounts = await db.account.findMany({
    where: { tenantId: tenant.id },
    orderBy: { code: "asc" },
    include: { lines: true },
  });

  const assets = accounts
    .filter((a) => a.type === "ASSET")
    .map((a) => ({
      account: a,
      amount: a.lines.reduce((s, l) => s + l.debitCents - l.creditCents, 0),
    }))
    .filter((r) => r.amount !== 0);

  const liabilities = accounts
    .filter((a) => a.type === "LIABILITY")
    .map((a) => ({
      account: a,
      amount: a.lines.reduce((s, l) => s + l.creditCents - l.debitCents, 0),
    }))
    .filter((r) => r.amount !== 0);

  const equity = accounts
    .filter((a) => a.type === "EQUITY")
    .map((a) => ({
      account: a,
      amount: a.lines.reduce((s, l) => s + l.creditCents - l.debitCents, 0),
    }))
    .filter((r) => r.amount !== 0);

  const revenue = accounts
    .filter((a) => a.type === "REVENUE")
    .reduce(
      (s, a) => s + a.lines.reduce((ls, l) => ls + l.creditCents - l.debitCents, 0),
      0
    );
  const expenses = accounts
    .filter((a) => a.type === "EXPENSE")
    .reduce(
      (s, a) => s + a.lines.reduce((ls, l) => ls + l.debitCents - l.creditCents, 0),
      0
    );
  const currentEarnings = revenue - expenses;

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const totalEquity = equity.reduce((s, r) => s + r.amount, 0) + currentEarnings;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/reports" className="text-sm text-muted hover:underline">
            ← Reports
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Balance Sheet</h1>
          <p className="text-muted">What you own, owe, and are worth, right now.</p>
        </div>
        <Link
          href="/reports/balance-sheet/csv"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Export CSV
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Total assets</p>
          <p className="text-xl font-semibold">
            {formatCents(totalAssets, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Total liabilities</p>
          <p className="text-xl font-semibold">
            {formatCents(totalLiabilities, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Total equity</p>
          <p className="text-xl font-semibold">
            {formatCents(totalEquity, tenant.currency)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-slate-50 px-5 py-3 text-sm font-semibold">
            Assets
          </div>
          <table className="w-full text-sm">
            <tbody>
              {assets.map(({ account, amount }) => (
                <tr key={account.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2 text-muted">
                    {account.code} · {account.name}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {formatCents(amount, tenant.currency)}
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-4 text-center text-muted">
                    No asset activity yet.
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-foreground/10 font-semibold">
                <td className="px-5 py-2">Total</td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {formatCents(totalAssets, tenant.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-slate-50 px-5 py-3 text-sm font-semibold">
              Liabilities
            </div>
            <table className="w-full text-sm">
              <tbody>
                {liabilities.map(({ account, amount }) => (
                  <tr key={account.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2 text-muted">
                      {account.code} · {account.name}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums">
                      {formatCents(amount, tenant.currency)}
                    </td>
                  </tr>
                ))}
                {liabilities.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-5 py-4 text-center text-muted">
                      No liability activity yet.
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-foreground/10 font-semibold">
                  <td className="px-5 py-2">Total</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {formatCents(totalLiabilities, tenant.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-slate-50 px-5 py-3 text-sm font-semibold">
              Equity
            </div>
            <table className="w-full text-sm">
              <tbody>
                {equity.map(({ account, amount }) => (
                  <tr key={account.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2 text-muted">
                      {account.code} · {account.name}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums">
                      {formatCents(amount, tenant.currency)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-border last:border-0">
                  <td className="px-5 py-2 text-muted">Current earnings</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {formatCents(currentEarnings, tenant.currency)}
                  </td>
                </tr>
                <tr className="border-t-2 border-foreground/10 font-semibold">
                  <td className="px-5 py-2">Total</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {formatCents(totalEquity, tenant.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
