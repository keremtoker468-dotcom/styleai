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
          Your personal styling assistant, powered by AI.
        </p>
        <p className="text-muted-foreground/70 text-sm sm:text-base leading-relaxed mb-12 max-w-md mx-auto">
          Tell us about your style, occasion, and preferences — we&apos;ll
          curate the perfect outfit for you with links to shop instantly.
        </p>

        <button
          onClick={() => setShowChat(true)}
          className="group relative inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-sm tracking-widest uppercase transition-all duration-300 hover:bg-accent hover:text-accent-foreground"
        >
          <span>Start Styling</span>
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>

        {/* Store logos */}
        <div className="mt-16 flex items-center justify-center gap-8 text-muted-foreground/40 text-xs tracking-widest uppercase">
          <span>Beymen</span>
          <span className="w-px h-3 bg-border" />
          <span>Zara</span>
          <span className="w-px h-3 bg-border" />
          <span>Mango</span>
        </div>
      </div>
    </main>
  );
}
