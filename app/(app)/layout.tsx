import Link from "next/link";
import { requireTenant } from "@/lib/current-tenant";
import { hasPermission, type Permission } from "@/lib/permissions";
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
  BoxIcon,
  TrashIcon,
  FactoryIcon,
} from "@/components/icons";

const NAV: {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  permission?: Permission;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon, permission: "viewDashboard" },
  { href: "/pos", label: "Point of Sale", icon: ReceiptIcon },
  { href: "/items", label: "Items", icon: TagIcon },
  { href: "/purchases", label: "Purchase Orders", icon: BoxIcon, permission: "managePurchases" },
  { href: "/production", label: "Production", icon: FactoryIcon },
  { href: "/waste", label: "Waste", icon: TrashIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon, permission: "manageCustomers" },
  { href: "/suppliers", label: "Suppliers", icon: UsersIcon, permission: "manageSuppliers" },
  { href: "/accounts", label: "Chart of Accounts", icon: BookIcon, permission: "manageAccounts" },
  { href: "/journal", label: "Journal", icon: LedgerIcon, permission: "manageJournal" },
  { href: "/reports", label: "Reports", icon: ChartIcon, permission: "viewReports" },
  { href: "/team", label: "Team", icon: UsersIcon, permission: "manageTeam" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, tenant } = await requireTenant();
  const nav = NAV.filter(
    (item) => !item.permission || hasPermission(session.role, item.permission)
  );

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            T
          </div>
          <span className="text-base font-semibold text-white">Tallyo</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map(({ href, label, icon: Icon }) => (
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

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
