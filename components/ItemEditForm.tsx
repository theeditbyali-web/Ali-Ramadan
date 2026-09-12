"use client";

import { useActionState } from "react";
import { updateItem, type ActionState } from "@/lib/actions/items";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type Item = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  priceCents: number;
  sellable: boolean;
};

export default function ItemEditForm({ item }: { item: Item }) {
  const [state, formAction, pending] = useActionState(
    updateItem,
    initialState
  );

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold">Details</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={item.id} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={item.name}
            className={`w-48 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Category
          <input
            name="category"
            defaultValue={item.category ?? ""}
            placeholder="e.g. Beverages"
            className={`w-40 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Unit
          <input
            name="unit"
            defaultValue={item.unit}
            className={`w-28 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Price
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={(item.priceCents / 100).toFixed(2)}
            className={`w-28 ${inputClass}`}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input
            name="sellable"
            type="checkbox"
            defaultChecked={item.sellable}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Sell at POS
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-danger">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
