import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { getMilkOptions, getDefaultMilkByItem } from "@/lib/milk";
import POSForm from "@/components/POSForm";
import Card from "@/components/ui/Card";

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

const PAYMENT_LABEL: Record<string, string> = {
  ON_ACCOUNT: "On account",
  WHISH: "Whish",
};

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function POSPage() {
  const { tenant } = await requireTenant();

  const [items, customers, recentOrders] = await Promise.all([
    db.item.findMany({
      where: { tenantId: tenant.id, sellable: true },
      orderBy: { createdAt: "asc" },
      include: { category: true },
    }),
    db.customer.findMany({
      where: { tenantId: tenant.id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    db.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { customer: true },
    }),
  ]);

  const [milkOptions, defaultMilkByItem] = await Promise.all([
    getMilkOptions(tenant.id),
    getDefaultMilkByItem(tenant.id, items.map((p) => p.id)),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Point of Sale</h1>
        <p className="text-muted">Ring up an order and post it to the books.</p>
      </div>

      <POSForm
        items={items.map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          category: p.category?.name ?? "Other",
          defaultMilkItemId: defaultMilkByItem.get(p.id),
        }))}
        milkOptions={milkOptions}
        customerNames={customers.map((c) => c.name)}
        currency={tenant.currency}
      />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Recent orders
        </h2>
        {recentOrders.length === 0 && (
          <p className="text-sm text-muted">No orders yet.</p>
        )}
        {recentOrders.map((order) => (
          <Card key={order.id} className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-muted">
                {TYPE_LABEL[order.type]} · {PAYMENT_LABEL[order.paymentMethod]} ·{" "}
                {order.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                {order.cutlery ? ` · Cutlery: ${order.cutlery.split(",").join(", ")}` : ""}
              </p>
            </div>
            <p className="font-semibold tabular-nums">
              {formatCents(order.totalCents, tenant.currency)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
