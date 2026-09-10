import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { AdminUser } from "@/lib/types";

export async function getCurrentAdmin(): Promise<{
  user: User | null;
  admin: AdminUser | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null, admin: null };

    const { data: admin } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    return { user, admin: (admin as AdminUser | null) ?? null };
  } catch {
    return { user: null, admin: null };
  }
}
