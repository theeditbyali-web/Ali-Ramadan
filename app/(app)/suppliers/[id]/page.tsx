import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import SupplierEditForm from "@/components/SupplierEditForm";
import PaymentForm from "@/components/PaymentForm";
import Card from "@/components/ui/Card";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank",
  WHISH: "Whish",
};

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function SupplierCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "manageSuppliers");

  const supplier = await db.supplier.findFirst({
    where: { id, tenantId: tenant.id },
    include: { account: { include: { lines: true } } },
  });
  if (!supplier) notFound();

  const [purchaseOrders, payments] = await Promise.all([
    db.purchaseOrder.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      include: { lines: { include: { item: true } } },
    }),
    db.payment.findMany({
      where: { supplierId: supplier.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalSpent = purchaseOrders.reduce((s, po) => s + po.totalCents, 0);
  const balance = supplier.account.lines.reduce(
    (s, l) => s + l.creditCents - l.debitCents,
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/suppliers" className="text-sm text-muted hover:underline">
          ← Suppliers
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{supplier.name}</h1>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-xs text-accent">
            {supplier.code}
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
          <p className="text-sm text-muted">Total spent</p>
          <p className="text-xl font-semibold">
            {formatCents(totalSpent, tenant.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Ledger account</p>
          <p className="font-mono text-xl font-semibold">{supplier.account.code}</p>
        </Card>
      </div>

      <SupplierEditForm supplier={supplier} />

      <PaymentForm kind="supplier" id={supplier.id} />

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">Payment history</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Method</th>
              <th className="px-5 py-3">Note</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-muted">
                  {p.date.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-5 py-3">{METHOD_LABEL[p.method]}</td>
                <td className="px-5 py-3 text-muted">{p.note}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">
                  {formatCents(p.amountCents, tenant.currency)}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Purchase history
        </h2>
        {purchaseOrders.length === 0 && (
          <p className="text-sm text-muted">No purchase orders yet.</p>
        )}
        {purchaseOrders.map((po) => (
          <Card key={po.id} className="p-5 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted">
                {po.date.toISOString().slice(0, 10)}
              </span>
              <span className="font-semibold">
                {formatCents(po.totalCents, tenant.currency)}
              </span>
            </div>
            <table className="w-full">
              <tbody>
                {po.lines.map((line) => (
                  <tr key={line.id} className="border-t border-border first:border-0">
                    <td className="py-1.5 pr-4 text-muted">{line.item.name}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {line.quantity} {line.item.unit} ×{" "}
                      {formatCents(line.unitCostCents, tenant.currency)}
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
