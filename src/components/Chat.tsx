"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface MessagePart {
  text?: string;
  image?: string;
  mimeType?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  parts?: MessagePart[];
  imagePreview?: string; // data URL for display only
}

interface ChatProps {
  onBack: () => void;
}

interface PendingImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
  fileName: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const GREETING =
  "Welcome! I'm your personal styling assistant. Think of me as that friend who always knows exactly what to wear. You can also share a photo — a selfie, an outfit you love, or something you'd like to find — and I'll work with that too. Tell me, what's the occasion?";

function formatMessage(text: string): string {
  // Bold: **text**
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  formatted = formatted.replace(
    /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
    "<em>$1</em>"
  );
  // Links: [text](url)
  formatted = formatted.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // Bare URLs
  formatted = formatted.replace(
    /(?<!")(https?:\/\/[^\s<)]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // Line breaks
  formatted = formatted.replace(/\n/g, "<br />");
  return formatted;
}

export default function Chat({ onBack }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Reset input so the same file can be re-selected
    e.target.value = "";

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extract base64 data without the data URL prefix
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

  const sendMessage = async () => {
    const trimmed = input.trim();
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
      parts.push({ text: "What do you think of this?" });
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
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
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
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, but I'm having a moment. Could you try again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
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
          <span className="hidden sm:inline">Back</span>
        </button>
        <h1 className="font-serif text-xl tracking-tight">
          Style<span className="text-accent">AI</span>
        </h1>
        <div className="w-16" />
      </header>

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

      {/* Input */}
      <div className="sticky bottom-0 px-4 sm:px-6 pb-6 pt-3">
        <div className="max-w-xl mx-auto">
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
              title="Share a photo"
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
              onKeyDown={handleKeyDown}
              placeholder={
                pendingImage
                  ? "Add a message or just send the photo..."
                  : "Tell me about your style..."
              }
              rows={1}
              className="flex-1 bg-transparent text-sm sm:text-[15px] resize-none outline-none placeholder:text-muted-foreground/40 max-h-[120px]"
            />

            <button
              onClick={sendMessage}
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
