import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";

export default async function DashboardPage() {
  const { tenant } = await requireTenant();

  const [accountCount, entryCount] = await Promise.all([
    db.account.count({ where: { tenantId: tenant.id } }),
    db.journalEntry.count({ where: { tenantId: tenant.id } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-zinc-500">{tenant.name} · {tenant.currency}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Accounts" value={accountCount} />
        <Stat label="Journal entries" value={entryCount} />
      </div>

      <div className="flex gap-4">
        <Link
          href="/journal"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Record a transaction
        </Link>
        <Link
          href="/reports/trial-balance"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium dark:border-zinc-700"
        >
          View trial balance
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}
