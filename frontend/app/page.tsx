"use client";

import Link from "next/link";
import ScorelyLogo from "@/components/ScorelyLogo";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#000B14] text-[#E2E8F0]">
      {/* Top bar */}
      <header className="px-8 py-6">
        <ScorelyLogo asHomeButton={false} />
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-16 pb-16 max-w-5xl mx-auto">
        <p className="text-[#0073C1] text-sm font-semibold uppercase tracking-widest mb-5">
          AI-Powered DECA Grading
        </p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#E2E8F0] mb-6 leading-none">
          AUDIT YOUR<br />DECA REPORT.
        </h1>
        <p className="text-[#94A3B8] text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
          Upload your written report, select your event, and receive deterministic
          section-by-section scoring in under 20 seconds.
        </p>
        <Link
          href="/upload"
          className="px-8 py-4 bg-[#0073C1] text-white font-semibold text-base rounded-sm hover:bg-[#005fa3] transition-all duration-300 ease-in-out"
        >
          Start Audit →
        </Link>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-10 text-center">
          How It Works
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Upload Your PDF",
              description:
                "Select your DECA event and upload your written report. Scoring is anchored to the exact event rubric, not general writing quality.",
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="1" stroke="#0073C1" strokeWidth="1.5" />
                  <path d="M6 10h8M6 7h8M6 13h5" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              step: "02",
              title: "AI Analyzes",
              description:
                "Our engine cross-references every section against the official rubric. Extraction, analysis, and scoring complete in under 20 seconds.",
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="#0073C1" strokeWidth="1.5" />
                  <path d="M10 6v4l3 3" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              step: "03",
              title: "Review Results",
              description:
                "Get a full score breakdown with section-level commentary: what you did well, what's missing, and how to improve.",
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 14l4-4 3 3 5-6" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-[#00162A] border border-[#1E293B] rounded-md p-8"
            >
              <div className="mb-4">{item.icon}</div>
              <h3 className="text-[#E2E8F0] font-semibold text-lg mb-3">{item.title}</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#E2E8F0] mb-4">
            Ready to audit your report?
          </h2>
          <p className="text-[#94A3B8] mb-8">
            Upload your PDF and get results in seconds.
          </p>
          <Link
            href="/upload"
            className="px-8 py-4 bg-[#0073C1] text-white font-semibold text-base rounded-sm hover:bg-[#005fa3] transition-all duration-300 ease-in-out"
          >
            Start Audit →
          </Link>
        </section>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] px-8 py-6 max-w-5xl mx-auto">
        <p className="text-[#94A3B8] text-xs">
          © {new Date().getFullYear()} ScorelyAI. Built for DECA competitors.
        </p>
      </footer>
    </main>
  );
}
