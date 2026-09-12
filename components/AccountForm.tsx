"use client";

import { useActionState } from "react";
import { createAccount, type ActionState } from "@/lib/actions/accounts";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const initialState: ActionState = {};
const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export default function AccountForm() {
  const [state, formAction, pending] = useActionState(
    createAccount,
    initialState
  );

  return (
    <Card className="p-5">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Code
          <input name="code" required className={`w-24 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input name="name" required className={`w-56 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Type
          <select name="type" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add account"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-danger">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
