import { Alert } from "@/components/ui/alert";
import { isDemoMode } from "@/lib/demo/config";

export function DemoModeBanner({ className }: { className?: string }) {
  if (!isDemoMode()) return null;

  return (
    <Alert tone="warning" title="Local demo only — not the live system" className={className}>
      This computer is in demo mode. Use the Vercel production URL with Supabase connected so every
      browser and phone saves into the same admin list. Also turn off{" "}
      <strong>Vercel → Settings → Deployment Protection</strong> (Vercel Authentication), or other
      devices cannot open the form.
    </Alert>
  );
}
