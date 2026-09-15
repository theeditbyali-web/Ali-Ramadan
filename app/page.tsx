import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  LedgerIcon,
  ReceiptIcon,
  UsersIcon,
} from "@/components/icons";

const FEATURES = [
  {
    icon: LedgerIcon,
    title: "General Ledger",
    description:
      "A real double-entry ledger with a chart of accounts and trial balance — debits and credits always reconcile.",
  },
  {
    icon: ReceiptIcon,
    title: "Point of Sale",
    description:
      "Ring up sales and post them straight to your books automatically. Coming soon.",
  },
  {
    icon: UsersIcon,
    title: "Payroll",
    description:
      "Run payroll with Lebanon-specific tax and NSSF handling. Coming soon.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              T
            </div>
            <span className="text-base font-semibold">Tallyo</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-5 inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Built for small businesses in Lebanon
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Books, sales, and payroll — in one place
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Tallyo is a straightforward accounting platform: a proper
          double-entry general ledger today, with point of sale and payroll
          on the way.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
          >
            Create your account
            <ArrowRightIcon />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-slate-50"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            "Double-entry bookkeeping, validated automatically",
            "Chart of accounts seeded and ready to use",
            "Multi-tenant — one account per business",
            "Trial balance report out of the box",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted">
          © {new Date().getFullYear()} Tallyo.
        </div>
      </footer>
    </div>
  );
}
