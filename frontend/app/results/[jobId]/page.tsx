"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { getJobStatus } from "@/lib/api";
import { GradingResult } from "@/types/grading";
import AuditProgress from "@/components/AuditProgress";
import AuthButton from "@/components/AuthButton";
import HistorySidebar from "@/components/HistorySidebar";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import ScorelyLogo from "@/components/ScorelyLogo";

const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 180000; // 3 min — accounts for Render free-tier cold start (30–60 s)

export default function ResultsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const [status, setStatus] = useState<string>("pending");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [eventCode, setEventCode] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const startTime = Date.now();

    const poll = async () => {
      try {
        const data = await getJobStatus(jobId);
        setStatus(data.status);

        if (data.status === "complete" && data.result) {
          clearInterval(interval);
          setCompleting(true);
          setEventCode(data.event_code ?? null);
          setTimeout(() => setResult(data.result), 900);
          return;
        }

        if (data.status === "failed") {
          setError(data.error || "Grading failed. Please try again.");
          clearInterval(interval);
          return;
        }

        if (Date.now() - startTime > POLL_TIMEOUT) {
          setError(
            "The backend is taking longer than expected — it may still be starting up. Please wait a moment and try again."
          );
          clearInterval(interval);
        }
      } catch {
        setError("Failed to check status. Is the backend running?");
        clearInterval(interval);
      }
    };

    poll();
    interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [jobId]);

  const statusMessage =
    status === "pending"
      ? "Waiting in queue..."
      : status === "processing"
      ? "Analyzing report..."
      : "";

  return (
    <main className="min-h-screen bg-[#000B14] text-[#E2E8F0]">
      {/* Top bar */}
      <header className="px-8 py-6 flex items-center justify-between">
        <ScorelyLogo />
        <div className="flex items-center gap-4">
          <AuthButton />
          {result && (
            <div className="flex items-center gap-4">
              <button
                onClick={copyLink}
                className="text-[#94A3B8] hover:text-[#E2E8F0] text-sm transition-colors duration-200"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
              <Link
                href={`/upload${eventCode ? `?event=${eventCode}` : ""}`}
                className="text-[#94A3B8] hover:text-[#E2E8F0] text-sm transition-colors duration-200"
              >
                New Audit →
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col items-center px-4 pt-10 pb-24 max-w-5xl mx-auto">
        {/* Loading state */}
        {!result && !error && (
          <div className="flex flex-col items-center justify-center mt-16 w-full">
            <p className="text-[#0073C1] text-xs font-semibold uppercase tracking-widest mb-8">
              {statusMessage || "Processing..."}
            </p>
            <AuditProgress complete={completing} />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mt-16 w-full max-w-md mx-auto">
            <div className="bg-[#00162A] border border-[#1E293B] rounded-md p-10 text-center">
              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 mx-auto mb-6">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#EF4444]">
                  <path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {/* Title */}
              <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-2">
                {error.toLowerCase().includes("deca") || error.toLowerCase().includes("written entry") || error.toLowerCase().includes("extract enough text")
                  ? "Document Not Recognized"
                  : error.toLowerCase().includes("longer than expected") || error.toLowerCase().includes("starting up")
                  ? "Taking Too Long"
                  : error.toLowerCase().includes("backend") || error.toLowerCase().includes("status")
                  ? "Connection Error"
                  : "Something Went Wrong"}
              </p>
              {/* Message */}
              <p className="text-[#94A3B8] text-sm leading-relaxed mb-8">
                {error}
              </p>
              {/* CTA */}
              <Link
                href="/upload"
                className="inline-block px-6 py-2.5 bg-[#0073C1] hover:bg-[#005fa3] text-white text-sm font-semibold rounded-sm transition-colors duration-200"
              >
                Try again
              </Link>
            </div>
          </div>
        )}

        {/* Results with past submissions below */}
        {result && (
          <div className="w-full flex flex-col gap-6">
            <ScoreBreakdown result={result} />
            {eventCode && <HistorySidebar currentJobId={jobId} eventCode={eventCode} />}
          </div>
        )}
      </div>
    </main>
  );
}
