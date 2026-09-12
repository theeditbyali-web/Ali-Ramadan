import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import ProductForm from "@/components/ProductForm";
import Card from "@/components/ui/Card";

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default async function ProductsPage() {
  const { tenant } = await requireTenant();
  const products = await db.product.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Menu / Products</h1>
        <p className="text-muted">What you sell at the register.</p>
      </div>

      <ProductForm />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3 font-medium">{p.name}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatCents(p.priceCents, tenant.currency)}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-6 text-center text-muted">
                  No items yet — add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
