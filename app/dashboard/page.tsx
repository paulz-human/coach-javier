// @ts-nocheck
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("planned_at", { ascending: false })
    .limit(20);

  const all = sessions ?? [];
  const completed = all.filter((s) => s.status === "completed");
  const totalKm = completed.reduce((sum, s) => sum + (s.actual_distance_km ?? 0), 0);
  const completionRate = all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0;
  const planned = all.filter((s) => s.status === "planned");

  const typeLabel: Record<string, string> = {
    easy: "Endurance",
    tempo: "Tempo",
    intervals: "Fractionné",
    long: "Longue sortie",
    recovery: "Récupération",
  };

  const typeEmoji: Record<string, string> = {
    easy: "🟢", tempo: "🟡", intervals: "🔴", long: "🔵", recovery: "🩵",
  };

  const stats = [
    { value: String(completed.length), label: "Séances faites", color: "var(--accent)" },
    { value: `${completionRate}%`, label: "Complétion", color: completionRate >= 70 ? "var(--accent)" : "#f59e0b" },
    { value: `${totalKm.toFixed(1)}`, label: "km courus", color: "#111" },
    { value: String(planned.length), label: "À venir", color: "#6366f1" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#f7f7f5" }}>

      {/* Header */}
      <div style={{
        padding: "52px 20px 20px", background: "#fff",
        borderBottom: "1px solid #ebebeb",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>Mes stats</h1>
          <p style={{ fontSize: 14, color: "#888", marginTop: 2 }}>Historique de tes séances</p>
        </div>
        <Link href="/chat" style={{
          fontSize: 14, fontWeight: 600, padding: "9px 16px",
          borderRadius: 12, background: "var(--accent)", color: "#fff",
          textDecoration: "none", boxShadow: "0 4px 12px rgba(29,185,84,0.3)",
        }}>
          ← Chat
        </Link>
      </div>

      <div style={{ padding: "20px 16px 60px" }}>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: "#fff", borderRadius: 20, padding: "18px 16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginTop: 6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Section title */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 4 }}>
          Historique
        </p>

        {/* Empty state */}
        {all.length === 0 && (
          <div style={{
            background: "#fff", borderRadius: 20, padding: "40px 20px",
            textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏃</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 6 }}>
              Aucune séance pour l&apos;instant
            </p>
            <p style={{ fontSize: 14, color: "#888" }}>
              Dis à Javier quand tu cours,<br />il enregistre tout.
            </p>
          </div>
        )}

        {/* Session list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {all.map((session) => {
            const date = new Date(session.planned_at).toLocaleDateString("fr-FR", {
              weekday: "short", day: "numeric", month: "short",
            });
            const km = session.actual_distance_km ?? session.planned_distance_km;
            const statusStyle =
              session.status === "completed"
                ? { background: "#e8f8ee", color: "var(--accent-dark)" }
                : session.status === "skipped"
                ? { background: "#fee2e2", color: "#ef4444" }
                : { background: "#f2f2f0", color: "#888" };

            return (
              <div key={session.id} style={{
                background: "#fff", borderRadius: 18, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 13, fontSize: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#f2f2f0", flexShrink: 0,
                }}>
                  {typeEmoji[session.type] ?? "🏃"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>
                    {typeLabel[session.type] ?? session.type}
                    {km ? ` · ${km} km` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{date}</div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: "5px 10px",
                  borderRadius: 10, flexShrink: 0, ...statusStyle,
                }}>
                  {session.status === "completed" ? "✓ Faite" : session.status === "skipped" ? "Manquée" : "Prévue"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
