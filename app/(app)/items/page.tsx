import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { getItemCost, calculateProfitPercent } from "@/lib/inventory";
import ItemForm from "@/components/ItemForm";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function ItemsPage() {
  const { tenant } = await requireTenant();
  const [items, categories] = await Promise.all([
    db.item.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
      include: { category: true },
    }),
    db.category.findMany({
      where: { tenantId: tenant.id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = await Promise.all(
    items.map(async (item) => {
      const { costCents } = await getItemCost(item.id);
      const profitPercent = calculateProfitPercent(item.priceCents, costCents);
      return { item, costCents, profitPercent };
    })
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Items</h1>
        <p className="text-muted">
          Everything you sell or stock — menu items and raw materials alike.
        </p>
      </div>

      <ItemForm categoryNames={categories.map((c) => c.name)} />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Unit</th>
              <th className="px-5 py-3 text-right">Price</th>
              <th className="px-5 py-3 text-right">Cost</th>
              <th className="px-5 py-3 text-right">Profit %</th>
              <th className="px-5 py-3">Sold at POS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, costCents, profitPercent }) => (
              <tr
                key={item.id}
                className="border-b border-border last:border-0 hover:bg-slate-50"
              >
                <td className="px-5 py-3 font-medium">
                  <Link href={`/items/${item.id}`} className="hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted">{item.category?.name || "—"}</td>
                <td className="px-5 py-3 text-muted">{item.unit}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatCents(item.priceCents, tenant.currency)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">
                  {costCents !== null ? formatCents(costCents, tenant.currency) : "—"}
                </td>
                <td
                  className={`px-5 py-3 text-right tabular-nums font-medium ${
                    profitPercent !== null && profitPercent < 0
                      ? "text-danger"
                      : ""
                  }`}
                >
                  {profitPercent !== null ? `${profitPercent.toFixed(1)}%` : "—"}
                </td>
                <td className="px-5 py-3 text-muted">
                  {item.sellable ? "Yes" : "No"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-muted">
                  No items yet — add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
