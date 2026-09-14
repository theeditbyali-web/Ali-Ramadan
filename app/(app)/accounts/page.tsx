import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import AccountForm from "@/components/AccountForm";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default async function AccountsPage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "manageAccounts");
  const accounts = await db.account.findMany({
    where: { tenantId: tenant.id },
    orderBy: { code: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
        <p className="text-muted">
          Every account your business tracks — assets, liabilities, equity,
          revenue, and expenses.
        </p>
      </div>

      <AccountForm />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-muted">{a.code}</td>
                <td className="px-5 py-3 font-medium">{a.name}</td>
                <td className="px-5 py-3">
                  <Badge type={a.type} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
