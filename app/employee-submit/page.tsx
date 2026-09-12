import { Suspense } from "react";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { EmployeeForm } from "@/components/employee/employee-form";
import { PublicHeader } from "@/components/public-header";
import { Spinner } from "@/components/ui/spinner";
import { EmployeeSubmitIntro } from "@/components/employee/submit-intro";

export const metadata = {
  title: "Submit",
};

export default function EmployeeSubmitPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PublicHeader showAdminLink={false} showHomeLink={false} centered />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <DemoModeBanner className="mb-6" />
        <Suspense fallback={<Spinner label="Loading form" />}>
          <EmployeeSubmitIntro />
          <EmployeeForm />
        </Suspense>
      </main>
    </div>
  );
}
