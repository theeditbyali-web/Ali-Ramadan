import { db } from "@/lib/db";
import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import { updateTeamMemberRole, removeTeamMember } from "@/lib/actions/team";
import TeamForm from "@/components/TeamForm";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default async function TeamPage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "manageTeam");

  const memberships = await db.membership.findMany({
    where: { tenantId: tenant.id },
    include: { user: true },
    orderBy: { user: { createdAt: "asc" } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted">
          Who can log in to {tenant.name}, and what they can do.
        </p>
      </div>

      <TeamForm />

      <Card className="overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="font-semibold">Members</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => {
                const isSelf = m.userId === session.userId;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">
                      {m.user.name}
                      {isSelf && <span className="ml-2 text-xs text-muted">(you)</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">{m.user.email}</td>
                    <td className="px-5 py-3">
                      <Badge type={m.role} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-3">
                          <form action={updateTeamMemberRole} className="flex items-center gap-2">
                            <input type="hidden" name="membershipId" value={m.id} />
                            <select
                              name="role"
                              defaultValue={m.role}
                              className="rounded-lg border border-border px-2 py-1 text-xs outline-none focus:border-accent"
                            >
                              <option value="OWNER">Owner</option>
                              <option value="ADMIN">Admin</option>
                              <option value="STAFF">Staff</option>
                            </select>
                            <button
                              type="submit"
                              className="text-xs font-medium text-accent hover:underline"
                            >
                              Save
                            </button>
                          </form>
                          <form action={removeTeamMember}>
                            <input type="hidden" name="membershipId" value={m.id} />
                            <button
                              type="submit"
                              className="text-xs text-muted hover:text-danger hover:underline"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
