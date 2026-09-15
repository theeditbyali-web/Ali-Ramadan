"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type ActionState } from "@/lib/actions/auth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-base font-bold text-white">
            T
          </div>
        </div>
        <Card className="p-8">
          <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
          <p className="mb-6 text-sm text-muted">
            Sets up your business and its books.
          </p>
          <form action={formAction} className="flex flex-col gap-4">
            <Field label="Your name" name="name" type="text" />
            <Field label="Business name" name="businessName" type="text" />
            <Field label="Email" name="email" type="email" />
            <Field label="Password" name="password" type="password" />
            {state?.error && (
              <p className="text-sm text-danger">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="mt-2 w-full">
              {pending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type,
}: {
  label: string;
  name: string;
  type: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required
        className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
    </label>
  );
}
