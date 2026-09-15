import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import PrintButton from "@/components/PrintButton";
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

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant } = await requireTenant();

  const order = await db.order.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      customer: true,
      items: { include: { item: true, milkItem: true } },
    },
  });
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/reports/sales" className="text-sm text-muted hover:underline">
          ← Sales report
        </Link>
        <PrintButton />
      </div>

      <Card className="mx-auto w-full max-w-sm p-6 print:border-0 print:shadow-none">
        <div className="mb-4 text-center">
          <h1 className="text-lg font-semibold">{tenant.name}</h1>
          <p className="text-xs text-muted">
            {tenant.country} · Receipt #{order.id.slice(-8).toUpperCase()}
          </p>
          {order.refundedAt && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-danger">
              Refunded
            </p>
          )}
        </div>

        <div className="mb-4 border-y border-dashed border-border py-3 text-xs text-muted">
          <div className="flex justify-between">
            <span>Date</span>
            <span>{order.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{order.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Type</span>
            <span>{TYPE_LABEL[order.type]}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment</span>
            <span>{PAYMENT_LABEL[order.paymentMethod]}</span>
          </div>
          {order.cutlery && (
            <div className="flex justify-between">
              <span>Cutlery</span>
              <span>{order.cutlery.split(",").join(", ")}</span>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <tbody>
            {order.items.map((line) => (
              <tr key={line.id} className="align-top">
                <td className="py-1">
                  <p>{line.item.name}</p>
                  {line.milkItem && (
                    <p className="text-xs text-muted">with {line.milkItem.name}</p>
                  )}
                </td>
                <td className="py-1 text-right text-muted">×{line.quantity}</td>
                <td className="py-1 text-right tabular-nums">
                  {formatCents(line.priceCents * line.quantity, tenant.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col gap-1 border-t border-dashed border-border pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatCents(order.subtotalCents + order.discountCents, tenant.currency)}
            </span>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-muted">
              <span>Discount</span>
              <span className="tabular-nums">−{formatCents(order.discountCents, tenant.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>VAT</span>
            <span className="tabular-nums">{formatCents(order.taxCents, tenant.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(order.totalCents, tenant.currency)}</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">Thank you!</p>
      </Card>
    </div>
  );
}
