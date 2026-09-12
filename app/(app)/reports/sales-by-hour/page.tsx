import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function SalesByHourPage() {
  const { tenant } = await requireTenant();

  const orders = await db.order.findMany({
    where: { tenantId: tenant.id },
    select: { createdAt: true, totalCents: true },
  });

  const byHour = Array.from({ length: 24 }, () => ({ count: 0, totalCents: 0 }));
  for (const o of orders) {
    const hour = o.createdAt.getHours();
    byHour[hour].count += 1;
    byHour[hour].totalCents += o.totalCents;
  }

  const maxTotal = Math.max(1, ...byHour.map((h) => h.totalCents));

  function formatHour(h: number): string {
    const period = h < 12 ? "AM" : "PM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${period}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/reports" className="text-sm text-muted hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Sales by Hour</h1>
        <p className="text-muted">
          All-time orders grouped by the hour they were placed.
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Hour</th>
              <th className="px-5 py-3 text-right">Orders</th>
              <th className="px-5 py-3 text-right">Revenue</th>
              <th className="px-5 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {byHour.map((h, hour) => (
              <tr key={hour} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{formatHour(hour)}</td>
                <td className="px-5 py-3 text-right text-muted">{h.count}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatCents(h.totalCents, tenant.currency)}
                </td>
                <td className="px-5 py-3">
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${(h.totalCents / maxTotal) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
