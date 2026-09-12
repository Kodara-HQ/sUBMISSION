"use client";

import { useSearchParams } from "next/navigation";

export function EmployeeSubmitIntro() {
  const type = (useSearchParams().get("type") || "").trim().toLowerCase();
  const safety = type === "safety" || type === "safety-tip" || type === "safety_tip" || type === "tip";
  const spotlight =
    type === "spotlight" || type === "employee-spotlight" || type === "employee_spotlight";

  const title = safety ? "Share a safety tip" : spotlight ? "Employee Spotlight" : "Share a submission";
  const description = safety
    ? "Your tip is anonymous. Required fields are marked with an asterisk (*)."
    : spotlight
      ? "Answer the spotlight questions below. Required fields are marked with an asterisk (*)."
      : "Choose a submission type below. Required fields are marked with an asterisk (*).";

  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-navy">{title}</h1>
      <p className="mx-auto mt-1 mb-6 max-w-xl text-center text-sm text-muted">{description}</p>
    </>
  );
}
