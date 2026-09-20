import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { BUSINESS_SETTINGS_KEY, DEFAULT_BUSINESS_SETTINGS, type BusinessSettings } from "@/lib/validation/settings";
import { BusinessSettingsForm } from "@/components/settings/business-settings-form";

export default async function SettingsPage() {
  await requirePermission("settings:manage");
  const row = await prisma.setting.findUnique({ where: { key: BUSINESS_SETTINGS_KEY } });
  const settings = (row ? row.value : DEFAULT_BUSINESS_SETTINGS) as BusinessSettings;

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">Settings</h1>
      <BusinessSettingsForm initial={settings} />
    </div>
  );
}
