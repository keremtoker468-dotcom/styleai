"use client";

import { useState, useEffect } from "react";
import Chat from "@/components/Chat";
import StyleProfileSetup from "@/components/StyleProfileSetup";
import SavedOutfits from "@/components/SavedOutfits";
import { StyleProfile, getUserId, getStyleProfile } from "@/lib/supabase";

const ACCESS_PASSWORD = process.env.NEXT_PUBLIC_ACCESS_PASSWORD || "";

type View = "landing" | "profile-setup" | "chat" | "saved";

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      localStorage.setItem("styleai_auth", "true");
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="animate-fade-in text-center max-w-sm w-full">
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight mb-3">
          Style<span className="text-accent">AI</span>
        </h1>
        <div className="w-12 h-px bg-accent mx-auto mb-8" />
        <p className="text-muted-foreground text-sm mb-8">
          Bu site şu anda özel erişime açıktır.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            autoFocus
            className={`w-full bg-transparent border rounded-lg px-4 py-3 text-sm text-center outline-none transition-colors placeholder:text-muted-foreground/40 ${
              error
                ? "border-red-400 animate-shake"
                : "border-border focus:border-accent"
            }`}
          />
          <button
            type="submit"
            className="w-full border border-foreground/20 text-foreground px-6 py-3 text-xs tracking-[0.2em] uppercase transition-all duration-500 hover:border-accent hover:text-accent rounded-lg"
          >
            Giriş
          </button>
        </form>
      </div>
    </main>
  );
}

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<View>("landing");
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    // If no password is set, skip the gate
    if (!ACCESS_PASSWORD) {
      setAuthed(true);
    } else {
      const saved = localStorage.getItem("styleai_auth");
      if (saved === "true") {
        setAuthed(true);
      }
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const checkProfile = async () => {
      const userId = getUserId();
      if (!userId) {
        setProfileChecked(true);
        return;
      }
      const existing = await getStyleProfile(userId);
      if (existing) {
        setProfile(existing);
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [authed]);

  const handleStartStyling = () => {
    if (profile || localStorage.getItem("styleai_profile_skipped")) {
      setView("chat");
    } else {
      setView("profile-setup");
    }
  };

  const handleProfileComplete = (savedProfile: StyleProfile | null) => {
    if (savedProfile) {
      setProfile(savedProfile);
    } else {
      localStorage.setItem("styleai_profile_skipped", "true");
    }
    setView("chat");
  };

  if (!authChecked) return null;

  if (!authed) {
    return <PasswordGate onUnlock={() => setAuthed(true)} />;
  }

  if (!profileChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-fade-in">
          <h1 className="font-serif text-3xl tracking-tight">
            Style<span className="text-accent">AI</span>
          </h1>
        </div>
      </main>
    );
  }

  if (view === "profile-setup") {
    return <StyleProfileSetup onComplete={handleProfileComplete} />;
  }

  if (view === "saved") {
    return <SavedOutfits onBack={() => setView("chat")} />;
  }

  if (view === "chat") {
    return (
      <Chat
        onBack={() => setView("landing")}
        profile={profile}
        onOpenSaved={() => setView("saved")}
      />
    );
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
          Kişisel stil danışmanın.
        </p>
        <p className="text-muted-foreground/70 text-sm sm:text-base leading-relaxed mb-14 max-w-md mx-auto">
          Stilini, durumu ve tercihlerini anlat — sana mükemmel kombini
          oluşturalım.
        </p>

        <button
          onClick={handleStartStyling}
          className="group relative inline-flex items-center gap-3 border border-foreground/20 text-foreground px-10 py-4 text-xs tracking-[0.2em] uppercase transition-all duration-500 hover:border-accent hover:text-accent hover:tracking-[0.25em]"
        >
          <span>Başlayalım</span>
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
