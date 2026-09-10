"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Alert tone="error" title="Something went wrong">
        Please try again. If the problem continues, contact your administrator.
      </Alert>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
