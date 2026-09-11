import { DemoModeBanner } from "@/components/demo-mode-banner";
import { EmployeeForm } from "@/components/employee/employee-form";
import { PublicHeader } from "@/components/public-header";

export const metadata = {
  title: "Submit",
};

export default function EmployeeSubmitPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PublicHeader showAdminLink={false} showHomeLink={false} centered />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <DemoModeBanner className="mb-6" />
        <h1 className="text-center text-2xl font-semibold tracking-tight text-navy">
          Share a submission
        </h1>
        <p className="mx-auto mt-1 mb-6 max-w-xl text-center text-sm text-muted">
          Choose a submission type below. Required fields are marked with an asterisk (*).
        </p>
        <EmployeeForm />
      </main>
    </div>
  );
}
