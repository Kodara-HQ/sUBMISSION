import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <PublicHeader />
      <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10">
        <p className="text-sm font-medium text-accent">Internal use only</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Employee Spotlight
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Employees complete the spotlight questionnaire. Administrators review and manage
          submissions from a secure dashboard.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-navy">Employee Spotlight</h2>
            <p className="mt-1 text-sm text-muted">
              Open the questionnaire and answer the four questions.
            </p>
            <Link
              href="/employee-submit"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-lg bg-accent px-5 text-base font-medium text-white hover:bg-accent-hover"
            >
              Start a spotlight
            </Link>
          </section>
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-navy">Administrator dashboard</h2>
            <p className="mt-1 text-sm text-muted">
              Sign in to review submissions, manage questions, and maintain employee records.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-medium text-white hover:bg-navy-700"
            >
              Administrator sign in
            </Link>
          </section>
        </div>
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        Submit only information you are authorized to share. Do not forward the employee link to
        people outside your organization.
      </footer>
    </div>
  );
}
