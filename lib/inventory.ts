import { db } from "@/lib/db";

export type ItemCost = {
  costCents: number | null; // null means "no cost data yet"
  costSource: "purchases" | "recipe" | "none";
};

/**
 * An item's cost is either:
 *  - the weighted-average unit cost from its purchase order history
 *    (for raw materials you buy directly), or
 *  - the sum of its recipe's component costs (for items built from
 *    other items), computed recursively.
 * If an item has both, purchase history wins (it's the more direct
 * signal of what this specific item actually costs you).
 */
export async function getItemCost(
  itemId: string,
  _visiting: Set<string> = new Set()
): Promise<ItemCost> {
  if (_visiting.has(itemId)) {
    // Circular recipe reference — bail out rather than recurse forever.
    return { costCents: null, costSource: "none" };
  }
  _visiting.add(itemId);

  const purchaseLines = await db.purchaseOrderLine.findMany({
    where: { itemId },
  });

  if (purchaseLines.length > 0) {
    const totalQty = purchaseLines.reduce((s, l) => s + l.quantity, 0);
    const totalCostCents = purchaseLines.reduce(
      (s, l) => s + l.unitCostCents * l.quantity,
      0
    );
    if (totalQty > 0) {
      return {
        costCents: Math.round(totalCostCents / totalQty),
        costSource: "purchases",
      };
    }
  }

  const components = await db.itemComponent.findMany({
    where: { parentItemId: itemId },
  });

  if (components.length === 0) {
    return { costCents: null, costSource: "none" };
  }

  let recipeCostCents = 0;
  for (const c of components) {
    const componentCost = await getItemCost(c.componentItemId, _visiting);
    if (componentCost.costCents === null) {
      // A component with unknown cost makes the whole recipe's cost unknown.
      return { costCents: null, costSource: "none" };
    }
    recipeCostCents += componentCost.costCents * c.quantity;
  }

  return { costCents: Math.round(recipeCostCents), costSource: "recipe" };
}

export function calculateProfitPercent(
  priceCents: number,
  costCents: number | null
): number | null {
  if (costCents === null || priceCents <= 0) return null;
  return ((priceCents - costCents) / priceCents) * 100;
}
