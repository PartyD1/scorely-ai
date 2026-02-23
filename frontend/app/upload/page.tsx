"use client";

import UploadForm from "@/components/UploadForm";
import ScorelyLogo from "@/components/ScorelyLogo";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-[#000B14] text-[#F8FAFC]">
      {/* Top bar */}
      <header className="px-8 py-6">
        <ScorelyLogo />
      </header>

      {/* Content */}
      <div className="flex flex-col items-center px-4 pt-10 pb-24 max-w-5xl mx-auto">
        <div className="w-full max-w-xl">
          <p className="text-[#0073C1] text-xs font-semibold uppercase tracking-widest mb-4">
            New Audit
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#F8FAFC] mb-2">
            Upload Your Report
          </h1>
          <p className="text-[#94A3B8] text-sm mb-10">
            Select your event and upload your PDF to begin the audit.
          </p>

          <UploadForm />
        </div>
      </div>
    </main>
  );
}
