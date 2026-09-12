import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import JournalEntryForm from "@/components/JournalEntryForm";
import Card from "@/components/ui/Card";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function JournalPage() {
  const { tenant } = await requireTenant();

  const [accounts, entries] = await Promise.all([
    db.account.findMany({
      where: { tenantId: tenant.id },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.journalEntry.findMany({
      where: { tenantId: tenant.id },
      orderBy: { date: "desc" },
      include: { lines: { include: { account: true } } },
      take: 50,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Journal</h1>
        <p className="text-muted">
          Every transaction, recorded as balanced debits and credits.
        </p>
      </div>

      <JournalEntryForm accounts={accounts} />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Recent entries
        </h2>
        {entries.length === 0 && (
          <p className="text-sm text-muted">No entries yet.</p>
        )}
        {entries.map((entry) => (
          <Card key={entry.id} className="p-5 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium">
                {entry.date.toISOString().slice(0, 10)}
              </span>
              <span className="text-muted">{entry.memo}</span>
            </div>
            <table className="w-full">
              <tbody>
                {entry.lines.map((line) => (
                  <tr key={line.id} className="border-t border-border first:border-0">
                    <td className="py-1.5 pr-4 text-muted">
                      {line.account.code} · {line.account.name}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {line.debitCents ? formatCents(line.debitCents) : ""}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {line.creditCents ? formatCents(line.creditCents) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </div>
  );
}
