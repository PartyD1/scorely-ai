import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScorelyAI: DECA Report Auditor",
  description: "AI-powered rubric grading for DECA reports. Upload your report and get instant section-level scoring and feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-[#000B14] min-h-screen text-[#E2E8F0]`}>
        {children}
      </body>
    </html>
  );
}
