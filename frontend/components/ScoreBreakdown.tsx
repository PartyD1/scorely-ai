"use client";

import { useState } from "react";
import { GradingResult, PenaltyCheck, SectionScore } from "@/types/grading";

function getScoreColor(pct: number): string {
  if (pct >= 80) return "from-green-500 to-emerald-500";
  if (pct >= 60) return "from-amber-500 to-yellow-500";
  return "from-red-500 to-rose-500";
}

function getScoreBg(pct: number): string {
  if (pct >= 80) return "bg-green-500/10 border-green-500/30";
  if (pct >= 60) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function SectionCard({ section }: { section: SectionScore }) {
  const [expanded, setExpanded] = useState(false);
  const pct = section.max_points > 0
    ? (section.awarded_points / section.max_points) * 100
    : 0;

  return (
    <div
      className="bg-[#120020] border border-purple-500/20 rounded-xl p-5 cursor-pointer hover:border-purple-500/40 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium">{section.name}</h3>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${getScoreBg(pct)}`}>
          {section.awarded_points}/{section.max_points}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-purple-900/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getScoreColor(pct)} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {expanded && (
        <p className="mt-4 text-purple-200/70 text-sm leading-relaxed">
          {section.feedback}
        </p>
      )}

      <p className="text-purple-400/50 text-xs mt-2">
        {expanded ? "Click to collapse" : "Click to expand feedback"}
      </p>
    </div>
  );
}

const PENALTY_BADGE: Record<PenaltyCheck["status"], { label: string; classes: string }> = {
  flagged: { label: "Action Required", classes: "bg-red-500/10 border-red-500/40 text-red-400" },
  manual_check: { label: "Verify Manually", classes: "bg-amber-500/10 border-amber-500/40 text-amber-400" },
  clear: { label: "Clear", classes: "bg-green-500/10 border-green-500/40 text-green-400" },
};

function PenaltyCard({ penalty }: { penalty: PenaltyCheck }) {
  const badge = PENALTY_BADGE[penalty.status];
  return (
    <div className="bg-[#120020] border border-purple-500/20 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-white text-sm font-medium leading-snug">{penalty.description}</p>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.classes}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-purple-200/60 text-xs mt-2 leading-relaxed">{penalty.note}</p>
      <p className="text-purple-400/40 text-xs mt-1">{penalty.penalty_points} pts at risk</p>
    </div>
  );
}

export default function ScoreBreakdown({ result }: { result: GradingResult }) {
  const overallPct = result.total_possible > 0
    ? (result.total_awarded / result.total_possible) * 100
    : 0;

  const hasFlaggedPenalties = result.penalties?.some((p) => p.status === "flagged");

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Penalty warning banner */}
      {hasFlaggedPenalties && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/40 rounded-xl px-5 py-4">
          <span className="text-red-400 text-lg">⚠</span>
          <p className="text-red-400 text-sm font-medium">
            Your report will likely receive penalty points. Review the checklist below before submitting.
          </p>
        </div>
      )}

      {/* Overall score card */}
      <div className="bg-[#1a0030] border border-purple-500/30 rounded-2xl p-8 text-center shadow-lg shadow-purple-600/10">
        <p className="text-purple-300/60 text-sm uppercase tracking-widest mb-2">
          Overall Score
        </p>
        <p className="text-6xl font-bold text-white mb-1">
          {result.total_awarded}
          <span className="text-2xl text-purple-400/60">/{result.total_possible}</span>
        </p>
        <p className="text-purple-300/50 text-sm">{overallPct.toFixed(0)}%</p>

        {/* Overall progress bar */}
        <div className="w-full h-3 bg-purple-900/30 rounded-full overflow-hidden mt-4">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getScoreColor(overallPct)} transition-all duration-700`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Focus Here First — primary improvement */}
      {result.primary_improvement && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5">
          <h3 className="text-amber-400 font-semibold text-sm uppercase tracking-widest mb-2">
            Focus Here First
          </h3>
          <p className="text-amber-100/80 text-sm leading-relaxed">
            {result.primary_improvement}
          </p>
        </div>
      )}

      {/* Overall feedback */}
      {result.overall_feedback && (
        <div className="bg-[#120020] border border-purple-500/20 rounded-xl p-5">
          <h3 className="text-white font-medium mb-2">Overall Feedback</h3>
          <p className="text-purple-200/70 text-sm leading-relaxed">
            {result.overall_feedback}
          </p>
        </div>
      )}

      {/* Section breakdown */}
      <div className="space-y-3">
        <h2 className="text-white text-lg font-semibold">Section Breakdown</h2>
        {result.sections.map((section) => (
          <SectionCard key={section.name} section={section} />
        ))}
      </div>

      {/* Penalty checklist */}
      {result.penalties && result.penalties.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-white text-lg font-semibold">DECA Penalty Checklist</h2>
            <p className="text-purple-300/50 text-xs mt-0.5">
              These are warnings only — they do not affect your score above. Fix any flagged items before submitting.
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
