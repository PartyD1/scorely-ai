import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#1E3A5F] px-8 py-6 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[#3F5068] text-xs">
          © {new Date().getFullYear()} ScorelyAI. All rights reserved.
        </p>
        <nav className="flex items-center gap-6">
          <Link href="/feedback" className="text-[#64748B] hover:text-[#94A3B8] text-xs transition-colors">
            Feedback
          </Link>
        </nav>
      </div>
    </footer>
  );
}
