import { EmployeeDetail } from "@/components/admin/employee-detail";

export const metadata = {
  title: "Employee",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeDetail id={id} />;
}
