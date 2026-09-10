"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import type { DashboardStats, Submission } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

const emptyStats: DashboardStats = {
  total_submissions: 0,
  pending: 0,
  reviewed: 0,
  this_week: 0,
  this_month: 0,
  new_submissions: 0,
  total_employees: 0,
  by_department: [],
  over_time: [],
};

export function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [recent, setRecent] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [statsRes, recentRes] = await Promise.all([
        supabase.rpc("get_dashboard_stats"),
        supabase
          .from("submissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      if (cancelled) return;
      if (statsRes.error || recentRes.error) {
        setError("Dashboard data could not be loaded.");
      } else {
        setStats((statsRes.data as DashboardStats) || emptyStats);
        setRecent((recentRes.data || []) as Submission[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (loading) return <Spinner label="Loading dashboard" />;

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of employee submissions and review progress."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total submissions" value={stats.total_submissions} />
        <StatCard label="New submissions" value={stats.new_submissions} hint="Pending in the last 7 days" />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Reviewed" value={stats.reviewed} />
        <StatCard label="This week" value={stats.this_week} />
        <StatCard label="This month" value={stats.this_month} />
        <StatCard label="Active employees" value={stats.total_employees} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Submissions over time" description="Last 30 days" />
          <CardBody className="h-72">
            {stats.over_time.length === 0 ? (
              <EmptyState title="No recent submissions" description="New submissions will appear in this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.over_time}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Submissions by department" />
          <CardBody className="h-72">
            {stats.by_department.length === 0 ? (
              <EmptyState title="No department data" description="Submissions will be grouped here by department." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_department}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#163456" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent submissions"
          action={
            <Link href="/admin/submissions" className="text-sm font-medium text-accent hover:underline">
              View all
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState title="No submissions yet" description="Employee submissions will appear here as they arrive." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((submission) => (
                  <tr key={submission.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <Link href={`/admin/submissions/${submission.id}`} className="font-medium text-navy hover:underline">
                        {submission.employee_full_name}
                      </Link>
                      <p className="text-xs text-muted">{submission.employee_identifier}</p>
                    </td>
                    <td className="px-5 py-3">{submission.department_name}</td>
                    <td className="px-5 py-3">{submission.submission_type_name}</td>
                    <td className="px-5 py-3">{formatDate(submission.submission_date)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={submission.status === "reviewed" ? "success" : "warning"}>
                        {submission.status === "reviewed" ? "Reviewed" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sr-only">Latest activity {recent[0] ? formatDateTime(recent[0].created_at) : ""}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
