import { db } from "@/lib/db";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Finds or creates a Category by name. If `sellable` is true and the
 * category doesn't yet have a linked revenue account, creates one under
 * the 701 "Sales by Category" parent (code 701 + a zero-padded 5-digit
 * sequence, e.g. 70100001) and links it.
 */
export async function resolveCategory(
  tx: Tx,
  tenantId: string,
  name: string,
  sellable: boolean
) {
  let category = await tx.category.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });

  if (!category) {
    category = await tx.category.create({
      data: { tenantId, name },
    });
  }

  if (sellable && !category.accountId) {
    const salesParent = await tx.account.findUnique({
      where: { tenantId_code: { tenantId, code: "701" } },
    });
    if (!salesParent) {
      throw new Error(
        'No "Sales by Category" (701) account found — it should have been seeded when your business was created.'
      );
    }

    const categoryCount = await tx.category.count({
      where: { tenantId, accountId: { not: null } },
    });
    const code = `701${String(categoryCount + 1).padStart(5, "0")}`;

    const account = await tx.account.create({
      data: {
        tenantId,
        code,
        name: `Sales of ${name}`,
        type: "REVENUE",
        parentId: salesParent.id,
      },
    });

    category = await tx.category.update({
      where: { id: category.id },
      data: { accountId: account.id },
    });
  }

  return category;
}
