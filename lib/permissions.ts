import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

// What each role can do. OWNER can always do everything a lower role can —
// list every role that's allowed, don't assume inheritance.
export const PERMISSIONS = {
  useSell: ["OWNER", "ADMIN", "STAFF"],
  refundOrders: ["OWNER", "ADMIN"],
  manageItems: ["OWNER", "ADMIN"],
  recordWaste: ["OWNER", "ADMIN", "STAFF"],
  recordProduction: ["OWNER", "ADMIN", "STAFF"],
  managePurchases: ["OWNER", "ADMIN"],
  manageCustomers: ["OWNER", "ADMIN"],
  manageSuppliers: ["OWNER", "ADMIN"],
  managePayments: ["OWNER", "ADMIN"],
  manageAccounts: ["OWNER", "ADMIN"],
  manageJournal: ["OWNER", "ADMIN"],
  viewReports: ["OWNER", "ADMIN"],
  viewDashboard: ["OWNER", "ADMIN"],
  manageTeam: ["OWNER"],
  manageSettings: ["OWNER"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

// For server actions: return this instead of proceeding when unauthorized.
export function permissionDenied(): { error: string } {
  return { error: "You don't have permission to do this." };
}

// For pages: redirects away (to the POS, the one page every role can reach)
// instead of rendering restricted content.
export function requirePermission(role: Role, permission: Permission) {
  if (!hasPermission(role, permission)) redirect("/pos");
}
