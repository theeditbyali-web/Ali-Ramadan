import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import ProductionForm from "@/components/ProductionForm";
import Card from "@/components/ui/Card";

export default async function ProductionPage() {
  const { tenant } = await requireTenant();

  const [items, movements] = await Promise.all([
    db.item.findMany({
      where: { tenantId: tenant.id, components: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    db.itemMovement.findMany({
      where: { tenantId: tenant.id, type: "PRODUCTION_IN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { item: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Production</h1>
        <p className="text-muted">
          Manually make a batch of something from its recipe.
        </p>
      </div>

      <ProductionForm items={items} />

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">Recent production</h2>
          <p className="mb-4 text-sm text-muted">
            Most recent first. See an item's own page for what was consumed
            to make it.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Item</th>
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
                  <td className="px-5 py-3 font-medium">{m.item.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-success">
                    +{m.quantity} {m.item.unit}
                  </td>
                  <td className="px-5 py-3 text-muted">{m.note}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-muted">
                    No production recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
