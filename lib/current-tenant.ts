import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, type SessionPayload } from "@/lib/auth";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireTenant() {
  const session = await requireSession();
  const tenant = await db.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) redirect("/login");
  return { session, tenant };
}
