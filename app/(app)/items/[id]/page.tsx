import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { getItemCost, calculateProfitPercent } from "@/lib/inventory";
import { removeComponent } from "@/lib/actions/items";
import ItemEditForm from "@/components/ItemEditForm";
import ItemComponentForm from "@/components/ItemComponentForm";
import Card from "@/components/ui/Card";

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE_IN: "Purchase in",
  SALE_OUT: "Sale",
  ADJUSTMENT: "Adjustment",
};

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function ItemCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant } = await requireTenant();

  const item = await db.item.findFirst({
    where: { id, tenantId: tenant.id },
    include: { category: { include: { account: true } } },
  });
  if (!item) notFound();

  const [components, usedIn, movements, otherItems, categories] = await Promise.all([
    db.itemComponent.findMany({
      where: { parentItemId: item.id },
      include: { componentItem: true },
    }),
    db.itemComponent.findMany({
      where: { componentItemId: item.id },
      include: { parentItem: true },
    }),
    db.itemMovement.findMany({
      where: { itemId: item.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.item.findMany({
      where: { tenantId: tenant.id, id: { not: item.id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    db.category.findMany({
      where: { tenantId: tenant.id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const { costCents, costSource } = await getItemCost(item.id);
  const profitPercent = calculateProfitPercent(item.priceCents, costCents);
  // The movements list below is capped at 50 for display, so stock-on-hand
  // is summed separately across the full history.
  const stockAggregate = await db.itemMovement.aggregate({
    where: { itemId: item.id },
    _sum: { quantity: true },
  });
  const stockOnHand = stockAggregate._sum.quantity ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/items" className="text-sm text-muted hover:underline">
          ← Items
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{item.name}</h1>
      </div>

      <ItemEditForm item={item} categoryNames={categories.map((c) => c.name)} />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted">Cost</p>
          <p className="text-xl font-semibold">
            {costCents !== null ? formatCents(costCents, tenant.currency) : "Unknown"}
          </p>
          <p className="text-xs text-muted">
            {costSource === "purchases"
              ? "From purchase history"
              : costSource === "recipe"
              ? "From sub-item recipe"
              : "No purchases or sub-items yet"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Profit</p>
          <p
            className={`text-xl font-semibold ${
              profitPercent !== null && profitPercent < 0 ? "text-danger" : ""
            }`}
          >
            {profitPercent !== null ? `${profitPercent.toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-muted">
            {formatCents(item.priceCents, tenant.currency)} price
            {costCents !== null ? ` − ${formatCents(costCents, tenant.currency)} cost` : ""}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Stock on hand</p>
          <p
            className={`text-xl font-semibold ${
              item.reorderPoint !== null && stockOnHand <= item.reorderPoint
                ? "text-danger"
                : ""
            }`}
          >
            {stockOnHand} {item.unit}
          </p>
          <p className="text-xs text-muted">
            {item.reorderPoint !== null && stockOnHand <= item.reorderPoint
              ? `Low stock — reorder at ${item.reorderPoint} ${item.unit}`
              : "From purchases and sales"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Revenue account</p>
          <p className="font-mono text-xl font-semibold">
            {item.category?.account?.code ?? "—"}
          </p>
          <p className="text-xs text-muted">
            {item.category?.account
              ? `Category: ${item.category.name}`
              : item.sellable
              ? "Set a category to get one"
              : "Not sold at POS"}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Sub-items (recipe)</h2>
        <p className="mb-4 text-sm text-muted">
          What one unit of {item.name} is made from. Drives its cost when
          there's no direct purchase history.
        </p>
        {components.length > 0 && (
          <table className="mb-4 w-full text-sm">
            <tbody>
              {components.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2">
                    <Link href={`/items/${c.componentItem.id}`} className="hover:underline">
                      {c.componentItem.name}
                    </Link>
                  </td>
                  <td className="py-2 text-right text-muted">
                    {c.quantity} {c.componentItem.unit}
                  </td>
                  <td className="w-10 py-2 text-right">
                    <form action={removeComponent}>
                      <input type="hidden" name="componentId" value={c.id} />
                      <input type="hidden" name="parentItemId" value={item.id} />
                      <button
                        type="submit"
                        className="text-xs text-muted hover:text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ItemComponentForm parentItemId={item.id} options={otherItems} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Used in</h2>
        <p className="mb-4 text-sm text-muted">
          Other items whose recipe includes {item.name}.
        </p>
        {usedIn.length === 0 ? (
          <p className="text-sm text-muted">Not used as a sub-item anywhere.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {usedIn.map((c) => (
              <li key={c.id}>
                <Link href={`/items/${c.parentItem.id}`} className="hover:underline">
                  {c.parentItem.name}
                </Link>
                <span className="text-muted">
                  {" "}
                  — uses {c.quantity} {item.unit} per unit
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">Item movement</h2>
          <p className="mb-4 text-sm text-muted">Stock in and out, most recent first.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Quantity</th>
              <th className="px-5 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-muted">
                  {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-5 py-3">{MOVEMENT_LABEL[m.type]}</td>
                <td
                  className={`px-5 py-3 text-right tabular-nums ${
                    m.quantity < 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {m.quantity > 0 ? "+" : ""}
                  {m.quantity} {item.unit}
                </td>
                <td className="px-5 py-3 text-muted">{m.note}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No movement yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
