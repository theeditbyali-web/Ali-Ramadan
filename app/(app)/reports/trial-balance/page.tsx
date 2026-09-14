import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function TrialBalancePage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewReports");

  const accounts = await db.account.findMany({
    where: { tenantId: tenant.id },
    orderBy: { code: "asc" },
    include: { lines: true },
  });

  const rows = accounts.map((a) => {
    const totalDebit = a.lines.reduce((s, l) => s + l.debitCents, 0);
    const totalCredit = a.lines.reduce((s, l) => s + l.creditCents, 0);
    const net = totalDebit - totalCredit;
    return {
      account: a,
      debit: net > 0 ? net : 0,
      credit: net < 0 ? -net : 0,
    };
  });

  const totalDebits = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = rows.reduce((s, r) => s + r.credit, 0);
  const balanced = totalDebits === totalCredits;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trial Balance</h1>
          <p className="text-muted">A snapshot of every account's balance.</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
            balanced
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
              : "bg-rose-50 text-rose-700 ring-rose-600/20"
          }`}
        >
          {balanced ? "Balanced" : "Out of balance"}
        </span>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Account</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Debit</th>
              <th className="px-5 py-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ account, debit, credit }) => (
              <tr key={account.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3 font-medium">
                  {account.code} · {account.name}
                </td>
                <td className="px-5 py-3">
                  <Badge type={account.type} />
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {debit ? formatCents(debit) : ""}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {credit ? formatCents(credit) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground/10 bg-slate-50 font-semibold">
              <td className="px-5 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-5 py-3 text-right tabular-nums">
                {formatCents(totalDebits)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums">
                {formatCents(totalCredits)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
