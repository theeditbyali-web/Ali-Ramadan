"use client";

import { useActionState } from "react";
import { createItem, type ActionState } from "@/lib/actions/items";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export default function ItemForm() {
  const [state, formAction, pending] = useActionState(createItem, initialState);

  return (
    <Card className="p-5">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input name="name" required className={`w-48 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Category
          <input
            name="category"
            placeholder="e.g. Beverages"
            className={`w-40 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Unit
          <input
            name="unit"
            placeholder="unit, kg, l…"
            defaultValue="unit"
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
            className={`w-28 ${inputClass}`}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add item"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-danger">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
