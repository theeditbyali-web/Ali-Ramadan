"use client";

import { useActionState, useState } from "react";
import { createJournalEntry, type ActionState } from "@/lib/actions/journal";

const initialState: ActionState = {};

type AccountOption = { id: string; code: string; name: string };

export default function JournalEntryForm({
  accounts,
}: {
  accounts: AccountOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createJournalEntry,
    initialState
  );
  const [rowCount, setRowCount] = useState(2);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Memo
          <input
            name="memo"
            placeholder="What is this transaction for?"
            className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <select
              name="accountId"
              required
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              defaultValue=""
            >
              <option value="" disabled>
                Select account…
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </select>
            <input
              name="debit"
              type="number"
              step="0.01"
              min="0"
              placeholder="Debit"
              defaultValue="0"
              className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="credit"
              type="number"
              step="0.01"
              min="0"
              placeholder="Credit"
              defaultValue="0"
              className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRowCount((n) => n + 1)}
        className="self-start text-sm text-zinc-500 hover:underline"
      >
        + Add line
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save entry"}
      </button>
    </form>
  );
}
