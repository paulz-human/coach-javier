// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  {
    id: "goal",
    question: "Quel est ton objectif ?",
    options: [
      { value: "general_fitness", label: "Forme générale", emoji: "💪" },
      { value: "lose_weight", label: "Perte de poids", emoji: "🔥" },
      { value: "run_race", label: "Préparer une course", emoji: "🏁" },
      { value: "improve_time", label: "Améliorer mes chronos", emoji: "⚡" },
    ],
  },
  {
    id: "weekly_frequency",
    question: "Combien de fois tu cours par semaine ?",
    options: [
      { value: "1", label: "1 fois / semaine", emoji: "😌" },
      { value: "2", label: "2 fois / semaine", emoji: "🙂" },
      { value: "3", label: "3 fois / semaine", emoji: "💪" },
      { value: "4", label: "4+ fois / semaine", emoji: "🔥" },
    ],
  },
  {
    id: "level",
    question: "Ton niveau de coureur ?",
    options: [
      { value: "beginner", label: "Débutant", emoji: "🌱" },
      { value: "intermediate", label: "Intermédiaire", emoji: "🏃" },
      { value: "advanced", label: "Confirmé", emoji: "🏆" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0); // 0 = name, 1-3 = questions
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const totalSteps = STEPS.length + 1;
  const progress = (step / totalSteps) * 100;
  const currentStep = STEPS[step - 1];

  async function handleAnswer(value: string) {
    const newAnswers = { ...answers, [currentStep.id]: value };
    setAnswers(newAnswers);
    if (step < STEPS.length) {
      setStep(step + 1);
    } else {
      await handleSubmit(newAnswers);
    }
  }

  async function handleSubmit(finalAnswers: Record<string, string>) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    await supabase.from("profiles").upsert({
      id: user.id,
      name: name.trim() || null,
      goal: finalAnswers.goal as never,
      weekly_frequency: parseInt(finalAnswers.weekly_frequency) as never,
      level: finalAnswers.level as never,
      onboarding_completed: true,
      subscription_status: "trial",
      trial_started_at: new Date().toISOString(),
    });
    router.push("/chat");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#fff" }}>

      {/* Progress bar */}
      <div style={{ padding: "52px 24px 0" }}>
        <div style={{ width: "100%", height: 4, borderRadius: 4, background: "#f0f0ee" }}>
          <div style={{
            height: 4, borderRadius: 4, background: "var(--accent)",
            width: `${progress}%`, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px 24px 0" }}>

        {step === 0 ? (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Bienvenue 👋
            </p>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--fg)", lineHeight: 1.2, marginBottom: 8 }}>
              Comment tu<br />t'appelles ?
            </h1>
            <p style={{ fontSize: 15, color: "var(--fg-muted)", marginBottom: 32, lineHeight: 1.5 }}>
              Javier apprend à te connaître<br />pour mieux te coacher.
            </p>
            <input
              type="text"
              placeholder="Ton prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(1)}
              autoFocus
              style={{
                width: "100%", borderRadius: 16, padding: "14px 18px",
                fontSize: 16, outline: "none", background: "#f2f2f0",
                color: "var(--fg)", border: "2px solid transparent",
                fontFamily: "inherit",
              }}
            />
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              {step} sur {STEPS.length}
            </p>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--fg)", lineHeight: 1.25, marginBottom: 32 }}>
              {currentStep.question}
            </h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {currentStep.options.map((opt) => {
                const selected = answers[currentStep.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    disabled={loading}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", borderRadius: 18, textAlign: "left",
                      cursor: "pointer", transition: "all 0.15s",
                      background: selected ? "var(--accent-light)" : "#f2f2f0",
                      border: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, fontSize: 22,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      background: selected ? "var(--accent)" : "#e8e8e5",
                    }}>
                      {opt.emoji}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)" }}>
                      {opt.label}
                    </span>
                    {selected && (
                      <div style={{
                        marginLeft: "auto", width: 22, height: 22, borderRadius: "50%",
                        background: "var(--accent)", display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4.5L3.8 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: "24px 24px 40px" }}>
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            disabled={!name.trim()}
            style={{
              width: "100%", padding: "16px", borderRadius: 18,
              fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer",
              background: "var(--accent)", color: "#fff",
              boxShadow: "0 4px 20px rgba(29,185,84,0.3)",
              opacity: name.trim() ? 1 : 0.3, transition: "opacity 0.2s",
              fontFamily: "inherit",
            }}
          >
            Continuer →
          </button>
        )}
        {loading && (
          <p style={{ textAlign: "center", fontSize: 14, color: "var(--fg-muted)" }}>
            Javier prépare ton programme...
          </p>
        )}
      </div>
    </div>
  );
}
