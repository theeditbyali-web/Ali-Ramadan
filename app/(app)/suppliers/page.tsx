import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import SupplierCreateForm from "@/components/SupplierCreateForm";
import Card from "@/components/ui/Card";

export default async function SuppliersPage() {
  const { tenant } = await requireTenant();
  const suppliers = await db.supplier.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "asc" },
    include: { purchaseOrders: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <p className="text-muted">
          Who you buy from — added automatically from a purchase order, or
          manually below.
        </p>
      </div>

      <SupplierCreateForm />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Supplier</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3 text-right">Purchase orders</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-muted">{s.code}</td>
                <td className="px-5 py-3 font-medium">
                  <Link href={`/suppliers/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted">{s.phone || "—"}</td>
                <td className="px-5 py-3 text-muted">{s.email || "—"}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {s.purchaseOrders.length}
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
