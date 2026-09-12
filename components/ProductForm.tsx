"use client";

import { useActionState } from "react";
import { createProduct, type ActionState } from "@/lib/actions/products";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export default function ProductForm() {
  const [state, formAction, pending] = useActionState(
    createProduct,
    initialState
  );

  return (
    <Card className="p-5">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input name="name" required className={`w-56 ${inputClass}`} />
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
