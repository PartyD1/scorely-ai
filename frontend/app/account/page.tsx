"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ScorelyLogo from "@/components/ScorelyLogo";
import AuthButton from "@/components/AuthButton";
import { getAccountSubmissions, deleteAccount } from "@/lib/api";
import { HistoryItem } from "@/types/grading";

function scoreColor(pct: number) {
  if (pct >= 80) return "text-[#22C55E] bg-[#22C55E]/10";
  if (pct >= 60) return "text-[#EAB308] bg-[#EAB308]/10";
  if (pct >= 40) return "text-[#F97316] bg-[#F97316]/10";
  return "text-[#EF4444] bg-[#EF4444]/10";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    getAccountSubmissions()
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [session, status]);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut({ redirect: false });
      router.push("/");
    } catch {
      setDeleting(false);
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
        <p className="text-[#94A3B8] text-sm">Sign in to view your account.</p>
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
      <header className="px-8 py-6 flex items-center justify-between border-b border-[#1E3A5F]">
        <ScorelyLogo />
        <AuthButton />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Profile card */}
        <section className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl p-6 flex items-center gap-5">
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={64}
              height={64}
              className="rounded-full shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#0073C1] flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {session.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[#E2E8F0] text-xl font-semibold truncate">{session.user?.name}</p>
            <p className="text-[#94A3B8] text-sm truncate">{session.user?.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-[#64748B] text-xs">
              <GoogleMiniIcon />
              Signed in with Google
            </span>
          </div>
        </section>

        {/* Submission history */}
        <section>
          <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">
            Submission History
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-[#0F2235] animate-pulse" />)}
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl px-6 py-10 text-center">
              <p className="text-[#64748B] text-sm">No submissions yet.</p>
              <Link href="/upload" className="text-[#0073C1] text-sm hover:underline mt-2 inline-block">
                Upload your first report →
              </Link>
            </div>
          ) : (
            <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E3A5F]">
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium">Event</th>
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium">Score</th>
                    <th className="text-left px-4 py-3 text-[#64748B] font-medium">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => {
                    const pct = Math.round((s.total_awarded / s.total_possible) * 100);
                    return (
                      <tr key={s.job_id} className="border-b border-[#1E3A5F]/50 last:border-0">
                        <td className="px-4 py-3">
                          <span className="text-[#E2E8F0] font-medium">{s.event_code ?? "—"}</span>
                          <span className="text-[#64748B] text-xs ml-2 hidden sm:inline">{s.event_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(pct)}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#64748B] text-xs">{formatDate(s.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/results/${s.job_id}`}
                            className="text-[#0073C1] hover:text-[#E2E8F0] text-xs transition-colors"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">
            Danger Zone
          </h2>
          <div className="bg-[#060F1A] border border-[#EF4444]/30 rounded-xl p-6">
            {!showDelete ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[#E2E8F0] text-sm font-medium">Delete Account</p>
                  <p className="text-[#64748B] text-xs mt-0.5">
                    Permanently removes your account and all {submissions.length} submission{submissions.length !== 1 ? "s" : ""}.
                  </p>
                </div>
                <button
                  onClick={() => setShowDelete(true)}
                  className="shrink-0 px-4 py-2 rounded-md border border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10 text-sm transition-colors"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[#E2E8F0] text-sm">
                  This will permanently delete your account and all {submissions.length} submission{submissions.length !== 1 ? "s" : ""}. Type{" "}
                  <span className="font-mono text-[#EF4444]">DELETE</span> to confirm.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-3 py-2 bg-[#000B14] border border-[#1E3A5F] rounded-md text-[#E2E8F0] text-sm placeholder-[#3F5068] focus:outline-none focus:border-[#EF4444]"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={confirmText !== "DELETE" || deleting}
                    className="px-4 py-2 rounded-md bg-[#EF4444] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#DC2626] transition-colors"
                  >
                    {deleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => { setShowDelete(false); setConfirmText(""); }}
                    className="px-4 py-2 rounded-md text-[#94A3B8] hover:text-[#E2E8F0] text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function GoogleMiniIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
