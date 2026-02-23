"use client";

import Link from "next/link";
import ScorelyLogo from "@/components/ScorelyLogo";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#000B14] text-[#F8FAFC]">
      {/* Top bar */}
      <header className="px-8 py-6">
        <ScorelyLogo asHomeButton={false} />
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-16 pb-16 max-w-5xl mx-auto">
        <p className="text-[#0073C1] text-sm font-semibold uppercase tracking-widest mb-5">
          AI-Powered DECA Grading
        </p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#F8FAFC] mb-6 leading-none">
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
                "Select your DECA event and upload your written report. Supports all typed PDFs up to 25 pages.",
            },
            {
              step: "02",
              title: "AI Analyzes",
              description:
                "Our engine extracts your document and cross-references every section against the official event rubric.",
            },
            {
              step: "03",
              title: "Review Results",
              description:
                "Receive a full score breakdown with section-level feedback and an overall quality assessment.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-[#00162A] border border-[#1E293B] rounded-md p-8"
            >
              <p className="text-[#0073C1] text-xs font-semibold uppercase tracking-widest mb-4">
                {item.step}
              </p>
              <h3 className="text-[#F8FAFC] font-semibold text-lg mb-3">{item.title}</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-10 text-center">
          Built for Precision
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="1" stroke="#0073C1" strokeWidth="1.5" />
                  <path d="M6 10h8M6 7h8M6 13h5" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
              title: "Rubric-Based Precision",
              description:
                "Scoring is anchored to the exact DECA event rubric, not general writing quality. Every point is justified.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="#0073C1" strokeWidth="1.5" />
                  <path d="M10 6v4l3 3" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
              title: "Instant Results",
              description:
                "Extraction, analysis, and scoring complete in under 20 seconds. No waiting, no manual review.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 14l4-4 3 3 5-6" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
              title: "Actionable Feedback",
              description:
                "Each section includes specific commentary: what you did well, what's missing, and how to improve.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-[#00162A] border border-[#1E293B] rounded-md p-8"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-[#F8FAFC] font-semibold text-base mb-3">{feature.title}</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#F8FAFC] mb-4">
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
