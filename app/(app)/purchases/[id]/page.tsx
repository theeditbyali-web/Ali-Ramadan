import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import ReceivePurchaseOrderForm from "@/components/ReceivePurchaseOrderForm";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "managePurchases");

  const order = await db.purchaseOrder.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      supplier: true,
      lines: { include: { item: true } },
      receipts: { include: { lines: { include: { item: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const totalOrdered = order.lines.reduce((s, l) => s + l.quantity, 0);
  const totalReceived = order.lines.reduce((s, l) => s + l.receivedQuantity, 0);
  const status =
    totalReceived <= 0 ? "Ordered" : totalReceived >= totalOrdered ? "Received" : "Partially received";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/purchases" className="text-sm text-muted hover:underline">
          ← Purchase Orders
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{order.supplier.name}</h1>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
            {status}
          </span>
        </div>
        <p className="text-muted">
          Ordered {order.date.toISOString().slice(0, 10)} ·{" "}
          {formatCents(order.totalCents, tenant.currency)}
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">Lines</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3 text-right">Ordered</th>
              <th className="px-5 py-3 text-right">Received</th>
              <th className="px-5 py-3 text-right">Unit cost</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{line.item.name}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">
                  {line.quantity} {line.item.unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span
                    className={
                      line.receivedQuantity >= line.quantity ? "text-success" : "text-muted"
                    }
                  >
                    {line.receivedQuantity} {line.item.unit}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">
                  {formatCents(line.unitCostCents, tenant.currency)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">
                  {formatCents(line.unitCostCents * line.quantity, tenant.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ReceivePurchaseOrderForm
        purchaseOrderId={order.id}
        lines={order.lines.map((l) => ({
          id: l.id,
          itemName: l.item.name,
          unit: l.item.unit,
          quantity: l.quantity,
          receivedQuantity: l.receivedQuantity,
        }))}
      />

      {order.receipts.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Receipt history</h2>
          <div className="flex flex-col gap-4">
            {order.receipts.map((receipt) => (
              <div key={receipt.id} className="border-b border-border pb-3 text-sm last:border-0 last:pb-0">
                <div className="mb-1 flex justify-between text-muted">
                  <span>{receipt.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                  <span className="font-medium text-foreground">
                    {formatCents(receipt.totalCents, tenant.currency)}
                  </span>
                </div>
                <ul className="text-muted">
                  {receipt.lines.map((l) => (
                    <li key={l.id}>
                      {l.quantity} {l.item.unit} · {l.item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
