import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

function poStatus(lines: { quantity: number; receivedQuantity: number }[]) {
  const totalOrdered = lines.reduce((s, l) => s + l.quantity, 0);
  const totalReceived = lines.reduce((s, l) => s + l.receivedQuantity, 0);
  if (totalReceived <= 0) return { label: "Ordered", tone: "muted" as const };
  if (totalReceived >= totalOrdered) return { label: "Received", tone: "success" as const };
  return { label: "Partially received", tone: "accent" as const };
}

const STATUS_STYLE: Record<string, string> = {
  muted: "bg-slate-100 text-slate-700 ring-slate-600/20",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  accent: "bg-accent-soft text-accent ring-accent/20",
};

export default async function PurchasesPage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "managePurchases");

  const [items, suppliers, purchaseOrders] = await Promise.all([
    db.item.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    db.supplier.findMany({
      where: { tenantId: tenant.id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    db.purchaseOrder.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { lines: { include: { item: true } }, supplier: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <p className="text-muted">
          Record what you buy from suppliers — this is what item costs are
          calculated from.
        </p>
      </div>

      <PurchaseOrderForm
        items={items}
        supplierNames={suppliers.map((s) => s.name)}
      />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Recent purchase orders
        </h2>
        {purchaseOrders.length === 0 && (
          <p className="text-sm text-muted">No purchase orders yet.</p>
        )}
        {purchaseOrders.map((po) => {
          const status = poStatus(po.lines);
          return (
          <Card key={po.id} className="p-5 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href={`/suppliers/${po.supplier.id}`} className="font-medium hover:underline">
                  {po.supplier.name}
                </Link>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status.tone]}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted">
                  {po.date.toISOString().slice(0, 10)}
                </span>
                <Link
                  href={`/purchases/${po.id}`}
                  className="font-medium text-accent hover:underline"
                >
                  {status.label === "Received" ? "View" : "Receive"}
                </Link>
              </div>
            </div>
            <table className="w-full">
              <tbody>
                {po.lines.map((line) => (
                  <tr key={line.id} className="border-t border-border first:border-0">
                    <td className="py-1.5 pr-4 text-muted">
                      {line.item.name}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-muted">
                      {line.receivedQuantity}/{line.quantity} {line.item.unit} received
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-muted">
                      {formatCents(line.unitCostCents, tenant.currency)} /{" "}
                      {line.item.unit}
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-medium">
                      {formatCents(line.unitCostCents * line.quantity, tenant.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex justify-end border-t border-border pt-2 font-semibold">
              {formatCents(po.totalCents, tenant.currency)}
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
