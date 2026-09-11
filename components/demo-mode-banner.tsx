import { Alert } from "@/components/ui/alert";
import { isDemoMode } from "@/lib/demo/config";

export function DemoModeBanner({ className }: { className?: string }) {
  if (!isDemoMode()) return null;

  return (
    <Alert tone="warning" title="Demo mode — data stays in this browser only" className={className}>
      Submissions are saved in this device’s browser storage, so other phones or browsers will not see
      them. Add <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel, run the SQL
      scripts, then redeploy to share one live database.
    </Alert>
  );
}
