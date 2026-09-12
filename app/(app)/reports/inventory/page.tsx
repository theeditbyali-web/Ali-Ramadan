import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { getItemCost } from "@/lib/inventory";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function InventoryReportPage() {
  const { tenant } = await requireTenant();

  const items = await db.item.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });

  const aggregates = await db.itemMovement.groupBy({
    by: ["itemId"],
    where: { tenantId: tenant.id },
    _sum: { quantity: true },
  });
  const stockByItem = new Map(
    aggregates.map((a) => [a.itemId, a._sum.quantity ?? 0])
  );

  const rows = await Promise.all(
    items.map(async (item) => {
      const stockOnHand = stockByItem.get(item.id) ?? 0;
      const { costCents } = await getItemCost(item.id);
      const value = costCents !== null ? costCents * stockOnHand : null;
      return { item, stockOnHand, costCents, value };
    })
  );

  const totalValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/reports" className="text-sm text-muted hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Inventory</h1>
        <p className="text-muted">Stock on hand and its value, item by item.</p>
      </div>

      <Card className="p-5">
        <p className="text-sm text-muted">Total inventory value</p>
        <p className="text-xl font-semibold">
          {formatCents(totalValue, tenant.currency)}
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3 text-right">Stock on hand</th>
              <th className="px-5 py-3 text-right">Unit cost</th>
              <th className="px-5 py-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, stockOnHand, costCents, value }) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3 font-medium">
                  <Link href={`/items/${item.id}`} className="hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td
                  className={`px-5 py-3 text-right tabular-nums ${
                    stockOnHand < 0 ? "text-danger" : ""
                  }`}
                >
                  {stockOnHand} {item.unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">
                  {costCents !== null ? formatCents(costCents, tenant.currency) : "—"}
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">
                  {value !== null ? formatCents(value, tenant.currency) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
