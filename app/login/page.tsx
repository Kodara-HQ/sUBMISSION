import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { PublicHeader } from "@/components/public-header";
import { Spinner } from "@/components/ui/spinner";

export const metadata = {
  title: "Administrator sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PublicHeader showAdminLink={false} />
      <main id="main-content" className="mx-auto flex w-full max-w-md flex-1 items-start px-4 py-12">
        <div className="w-full">
          <Suspense fallback={<Spinner label="Loading sign in" />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
