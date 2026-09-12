import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import AccountForm from "@/components/AccountForm";

export default async function AccountsPage() {
  const { tenant } = await requireTenant();
  const accounts = await db.account.findMany({
    where: { tenantId: tenant.id },
    orderBy: { code: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
      <AccountForm />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Type</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 pr-4 font-mono">{a.code}</td>
              <td className="py-2 pr-4">{a.name}</td>
              <td className="py-2 pr-4 text-zinc-500">{a.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
