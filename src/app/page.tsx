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
        <h1 className="font-serif text-5xl sm:text-6xl font-semibold tracking-tight mb-3">
          Style<span className="text-accent">AI</span>
        </h1>
        <div className="divider-accent w-16 mx-auto mb-8" />
        <p className="text-muted-foreground text-sm mb-8 tracking-wide">
          Bu site su anda ozel erisime aciktir.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="password-input" className="sr-only">
            Sifre
          </label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sifre"
            autoFocus
            className={`w-full bg-transparent border rounded-xl px-4 py-3.5 text-sm text-center outline-none transition-all duration-200 placeholder:text-muted-foreground/40 ${
              error
                ? "border-red-400 animate-shake"
                : "border-border focus:border-accent focus:shadow-accent-glow"
            }`}
          />
          <button
            type="submit"
            className="w-full border border-foreground/20 text-foreground px-6 py-3.5 text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-accent hover:text-accent hover:shadow-accent-glow rounded-xl cursor-pointer"
          >
            Giris
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
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div
        className="absolute top-1/4 -right-32 w-64 h-64 rounded-full opacity-[0.03] animate-float pointer-events-none"
        style={{ background: "var(--accent)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 -left-32 w-48 h-48 rounded-full opacity-[0.03] animate-float pointer-events-none"
        style={{
          background: "var(--accent)",
          animationDelay: "3s",
        }}
        aria-hidden="true"
      />

      {/* Logo / Brand */}
      <div className="text-center max-w-2xl relative">
        <div className="animate-fade-in">
          <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tight mb-4">
            Style<span className="text-accent">AI</span>
          </h1>
        </div>

        <div
          className="divider-accent w-16 mx-auto mb-10 animate-fade-in"
          style={{ animationDelay: "0.15s" }}
        />

        <p
          className="opacity-0 animate-slide-up text-muted-foreground text-lg sm:text-xl leading-relaxed mb-4 font-light"
          style={{ animationDelay: "0.2s" }}
        >
          Kisisel stil danismanin.
        </p>
        <p
          className="opacity-0 animate-slide-up text-muted-foreground/60 text-sm sm:text-base leading-relaxed mb-16 max-w-md mx-auto"
          style={{ animationDelay: "0.35s" }}
        >
          Stilini, durumu ve tercihlerini anlat — sana mukemmel kombini
          olusturalim.
        </p>

        <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: "0.5s" }}
        >
          <button
            onClick={handleStartStyling}
            className="group relative inline-flex items-center gap-3 border border-foreground/20 text-foreground px-12 py-4.5 text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-accent hover:text-accent hover:tracking-[0.25em] hover:shadow-accent-glow rounded-xl cursor-pointer"
          >
            <span className="font-medium">Baslayalim</span>
            <svg
              className="w-3.5 h-3.5 opacity-0 -ml-3 transition-all duration-300 group-hover:opacity-100 group-hover:ml-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>

        {/* Store names */}
        <div
          className="opacity-0 animate-fade-in mt-20 flex items-center justify-center gap-8 text-muted-foreground/20 text-[10px] tracking-[0.3em] uppercase font-medium"
          style={{ animationDelay: "0.7s" }}
        >
          <span>Beymen</span>
          <span className="w-1 h-1 rounded-full bg-border/50" />
          <span>Zara</span>
          <span className="w-1 h-1 rounded-full bg-border/50" />
          <span>Mango</span>
        </div>
      </div>
    </main>
  );
}
