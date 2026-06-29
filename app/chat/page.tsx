"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_REPLIES = [
  "J'ai couru ce matin 🏃",
  "Programme cette semaine ?",
  "Séance d'aujourd'hui ?",
  "Je veux progresser 💪",
];

function cleanContent(text: string): string {
  return text
    .replace(/<log_session>.*?<\/log_session>/gs, "")
    .replace(/<plan_session>.*?<\/plan_session>/gs, "")
    .trim();
}

function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: cleanContent(accumulated) } : m)
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: "Une erreur est survenue." } : m)
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg)" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "52px 20px 16px", background: "var(--bg)",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "var(--accent)", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18,
            boxShadow: "0 4px 12px rgba(29,185,84,0.3)", flexShrink: 0,
          }}>J</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--fg)" }}>Coach Javier</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: streaming ? "#f59e0b" : "var(--accent)"
              }} />
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                {streaming ? "En train d'écrire..." : "En ligne"}
              </span>
            </div>
          </div>
        </div>
        <Link href="/dashboard" style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: 14, fontWeight: 600, padding: "8px 14px",
          borderRadius: 12, background: "var(--surface)", color: "var(--fg)",
          textDecoration: "none",
        }}>
          Stats <span style={{ fontSize: 16 }}>›</span>
        </Link>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "24px 16px",
        background: "var(--bg-2)", display: "flex", flexDirection: "column", gap: 16,
      }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: "var(--accent)", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 24,
              boxShadow: "0 8px 24px rgba(29,185,84,0.25)", marginBottom: 16,
            }}>J</div>
            <p style={{ fontWeight: 700, fontSize: 17, color: "var(--fg)", marginBottom: 6 }}>Coach Javier</p>
            <p style={{ fontSize: 14, color: "var(--fg-muted)" }}>Dis bonjour ou utilise un raccourci</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end", gap: 8,
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 32, height: 32, borderRadius: 10, background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 900, fontSize: 13, flexShrink: 0,
              }}>J</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "12px 16px", fontSize: 15,
              lineHeight: 1.55, whiteSpace: "pre-wrap",
              background: msg.role === "user" ? "var(--accent)" : "var(--card)",
              color: msg.role === "user" ? "#fff" : "var(--fg)",
              borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
              boxShadow: msg.role === "assistant" ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
            }}>
              {msg.content
                ? msg.content.split("\n").map((line, i, arr) => (
                    <span key={i}>{renderText(line)}{i < arr.length - 1 && <br />}</span>
                  ))
                : <span style={{ color: "var(--fg-muted)" }}>▍</span>
              }
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {messages.length === 0 && (
        <div style={{
          display: "flex", gap: 8, padding: "8px 16px 4px",
          overflowX: "auto", background: "var(--bg-2)", flexShrink: 0,
        }}>
          {QUICK_REPLIES.map((qr) => (
            <button key={qr} onClick={() => sendMessage(qr)} style={{
              whiteSpace: "nowrap", fontSize: 13, fontWeight: 500,
              padding: "9px 14px", borderRadius: 20, flexShrink: 0,
              background: "var(--card)", border: "1.5px solid var(--border)",
              color: "var(--fg)", cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-end",
        padding: "12px 16px 24px", background: "var(--bg)",
        borderTop: "1px solid var(--border)", flexShrink: 0,
      }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "48px";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
          }}
          placeholder="Message Javier..."
          style={{
            flex: 1, resize: "none", borderRadius: 24, padding: "12px 18px",
            fontSize: 15, outline: "none", height: 48, maxHeight: 120,
            background: "var(--surface)", color: "var(--fg)",
            border: "1.5px solid var(--border)", lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          style={{
            width: 48, height: 48, borderRadius: 16, flexShrink: 0,
            background: "var(--accent)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(29,185,84,0.35)",
            opacity: !input.trim() || streaming ? 0.35 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
