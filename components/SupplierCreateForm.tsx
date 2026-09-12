"use client";

import { useActionState } from "react";
import { createSupplier, type ActionState } from "@/lib/actions/suppliers";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export default function SupplierCreateForm() {
  const [state, formAction, pending] = useActionState(
    createSupplier,
    initialState
  );

  return (
    <Card className="p-5">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input name="name" required className={`w-48 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Phone
          <input name="phone" className={`w-40 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input name="email" type="email" className={`w-56 ${inputClass}`} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
          Address
          <input name="address" className={inputClass} />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add supplier"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-danger">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
