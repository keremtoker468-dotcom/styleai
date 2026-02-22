"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  onBack: () => void;
}

const GREETING =
  "Welcome! I'm your personal styling assistant. Think of me as that friend who always knows exactly what to wear. Tell me — what's the occasion? A casual day out, something for work, or perhaps a special evening?";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
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
    // Auto-resize
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
                  <div className="bg-foreground text-background px-4 py-3 rounded-2xl rounded-br-sm">
                    <p className="text-sm sm:text-[15px] leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
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
          <div className="flex items-end gap-3 border border-border/60 rounded-xl px-4 py-3 bg-background/80 backdrop-blur-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Tell me about your style..."
              rows={1}
              className="flex-1 bg-transparent text-sm sm:text-[15px] resize-none outline-none placeholder:text-muted-foreground/40 max-h-[120px]"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
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
