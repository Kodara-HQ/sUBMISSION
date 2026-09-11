"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/fields";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "auth" ? "Sign-in could not be completed." : "");
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
        const bootstrap = await fetch("/api/admin/bootstrap", { method: "POST" });
        if (!bootstrap.ok) {
          await supabase.auth.signOut();
          return "This account is not authorized to access the administrator dashboard.";
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
      const supabase = createClient();
      const trimmedEmail = email.trim();
      let { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        const provision = await fetch("/api/admin/bootstrap-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
            full_name: "Emmanuel Lamadeku",
          }),
        });
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
        setError("Invalid email or password.");
        return;
      }

      const gateError = await completeAdminGate(supabase);
      if (gateError) {
        setError(gateError);
        return;
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
