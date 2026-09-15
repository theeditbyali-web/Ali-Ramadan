import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import ProductionForm from "@/components/ProductionForm";
import Card from "@/components/ui/Card";

export default async function ProductionPage() {
  const { tenant } = await requireTenant();

  const [items, runs] = await Promise.all([
    db.item.findMany({
      where: { tenantId: tenant.id, components: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    db.productionRun.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { item: true, lines: { include: { item: true } } },
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

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Recent production
        </h2>
        {runs.length === 0 && (
          <p className="text-sm text-muted">No production recorded yet.</p>
        )}
        {runs.map((run) => (
          <Card key={run.id} className="p-5 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Produced{" "}
                  <span className="text-success">
                    +{run.quantity} {run.item.unit}
                  </span>{" "}
                  of {run.item.name}
                </p>
                {run.note && <p className="text-muted">{run.note}</p>}
              </div>
              <span className="text-muted">
                {run.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                Ingredients used
              </p>
              <ul className="flex flex-col gap-1">
                {run.lines.map((line) => (
                  <li key={line.id} className="flex justify-between text-muted">
                    <span>{line.item.name}</span>
                    <span className="tabular-nums text-danger">
                      −{line.quantity} {line.item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
