"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { pct: 8,  label: "Reading through your report..." },
  { pct: 30, label: "Identifying key arguments and structure..." },
  { pct: 55, label: "Scoring each section against the rubric..." },
  { pct: 78, label: "Weighing your strengths and gaps..." },
  { pct: 93, label: "Almost there — writing up your results..." },
];

const STEP_DURATION = 4000;

export default function AuditProgress({ message }: { message?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, []);

  const { pct, label } = STEPS[step];

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Progress bar */}
      <div className="w-full h-3 bg-[#1E293B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0073C1] transition-all duration-[3000ms] ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Description */}
      <p
        key={step}
        className="text-[#94A3B8] text-base text-center"
      >
        {message ?? label}
      </p>
    </div>
  );
}
