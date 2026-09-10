export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
