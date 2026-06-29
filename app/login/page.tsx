// @ts-nocheck
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#fff", padding: "0 24px" }}>

      {/* Logo */}
      <div style={{ paddingTop: 72, marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: "#1db954", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 28,
          boxShadow: "0 8px 24px rgba(29,185,84,0.3)",
        }}>J</div>
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 900, color: "#111", marginBottom: 8, lineHeight: 1.1 }}>
        Coach Javier
      </h1>
      <p style={{ fontSize: 16, color: "#888", marginBottom: 40, lineHeight: 1.6 }}>
        Ton coach running personnel.<br />Connecte-toi pour commencer.
      </p>

      <input
        type="email"
        placeholder="ton@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%", borderRadius: 16, padding: "14px 18px",
          fontSize: 16, outline: "none", marginBottom: 12,
          background: "#f2f2f0", color: "#111",
          border: "1.5px solid #ebebeb", fontFamily: "inherit",
        }}
        autoFocus
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        style={{
          width: "100%", borderRadius: 16, padding: "14px 18px",
          fontSize: 16, outline: "none", marginBottom: 8,
          background: "#f2f2f0", color: "#111",
          border: "1.5px solid #ebebeb", fontFamily: "inherit",
        }}
      />

      {error && (
        <p style={{ fontSize: 14, color: "#ef4444", marginBottom: 12, fontWeight: 500 }}>
          {error}
        </p>
      )}

      <button
        onClick={handleLogin}
        disabled={!email.trim() || !password.trim() || loading}
        style={{
          width: "100%", padding: "16px", borderRadius: 18,
          fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer",
          background: "#1db954", color: "#fff", marginTop: 8,
          boxShadow: "0 4px 20px rgba(29,185,84,0.3)",
          opacity: (!email.trim() || !password.trim() || loading) ? 0.35 : 1,
          fontFamily: "inherit",
        }}
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </div>
  );
}
