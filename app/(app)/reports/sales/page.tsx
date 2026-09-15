import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import { refundOrder } from "@/lib/actions/orders";
import Card from "@/components/ui/Card";

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

const PAYMENT_LABEL: Record<string, string> = {
  ON_ACCOUNT: "On account",
  WHISH: "Whish",
};

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewReports");
  const { from, to } = await searchParams;

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999`);

  const orders = await db.order.findMany({
    where: {
      tenantId: tenant.id,
      ...(from || to ? { createdAt } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  const totalRevenue = orders.reduce((s, o) => s + o.subtotalCents, 0);
  const totalTax = orders.reduce((s, o) => s + o.taxCents, 0);
  const totalCollected = orders.reduce((s, o) => s + o.totalCents, 0);
  const averageOrder = orders.length > 0 ? totalCollected / orders.length : 0;

  const byType = new Map<string, { count: number; totalCents: number }>();
  const byPayment = new Map<string, { count: number; totalCents: number }>();
  for (const o of orders) {
    const t = byType.get(o.type) ?? { count: 0, totalCents: 0 };
    t.count += 1;
    t.totalCents += o.totalCents;
    byType.set(o.type, t);

    const p = byPayment.get(o.paymentMethod) ?? { count: 0, totalCents: 0 };
    p.count += 1;
    p.totalCents += o.totalCents;
    byPayment.set(o.paymentMethod, p);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/reports" className="text-sm text-muted hover:underline">
            ← Reports
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Sales Report</h1>
          <p className="text-muted">
            Orders, revenue, and totals
            {from || to ? "" : " — all-time"}.
          </p>
        </div>
        <Link
          href={`/reports/sales/csv${from || to ? `?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}` : ""}`}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Export CSV
        </Link>
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
            href="/reports/sales"
            className="text-sm text-muted hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted">Orders</p>
          <p className="text-xl font-semibold">{orders.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Revenue (ex. VAT)</p>
          <p className="text-xl font-semibold">
            {formatCents(totalRevenue, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">VAT collected</p>
          <p className="text-xl font-semibold">
            {formatCents(totalTax, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Average order</p>
          <p className="text-xl font-semibold">
            {formatCents(averageOrder, tenant.currency)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">By order type</h2>
          <table className="w-full text-sm">
            <tbody>
              {Array.from(byType.entries()).map(([type, v]) => (
                <tr key={type} className="border-b border-border last:border-0">
                  <td className="py-1.5 text-muted">{TYPE_LABEL[type] ?? type}</td>
                  <td className="py-1.5 text-right text-muted">{v.count}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {formatCents(v.totalCents, tenant.currency)}
                  </td>
                </tr>
              ))}
              {byType.size === 0 && (
                <tr>
                  <td className="py-1.5 text-muted">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">By payment method</h2>
          <table className="w-full text-sm">
            <tbody>
              {Array.from(byPayment.entries()).map(([method, v]) => (
                <tr key={method} className="border-b border-border last:border-0">
                  <td className="py-1.5 text-muted">{PAYMENT_LABEL[method] ?? method}</td>
                  <td className="py-1.5 text-right text-muted">{v.count}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {formatCents(v.totalCents, tenant.currency)}
                  </td>
                </tr>
              ))}
              {byPayment.size === 0 && (
                <tr>
                  <td className="py-1.5 text-muted">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">All orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className={`border-b border-border last:border-0 ${
                  o.refundedAt ? "opacity-50" : ""
                }`}
              >
                <td className="px-5 py-3 text-muted">
                  {o.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-5 py-3">
                  <Link href={`/customers/${o.customer.id}`} className="hover:underline">
                    {o.customer.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted">{TYPE_LABEL[o.type]}</td>
                <td className="px-5 py-3 text-muted">{PAYMENT_LABEL[o.paymentMethod]}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">
                  {formatCents(o.totalCents, tenant.currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/receipts/${o.id}`}
                      className="text-xs text-muted hover:text-accent hover:underline"
                    >
                      Receipt
                    </Link>
                    {o.refundedAt ? (
                      <span className="text-xs text-muted">Refunded</span>
                    ) : (
                      <form action={refundOrder}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <button
                          type="submit"
                          className="text-xs text-muted hover:text-danger hover:underline"
                        >
                          Refund
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
