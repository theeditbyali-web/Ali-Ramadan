"use client";

import { useActionState, useState } from "react";
import { createJournalEntry, type ActionState } from "@/lib/actions/journal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

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
    <Card className="p-6">
      <h2 className="mb-4 font-semibold">New journal entry</h2>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Date
            <input
              type="date"
              name="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
            Memo
            <input
              name="memo"
              placeholder="What is this transaction for?"
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              <select
                name="accountId"
                required
                className={`w-full min-w-0 sm:flex-1 ${inputClass}`}
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
                className={`w-24 min-w-0 flex-1 sm:w-28 sm:flex-none ${inputClass}`}
              />
              <input
                name="credit"
                type="number"
                step="0.01"
                min="0"
                placeholder="Credit"
                defaultValue="0"
                className={`w-24 min-w-0 flex-1 sm:w-28 sm:flex-none ${inputClass}`}
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
          {pending ? "Saving…" : "Save entry"}
        </Button>
      </form>
    </Card>
  );
}
