import Link from "next/link";
import { requireTenant } from "@/lib/current-tenant";
import { logout } from "@/lib/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant } = await requireTenant();

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="font-semibold">{tenant.name}</span>
            <nav className="flex gap-5 text-sm">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/accounts" className="hover:underline">
                Chart of Accounts
              </Link>
              <Link href="/journal" className="hover:underline">
                Journal
              </Link>
              <Link href="/reports/trial-balance" className="hover:underline">
                Trial Balance
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-500 hover:underline">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
