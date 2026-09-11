"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/fields";
import { isDemoMode } from "@/lib/demo/config";
import { isSupabaseConfigured, setRuntimeSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

const CONFIG_HELP =
  "Supabase is not configured on this deployment. In Vercel → Settings → Environment Variables, add for Production: SUPABASE_URL, SUPABASE_ANON_KEY (eyJ… JWT), and ADMIN_BOOTSTRAP_EMAIL. Then Redeploy with “Use existing Build Cache” turned OFF.";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const demo = isDemoMode();
  const [configured, setConfigured] = useState(() => demo || isSupabaseConfigured());
  const [checkingConfig, setCheckingConfig] = useState(() => !demo && !isSupabaseConfigured());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "auth" ? "Sign-in could not be completed." : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (demo) {
      setConfigured(true);
      setCheckingConfig(false);
      return;
    }

    if (isSupabaseConfigured()) {
      setConfigured(true);
      setCheckingConfig(false);
      setError((current) => (current === CONFIG_HELP ? "" : current));
      return;
    }

    let cancelled = false;
    setCheckingConfig(true);

    (async () => {
      try {
        const response = await fetch("/api/public-config", { cache: "no-store" });
        const body = (await response.json()) as {
          configured?: boolean;
          url?: string;
          key?: string;
          hasUrl?: boolean;
          hasKey?: boolean;
        };
        if (cancelled) return;
        if (body.configured && body.url && body.key) {
          setRuntimeSupabaseConfig({ url: body.url, key: body.key });
          setConfigured(true);
          setError((current) => (current === CONFIG_HELP ? "" : current));
        } else {
          setConfigured(false);
          setError(CONFIG_HELP);
        }
      } catch {
        if (!cancelled) {
          setConfigured(false);
          setError(CONFIG_HELP);
        }
      } finally {
        if (!cancelled) setCheckingConfig(false);
      }
    })();

    function onReady() {
      if (isSupabaseConfigured()) {
        setConfigured(true);
        setCheckingConfig(false);
        setError((current) => (current === CONFIG_HELP ? "" : current));
      }
    }
    window.addEventListener("esp-supabase-ready", onReady);
    return () => {
      cancelled = true;
      window.removeEventListener("esp-supabase-ready", onReady);
    };
  }, [demo]);

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
      if (!demo && !isSupabaseConfigured()) {
        const response = await fetch("/api/public-config", { cache: "no-store" });
        const body = (await response.json()) as {
          configured?: boolean;
          url?: string;
          key?: string;
        };
        if (body.configured && body.url && body.key) {
          setRuntimeSupabaseConfig({ url: body.url, key: body.key });
          setConfigured(true);
        } else {
          setError(CONFIG_HELP);
          return;
        }
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
        } else {
          setError(
            provisionBody.message ||
              "Invalid email or password. If this is the first login, set ADMIN_BOOTSTRAP_EMAIL in Vercel and reset the user password in Supabase Auth.",
          );
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
          setError(
            "Invalid email or password. Reset it in Supabase → Authentication → Users, or delete that user and sign in once to recreate the bootstrap admin.",
          );
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
        setError(CONFIG_HELP);
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
          {checkingConfig ? (
            <Alert tone="info">Checking database connection…</Alert>
          ) : null}
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
          <Button type="submit" className="w-full" disabled={busy || checkingConfig || !configured}>
            {busy ? "Signing in…" : checkingConfig ? "Connecting…" : "Sign in"}
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
