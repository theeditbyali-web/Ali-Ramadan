import { db } from "@/lib/db";

// The base "milk" a drink recipe is built on — whichever of these a recipe
// uses directly can be swapped for another at order time (same quantity,
// different ingredient). Other dairy items (Half & Half, Condensed Milk,
// Pastry Cream, Kashta) aren't offered as swaps — they're used for their own
// distinct role in a recipe, not as an interchangeable milk base.
export const MILK_ITEM_NAMES = [
  "Full Fat Milk",
  "Oat Milk",
  "Almond Milk",
  "Soya Milk",
  "Coconut Milk",
  "Lactose-Free Milk",
  "Skimmed Milk",
];

export async function getMilkOptions(tenantId: string) {
  return db.item.findMany({
    where: { tenantId, name: { in: MILK_ITEM_NAMES }, sellable: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// For each of the given sellable items, find which milk ingredient (if any)
// its recipe uses directly — that's the item's default, swappable milk.
export async function getDefaultMilkByItem(tenantId: string, itemIds: string[]) {
  const components = await db.itemComponent.findMany({
    where: {
      parentItemId: { in: itemIds },
      componentItem: { tenantId, name: { in: MILK_ITEM_NAMES } },
    },
    select: { parentItemId: true, componentItemId: true },
  });
  const map = new Map<string, string>();
  for (const c of components) map.set(c.parentItemId, c.componentItemId);
  return map;
}
