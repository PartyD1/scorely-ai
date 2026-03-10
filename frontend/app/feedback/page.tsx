"use client";

import { useState } from "react";
import Link from "next/link";
import ScorelyLogo from "@/components/ScorelyLogo";
import AuthButton from "@/components/AuthButton";

type FeedbackType = "Bug Report" | "Feature Request";

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("Bug Report");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!subject.trim() || !message.trim()) return;
    const emailSubject = `ScorelyAI [${type}] - ${subject.trim()}`;
    const emailBody = message.trim();
    const mailto = `mailto:pmdoshi1234@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailto;
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-[#000B14] text-[#E2E8F0]">
      <header className="px-8 py-6 flex items-center justify-between border-b border-[#1E3A5F]">
        <ScorelyLogo />
        <AuthButton />
      </header>

      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-[#E2E8F0] text-2xl font-semibold mb-1">Send Feedback</h1>
        <p className="text-[#64748B] text-sm mb-8">
          Report a bug or suggest a feature. This will open your email app.
        </p>

        <div className="space-y-5">
          {/* Type */}
          <div>
            <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest block mb-2">
              Type
            </label>
            <div className="flex gap-3">
              {(["Bug Report", "Feature Request"] as FeedbackType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    type === t
                      ? "bg-[#0073C1]/20 border-[#0073C1] text-[#60AEFF]"
                      : "bg-[#060F1A] border-[#1E3A5F] text-[#64748B] hover:text-[#94A3B8]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest block mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary"
              className="w-full px-3 py-2 bg-[#060F1A] border border-[#1E3A5F] rounded-md text-[#E2E8F0] text-sm placeholder-[#3F5068] focus:outline-none focus:border-[#0073C1]"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest block mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the bug or feature in detail..."
              rows={6}
              className="w-full px-3 py-2 bg-[#060F1A] border border-[#1E3A5F] rounded-md text-[#E2E8F0] text-sm placeholder-[#3F5068] focus:outline-none focus:border-[#0073C1] resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!subject.trim() || !message.trim()}
            className="w-full px-4 py-2.5 rounded-md bg-[#0073C1] hover:bg-[#005A99] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Open Email App
          </button>

          {submitted && (
            <p className="text-[#22C55E] text-sm text-center">
              Opening your email app — thanks for the feedback!
            </p>
          )}

          <p className="text-center">
            <Link href="/upload" className="text-[#64748B] hover:text-[#94A3B8] text-xs transition-colors">
              ← Back to upload
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
