"use client";

import { useActionState } from "react";
import { updateSettings, type ActionState } from "@/lib/actions/settings";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type Tenant = {
  name: string;
  country: string;
  currency: string;
  vatRate: number;
};

export default function SettingsForm({ tenant }: { tenant: Tenant }) {
  const [state, formAction, pending] = useActionState(updateSettings, initialState);

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold">Business details</h2>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1.5 text-sm font-medium">
            Business name
            <input name="name" required defaultValue={tenant.name} className={inputClass} />
          </label>
          <label className="flex w-28 flex-col gap-1.5 text-sm font-medium">
            Country
            <input
              name="country"
              required
              defaultValue={tenant.country}
              placeholder="LB"
              className={inputClass}
            />
          </label>
          <label className="flex w-28 flex-col gap-1.5 text-sm font-medium">
            Currency
            <input
              name="currency"
              required
              defaultValue={tenant.currency}
              placeholder="USD"
              className={`uppercase ${inputClass}`}
            />
          </label>
          <label className="flex w-28 flex-col gap-1.5 text-sm font-medium">
            VAT %
            <input
              name="vatPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              defaultValue={tenant.vatRate * 100}
              className={inputClass}
            />
          </label>
        </div>
        <p className="text-xs text-muted">
          Changing currency doesn&apos;t convert past amounts — historical
          orders and reports will still show numbers as originally recorded.
        </p>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
