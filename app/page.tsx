import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Ledger</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Accounting, payroll, and point of sale for small businesses.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-foreground px-6 py-3 font-medium text-background"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 px-6 py-3 font-medium dark:border-zinc-700"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
