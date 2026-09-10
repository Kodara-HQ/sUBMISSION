"use client";

import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function Unauthorized() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <Alert tone="error" title="Access denied">
        Your account is signed in, but it is not authorized to use the administrator dashboard.
        Contact a super administrator if you need access.
      </Alert>
      <Button className="mt-4" variant="outline" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
