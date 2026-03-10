"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getAdminStats, getAdminUsers, getAdminUserSubmissions } from "@/lib/api";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

interface Stats {
  total_users: number;
  total_submissions: number;
  submissions_today: number;
  top_events: { event_code: string; count: number }[];
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ScoreBar({ awarded, possible }: { awarded?: number; possible?: number }) {
  if (awarded == null || possible == null || possible === 0) return <span className="text-[#64748B] text-xs">—</span>;
  const pct = Math.round((awarded / possible) * 100);
  const color = pct >= 80 ? "#22C55E" : pct >= 60 ? "#EAB308" : pct >= 40 ? "#F97316" : "#EF4444";
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {pct}% ({awarded}/{possible})
    </span>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return; // show sign-in prompt
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    Promise.all([getAdminStats(), getAdminUsers()])
      .then(([s, u]) => {
        setStats(s);
        setUsers(u);
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

  return (
    <main className="min-h-screen bg-[#000B14] text-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Stats cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-[#0F2235] animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Users" value={stats.total_users} />
              <StatCard label="Total Submissions" value={stats.total_submissions} />
              <StatCard label="Submissions Today" value={stats.submissions_today} />
            </div>

            {/* Top events */}
            {stats.top_events.length > 0 && (
              <section>
                <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-3">
                  Top Events
                </h2>
                <div className="flex flex-wrap gap-2">
                  {stats.top_events.map((e) => (
                    <div
                      key={e.event_code}
                      className="px-3 py-1.5 rounded-full bg-[#0F2235] border border-[#1E3A5F] text-sm"
                    >
                      <span className="text-[#E2E8F0] font-medium">{e.event_code}</span>
                      <span className="text-[#64748B] ml-2">{e.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Users table */}
        <section>
          <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">
            Users
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-[#0F2235] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E3A5F]">
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium">Joined</th>
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
                          selectedUser?.id === user.id
                            ? "bg-[#0F2235]"
                            : "hover:bg-[#0A1929]"
                        }`}
                      >
                        <td className="px-4 py-3 text-[#E2E8F0]">{user.name}</td>
                        <td className="px-4 py-3 text-[#94A3B8]">{user.email}</td>
                        <td className="px-4 py-3 text-[#64748B]">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3 text-right text-[#94A3B8]">{user.submission_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Submission drill-down */}
        {selectedUser && (
          <section>
            <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">
              Submissions — {selectedUser.name}
            </h2>
            {loadingSubmissions ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-[#0F2235] animate-pulse" />
                ))}
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
                            <span className="text-[#E2E8F0]">{sub.event_code ?? "—"}</span>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl px-5 py-4">
      <p className="text-[#64748B] text-xs mb-1">{label}</p>
      <p className="text-[#E2E8F0] text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
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
