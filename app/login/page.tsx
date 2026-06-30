// @ts-nocheck
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      setError("Une erreur est survenue. Réessaie.");
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
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
        Ton coach running personnel.<br />Inscris-toi ou connecte-toi.
      </p>

      {sent ? (
        <div style={{
          background: "#e8f8ee", borderRadius: 20, padding: "24px 20px",
          border: "1.5px solid #1db954",
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 6 }}>
            Vérifie ta boîte mail
          </p>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
            Un lien magique a été envoyé à <strong>{email}</strong>.<br />
            Clique dessus pour accéder à Coach Javier.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            style={{
              marginTop: 16, fontSize: 13, color: "#1db954", background: "none",
              border: "none", cursor: "pointer", fontWeight: 600, padding: 0,
              fontFamily: "inherit",
            }}
          >
            Utiliser un autre email →
          </button>
        </div>
      ) : (
        <>
          <input
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", borderRadius: 16, padding: "14px 18px",
              fontSize: 16, outline: "none", marginBottom: 12,
              background: "#f2f2f0", color: "#111",
              border: "1.5px solid #ebebeb", fontFamily: "inherit",
            }}
            autoFocus
          />

          {error && (
            <p style={{ fontSize: 14, color: "#ef4444", marginBottom: 12, fontWeight: 500 }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={!email.trim() || loading}
            style={{
              width: "100%", padding: "16px", borderRadius: 18,
              fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer",
              background: "#1db954", color: "#fff",
              boxShadow: "0 4px 20px rgba(29,185,84,0.3)",
              opacity: (!email.trim() || loading) ? 0.35 : 1,
              fontFamily: "inherit",
            }}
          >
            {loading ? "Envoi en cours..." : "Recevoir le lien magique ✨"}
          </button>

          <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
            Pas de mot de passe — on t'envoie un lien par email.<br />
            Première fois ? Ton compte est créé automatiquement.
          </p>
        </>
      )}
    </div>
  );
}
