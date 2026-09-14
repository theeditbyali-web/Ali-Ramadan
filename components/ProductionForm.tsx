"use client";

import { useActionState } from "react";
import { recordProduction, type ActionState } from "@/lib/actions/production";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type ItemOption = { id: string; name: string; unit: string };

export default function ProductionForm({ items }: { items: ItemOption[] }) {
  const [state, formAction, pending] = useActionState(recordProduction, initialState);

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold">Record production</h2>
      <p className="mb-4 text-sm text-muted">
        Manually make a batch of something from its recipe — consumes the
        ingredients and adds the finished item to stock.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 min-w-[12rem] flex-col gap-1.5 text-sm font-medium">
            Item to produce
            <select name="itemId" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Select item…
              </option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-28 flex-col gap-1.5 text-sm font-medium">
            Quantity
            <input
              name="quantity"
              type="number"
              step="0.001"
              min="0.001"
              required
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Note (optional)
          <input
            name="note"
            placeholder="e.g. morning prep batch"
            className={inputClass}
          />
        </label>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Recording…" : "Record production"}
        </Button>
      </form>
    </Card>
  );
}
