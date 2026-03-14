"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import ScorelyLogo from "@/components/ScorelyLogo";
import AuthButton from "@/components/AuthButton";
import { getAdminStats, getAdminUsers, getAdminUserSubmissions, getAdminAnalytics } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_users: number;
  total_submissions: number;
  submissions_today: number;
  submissions_this_week: number;
  unique_ips: number;
  anonymous_submissions: number;
  authenticated_submissions: number;
  completion_rate: number;
  top_events: { event_code: string; count: number }[];
}

interface DailyPoint { date: string; value: number }

interface Analytics {
  signups_30d: DailyPoint[];
  submissions_30d: DailyPoint[];
  anon_submissions_30d: DailyPoint[];
  auth_submissions_30d: DailyPoint[];
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
  submission_count: number;
}

interface Submission {
  job_id: string;
  event_name: string;
  event_code?: string;
  total_awarded?: number;
  total_possible?: number;
  status: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl px-5 py-4 flex flex-col gap-1">
      <p className="text-[#64748B] text-xs font-medium uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? "text-[#E2E8F0]"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[#64748B] text-xs">{sub}</p>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">
      {children}
    </h2>
  );
}

function ScoreBar({ awarded, possible }: { awarded?: number; possible?: number }) {
  if (awarded == null || possible == null || possible === 0)
    return <span className="text-[#64748B] text-xs">—</span>;
  const pct = Math.round((awarded / possible) * 100);
  const color =
    pct >= 80 ? "#22C55E" : pct >= 60 ? "#EAB308" : pct >= 40 ? "#F97316" : "#EF4444";
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {pct}% ({awarded}/{possible})
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: "text-[#22C55E] bg-[#22C55E]/10",
    failed: "text-[#EF4444] bg-[#EF4444]/10",
    processing: "text-[#EAB308] bg-[#EAB308]/10",
    pending: "text-[#64748B] bg-[#64748B]/10",
  };
  const cls = colors[status] ?? colors.pending;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>
  );
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "#060F1A",
    border: "1px solid #1E3A5F",
    borderRadius: 8,
    color: "#E2E8F0",
    fontSize: 12,
  },
  itemStyle: { color: "#94A3B8" },
  labelStyle: { color: "#E2E8F0", fontWeight: 600, marginBottom: 4 },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    if (!isAdmin) { router.replace("/"); return; }

    Promise.all([getAdminStats(), getAdminUsers(), getAdminAnalytics()])
      .then(([s, u, a]) => {
        setStats(s);
        setUsers(u);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  }, [session, status, isAdmin, router]);

  async function selectUser(user: AdminUser) {
    setSelectedUser(user);
    setLoadingSubmissions(true);
    try {
      const data = await getAdminUserSubmissions(user.id);
      setSubmissions(data);
    } finally {
      setLoadingSubmissions(false);
    }
  }

  // ── Loading / Auth gates ─────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#000B14] flex items-center justify-center">
        <div className="h-6 w-24 rounded bg-[#0F2235] animate-pulse" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#000B14] flex flex-col items-center justify-center gap-4 text-[#E2E8F0]">
        <p className="text-[#94A3B8] text-sm">Sign in to access the admin dashboard.</p>
        <button
          onClick={() => signIn("google")}
          className="px-4 py-2 rounded-md bg-[#0073C1] hover:bg-[#005A99] text-white text-sm transition-colors"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────

  const pulse = "animate-pulse bg-[#0F2235] rounded-xl";

  // ── Derived chart data ───────────────────────────────────────────────────

  const submissionsChartData = analytics?.submissions_30d.map((pt, i) => ({
    date: shortDate(pt.date),
    Total: pt.value,
    Authenticated: analytics.auth_submissions_30d[i]?.value ?? 0,
    Anonymous: analytics.anon_submissions_30d[i]?.value ?? 0,
  }));

  const signupsChartData = analytics?.signups_30d.map((pt) => ({
    date: shortDate(pt.date),
    Signups: pt.value,
  }));

  const topEventsChartData = stats?.top_events.map((e) => ({
    name: e.event_code,
    count: e.count,
  }));

  const BAR_COLORS = [
    "#0073C1", "#0099E6", "#22C55E", "#EAB308", "#F97316",
    "#EF4444", "#A855F7", "#EC4899", "#14B8A6", "#64748B",
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#000B14] text-[#E2E8F0]">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#1E3A5F]/60">
        <div className="flex items-center gap-4">
          <ScorelyLogo />
          <span className="text-[#0073C1] text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded border border-[#0073C1]/40 bg-[#0073C1]/10">
            Admin
          </span>
        </div>
        <AuthButton />
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">

        {/* ── KPI Cards ── */}
        <section>
          <SectionHeader>Overview</SectionHeader>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`h-24 ${pulse}`} />
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.total_users} />
              <StatCard
                label="Unique IPs"
                value={stats.unique_ips}
                sub="distinct anonymous visitors"
              />
              <StatCard label="Total Submissions" value={stats.total_submissions} />
              <StatCard
                label="Completion Rate"
                value={`${stats.completion_rate}%`}
                accent={
                  stats.completion_rate >= 80
                    ? "text-[#22C55E]"
                    : stats.completion_rate >= 60
                    ? "text-[#EAB308]"
                    : "text-[#EF4444]"
                }
              />
              <StatCard label="Submissions Today" value={stats.submissions_today} />
              <StatCard label="This Week" value={stats.submissions_this_week} />
              <StatCard
                label="Authenticated"
                value={stats.authenticated_submissions}
                sub="signed-in users"
                accent="text-[#0073C1]"
              />
              <StatCard
                label="Anonymous"
                value={stats.anonymous_submissions}
                sub="no account"
                accent="text-[#94A3B8]"
              />
            </div>
          )}
        </section>

        {/* ── Charts ── */}
        <section>
          <SectionHeader>Trends — Last 30 Days</SectionHeader>
          {loading || !analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`h-64 ${pulse}`} />
              <div className={`h-64 ${pulse}`} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Signups over time */}
              <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl p-5">
                <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">
                  New Signups
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={signupsChartData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748B", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="Signups"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#22C55E" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Submissions over time */}
              <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl p-5">
                <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">
                  Submissions
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={submissionsChartData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748B", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: "#94A3B8" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Total"
                      stroke="#0073C1"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Authenticated"
                      stroke="#22C55E"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Anonymous"
                      stroke="#64748B"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* ── Top Events Bar Chart ── */}
        {!loading && stats && stats.top_events.length > 0 && (
          <section>
            <SectionHeader>Top Events by Submissions</SectionHeader>
            <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl p-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topEventsChartData} barSize={28}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748B", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP_STYLE}
                    formatter={(value) => [value, "Submissions"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {topEventsChartData?.map((_, index) => (
                      <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Users Table ── */}
        <section>
          <SectionHeader>Registered Users ({users.length})</SectionHeader>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-12 ${pulse}`} />
              ))}
            </div>
          ) : (
            <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E3A5F]">
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium">User</th>
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium hidden md:table-cell">Joined</th>
                    <th className="text-right px-4 py-3 text-[#64748B] font-medium">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#64748B] text-xs">
                        No users yet.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`border-b border-[#1E3A5F]/50 cursor-pointer transition-colors ${
                          selectedUser?.id === user.id ? "bg-[#0F2235]" : "hover:bg-[#0A1929]"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {user.picture ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.picture}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center text-xs text-[#94A3B8] font-bold">
                                {user.name?.[0]?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <span className="text-[#E2E8F0] font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#94A3B8] hidden sm:table-cell">{user.email}</td>
                        <td className="px-4 py-3 text-[#64748B] hidden md:table-cell">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[#E2E8F0] font-semibold">{user.submission_count}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Submission drill-down ── */}
        {selectedUser && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <SectionHeader>
                Submissions — {selectedUser.name}
              </SectionHeader>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[#64748B] hover:text-[#94A3B8] text-xs transition-colors"
              >
                ✕ Close
              </button>
            </div>
            {loadingSubmissions ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className={`h-10 ${pulse}`} />)}
              </div>
            ) : (
              <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E3A5F]">
                      <th className="text-left px-4 py-3 text-[#64748B] font-medium">Event</th>
                      <th className="text-left px-4 py-3 text-[#64748B] font-medium">Score</th>
                      <th className="text-left px-4 py-3 text-[#64748B] font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-[#64748B] font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[#64748B] text-xs">
                          No submissions.
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub.job_id} className="border-b border-[#1E3A5F]/50">
                          <td className="px-4 py-3">
                            <span className="text-[#E2E8F0] font-medium">{sub.event_code ?? "—"}</span>
                            <span className="text-[#64748B] text-xs ml-2">{sub.event_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <ScoreBar awarded={sub.total_awarded} possible={sub.total_possible} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className="px-4 py-3 text-[#64748B]">{formatDate(sub.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}
