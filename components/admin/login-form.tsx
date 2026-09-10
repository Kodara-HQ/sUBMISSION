"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/fields";
import { DEMO_EMAIL, DEMO_PASSWORD, isDemoMode } from "@/lib/demo/config";
import { createClient } from "@/lib/supabase/client";

const demo = isDemoMode();

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const [email, setEmail] = useState(demo ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(demo ? DEMO_PASSWORD : "");
  const [error, setError] = useState(searchParams.get("error") === "auth" ? "Sign-in could not be completed." : "");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Invalid email or password.");
        return;
      }

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
          const bootstrap = await fetch("/api/admin/bootstrap", { method: "POST" });
          if (!bootstrap.ok) {
            await supabase.auth.signOut();
            setError("This account is not authorized to access the administrator dashboard.");
            return;
          }
        }
      }

      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Administrator sign in" description="Use your authorized administrator credentials." />
      <CardBody>
        <form className="space-y-4" onSubmit={onSubmit}>
          {demo ? (
            <Alert tone="info" title="Local demo login">
              Email: {DEMO_EMAIL}
              <br />
              Password: {DEMO_PASSWORD}
            </Alert>
          ) : null}
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
          <Button type="submit" className="w-full" disabled={busy}>
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
