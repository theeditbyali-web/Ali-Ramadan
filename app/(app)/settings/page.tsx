import { requireTenant } from "@/lib/current-tenant";
import { requirePermission } from "@/lib/permissions";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const { session, tenant } = await requireTenant();
  requirePermission(session.role, "manageSettings");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted">Your business info and tax rate.</p>
      </div>

      <SettingsForm
        tenant={{
          name: tenant.name,
          country: tenant.country,
          currency: tenant.currency,
          vatRate: tenant.vatRate,
        }}
      />
    </div>
  );
}
