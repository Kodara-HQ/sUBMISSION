import { EmployeeForm } from "@/components/employee/employee-form";
import { PublicHeader } from "@/components/public-header";

export const metadata = {
  title: "Employee Spotlight",
};

export default function EmployeeSubmitPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PublicHeader />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Employee Spotlight</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Complete the questionnaire below. Required fields are marked with an asterisk (*).
        </p>
        <EmployeeForm />
      </main>
    </div>
  );
}
