import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import { csvResponse } from "@/lib/csv";

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

const PAYMENT_LABEL: Record<string, string> = {
  ON_ACCOUNT: "On account",
  WHISH: "Whish",
};

export async function GET(request: Request) {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "viewReports");

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999`);

  const orders = await db.order.findMany({
    where: { tenantId: tenant.id, ...(from || to ? { createdAt } : {}) },
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  const rows: (string | number)[][] = [
    ["Date", "Customer", "Type", "Payment", "Subtotal", "VAT", "Discount", "Total", "Refunded"],
  ];
  for (const o of orders) {
    rows.push([
      o.createdAt.toISOString().slice(0, 16).replace("T", " "),
      o.customer.name,
      TYPE_LABEL[o.type] ?? o.type,
      PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod,
      (o.subtotalCents / 100).toFixed(2),
      (o.taxCents / 100).toFixed(2),
      (o.discountCents / 100).toFixed(2),
      (o.totalCents / 100).toFixed(2),
      o.refundedAt ? "Yes" : "No",
    ]);
  }

  return csvResponse("sales-report.csv", rows);
}
