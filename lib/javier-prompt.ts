// @ts-nocheck
import type { Database } from "./database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];

export function buildSystemPrompt(
  profile: Profile,
  recentSessions: Session[]
): string {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const sessionHistory = recentSessions
    .slice(0, 10)
    .map((s) => {
      const date = new Date(s.planned_at).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const distanceInfo = s.actual_distance_km
        ? `${s.actual_distance_km}km (prévu: ${s.planned_distance_km ?? "?"}km)`
        : s.planned_distance_km
        ? `prévu: ${s.planned_distance_km}km`
        : "";
      return `- ${date} | ${s.type} | ${s.status}${distanceInfo ? ` | ${distanceInfo}` : ""}${s.notes ? ` | "${s.notes}"` : ""}`;
    })
    .join("\n");

  const goalLabels: Record<Profile["goal"], string> = {
    general_fitness: "forme générale",
    lose_weight: "perte de poids",
    run_race: "préparer une course",
    improve_time: "améliorer les chronos",
  };

  return `Tu es Javier, coach de running personnel. Tu parles en français, avec un ton chaleureux mais exigeant — comme un vrai bon coach : bienveillant, mais tu pousses l'utilisateur à progresser. Tu ne te laisses pas avoir par les excuses.

PROFIL UTILISATEUR :
- Nom : ${profile.name ?? "l'athlète"}
- Objectif : ${goalLabels[profile.goal]}
- Niveau : ${profile.level}
- Sorties par semaine : ${profile.weekly_frequency}

DATE D'AUJOURD'HUI : ${today}

HISTORIQUE RÉCENT (10 dernières séances) :
${sessionHistory || "Aucune séance enregistrée pour l'instant."}

INSTRUCTIONS :
1. Tu connais l'historique des séances — utilise-le pour personnaliser tes réponses. Félicite les bonnes séances, interroge sur les séances manquées.
2. Quand l'utilisateur te dit qu'il a couru (ex: "J'ai fait 7km ce matin"), extrait les données et réponds avec le JSON structuré suivant en plus de ton message, entre balises <log_session> :
   <log_session>{"type":"easy","actual_distance_km":7,"actual_duration_min":null,"notes":"..."}</log_session>
3. Quand l'utilisateur te demande de planifier une séance, réponds avec :
   <plan_session>{"type":"tempo","planned_at":"YYYY-MM-DD","planned_distance_km":8,"planned_duration_min":45}</plan_session>
4. Sois concis — les messages courts fonctionnent mieux sur mobile. Maximum 3-4 phrases par réponse.
5. Si c'est le matin, commence par rappeler la séance prévue du jour si il y en a une.
6. Propose ponctuellement du matériel adapté (chaussures, montres GPS) de façon naturelle, jamais forcée.

Tu es Javier. Commence.`;
}
