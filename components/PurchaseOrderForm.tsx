"use client";

import { useActionState, useState } from "react";
import { createPurchaseOrder, type ActionState } from "@/lib/actions/purchases";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type ItemOption = { id: string; name: string; unit: string };

export default function PurchaseOrderForm({
  items,
}: {
  items: ItemOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createPurchaseOrder,
    initialState
  );
  const [rowCount, setRowCount] = useState(1);

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold">New purchase order</h2>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Supplier
          <input name="supplierName" required className={`max-w-xs ${inputClass}`} />
        </label>

        <div className="flex flex-col gap-2">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              <select
                name="itemId"
                required
                className={`w-full min-w-0 sm:flex-1 ${inputClass}`}
                defaultValue=""
              >
                <option value="" disabled>
                  Select item…
                </option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <input
                name="quantity"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="Quantity"
                className={`w-28 min-w-0 flex-1 sm:flex-none ${inputClass}`}
              />
              <input
                name="unitCost"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Unit cost"
                className={`w-28 min-w-0 flex-1 sm:flex-none ${inputClass}`}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRowCount((n) => n + 1)}
          className="self-start text-sm font-medium text-accent hover:underline"
        >
          + Add line
        </button>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save purchase order"}
        </Button>
      </form>
    </Card>
  );
}
