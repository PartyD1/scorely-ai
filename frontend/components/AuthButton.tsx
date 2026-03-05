"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (status === "loading") {
    return <div className="h-8 w-24 rounded-md bg-[#0F2235] animate-pulse" />;
  }

  if (session?.user) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full focus:outline-none"
          aria-label="Account menu"
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={32}
              height={32}
              className="rounded-full ring-2 ring-transparent hover:ring-[#0073C1] transition-all"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0073C1] flex items-center justify-center text-white text-xs font-semibold">
              {session.user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className={`text-[#64748B] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-[#060F1A] border border-[#1E3A5F] rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1E3A5F]">
              <p className="text-[#E2E8F0] text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-[#64748B] text-xs truncate">{session.user.email}</p>
            </div>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#0A1929] transition-colors"
            >
              <AccountIcon />
              My Account
            </Link>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#0A1929] transition-colors"
            >
              <SignOutIcon />
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0F2235] border border-[#1E3A5F] text-[#94A3B8] hover:text-[#E2E8F0] hover:border-[#0073C1] text-sm transition-all duration-200"
    >
      <GoogleIcon />
      Sign in
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <path d="M13 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M8 14l4-4-4-4M12 10H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
