import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-navy">Page not found</h1>
      <p className="mt-2 text-sm text-muted">The page you requested does not exist or is no longer available.</p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
