"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleProfile,
  SavedOutfit,
  OutfitItem,
  getUserId,
  saveOutfit,
  saveConversationMessage,
  getConversationHistory,
} from "@/lib/supabase";

interface MessagePart {
  text?: string;
  image?: string;
  mimeType?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  parts?: MessagePart[];
  imagePreview?: string;
}

interface ChatProps {
  onBack: () => void;
  profile: StyleProfile | null;
  onOpenSaved: () => void;
}

interface PendingImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
  fileName: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const GREETING =
  "Merhaba! Ben senin kişisel stil danışmanın. Beni her zaman ne giyeceğini bilen o arkadaşın gibi düşün. Bir selfie, beğendiğin bir kıyafet veya bulmak istediğin bir parçanın fotoğrafını da paylaşabilirsin. Söyle bakalım, nasıl bir tarz arıyorsun?";

const SUGGESTION_CHIPS = [
  "Ünlü tarzı",
  "Fotoğraf yükle",
  "Daha casual",
  "Renk öner",
  "Kombini tamamla",
];

function buildProfileContext(profile: StyleProfile): string {
  const parts: string[] = [];
  if (profile.height) parts.push(`Boy: ${profile.height}`);
  if (profile.weight) parts.push(`Kilo: ${profile.weight}`);
  if (profile.age) parts.push(`Yaş: ${profile.age}`);
  if (profile.size) parts.push(`Beden: ${profile.size}`);
  if (profile.shoe_size) parts.push(`Ayakkabı numarası: ${profile.shoe_size}`);
  if (profile.style_preferences?.length)
    parts.push(`Stil tercihleri: ${profile.style_preferences.join(", ")}`);
  if (profile.color_preferences?.length)
    parts.push(`Renk tercihleri: ${profile.color_preferences.join(", ")}`);
  if (profile.avoided_styles?.length)
    parts.push(`Kaçınılan stiller: ${profile.avoided_styles.join(", ")}`);
  return parts.join("\n");
}

function formatMessage(text: string): string {
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(
    /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
    "<em>$1</em>"
  );
  formatted = formatted.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  formatted = formatted.replace(
    /(?<!")(https?:\/\/[^\s<)]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  formatted = formatted.replace(
    /^---$/gm,
    '<hr class="my-4 border-border/40" />'
  );
  formatted = formatted.replace(/\n/g, "<br />");
  return formatted;
}

function parseOutfitsFromMessage(
  text: string
): { title: string; description: string; items: OutfitItem[] }[] {
  const outfits: {
    title: string;
    description: string;
    items: OutfitItem[];
  }[] = [];

  const sections = text.split(/(?=\*\*[\d\.\s]*[^*]+\*\*)/g);

  for (const section of sections) {
    const titleMatch = section.match(/\*\*([^*]+)\*\*/);
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/^\d+\.\s*/, "").trim();
    if (title.length < 3 || title.length > 100) continue;

    const items: OutfitItem[] = [];
    const lines = section.split("\n");
    for (const line of lines) {
      const itemNameMatch = line.match(
        /[-•]\s*(?:\*\*)?([^—\-*\[]+?)(?:\*\*)?\s*[—\-]/
      );
      if (!itemNameMatch) continue;

      const itemName = itemNameMatch[1].trim();
      if (itemName.length < 2) continue;

      const item: OutfitItem = { name: itemName };
      const beymenMatch =
        line.match(
          /(?:Beymen[:\s]*)?https:\/\/www\.beymen\.com\/search\?q=[^\s)]+/i
        ) ||
        line.match(
          /\[Beymen\]\((https:\/\/www\.beymen\.com\/search\?q=[^\s)]+)\)/i
        );
      const zaraMatch =
        line.match(
          /(?:Zara[:\s]*)?https:\/\/www\.zara\.com\/tr\/tr\/search\?searchTerm=[^\s)]+/i
        ) ||
        line.match(
          /\[Zara\]\((https:\/\/www\.zara\.com\/tr\/tr\/search\?searchTerm=[^\s)]+)\)/i
        );
      const mangoMatch =
        line.match(
          /(?:Mango[:\s]*)?https:\/\/shop\.mango\.com\/tr\/search\?q=[^\s)]+/i
        ) ||
        line.match(
          /\[Mango\]\((https:\/\/shop\.mango\.com\/tr\/search\?q=[^\s)]+)\)/i
        );

      if (beymenMatch)
        item.beymen_link =
          beymenMatch[1] || beymenMatch[0].replace(/^Beymen[:\s]*/i, "");
      if (zaraMatch)
        item.zara_link =
          zaraMatch[1] || zaraMatch[0].replace(/^Zara[:\s]*/i, "");
      if (mangoMatch)
        item.mango_link =
          mangoMatch[1] || mangoMatch[0].replace(/^Mango[:\s]*/i, "");

      if (item.beymen_link || item.zara_link || item.mango_link) {
        items.push(item);
      }
    }

    if (items.length > 0) {
      const titleIdx = lines.findIndex((l) => l.includes(titleMatch[0]));
      const firstItemIdx = lines.findIndex((l) =>
        l.match(/[-•]\s*(?:\*\*)?[^—\-*\[]+?(?:\*\*)?\s*[—\-]/)
      );
      const descLines = lines
        .slice(
          titleIdx + 1,
          firstItemIdx > titleIdx ? firstItemIdx : titleIdx + 3
        )
        .filter(
          (l) =>
            l.trim() && !l.startsWith("---") && !l.startsWith("Parça")
        );
      const description = descLines
        .join(" ")
        .replace(/\*\*/g, "")
        .trim();

      outfits.push({ title, description, items });
    }
  }

  return outfits;
}

export default function Chat({ onBack, profile, onOpenSaved }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [savingOutfitIdx, setSavingOutfitIdx] = useState<string | null>(null);
  const [savedOutfitIds, setSavedOutfitIds] = useState<Set<string>>(
    new Set()
  );
  const [completeTheLookMode, setCompleteTheLookMode] = useState<{
    outfitTitle: string;
    items: OutfitItem[];
  } | null>(null);
  const [conversationHistory, setConversationHistory] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileContext = profile ? buildProfileContext(profile) : "";

  // Load past conversation history from Supabase on mount
  useEffect(() => {
    const loadHistory = async () => {
      const userId = getUserId();
      if (!userId) return;
      const history = await getConversationHistory(userId, 20);
      if (history.length > 0) {
        const formatted = history
          .map(
            (msg) =>
              `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
          )
          .join("\n");
        setConversationHistory(formatted);
      }
    };
    loadHistory();
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!ACCEPTED_TYPES.includes(file.type)) return;
    if (file.size > MAX_FILE_SIZE) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setPendingImage({
        base64,
        mimeType: file.type,
        previewUrl: dataUrl,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const removePendingImage = () => {
    setPendingImage(null);
  };

  const sendMessage = async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if ((!trimmed && !pendingImage) || isLoading) return;

    const parts: MessagePart[] = [];
    let imagePreview: string | undefined;

    if (pendingImage) {
      parts.push({
        image: pendingImage.base64,
        mimeType: pendingImage.mimeType,
      });
      imagePreview = pendingImage.previewUrl;
    }

    if (trimmed) {
      parts.push({ text: trimmed });
    } else if (pendingImage) {
      parts.push({ text: "Bu hakkında ne düşünüyorsun?" });
    }

    const displayContent = trimmed || "";
    const userMessage: Message = {
      role: "user",
      content: displayContent,
      parts,
      imagePreview,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setPendingImage(null);
    setCompleteTheLookMode(null);
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Save user message to Supabase
    const userId = getUserId();
    if (userId) {
      saveConversationMessage({
        user_id: userId,
        role: "user",
        content: displayContent || "Bu hakkında ne düşünüyorsun?",
      });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            parts: m.parts,
          })),
          profileContext: profileContext || undefined,
          conversationHistory: conversationHistory || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      // Save assistant message to Supabase
      if (userId) {
        saveConversationMessage({
          user_id: userId,
          role: "assistant",
          content: data.message,
        });
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      console.error("Chat error:", errMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Bir sorun oluştu, tekrar deneyebilir misin?${errMsg ? ` (${errMsg})` : ""}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  const handleChipClick = (chip: string) => {
    if (chip === "Fotoğraf yükle") {
      fileInputRef.current?.click();
      return;
    }
    if (chip === "Kombini tamamla") {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          const outfits = parseOutfitsFromMessage(messages[i].content);
          if (outfits.length > 0) {
            setCompleteTheLookMode({
              outfitTitle: outfits[0].title,
              items: outfits[0].items,
            });
            setInput("");
            inputRef.current?.focus();
            return;
          }
        }
      }
      sendMessage(
        "Kombini tamamlamak istiyorum, elimdeki parçalarla yeni öneriler sun"
      );
      return;
    }
    sendMessage(chip);
  };

  const handleSaveOutfit = async (
    outfit: { title: string; description: string; items: OutfitItem[] },
    msgIdx: number
  ) => {
    const key = `${msgIdx}-${outfit.title}`;
    if (savedOutfitIds.has(key)) return;
    setSavingOutfitIdx(key);

    const userId = getUserId();
    const outfitData: SavedOutfit = {
      user_id: userId,
      title: outfit.title,
      description: outfit.description,
      items: outfit.items,
    };

    const saved = await saveOutfit(outfitData);
    if (saved) {
      setSavedOutfitIds((prev) => {
        const next = new Set(Array.from(prev));
        next.add(key);
        return next;
      });
    }
    setSavingOutfitIdx(null);
  };

  const handleCompleteTheLook = (outfit: {
    title: string;
    items: OutfitItem[];
  }) => {
    setCompleteTheLookMode({
      outfitTitle: outfit.title,
      items: outfit.items,
    });
    setInput("");
    inputRef.current?.focus();
  };

  const sendCompleteTheLook = () => {
    if (!completeTheLookMode || !input.trim()) return;
    const text = `"${completeTheLookMode.outfitTitle}" kombinini tamamlamak istiyorum. Elimde şu parça var: ${input.trim()}. Bu parçaya uygun tamamlayıcı parçalar öner ve alışveriş linkleri ver.`;
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="hidden sm:inline">Geri</span>
        </button>
        <h1 className="font-serif text-xl tracking-tight">
          Style<span className="text-accent">AI</span>
        </h1>
        <button
          onClick={onOpenSaved}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors"
          title="Kayıtlı Kombinler"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      </header>

      {/* Profile banner */}
      {profile &&
        (profile.style_preferences?.length ||
          profile.color_preferences?.length) && (
          <div className="px-4 sm:px-6 py-2.5 border-b border-border/50 bg-muted/30">
            <div className="max-w-xl mx-auto flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              {profile.style_preferences?.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-accent/10 text-accent rounded-full whitespace-nowrap"
                >
                  {s}
                </span>
              ))}
              {profile.color_preferences?.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 bg-foreground/5 text-foreground/60 rounded-full whitespace-nowrap"
                >
                  {c}
                </span>
              ))}
              {profile.size && (
                <span className="px-2 py-0.5 bg-foreground/5 text-foreground/60 rounded-full whitespace-nowrap">
                  {profile.size}
                </span>
              )}
            </div>
          </div>
        )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="max-w-xl mx-auto py-8 space-y-8 flex flex-col min-h-full justify-center">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`animate-slide-up ${
                msg.role === "user" ? "flex justify-end" : ""
              }`}
            >
              {msg.role === "assistant" ? (
                <div>
                  <p
                    className="chat-message text-sm sm:text-[15px] leading-[1.8] text-foreground/85"
                    dangerouslySetInnerHTML={{
                      __html: formatMessage(msg.content),
                    }}
                  />
                  {/* Outfit action buttons */}
                  {(() => {
                    const outfits = parseOutfitsFromMessage(msg.content);
                    if (outfits.length === 0) return null;
                    return (
                      <div className="mt-4 space-y-3">
                        {outfits.map((outfit, oi) => {
                          const key = `${i}-${outfit.title}`;
                          const isSaved = savedOutfitIds.has(key);
                          const isSaving = savingOutfitIdx === key;
                          return (
                            <div
                              key={oi}
                              className="flex items-center gap-2 flex-wrap"
                            >
                              <button
                                onClick={() =>
                                  handleSaveOutfit(outfit, i)
                                }
                                disabled={isSaving || isSaved}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border ${
                                  isSaved
                                    ? "border-accent/30 text-accent bg-accent/5"
                                    : "border-border hover:border-accent text-muted-foreground hover:text-accent"
                                } disabled:opacity-60`}
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill={isSaved ? "currentColor" : "none"}
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                  />
                                </svg>
                                {isSaving
                                  ? "Kaydediliyor..."
                                  : isSaved
                                  ? "Kaydedildi"
                                  : "Kombini Kaydet"}
                              </button>
                              <button
                                onClick={() =>
                                  handleCompleteTheLook(outfit)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border border-border hover:border-accent text-muted-foreground hover:text-accent"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m7.5-7.5h-15"
                                  />
                                </svg>
                                Kombini Tamamla
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="max-w-[85%] sm:max-w-[75%]">
                  {msg.imagePreview && (
                    <div className="mb-2 rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.imagePreview}
                        alt="Shared"
                        className="max-h-48 w-auto rounded-xl object-cover"
                      />
                    </div>
                  )}
                  {msg.content && (
                    <div className="bg-foreground text-background px-4 py-3 rounded-2xl rounded-br-sm">
                      <p className="text-sm sm:text-[15px] leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full animate-pulse-subtle" />
                <span
                  className="w-1 h-1 bg-muted-foreground/30 rounded-full animate-pulse-subtle"
                  style={{ animationDelay: "0.3s" }}
                />
                <span
                  className="w-1 h-1 bg-muted-foreground/30 rounded-full animate-pulse-subtle"
                  style={{ animationDelay: "0.6s" }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick suggestion chips */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 sm:px-6 pb-2">
          <div className="max-w-xl mx-auto flex gap-2 overflow-x-auto pb-1">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-border text-muted-foreground hover:border-accent hover:text-accent transition-all whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 px-4 sm:px-6 pb-6 pt-3">
        <div className="max-w-xl mx-auto">
          {/* Complete the look banner */}
          {completeTheLookMode && (
            <div className="mb-3 p-3 bg-accent/5 border border-accent/20 rounded-xl animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-accent font-medium">
                  Kombini Tamamla: {completeTheLookMode.outfitTitle}
                </span>
                <button
                  onClick={() => setCompleteTheLookMode(null)}
                  className="text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Elindeki parçayı yaz (ör. &quot;siyah blazer var&quot;) ve
                tamamlayıcı öneriler al
              </p>
            </div>
          )}

          {/* Image preview */}
          {pendingImage && (
            <div className="mb-3 flex items-start gap-2 animate-fade-in">
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImage.previewUrl}
                  alt={pendingImage.fileName}
                  className="h-16 w-16 object-cover rounded-lg border border-border/60"
                />
                <button
                  onClick={removePendingImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3 border border-border/60 rounded-xl px-4 py-3 bg-background/80 backdrop-blur-sm">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-muted-foreground/50 hover:text-accent transition-colors disabled:opacity-20"
              title="Fotoğraf paylaş"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zm16.5-13.5h.008v.008h-.008V7.5zm0 0a1.125 1.125 0 10-2.25 0 1.125 1.125 0 002.25 0z"
                />
              </svg>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (completeTheLookMode) {
                    sendCompleteTheLook();
                  } else {
                    sendMessage();
                  }
                }
              }}
              placeholder={
                completeTheLookMode
                  ? "Elindeki parçayı yaz... (ör. siyah blazer)"
                  : pendingImage
                  ? "Mesaj ekle veya fotoğrafı gönder..."
                  : "Stilinden bahset..."
              }
              rows={1}
              className="flex-1 bg-transparent text-sm sm:text-[15px] resize-none outline-none placeholder:text-muted-foreground/40 max-h-[120px]"
            />

            <button
              onClick={
                completeTheLookMode
                  ? sendCompleteTheLook
                  : () => sendMessage()
              }
              disabled={(!input.trim() && !pendingImage) || isLoading}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground disabled:opacity-20 transition-all hover:text-accent"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
