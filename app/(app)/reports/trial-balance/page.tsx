import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function TrialBalancePage() {
  const { tenant } = await requireTenant();

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Trial Balance</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
            <th className="py-2 pr-4">Account</th>
            <th className="py-2 pr-4 text-right">Debit</th>
            <th className="py-2 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ account, debit, credit }) => (
            <tr key={account.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 pr-4">
                {account.code} · {account.name}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {debit ? formatCents(debit) : ""}
              </td>
              <td className="py-2 text-right tabular-nums">
                {credit ? formatCents(credit) : ""}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-300 font-medium dark:border-zinc-700">
            <td className="py-2 pr-4">Total</td>
            <td className="py-2 pr-4 text-right tabular-nums">
              {formatCents(totalDebits)}
            </td>
            <td className="py-2 text-right tabular-nums">
              {formatCents(totalCredits)}
            </td>
          </tr>
        </tfoot>
      </table>
      {!balanced && (
        <p className="text-sm text-red-600">
          Warning: debits and credits don&apos;t match — this shouldn&apos;t
          happen and indicates a data issue.
        </p>
      )}
    </div>
  );
}
