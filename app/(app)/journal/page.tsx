import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import JournalEntryForm from "@/components/JournalEntryForm";
import Card from "@/components/ui/Card";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual entry",
  pos: "POS sale",
  refund: "Refund",
  waste: "Waste",
  purchase: "Purchase receiving",
  payment: "Payment",
};

function sourceLink(entry: {
  source: string;
  order: { id: string } | null;
  purchaseReceipt: { purchaseOrderId: string } | null;
  wasteEvent: { id: string } | null;
  payment: { customerId: string | null; supplierId: string | null } | null;
}): { href: string; label: string } | null {
  if (entry.order) return { href: `/receipts/${entry.order.id}`, label: "View receipt" };
  if (entry.purchaseReceipt)
    return { href: `/purchases/${entry.purchaseReceipt.purchaseOrderId}`, label: "View purchase order" };
  if (entry.wasteEvent) return { href: `/waste`, label: "View waste" };
  if (entry.payment?.customerId)
    return { href: `/customers/${entry.payment.customerId}`, label: "View customer" };
  if (entry.payment?.supplierId)
    return { href: `/suppliers/${entry.payment.supplierId}`, label: "View supplier" };
  return null;
}

export default async function JournalPage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "manageJournal");

  const [accounts, entries] = await Promise.all([
    db.account.findMany({
      where: { tenantId: tenant.id },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.journalEntry.findMany({
      where: { tenantId: tenant.id },
      orderBy: { date: "desc" },
      include: {
        lines: { include: { account: true } },
        order: { select: { id: true } },
        purchaseReceipt: { select: { purchaseOrderId: true } },
        wasteEvent: { select: { id: true } },
        payment: { select: { customerId: true, supplierId: true } },
      },
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
        {entries.map((entry) => {
          const link = sourceLink(entry);
          return (
            <Card key={entry.id} className="p-5 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">
                  {entry.date.toISOString().slice(0, 10)}
                </span>
                <span className="text-muted">{entry.memo}</span>
              </div>
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20">
                  {SOURCE_LABEL[entry.source] ?? entry.source}
                </span>
                {link && (
                  <Link href={link.href} className="font-medium text-accent hover:underline">
                    {link.label}
                  </Link>
                )}
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
          );
        })}
      </div>
    </div>
  );
}
