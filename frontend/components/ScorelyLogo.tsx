"use client";

import Link from "next/link";
import Image from "next/image";

interface ScorelyLogoProps {
  asHomeButton?: boolean;
  className?: string;
  height?: number;
}

export default function ScorelyLogo({ asHomeButton = true, className = "", height = 56 }: ScorelyLogoProps) {
  // PNG is 4695×608 — maintain aspect ratio
  const width = Math.round(height * (4695 / 608));

  const logo = (
    <Image
      src="/scorely-logo.png"
      alt="ScorelyAI"
      width={width}
      height={height}
      priority
      className={className}
    />
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
