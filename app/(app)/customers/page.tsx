import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function CustomersPage() {
  const { tenant } = await requireTenant();
  const customers = await db.customer.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "asc" },
    include: {
      account: { include: { lines: true } },
      orders: true,
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted">
          Each customer has a dedicated sub-account under Accounts
          Receivable — the balance below is what they currently owe.
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Account</th>
              <th className="px-5 py-3">Orders</th>
              <th className="px-5 py-3 text-right">Balance owed</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const balance = c.account.lines.reduce(
                (s, l) => s + l.debitCents - l.creditCents,
                0
              );
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-muted">{c.code}</td>
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/customers/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-muted">
                    {c.account.code}
                  </td>
                  <td className="px-5 py-3 text-muted">{c.orders.length}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatCents(balance, tenant.currency)}
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  No customers yet — they're created automatically from the
                  POS when you ring up an order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
