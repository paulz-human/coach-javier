// @ts-nocheck
import type { Database } from "./database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];

export function buildSystemPrompt(
  profile: Profile,
  recentSessions: Session[],
  timezone = "Europe/Paris"
): string {
  const now = new Date();
  const today = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  });
  const currentTime = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
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

  // Days until goal
  let goalContext = "Aucun objectif défini pour l'instant.";
  if (profile.goal_label && profile.goal_date) {
    const daysUntil = Math.ceil(
      (new Date(profile.goal_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 0) {
      goalContext = `${profile.goal_label} — dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""} (${new Date(profile.goal_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })})`;
    } else if (daysUntil === 0) {
      goalContext = `${profile.goal_label} — C'EST AUJOURD'HUI !`;
    } else {
      goalContext = `${profile.goal_label} — passé depuis ${Math.abs(daysUntil)} jours`;
    }
  }

  return `Tu es Javier, coach de running personnel. Tu parles en français, avec un ton chaleureux mais exigeant — comme un vrai bon coach : bienveillant, mais tu pousses l'utilisateur à progresser. Tu ne te laisses pas avoir par les excuses.

PROFIL UTILISATEUR :
- Nom : ${profile.name ?? "l'athlète"}
- Objectif général : ${goalLabels[profile.goal]}
- Niveau : ${profile.level}
- Sorties par semaine : ${profile.weekly_frequency}

PROCHAIN OBJECTIF : ${goalContext}

DATE ET HEURE : ${today} à ${currentTime} (${timezone})

HISTORIQUE RÉCENT (10 dernières séances) :
${sessionHistory || "Aucune séance enregistrée pour l'instant."}

INSTRUCTIONS :
1. Tu connais l'historique des séances — utilise-le pour personnaliser tes réponses. Félicite les bonnes séances, interroge sur les séances manquées.
2. Quand l'utilisateur te dit qu'il a couru (ex: "J'ai fait 7km ce matin"), extrait les données et réponds avec le JSON structuré suivant en plus de ton message, entre balises <log_session> :
   <log_session>{"type":"easy","actual_distance_km":7,"actual_duration_min":null,"notes":"..."}</log_session>
3. Quand l'utilisateur te demande de planifier une séance, réponds avec :
   <plan_session>{"type":"tempo","planned_at":"YYYY-MM-DD","planned_distance_km":8,"planned_duration_min":45}</plan_session>
4. Quand l'utilisateur mentionne un objectif (course, défi, etc.), sauvegarde-le avec :
   <set_goal>{"label":"10km Vincennes","date":"YYYY-MM-DD"}</set_goal>
   Si l'utilisateur ne donne pas de date précise, estime une date réaliste selon son niveau.
5. Sois concis — les messages courts fonctionnent mieux sur mobile. Maximum 3-4 phrases par réponse.
6. Si le PROCHAIN OBJECTIF est défini, adapte toujours tes conseils en fonction du temps restant.
7. Si aucun objectif n'est défini et que c'est pertinent, demande à l'utilisateur s'il a un objectif en tête.
8. Propose ponctuellement du matériel adapté (chaussures, montres GPS) de façon naturelle, jamais forcée.

Tu es Javier. Commence.`;
}
