import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import CustomerEditForm from "@/components/CustomerEditForm";
import Card from "@/components/ui/Card";

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function CustomerCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant } = await requireTenant();

  const customer = await db.customer.findFirst({
    where: { id, tenantId: tenant.id },
    include: { account: { include: { lines: true } } },
  });
  if (!customer) notFound();

  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });

  const balance = customer.account.lines.reduce(
    (s, l) => s + l.debitCents - l.creditCents,
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/customers" className="text-sm text-muted hover:underline">
          ← Customers
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-xs text-accent">
            {customer.code}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Balance owed</p>
          <p className="text-xl font-semibold">
            {formatCents(balance, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Orders</p>
          <p className="text-xl font-semibold">{orders.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Ledger account</p>
          <p className="font-mono text-xl font-semibold">{customer.account.code}</p>
        </Card>
      </div>

      <CustomerEditForm customer={customer} />

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">Order history</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-muted">
                  {o.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-5 py-3">{TYPE_LABEL[o.type]}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatCents(o.totalCents, tenant.currency)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-muted">
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
