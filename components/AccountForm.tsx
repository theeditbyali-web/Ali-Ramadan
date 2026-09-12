"use client";

import { useActionState } from "react";
import { createAccount, type ActionState } from "@/lib/actions/accounts";

const initialState: ActionState = {};
const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

export default function AccountForm() {
  const [state, formAction, pending] = useActionState(
    createAccount,
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <label className="flex flex-col gap-1 text-sm">
        Code
        <input
          name="code"
          required
          className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          required
          className="w-56 rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          name="type"
          required
          className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground px-5 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add account"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
