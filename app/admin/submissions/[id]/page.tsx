import { SubmissionDetail } from "@/components/admin/submission-detail";

export const metadata = {
  title: "Submission",
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubmissionDetail id={id} />;
}
