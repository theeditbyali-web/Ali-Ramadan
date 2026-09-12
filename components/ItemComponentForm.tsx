"use client";

import { useActionState } from "react";
import { addComponent, type ActionState } from "@/lib/actions/items";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type ItemOption = { id: string; name: string; unit: string };

export default function ItemComponentForm({
  parentItemId,
  options,
}: {
  parentItemId: string;
  options: ItemOption[];
}) {
  const [state, formAction, pending] = useActionState(
    addComponent,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="parentItemId" value={parentItemId} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Sub-item
        <select name="componentItemId" required className={`w-48 ${inputClass}`} defaultValue="">
          <option value="" disabled>
            Select item…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Quantity per unit
        <input
          name="quantity"
          type="number"
          step="0.001"
          min="0.001"
          required
          className={`w-32 ${inputClass}`}
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add sub-item"}
      </Button>
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
