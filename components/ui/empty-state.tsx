import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-5 py-12 text-center">
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      {action ? (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
