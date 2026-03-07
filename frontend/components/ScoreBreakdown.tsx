"use client";

import { useState } from "react";
import { GradingResult, PenaltyCheck, SectionScore } from "@/types/grading";

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}

function getSemanticColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 60) return "#FBBF24";
  if (pct >= 40) return "#EF4444";
  return "#7F1D1D";
}

function getSemanticBg(pct: number): { bg: string; border: string; text: string } {
  if (pct >= 80) return { bg: "bg-[#10B981]/10", border: "border-[#10B981]/40", text: "text-[#10B981]" };
  if (pct >= 60) return { bg: "bg-[#FBBF24]/10", border: "border-[#FBBF24]/40", text: "text-[#FBBF24]" };
  if (pct >= 40) return { bg: "bg-[#EF4444]/10", border: "border-[#EF4444]/40", text: "text-[#EF4444]" };
  return { bg: "bg-[#7F1D1D]/20", border: "border-[#7F1D1D]/40", text: "text-red-300" };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="shrink-0 text-[#60A5FA]/60 hover:text-[#60A5FA] transition-colors duration-150"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="5" y="5" width="8" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v7A1.5 1.5 0 003.5 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function SectionCard({
  section,
  index,
  forceExpanded,
}: {
  section: SectionScore;
  index: number;
  forceExpanded: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpanded || localExpanded;

  const pct = section.max_points > 0
    ? (section.awarded_points / section.max_points) * 100
    : 0;
  const barColor = getSemanticColor(pct);
  const semantic = getSemanticBg(pct);

  return (
    <div
      className="group bg-[#00162A] border border-[#1E293B] rounded-md cursor-pointer hover:border-[#0073C1]/60 transition-all duration-300 ease-in-out overflow-hidden"
      onClick={() => setLocalExpanded(!localExpanded)}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 px-6 pt-5 pb-3">
        <span className="flex-shrink-0 font-mono text-xs font-semibold text-[#94A3B8] w-8">
          {toRoman(index + 1)}.
        </span>
        <h3 className="text-[#E2E8F0] font-medium text-sm flex-1 min-w-0 truncate">
          {section.name}
        </h3>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-sm border ${semantic.bg} ${semantic.border} ${semantic.text}`}>
          {section.awarded_points}/{section.max_points}
        </span>
      </div>

      {/* Bar row */}
      <div className="flex items-center gap-3 px-6 pb-5">
        <div className="flex-1 h-2 bg-[#000B14] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-[#0073C1]/0 group-hover:text-[#0073C1]/60 text-[10px] font-medium transition-colors duration-200 select-none">
          {!expanded ? "Click to expand" : ""}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`flex-shrink-0 text-[#0073C1] transition-transform duration-300 ease-in-out ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Deep Dive feedback block */}
      {expanded && (
        <div
          className="px-6 py-5 border-t border-[#1E293B]"
          style={{ backgroundColor: "#001E35", borderLeft: `2px solid ${barColor}` }}
        >
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-3">
            Deep Dive
          </p>
          <p className="text-slate-300 text-base leading-relaxed">
            {section.feedback}
          </p>
          {section.improvement && section.awarded_points < section.max_points && (
            <div className="mt-4 p-4 rounded-md bg-[#0073C1]/10 border border-[#0073C1]/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#60A5FA] uppercase tracking-widest">
                  How to improve
                </p>
                <CopyButton text={section.improvement} />
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {section.improvement}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PENALTY_BADGE: Record<PenaltyCheck["status"], { label: string; bg: string; border: string; text: string }> = {
  flagged: { label: "Action Required", bg: "bg-[#EF4444]/10", border: "border-[#EF4444]/40", text: "text-[#EF4444]" },
  manual_check: { label: "Verify Manually", bg: "bg-[#FBBF24]/10", border: "border-[#FBBF24]/40", text: "text-[#FBBF24]" },
  clear: { label: "Clear", bg: "bg-[#10B981]/10", border: "border-[#10B981]/40", text: "text-[#10B981]" },
};

function PenaltyCard({ penalty }: { penalty: PenaltyCheck }) {
  const badge = PENALTY_BADGE[penalty.status];
  return (
    <div className="bg-[#00162A] border border-[#1E293B] rounded-md p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[#E2E8F0] text-sm font-medium leading-snug">{penalty.description}</p>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-sm border ${badge.bg} ${badge.border} ${badge.text}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-[#94A3B8] text-xs mt-2 leading-relaxed">{penalty.note}</p>
      <p className="text-[#94A3B8]/50 text-xs mt-1">{penalty.penalty_points} pts at risk</p>
    </div>
  );
}

export default function ScoreBreakdown({ result }: { result: GradingResult }) {
  const [allExpanded, setAllExpanded] = useState(false);

  const overallPct = result.total_possible > 0
    ? (result.total_awarded / result.total_possible) * 100
    : 0;
  const overallColor = getSemanticColor(overallPct);
  const hasFlaggedPenalties = result.penalties?.some((p) => p.status === "flagged");

  return (
    <div className="w-full space-y-6">
      {/* Truncation warning banner */}
      {result.was_truncated && (
        <div className="flex items-center gap-3 bg-[#FBBF24]/10 border border-[#FBBF24]/40 rounded-md px-5 py-4">
          <span className="text-[#FBBF24] text-lg">⚠</span>
          <p className="text-[#FBBF24] text-sm font-medium">
            Your document was too long and was truncated to ~{result.truncated_at_tokens?.toLocaleString()} tokens.
            Grading reflects the first portion of your report only.
          </p>
        </div>
      )}

      {/* Penalty warning banner */}
      {hasFlaggedPenalties && (
        <div className="flex items-center gap-3 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-md px-5 py-4">
          <span className="text-[#EF4444] text-lg">⚠</span>
          <p className="text-[#EF4444] text-sm font-medium">
            Your report will likely receive penalty points. Review the checklist below before submitting.
          </p>
        </div>
      )}

      {/* Overall score hero card */}
      <div className="bg-[#00162A] border border-[#1E293B] rounded-md p-10 text-center">
        <div className="flex flex-col items-center gap-1 mb-6">
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest">
            Audit Complete
          </p>
          {result.event_name && (
            <p className="text-[#0073C1] text-xl font-bold">{result.event_name}</p>
          )}
        </div>
        <p className="text-8xl font-bold tracking-tighter text-[#E2E8F0] mb-2">
          {overallPct.toFixed(0)}%
        </p>
        <p className="text-[#94A3B8] text-sm mb-6">
          {result.total_awarded}/{result.total_possible} points
        </p>

        {/* Overall progress bar */}
        <div className="w-full h-2 bg-[#000B14] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${overallPct}%`, backgroundColor: overallColor }}
          />
        </div>
      </div>

      {/* Overall feedback */}
      {result.overall_feedback && (
        <div className="bg-[#00162A] border border-[#1E293B] rounded-md p-6">
          <h3 className="text-[#E2E8F0] font-semibold text-sm uppercase tracking-wide mb-3">
            Overall Feedback
          </h3>
          <div className="space-y-4">
            {result.overall_feedback.split("\n\n").map((para, i) => {
              const visualPrefix = "Visual Assessment: ";
              if (para.startsWith(visualPrefix)) {
                return (
                  <p key={i} className="text-slate-300 text-base leading-relaxed">
                    <span className="font-semibold text-[#E2E8F0]">Visual Assessment: </span>
                    {para.slice(visualPrefix.length)}
                  </p>
                );
              }
              return (
                <p key={i} className="text-slate-300 text-base leading-relaxed">
                  {para}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Section breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest">
            Section Breakdown
          </h2>
          <button
            onClick={() => setAllExpanded((prev) => !prev)}
            className="text-[#0073C1] text-xs font-medium hover:text-[#60A5FA] transition-colors duration-150"
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        </div>
        {result.sections.map((section, i) => (
          <SectionCard key={section.name} section={section} index={i} forceExpanded={allExpanded} />
        ))}
      </div>

      {/* Penalty checklist */}
      {result.penalties && result.penalties.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest">
              DECA Penalty Checklist
            </h2>
            <p className="text-[#94A3B8]/60 text-xs mt-1">
              Warnings only. These do not affect your score above. Fix flagged items before submitting.
            </p>
          </div>
          {result.penalties.map((penalty, i) => (
            <PenaltyCard key={i} penalty={penalty} />
          ))}
        </div>
      )}
    </div>
  );
}
