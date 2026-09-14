import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import WasteForm from "@/components/WasteForm";
import Card from "@/components/ui/Card";

export default async function WastePage() {
  const { tenant } = await requireTenant();

  const [items, movements] = await Promise.all([
    db.item.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    db.itemMovement.findMany({
      where: { tenantId: tenant.id, type: "WASTE_OUT" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { item: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Waste</h1>
        <p className="text-muted">
          Record spoiled, dropped, or otherwise lost stock.
        </p>
      </div>

      <WasteForm items={items} />

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">Recent waste</h2>
          <p className="mb-4 text-sm text-muted">Most recent first.</p>
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
                  <td className="px-5 py-3 text-right tabular-nums text-danger">
                    {m.quantity} {m.item.unit}
                  </td>
                  <td className="px-5 py-3 text-muted">{m.note}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-muted">
                    No waste recorded yet.
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
