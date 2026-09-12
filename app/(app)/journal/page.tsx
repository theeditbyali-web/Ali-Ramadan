import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import JournalEntryForm from "@/components/JournalEntryForm";

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
      <h1 className="text-2xl font-semibold">Journal</h1>
      <JournalEntryForm accounts={accounts} />

      <div className="flex flex-col gap-6">
        {entries.length === 0 && (
          <p className="text-sm text-zinc-500">No entries yet.</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800"
          >
            <div className="mb-2 flex items-center justify-between text-zinc-500">
              <span>{entry.date.toISOString().slice(0, 10)}</span>
              <span>{entry.memo}</span>
            </div>
            <table className="w-full">
              <tbody>
                {entry.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-0.5 pr-4">
                      {line.account.code} · {line.account.name}
                    </td>
                    <td className="py-0.5 pr-4 text-right tabular-nums">
                      {line.debitCents ? formatCents(line.debitCents) : ""}
                    </td>
                    <td className="py-0.5 text-right tabular-nums">
                      {line.creditCents ? formatCents(line.creditCents) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
