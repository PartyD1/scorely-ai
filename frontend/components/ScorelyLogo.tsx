"use client";

import Link from "next/link";
import Image from "next/image";

interface ScorelyLogoProps {
  asHomeButton?: boolean;
  className?: string;
  height?: number;
}

export default function ScorelyLogo({ asHomeButton = true, className = "", height = 44 }: ScorelyLogoProps) {
  // PNG is 2346×303 — maintain aspect ratio
  const width = Math.round(height * (2346 / 303));

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
