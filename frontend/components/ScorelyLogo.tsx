"use client";

import Link from "next/link";

interface ScorelyLogoProps {
  asHomeButton?: boolean;
  className?: string;
}

export default function ScorelyLogo({ asHomeButton = true, className = "" }: ScorelyLogoProps) {
  const logo = (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Data Apex icon — three ascending bars */}
      <svg
        width="44"
        height="44"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="8" y1="5" x2="12" y2="5" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5.5" y1="10" x2="14.5" y2="10" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3" y1="15" x2="17" y2="15" stroke="#0073C1" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* Wordmark */}
      <span className="font-semibold uppercase tracking-wider text-4xl leading-none">
        <span className="text-[#F8FAFC]">SCORELY</span>
        <span className="text-[#0073C1] font-bold">AI</span>
      </span>
    </div>
  );

  if (asHomeButton) {
    return (
      <Link href="/" className="inline-flex items-center hover:opacity-80 transition-opacity duration-200">
        {logo}
      </Link>
    );
  }

  return logo;
}
