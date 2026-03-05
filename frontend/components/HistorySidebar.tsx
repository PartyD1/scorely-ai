"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getHistory } from "@/lib/api";
import { HistoryItem } from "@/types/grading";

function scoreColor(pct: number): string {
  if (pct >= 80) return "text-[#22C55E] bg-[#22C55E]/10";
  if (pct >= 60) return "text-[#EAB308] bg-[#EAB308]/10";
  if (pct >= 40) return "text-[#F97316] bg-[#F97316]/10";
  return "text-[#EF4444] bg-[#EF4444]/10";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface HistorySidebarProps {
  currentJobId: string;
  eventCode: string;
}

export default function HistorySidebar({ currentJobId, eventCode }: HistorySidebarProps) {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      setLoading(false);
      return;
    }
    getHistory(eventCode)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [session, status, eventCode]);

  if (!session && !loading) return null;

  return (
    <aside className="w-full">
      <div className="bg-[#060F1A] border border-[#1E3A5F] rounded-xl p-4">
        <p className="text-[#0073C1] text-xs font-semibold uppercase tracking-widest mb-4">
          Past Submissions
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-36 rounded-lg bg-[#0F2235] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && session && history.length === 0 && (
          <p className="text-[#64748B] text-xs leading-relaxed">
            No previous submissions for this event.
          </p>
        )}

        {/* History row */}
        {!loading && history.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {history.map((item) => {
              const pct = Math.round((item.total_awarded / item.total_possible) * 100);
              const isCurrent = item.job_id === currentJobId;
              return (
                <li key={item.job_id}>
                  <Link
                    href={`/results/${item.job_id}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                      isCurrent
                        ? "bg-[#0F2235] border border-[#0073C1]/40"
                        : "hover:bg-[#0A1929] border border-transparent"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[#94A3B8] text-xs">{formatDate(item.created_at)}</p>
                      {isCurrent && (
                        <p className="text-[#0073C1] text-[10px] font-medium mt-0.5">Current</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(pct)}`}>
                      {pct}%
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
