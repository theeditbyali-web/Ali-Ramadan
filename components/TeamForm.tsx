"use client";

import { useActionState } from "react";
import { inviteTeamMember, type ActionState } from "@/lib/actions/team";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export default function TeamForm() {
  const [state, formAction, pending] = useActionState(inviteTeamMember, initialState);

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold">Add a team member</h2>
      <p className="mb-4 text-sm text-muted">
        Creates a login for them on this business. Share the email and
        password with them directly — there's no email invite yet.
      </p>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm font-medium">
          Name
          <input name="name" required className={inputClass} />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm font-medium">
          Email
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="flex w-40 flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
          />
        </label>
        <label className="flex w-32 flex-col gap-1.5 text-sm font-medium">
          Role
          <select name="role" defaultValue="STAFF" className={inputClass}>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
            <option value="OWNER">Owner</option>
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>
      {state?.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
    </Card>
  );
}
