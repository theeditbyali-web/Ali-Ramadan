import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BarChart from "@/components/ui/BarChart";
import {
  TrendUpIcon,
  ReceiptIcon,
  AlertIcon,
  WalletIcon,
} from "@/components/icons";

const CHART_DAYS = 14;

function localDateKey(d: Date): string {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function DashboardPage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewDashboard");

  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const chartStart = new Date(todayStart);
  chartStart.setDate(chartStart.getDate() - (CHART_DAYS - 1));

  const [
    todaysOrders,
    yesterdaysOrders,
    chartOrders,
    items,
    stockAggregates,
    customers,
    recentOrderItems,
  ] = await Promise.all([
    db.order.findMany({
      where: { tenantId: tenant.id, createdAt: { gte: todayStart }, refundedAt: null },
      select: { totalCents: true },
    }),
    db.order.findMany({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: yesterdayStart, lt: todayStart },
        refundedAt: null,
      },
      select: { totalCents: true },
    }),
    db.order.findMany({
      where: { tenantId: tenant.id, createdAt: { gte: chartStart }, refundedAt: null },
      select: { createdAt: true, totalCents: true },
    }),
    db.item.findMany({
      where: { tenantId: tenant.id, reorderPoint: { not: null } },
      select: { id: true, name: true, unit: true, reorderPoint: true },
    }),
    db.itemMovement.groupBy({
      by: ["itemId"],
      where: { tenantId: tenant.id },
      _sum: { quantity: true },
    }),
    db.customer.findMany({
      where: { tenantId: tenant.id },
      include: { account: { include: { lines: true } } },
    }),
    db.orderItem.findMany({
      where: {
        order: { tenantId: tenant.id, refundedAt: null, createdAt: { gte: chartStart } },
      },
      include: { item: { select: { name: true } } },
    }),
  ]);

  const todayRevenueCents = todaysOrders.reduce((s, o) => s + o.totalCents, 0);
  const yesterdayRevenueCents = yesterdaysOrders.reduce((s, o) => s + o.totalCents, 0);
  const revenueDeltaPct =
    yesterdayRevenueCents > 0
      ? ((todayRevenueCents - yesterdayRevenueCents) / yesterdayRevenueCents) * 100
      : null;

  const stockByItem = new Map(
    stockAggregates.map((a) => [a.itemId, a._sum.quantity ?? 0])
  );
  const lowStockItems = items.filter(
    (it) => (stockByItem.get(it.id) ?? 0) <= (it.reorderPoint ?? 0)
  );

  const arOwedCents = customers.reduce(
    (sum, c) =>
      sum + c.account.lines.reduce((s, l) => s + l.debitCents - l.creditCents, 0),
    0
  );

  const todayKey = localDateKey(new Date());
  const revenueByDay = new Map<string, number>();
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date(chartStart);
    d.setDate(d.getDate() + i);
    revenueByDay.set(localDateKey(d), 0);
  }
  for (const o of chartOrders) {
    const key = localDateKey(o.createdAt);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + o.totalCents);
  }
  const chartData = Array.from(revenueByDay.entries()).map(([key, cents]) => ({
    label: key.slice(5).replace("-", "/"),
    value: cents / 100,
    highlight: key === todayKey,
  }));

  const sellerTotals = new Map<string, { name: string; revenueCents: number; qty: number }>();
  for (const line of recentOrderItems) {
    const existing = sellerTotals.get(line.itemId) ?? {
      name: line.item.name,
      revenueCents: 0,
      qty: 0,
    };
    existing.revenueCents += line.priceCents * line.quantity;
    existing.qty += line.quantity;
    sellerTotals.set(line.itemId, existing);
  }
  const topSellers = Array.from(sellerTotals.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);
  const topSellerMax = Math.max(1, ...topSellers.map((s) => s.revenueCents));

  return (
    <div className="flex flex-col gap-8">
      <div className="-mx-8 -mt-10 border-b border-border bg-gradient-to-br from-accent-soft/70 via-background to-background px-8 pb-8 pt-10 sm:-mx-8">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted">
          {tenant.name} · {tenant.country} · {tenant.currency}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          icon={TrendUpIcon}
          label="Revenue today"
          value={formatCents(todayRevenueCents, tenant.currency)}
          trend={
            revenueDeltaPct !== null
              ? { value: revenueDeltaPct, label: "vs. yesterday" }
              : undefined
          }
        />
        <Stat
          icon={ReceiptIcon}
          label="Orders today"
          value={todaysOrders.length}
        />
        <Stat
          icon={AlertIcon}
          label="Low stock items"
          value={lowStockItems.length}
          tone={lowStockItems.length > 0 ? "danger" : undefined}
        />
        <Stat
          icon={WalletIcon}
          label="Owed by customers"
          value={formatCents(arOwedCents, tenant.currency)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Revenue, last {CHART_DAYS} days</h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
              Today
            </span>
          </div>
          <BarChart data={chartData} currency={tenant.currency} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Top sellers</h2>
          {topSellers.length === 0 ? (
            <p className="text-sm text-muted">
              No sales in the last {CHART_DAYS} days yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {topSellers.map((s, i) => (
                <div key={s.name + i} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      <span className="mr-2 text-muted">{i + 1}.</span>
                      {s.name}
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatCents(s.revenueCents, tenant.currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-soft">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${Math.max(4, (s.revenueCents / topSellerMax) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-danger/30 p-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertIcon className="h-5 w-5 text-danger" />
            <h2 className="font-semibold">Low stock</h2>
          </div>
          <div className="flex flex-col gap-2">
            {lowStockItems.slice(0, 6).map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <Link href={`/items/${it.id}`} className="font-medium hover:underline">
                  {it.name}
                </Link>
                <span className="tabular-nums text-danger">
                  {stockByItem.get(it.id) ?? 0} {it.unit} left
                  <span className="text-muted"> · reorder at {it.reorderPoint}</span>
                </span>
              </div>
            ))}
          </div>
          {lowStockItems.length > 6 && (
            <Link
              href="/items"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              View all {lowStockItems.length} low-stock items →
            </Link>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Ready to record something?</h2>
          <p className="text-sm text-muted">
            Add a journal entry or check how your books balance.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/journal">
            <Button>Record a transaction</Button>
          </Link>
          <Link href="/reports/trial-balance">
            <Button variant="secondary">View trial balance</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  trend,
  tone,
}: {
  icon: (props: { className?: string }) => React.ReactElement;
  label: string;
  value: number | string;
  trend?: { value: number; label: string };
  tone?: "danger";
}) {
  return (
    <Card className="p-5">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${
          tone === "danger" ? "bg-rose-50 text-danger" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className={`text-2xl font-semibold ${tone === "danger" ? "text-danger" : ""}`}>
        {value}
      </p>
      <p className="text-sm text-muted">{label}</p>
      {trend && (
        <p
          className={`mt-1 text-xs font-medium ${
            trend.value >= 0 ? "text-success" : "text-danger"
          }`}
        >
          {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(0)}%{" "}
          <span className="font-normal text-muted">{trend.label}</span>
        </p>
      )}
    </Card>
  );
}
