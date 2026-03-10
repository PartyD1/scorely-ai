"use client";

import Link from "next/link";
import ScorelyLogo from "./ScorelyLogo";
import AuthButton from "./AuthButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1E3A5F]/50 bg-[#000B14]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
        {/* Left: Logo */}
        <div className="flex-1">
          <ScorelyLogo />
        </div>

        {/* Center: Nav links */}
        <nav className="flex items-center gap-1">
          <Link
            href="/feedback"
            className="px-3 py-1.5 text-sm text-[#64748B] hover:text-[#E2E8F0] transition-colors duration-200 rounded-md hover:bg-white/5"
          >
            Feedback
          </Link>
          <Link
            href="/donate"
            className="px-3 py-1.5 text-sm text-[#64748B] hover:text-[#E2E8F0] transition-colors duration-200 rounded-md hover:bg-white/5"
          >
            Support Us
          </Link>
        </nav>

        {/* Right: Auth */}
        <div className="flex-1 flex justify-end">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
