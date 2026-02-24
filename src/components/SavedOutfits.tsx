"use client";

import { useState, useEffect } from "react";
import { SavedOutfit, getUserId, getSavedOutfits, deleteOutfit } from "@/lib/supabase";

interface SavedOutfitsProps {
  onBack: () => void;
}

export default function SavedOutfits({ onBack }: SavedOutfitsProps) {
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOutfits = async () => {
      const userId = getUserId();
      const data = await getSavedOutfits(userId);
      setOutfits(data);
      setLoading(false);
    };
    fetchOutfits();
  }, []);

  const handleDelete = async (id: string) => {
    const success = await deleteOutfit(id);
    if (success) {
      setOutfits((prev) => prev.filter((o) => o.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <header className="glass-card flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/60 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm cursor-pointer"
          aria-label="Geri don"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="hidden sm:inline">Geri</span>
        </button>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Kayitli <span className="text-accent">Kombinler</span>
        </h1>
        <div className="w-16" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="max-w-xl mx-auto py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20" role="status">
              <span className="sr-only">Kombinler yukleniyor</span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse-subtle" />
                <span
                  className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse-subtle"
                  style={{ animationDelay: "0.3s" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse-subtle"
                  style={{ animationDelay: "0.6s" }}
                />
              </div>
            </div>
          ) : outfits.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              <p className="text-muted-foreground text-sm font-medium">
                Henuz kayitli kombinin yok.
              </p>
              <p className="text-muted-foreground/50 text-xs mt-1.5">
                Sohbette begendigin kombinleri kaydet!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {outfits.map((outfit, i) => (
                <div
                  key={outfit.id}
                  className="glass-card rounded-xl p-5 animate-slide-up hover:shadow-glass-lg transition-shadow duration-300"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-serif text-lg font-semibold">
                        {outfit.title}
                      </h3>
                      {outfit.occasion && (
                        <span className="text-xs text-accent tracking-wide font-medium">
                          {outfit.occasion}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => outfit.id && handleDelete(outfit.id)}
                      className="text-muted-foreground/30 hover:text-red-400 transition-colors duration-200 p-1.5 rounded-lg hover:bg-red-400/5 cursor-pointer"
                      aria-label={`${outfit.title} kombinini sil`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>

                  {outfit.description && (
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {outfit.description}
                    </p>
                  )}

                  {outfit.items && outfit.items.length > 0 && (
                    <div className="space-y-2">
                      {outfit.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm border-t border-border/30 pt-2.5"
                        >
                          <span className="text-foreground/80 font-medium">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            {item.beymen_link && (
                              <a
                                href={item.beymen_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:opacity-70 transition-opacity duration-200 font-medium"
                              >
                                Beymen
                              </a>
                            )}
                            {item.zara_link && (
                              <a
                                href={item.zara_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:opacity-70 transition-opacity duration-200 font-medium"
                              >
                                Zara
                              </a>
                            )}
                            {item.mango_link && (
                              <a
                                href={item.mango_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:opacity-70 transition-opacity duration-200 font-medium"
                              >
                                Mango
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-border/20 text-[10px] text-muted-foreground/35 tracking-wide">
                    {outfit.created_at &&
                      new Date(outfit.created_at).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
