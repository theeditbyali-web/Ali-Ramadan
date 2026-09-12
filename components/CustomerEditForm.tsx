"use client";

import { useActionState } from "react";
import { updateCustomer, type ActionState } from "@/lib/actions/customers";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type Customer = {
  id: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export default function CustomerEditForm({ customer }: { customer: Customer }) {
  const [state, formAction, pending] = useActionState(
    updateCustomer,
    initialState
  );

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold">Contact details</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={customer.id} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Phone
          <input
            name="phone"
            defaultValue={customer.phone ?? ""}
            className={`w-40 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            defaultValue={customer.email ?? ""}
            className={`w-56 ${inputClass}`}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
          Address
          <input
            name="address"
            defaultValue={customer.address ?? ""}
            className={inputClass}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-danger">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
