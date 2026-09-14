import Link from "next/link";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import Card from "@/components/ui/Card";

const REPORTS = [
  {
    href: "/reports/trial-balance",
    title: "Trial Balance",
    description: "Every account's debit and credit balance, at a glance.",
  },
  {
    href: "/reports/profit-loss",
    title: "Profit & Loss",
    description: "Revenue minus expenses, for a chosen period.",
  },
  {
    href: "/reports/balance-sheet",
    title: "Balance Sheet",
    description: "What you own, owe, and are worth, right now.",
  },
  {
    href: "/reports/cash-flow",
    title: "Cash Flow",
    description: "Money actually moving through Cash, Bank, and Whish.",
  },
  {
    href: "/reports/sales",
    title: "Sales Report",
    description: "Orders, revenue, and totals by type and payment method.",
  },
  {
    href: "/reports/sales-by-hour",
    title: "Sales by Hour",
    description: "Which hours of the day bring in the most business.",
  },
  {
    href: "/reports/daily",
    title: "Daily Sales",
    description: "Exactly what items sold on a given day.",
  },
  {
    href: "/reports/inventory",
    title: "Inventory",
    description: "Stock on hand and its value, item by item.",
  },
];

export default async function ReportsPage() {
  const { session } = await requireTenant();
  requirePermission(session.role, "viewReports");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted">Everything at a glance, and everything in detail.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full p-5 transition-colors hover:border-accent">
              <h2 className="font-semibold">{r.title}</h2>
              <p className="mt-1 text-sm text-muted">{r.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
