"use client";

import Link from "next/link";

interface ScorelyLogoProps {
  asHomeButton?: boolean;
  className?: string;
}

export default function ScorelyLogo({ asHomeButton = true, className = "" }: ScorelyLogoProps) {
  const logo = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Diamond SVG icon */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points="11,1 21,11 11,21 1,11"
          stroke="#0073C1"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>

      {/* Wordmark */}
      <span className="font-semibold uppercase tracking-wider text-base leading-none">
        <span className="text-[#F8FAFC]">SCORELY</span>
        <span className="text-[#0073C1]">AI</span>
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
