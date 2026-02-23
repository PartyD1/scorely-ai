"use client";

import { useState } from "react";
import { GradingResult, PenaltyCheck, SectionScore } from "@/types/grading";

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

function SectionCard({ section }: { section: SectionScore }) {
  const [expanded, setExpanded] = useState(false);
  const pct = section.max_points > 0
    ? (section.awarded_points / section.max_points) * 100
    : 0;
  const color = getSemanticColor(pct);
  const semantic = getSemanticBg(pct);

  return (
    <div
      className="bg-[#00162A] border border-[#1E293B] rounded-md cursor-pointer hover:border-[#0073C1]/40 transition-all duration-300 ease-in-out overflow-hidden"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Row header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Expand chevron */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`flex-shrink-0 transition-transform duration-300 ease-in-out ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M5 3l4 4-4 4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-[#E2E8F0] font-medium text-sm truncate">{section.name}</h3>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-sm border ml-4 ${semantic.bg} ${semantic.border} ${semantic.text}`}>
          {section.awarded_points}/{section.max_points}
        </span>
      </div>

      {/* Progress bar — full width, flush */}
      <div className="w-full h-[3px] bg-[#000B14]">
        <div
          className="h-full transition-all duration-500 ease-in-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Deep Dive feedback block */}
      {expanded && (
        <div
          className="px-6 py-5 border-t border-[#1E293B]"
          style={{ backgroundColor: "#001E35", borderLeft: `2px solid ${color}` }}
        >
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-3">
            Deep Dive
          </p>
          <p className="text-slate-300 text-base leading-relaxed">
            {section.feedback}
          </p>
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
  const overallPct = result.total_possible > 0
    ? (result.total_awarded / result.total_possible) * 100
    : 0;
  const overallColor = getSemanticColor(overallPct);
  const hasFlaggedPenalties = result.penalties?.some((p) => p.status === "flagged");

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
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
        <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-6">
          Audit Complete
        </p>
        <p className="text-8xl font-bold tracking-tighter text-[#E2E8F0] mb-2">
          {overallPct.toFixed(0)}%
        </p>
        <p className="text-[#94A3B8] text-sm mb-6">
          {result.total_awarded}/{result.total_possible} points
        </p>

        {/* Overall progress bar */}
        <div className="w-full h-[4px] bg-[#000B14] rounded-sm overflow-hidden">
          <div
            className="h-full transition-all duration-700 ease-in-out"
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
          <p className="text-slate-300 text-base leading-relaxed">
            {result.overall_feedback}
          </p>
        </div>
      )}

      {/* Section breakdown */}
      <div className="space-y-2">
        <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest pb-2">
          Section Breakdown
        </h2>
        {result.sections.map((section) => (
          <SectionCard key={section.name} section={section} />
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
