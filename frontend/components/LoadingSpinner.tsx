"use client";

import { useEffect, useState } from "react";

const AUDIT_STEPS = [
  "Initializing Audit Engine...",
  "Parsing Document Structure...",
  "Analyzing Performance Indicators...",
  "Cross-Referencing Rubric Standards...",
  "Finalizing Quality Insights...",
];

const STEP_DURATION = 4000;

export default function LoadingSpinner({ message }: { message?: string }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < AUDIT_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-start gap-12 max-w-sm mx-auto">
      {message && (
        <p className="text-[#94A3B8] text-xs uppercase tracking-widest">{message}</p>
      )}

      <div className="flex flex-col gap-5 w-full">
        {AUDIT_STEPS.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          const isPending = index > activeStep;

          return (
            <div key={step} className="flex items-center gap-4">
              {/* Status indicator */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#10B981" strokeWidth="1.5" />
                    <path d="M5 8l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-[#0073C1] animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[#1E293B]" />
                )}
              </div>

              {/* Step label */}
              <span
                className={`text-sm transition-all duration-300 ease-in-out ${
                  isCompleted
                    ? "text-[#10B981]"
                    : isActive
                    ? "text-[#F8FAFC] font-medium"
                    : isPending
                    ? "text-[#94A3B8]/30"
                    : ""
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
