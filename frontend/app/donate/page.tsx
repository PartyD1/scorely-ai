"use client";

export default function DonatePage() {
  return (
    <main className="min-h-screen bg-[#000B14] text-[#E2E8F0]">
      <section className="flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 max-w-4xl mx-auto">
        <div className="text-5xl mb-6">☕</div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#E2E8F0] mb-4">
          Buy Me a Coffee
        </h1>
        <p className="text-[#94A3B8] text-lg max-w-xl mb-3 leading-relaxed">
          ScorelyAI is free to use. If it helped you prep for competition,
          consider buying me a coffee. It goes directly to cover server and API costs.
        </p>
        <p className="text-[#64748B] text-sm mb-10">
          Every contribution is genuinely appreciated. Thank you. 🙏
        </p>
        <a
          href="https://www.buymeacoffee.com/parthdoshi"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#FFDD00] text-[#000000] font-semibold text-base rounded-sm hover:bg-[#f0cf00] transition-all duration-300 ease-in-out"
        >
          ☕ Buy Me a Coffee
        </a>
      </section>
    </main>
  );
}
