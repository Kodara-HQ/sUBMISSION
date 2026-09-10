import { SettingsManager } from "@/components/admin/settings-manager";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { admin } = await getCurrentAdmin();
  return <SettingsManager role={admin?.role || "admin"} />;
}
