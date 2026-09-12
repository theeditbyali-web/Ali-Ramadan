import Link from "next/link";
import { requireTenant } from "@/lib/current-tenant";
import { logout } from "@/lib/actions/auth";
import {
  HomeIcon,
  BookIcon,
  LedgerIcon,
  ChartIcon,
  LogoutIcon,
  ReceiptIcon,
  TagIcon,
  UsersIcon,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/pos", label: "Point of Sale", icon: ReceiptIcon },
  { href: "/products", label: "Menu / Products", icon: TagIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/accounts", label: "Chart of Accounts", icon: BookIcon },
  { href: "/journal", label: "Journal", icon: LedgerIcon },
  { href: "/reports/trial-balance", label: "Trial Balance", icon: ChartIcon },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant } = await requireTenant();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            L
          </div>
          <span className="text-base font-semibold text-white">Ledger</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/5 hover:text-[var(--sidebar-fg-active)]"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-white">
              {tenant.name}
            </p>
            <p className="text-xs text-slate-400">
              {tenant.country} · {tenant.currency}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/5 hover:text-[var(--sidebar-fg-active)]"
            >
              <LogoutIcon className="h-5 w-5" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
