"use client";

import { useState } from "react";
import Chat from "@/components/Chat";

export default function Home() {
  const [showChat, setShowChat] = useState(false);

  if (showChat) {
    return <Chat onBack={() => setShowChat(false)} />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Logo / Brand */}
      <div className="animate-fade-in text-center max-w-2xl">
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl tracking-tight mb-4">
          Style<span className="text-accent">AI</span>
        </h1>
        <div className="w-12 h-px bg-accent mx-auto mb-8" />
        <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed mb-4">
          Your personal styling assistant.
        </p>
        <p className="text-muted-foreground/70 text-sm sm:text-base leading-relaxed mb-14 max-w-md mx-auto">
          Tell us about your style, occasion, and preferences — we&apos;ll
          curate the perfect outfit for you.
        </p>

        <button
          onClick={() => setShowChat(true)}
          className="group relative inline-flex items-center gap-3 border border-foreground/20 text-foreground px-10 py-4 text-xs tracking-[0.2em] uppercase transition-all duration-500 hover:border-accent hover:text-accent hover:tracking-[0.25em]"
        >
          <span>Start Styling</span>
          <svg
            className="w-3.5 h-3.5 opacity-0 -ml-3 transition-all duration-500 group-hover:opacity-100 group-hover:ml-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>

        {/* Store names */}
        <div className="mt-20 flex items-center justify-center gap-6 text-muted-foreground/25 text-[10px] tracking-[0.3em] uppercase">
          <span>Beymen</span>
          <span className="text-border/50">&middot;</span>
          <span>Zara</span>
          <span className="text-border/50">&middot;</span>
          <span>Mango</span>
        </div>
      </div>
    </main>
  );
}
