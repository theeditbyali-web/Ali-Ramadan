import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

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
        {purchaseOrders.map((po) => (
          <Card key={po.id} className="p-5 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <Link href={`/suppliers/${po.supplier.id}`} className="font-medium hover:underline">
                {po.supplier.name}
              </Link>
              <span className="text-muted">
                {po.date.toISOString().slice(0, 10)}
              </span>
            </div>
            <table className="w-full">
              <tbody>
                {po.lines.map((line) => (
                  <tr key={line.id} className="border-t border-border first:border-0">
                    <td className="py-1.5 pr-4 text-muted">
                      {line.item.name}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {line.quantity} {line.item.unit}
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
        ))}
      </div>
    </div>
  );
}
