"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col min-h-dvh px-6 pt-20 pb-10" style={{ background: "var(--bg)" }}>
      {/* Logo */}
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black text-white mb-8"
        style={{ background: "var(--accent)", boxShadow: "0 8px 24px rgba(29,185,84,0.3)" }}
      >
        J
      </div>

      <h1 className="text-4xl font-black mb-2" style={{ color: "var(--fg)" }}>Coach Javier</h1>
      <p className="text-base mb-10 leading-relaxed" style={{ color: "var(--fg-muted)" }}>
        Ton coach running personnel.<br />Connecte-toi pour commencer.
      </p>

      <div className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl px-5 py-4 text-base outline-none"
          style={{
            background: "var(--surface)",
            color: "var(--fg)",
            border: "1.5px solid var(--border)",
          }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="w-full rounded-2xl px-5 py-4 text-base outline-none"
          style={{
            background: "var(--surface)",
            color: "var(--fg)",
            border: "1.5px solid var(--border)",
          }}
        />
      </div>

      {error && (
        <p className="text-sm mt-3 font-medium" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleLogin}
        disabled={!email.trim() || !password.trim() || loading}
        className="w-full py-4 rounded-2xl font-bold text-base mt-5 transition-all disabled:opacity-30"
        style={{
          background: "var(--accent)",
          color: "#fff",
          boxShadow: "0 4px 20px rgba(29,185,84,0.3)",
        }}
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </div>
  );
}
