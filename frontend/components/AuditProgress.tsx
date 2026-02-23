"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { pct: 8,  label: "Reading through your report..." },
  { pct: 30, label: "Identifying key arguments and structure..." },
  { pct: 55, label: "Scoring each section against the rubric..." },
  { pct: 78, label: "Weighing your strengths and gaps..." },
  { pct: 93, label: "Almost there! writing up your results..." },
];

const STEP_DURATION = 4000;

export default function AuditProgress({ message, complete }: { message?: string; complete?: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, []);

  const { pct, label } = STEPS[step];
  const displayPct = complete ? 100 : pct;
  const transitionDuration = complete ? "600ms" : "3000ms";

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="w-full h-4 bg-[#1E293B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0073C1] ease-in-out"
          style={{ width: `${displayPct}%`, transition: `width ${transitionDuration}` }}
        />
      </div>

      {/* Description */}
      <p
        key={complete ? "complete" : step}
        className="text-[#94A3B8] text-lg text-center animate-pulse"
      >
        {complete ? "Done! Loading your results..." : (message ?? label)}
      </p>
    </div>
  );
}
