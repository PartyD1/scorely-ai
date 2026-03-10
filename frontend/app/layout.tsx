import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

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
      <body suppressHydrationWarning className={`${GeistSans.variable} font-sans antialiased bg-[#000B14] min-h-screen text-[#E2E8F0]`}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            {children}
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
