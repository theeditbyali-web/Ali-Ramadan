import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export default async function DailySalesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { tenant } = await requireTenant();
  const { date: dateParam } = await searchParams;
  const date = dateParam || todayLocalDate();

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);

  const orders = await db.order.findMany({
    where: {
      tenantId: tenant.id,
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    include: { items: { include: { item: true } } },
  });

  const itemTotals = new Map<
    string,
    { name: string; unit: string; quantity: number; revenueCents: number }
  >();
  for (const order of orders) {
    for (const line of order.items) {
      const existing = itemTotals.get(line.itemId) ?? {
        name: line.item.name,
        unit: line.item.unit,
        quantity: 0,
        revenueCents: 0,
      };
      existing.quantity += line.quantity;
      existing.revenueCents += line.priceCents * line.quantity;
      itemTotals.set(line.itemId, existing);
    }
  }
  const rows = Array.from(itemTotals.values()).sort(
    (a, b) => b.revenueCents - a.revenueCents
  );

  const dayRevenue = orders.reduce((s, o) => s + o.totalCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/reports" className="text-sm text-muted hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Daily Sales</h1>
        <p className="text-muted">What sold on a given day.</p>
      </div>

      <form className="flex items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Date
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          View
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-muted">Orders</p>
          <p className="text-xl font-semibold">{orders.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Revenue (incl. VAT)</p>
          <p className="text-xl font-semibold">
            {formatCents(dayRevenue, tenant.currency)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3 text-right">Quantity sold</th>
              <th className="px-5 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{r.name}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {r.quantity} {r.unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">
                  {formatCents(r.revenueCents, tenant.currency)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-muted">
                  No sales on {date}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
