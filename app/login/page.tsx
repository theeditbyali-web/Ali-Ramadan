"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type ActionState } from "@/lib/actions/auth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-base font-bold text-white">
            T
          </div>
        </div>
        <Card className="p-8">
          <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
          <p className="mb-6 text-sm text-muted">Log in to your business.</p>
          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                required
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </label>
            {state?.error && (
              <p className="text-sm text-danger">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="mt-2 w-full">
              {pending ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
