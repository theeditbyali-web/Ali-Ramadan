import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import WasteForm from "@/components/WasteForm";
import Card from "@/components/ui/Card";

export default async function WastePage() {
  const { tenant } = await requireTenant();

  const [items, events] = await Promise.all([
    db.item.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    db.wasteEvent.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { item: true, lines: { include: { item: true } }, journalEntry: true },
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

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Recent waste
        </h2>
        {events.length === 0 && (
          <p className="text-sm text-muted">No waste recorded yet.</p>
        )}
        {events.map((event) => {
          // A raw item wastes itself directly — its one deduction line is
          // just itself, so there's nothing extra to break down.
          const hasBreakdown =
            event.lines.length > 1 ||
            (event.lines.length === 1 && event.lines[0].itemId !== event.itemId);

          return (
            <Card key={event.id} className="p-5 text-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Wasted{" "}
                    <span className="text-danger">
                      −{event.quantity} {event.item.unit}
                    </span>{" "}
                    of {event.item.name}
                  </p>
                  {event.reason && <p className="text-muted">{event.reason}</p>}
                </div>
                <span className="text-muted">
                  {event.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </div>
              {hasBreakdown && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    Ingredients lost
                  </p>
                  <ul className="flex flex-col gap-1">
                    {event.lines.map((line) => (
                      <li key={line.id} className="flex justify-between text-muted">
                        <span>{line.item.name}</span>
                        <span className="tabular-nums text-danger">
                          −{line.quantity} {line.item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {event.journalEntry && (
                <div className="mt-3 border-t border-border pt-3">
                  <Link href="/journal" className="text-accent hover:underline">
                    View journal entry
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
