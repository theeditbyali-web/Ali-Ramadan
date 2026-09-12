import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { BookIcon, LedgerIcon, ChartIcon } from "@/components/icons";

export default async function DashboardPage() {
  const { tenant } = await requireTenant();

  const [accountCount, entryCount, lines] = await Promise.all([
    db.account.count({ where: { tenantId: tenant.id } }),
    db.journalEntry.count({ where: { tenantId: tenant.id } }),
    db.journalLine.findMany({
      where: { account: { tenantId: tenant.id } },
    }),
  ]);

  const totalDebits = lines.reduce((s, l) => s + l.debitCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted">
          {tenant.name} · {tenant.country} · {tenant.currency}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat icon={BookIcon} label="Accounts" value={accountCount} />
        <Stat icon={LedgerIcon} label="Journal entries" value={entryCount} />
        <Stat
          icon={ChartIcon}
          label="Total activity"
          value={(totalDebits / 100).toLocaleString("en-US", {
            style: "currency",
            currency: tenant.currency,
          })}
        />
      </div>

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
}: {
  icon: (props: { className?: string }) => React.ReactElement;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </Card>
  );
}
