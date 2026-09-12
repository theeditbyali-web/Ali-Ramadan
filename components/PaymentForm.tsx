"use client";

import { useActionState } from "react";
import {
  recordCustomerPayment,
  recordSupplierPayment,
  type ActionState,
} from "@/lib/actions/payments";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "WHISH", label: "Whish" },
];

export default function PaymentForm({
  kind,
  id,
}: {
  kind: "customer" | "supplier";
  id: string;
}) {
  const action = kind === "customer" ? recordCustomerPayment : recordSupplierPayment;
  const idField = kind === "customer" ? "customerId" : "supplierId";
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold">
        {kind === "customer" ? "Record payment received" : "Record payment made"}
      </h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name={idField} value={id} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Amount
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className={`w-28 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Method
          <select name="method" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select…
            </option>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
          Note
          <input name="note" placeholder="Optional" className={inputClass} />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record payment"}
        </Button>
        {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
      </form>
    </Card>
  );
}
