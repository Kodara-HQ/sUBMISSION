"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/fields";
import { isDemoMode } from "@/lib/demo/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const demo = isDemoMode();
  const configured = demo || isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") === "auth"
      ? "Sign-in could not be completed."
      : !configured
        ? "Supabase is not configured on this deployment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy."
        : "",
  );
  const [busy, setBusy] = useState(false);

  async function completeAdminGate(supabase: ReturnType<typeof createClient>) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: claimed } = await supabase.rpc("claim_admin_invite");
    const claimedRow = Array.isArray(claimed) ? claimed[0] : claimed;

    if (!claimedRow?.id) {
      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user?.id || "")
        .eq("is_active", true)
        .maybeSingle();

      if (!existing) {
        let bootstrap: Response;
        try {
          bootstrap = await fetch("/api/admin/bootstrap", { method: "POST" });
        } catch {
          return "Could not reach the administrator bootstrap service. Check your connection and try again.";
        }
        if (!bootstrap.ok) {
          const body = (await bootstrap.json().catch(() => ({}))) as { message?: string };
          await supabase.auth.signOut();
          return (
            body.message ||
            "This account is not authorized to access the administrator dashboard. Run supabase/bootstrap-admin.sql in Supabase, or sign in with ADMIN_BOOTSTRAP_EMAIL."
          );
        }
      }
    }
    return "";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!configured) {
        setError(
          "Supabase is not configured on this deployment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.",
        );
        return;
      }

      const supabase = createClient();
      const trimmedEmail = email.trim();
      let { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError && !demo) {
        let provision: Response;
        try {
          provision = await fetch("/api/admin/bootstrap-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: trimmedEmail,
              password,
              full_name: "Emmanuel Lamadeku",
            }),
          });
        } catch {
          setError("Could not reach the sign-in service. Check your connection and try again.");
          return;
        }

        const provisionBody = (await provision.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };

        if (provision.ok) {
          ({ error: signInError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          }));
        } else if (provision.status === 403) {
          setError("Invalid email or password.");
          return;
        } else {
          setError(provisionBody.message || "Invalid email or password.");
          return;
        }
      }

      if (signInError) {
        const message = signInError.message || "";
        if (/confirm|verification|not confirmed/i.test(message)) {
          setError(
            "Email confirmation is required. In Supabase: Authentication → Providers → Email → turn off Confirm email, then try again.",
          );
        } else {
          setError("Invalid email or password.");
        }
        return;
      }

      const gateError = await completeAdminGate(supabase);
      if (gateError) {
        setError(gateError);
        return;
      }

      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/supabase is not configured/i.test(message)) {
        setError(message);
      } else {
        setError(message || "Unable to sign in right now. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Administrator sign in" description="Use your authorized administrator credentials." />
      <CardBody>
        <form className="space-y-4" onSubmit={onSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div>
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !configured}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted">
            <Link href="/" className="text-accent hover:underline">
              Back to portal home
            </Link>
          </p>
        </form>
      </CardBody>
    </Card>
  );
}
