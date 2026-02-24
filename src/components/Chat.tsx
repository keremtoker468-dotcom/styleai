"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleProfile,
  SavedOutfit,
  OutfitItem,
  getUserId,
  saveOutfit,
  saveStyleProfile,
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
  onProfileUpdate: (profile: StyleProfile) => void;
  onOpenSaved: () => void;
}

const STYLE_OPTIONS = [
  "Minimalist", "Streetwear", "Old Money", "Casual", "Bohemian", "Sporty",
  "Elegant", "Y2K", "Quiet Luxury", "Vintage", "Preppy", "Grunge",
];
const COLOR_OPTIONS = [
  "Siyah", "Beyaz", "Lacivert", "Bej", "Kahverengi", "Gri",
  "Kırmızı", "Yeşil", "Mavi", "Pembe", "Mor", "Turuncu",
];
const AVOIDED_OPTIONS = [
  "Neon renkler", "Oversize", "Slim fit", "Desenli", "Parlak kumaş",
  "Crop top", "Kısa etek", "Yüksek topuk", "Spor ayakkabı", "Takı/aksesuar",
];

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

      // Google Shopping link
      const googleMatch =
        line.match(
          /\[(?:Ara|Satın Al|Bul|Google)[^\]]*\]\((https:\/\/www\.google\.com\/search\?[^\s)]+)\)/i
        ) ||
        line.match(
          /(?:https:\/\/www\.google\.com\/search\?tbm=shop&q=[^\s)]+)/i
        );

      // Legacy store links (backward compatibility)
      const beymenMatch =
        line.match(
          /\[Beymen\]\((https:\/\/www\.beymen\.com\/search\?q=[^\s)]+)\)/i
        ) ||
        line.match(
          /(?:Beymen[:\s]*)?https:\/\/www\.beymen\.com\/search\?q=[^\s)]+/i
        );
      const zaraMatch =
        line.match(
          /\[Zara\]\((https:\/\/www\.zara\.com\/tr\/tr\/search\?searchTerm=[^\s)]+)\)/i
        ) ||
        line.match(
          /(?:Zara[:\s]*)?https:\/\/www\.zara\.com\/tr\/tr\/search\?searchTerm=[^\s)]+/i
        );
      const mangoMatch =
        line.match(
          /\[Mango\]\((https:\/\/shop\.mango\.com\/tr\/search\?q=[^\s)]+)\)/i
        ) ||
        line.match(
          /(?:Mango[:\s]*)?https:\/\/shop\.mango\.com\/tr\/search\?q=[^\s)]+/i
        );

      if (googleMatch)
        item.search_link = googleMatch[1] || googleMatch[0];
      if (beymenMatch)
        item.beymen_link =
          beymenMatch[1] || beymenMatch[0].replace(/^Beymen[:\s]*/i, "");
      if (zaraMatch)
        item.zara_link =
          zaraMatch[1] || zaraMatch[0].replace(/^Zara[:\s]*/i, "");
      if (mangoMatch)
        item.mango_link =
          mangoMatch[1] || mangoMatch[0].replace(/^Mango[:\s]*/i, "");

      if (item.search_link || item.beymen_link || item.zara_link || item.mango_link) {
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

export default function Chat({ onBack, profile, onProfileUpdate, onOpenSaved }: ChatProps) {
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    height: "", weight: "", age: "", size: "", shoe_size: "",
    style_preferences: [] as string[],
    color_preferences: [] as string[],
    avoided_styles: [] as string[],
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

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
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSaved}
            className="flex items-center text-muted-foreground hover:text-accent transition-colors"
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
          {/* Profile icon */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                profileOpen
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent"
              }`}
              title="Profil"
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
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl shadow-lg z-50 animate-fade-in overflow-hidden">
                <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Profil Bilgileri</p>
                  {!profileEditing && (
                    <button
                      onClick={() => {
                        setEditForm({
                          height: profile?.height || "",
                          weight: profile?.weight || "",
                          age: profile?.age || "",
                          size: profile?.size || "",
                          shoe_size: profile?.shoe_size || "",
                          style_preferences: profile?.style_preferences || [],
                          color_preferences: profile?.color_preferences || [],
                          avoided_styles: profile?.avoided_styles || [],
                        });
                        setProfileEditing(true);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-accent transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Düzenle
                    </button>
                  )}
                </div>

                {profileEditing ? (
                  <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Body info inputs */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "height" as const, label: "Boy", placeholder: "170 cm" },
                        { key: "weight" as const, label: "Kilo", placeholder: "65 kg" },
                        { key: "age" as const, label: "Yaş", placeholder: "25" },
                        { key: "size" as const, label: "Beden", placeholder: "M / 38" },
                      ].map((field) => (
                        <div key={field.key}>
                          <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1 block">{field.label}</label>
                          <input
                            type="text"
                            value={editForm[field.key]}
                            onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                            placeholder={field.placeholder}
                            className="w-full bg-transparent border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/30"
                          />
                        </div>
                      ))}
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1 block">Ayakkabı No</label>
                        <input
                          type="text"
                          value={editForm.shoe_size}
                          onChange={(e) => setEditForm({ ...editForm, shoe_size: e.target.value })}
                          placeholder="40"
                          className="w-full bg-transparent border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/30"
                        />
                      </div>
                    </div>

                    {/* Style chips */}
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">Stil Tercihleri</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STYLE_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setEditForm({
                              ...editForm,
                              style_preferences: editForm.style_preferences.includes(s)
                                ? editForm.style_preferences.filter((x) => x !== s)
                                : [...editForm.style_preferences, s],
                            })}
                            className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                              editForm.style_preferences.includes(s)
                                ? "bg-accent/10 text-accent border-accent/30"
                                : "bg-transparent text-muted-foreground/60 border-border hover:border-foreground/30"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color chips */}
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">Renk Tercihleri</p>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditForm({
                              ...editForm,
                              color_preferences: editForm.color_preferences.includes(c)
                                ? editForm.color_preferences.filter((x) => x !== c)
                                : [...editForm.color_preferences, c],
                            })}
                            className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                              editForm.color_preferences.includes(c)
                                ? "bg-accent/10 text-accent border-accent/30"
                                : "bg-transparent text-muted-foreground/60 border-border hover:border-foreground/30"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Avoided chips */}
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">Kaçınılanlar</p>
                      <div className="flex flex-wrap gap-1.5">
                        {AVOIDED_OPTIONS.map((a) => (
                          <button
                            key={a}
                            onClick={() => setEditForm({
                              ...editForm,
                              avoided_styles: editForm.avoided_styles.includes(a)
                                ? editForm.avoided_styles.filter((x) => x !== a)
                                : [...editForm.avoided_styles, a],
                            })}
                            className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                              editForm.avoided_styles.includes(a)
                                ? "bg-red-500/10 text-red-400/70 border-red-400/30"
                                : "bg-transparent text-muted-foreground/60 border-border hover:border-foreground/30"
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Save / Cancel buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setProfileEditing(false)}
                        className="flex-1 border border-border text-muted-foreground px-3 py-2 text-[11px] tracking-wide uppercase rounded-lg hover:border-foreground/40 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        onClick={async () => {
                          setProfileSaving(true);
                          const userId = getUserId();
                          const updated: StyleProfile = {
                            user_id: userId,
                            height: editForm.height || undefined,
                            weight: editForm.weight || undefined,
                            age: editForm.age || undefined,
                            size: editForm.size || undefined,
                            shoe_size: editForm.shoe_size || undefined,
                            style_preferences: editForm.style_preferences.length > 0 ? editForm.style_preferences : undefined,
                            color_preferences: editForm.color_preferences.length > 0 ? editForm.color_preferences : undefined,
                            avoided_styles: editForm.avoided_styles.length > 0 ? editForm.avoided_styles : undefined,
                          };
                          const saved = await saveStyleProfile(updated);
                          if (saved) {
                            onProfileUpdate(saved);
                          }
                          setProfileSaving(false);
                          setProfileEditing(false);
                        }}
                        disabled={profileSaving}
                        className="flex-1 bg-foreground text-background px-3 py-2 text-[11px] tracking-wide uppercase rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {profileSaving ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                    </div>
                  </div>
                ) : profile ? (
                  <div className="p-4 space-y-3">
                    {/* Body info */}
                    {(profile.height || profile.weight || profile.age || profile.size || profile.shoe_size) && (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.height && (
                          <span className="px-2 py-0.5 bg-foreground/5 text-foreground/70 rounded-full text-[11px] whitespace-nowrap">
                            {profile.height}
                          </span>
                        )}
                        {profile.weight && (
                          <span className="px-2 py-0.5 bg-foreground/5 text-foreground/70 rounded-full text-[11px] whitespace-nowrap">
                            {profile.weight}
                          </span>
                        )}
                        {profile.age && (
                          <span className="px-2 py-0.5 bg-foreground/5 text-foreground/70 rounded-full text-[11px] whitespace-nowrap">
                            {profile.age} yaş
                          </span>
                        )}
                        {profile.size && (
                          <span className="px-2 py-0.5 bg-foreground/5 text-foreground/70 rounded-full text-[11px] whitespace-nowrap">
                            Beden: {profile.size}
                          </span>
                        )}
                        {profile.shoe_size && (
                          <span className="px-2 py-0.5 bg-foreground/5 text-foreground/70 rounded-full text-[11px] whitespace-nowrap">
                            Ayakkabı: {profile.shoe_size}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Style preferences */}
                    {profile.style_preferences && profile.style_preferences.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">Stil</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.style_preferences.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-[11px] whitespace-nowrap"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Color preferences */}
                    {profile.color_preferences && profile.color_preferences.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">Renkler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.color_preferences.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 bg-foreground/5 text-foreground/60 rounded-full text-[11px] whitespace-nowrap"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Avoided styles */}
                    {profile.avoided_styles && profile.avoided_styles.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">Kaçınılanlar</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.avoided_styles.map((a) => (
                            <span
                              key={a}
                              className="px-2 py-0.5 bg-red-500/5 text-red-400/70 rounded-full text-[11px] whitespace-nowrap"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center space-y-3">
                    <p className="text-xs text-muted-foreground/60">
                      Henüz profil oluşturulmadı.
                    </p>
                    <button
                      onClick={() => {
                        setEditForm({
                          height: "", weight: "", age: "", size: "", shoe_size: "",
                          style_preferences: [], color_preferences: [], avoided_styles: [],
                        });
                        setProfileEditing(true);
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      Profil Oluştur
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="max-w-xl mx-auto py-6 space-y-8 flex flex-col">
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
