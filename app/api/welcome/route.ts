// @ts-nocheck
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/javier-prompt";

const anthropic = new Anthropic();

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const [profileResult, sessionsResult, messagesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("sessions").select("*").eq("user_id", user.id).order("planned_at", { ascending: false }).limit(10),
    supabase.from("messages").select("id").eq("user_id", user.id).limit(1),
  ]);

  const profile = profileResult.data;
  if (!profile) return new Response("Profile not found", { status: 404 });

  const isFirstSession = !messagesResult.data || messagesResult.data.length === 0;
  const sessions = sessionsResult.data ?? [];

  const systemPrompt = buildSystemPrompt(profile, sessions);

  // Find next planned session
  const nextSession = sessions.find((s) => s.status === "planned");
  // Find last completed session
  const lastSession = sessions.find((s) => s.status === "completed");

  let welcomeInstruction = "";
  if (isFirstSession) {
    welcomeInstruction = `C'est la toute première fois que ${profile.name ?? "l'utilisateur"} ouvre l'app. Présente-toi brièvement comme Coach Javier, montre que tu as bien compris son profil (objectif: ${profile.goal}, niveau: ${profile.level}, ${profile.weekly_frequency} sorties/semaine), et propose-lui de commencer par planifier sa première semaine. Sois chaleureux et motivant. Maximum 3-4 phrases.`;
  } else if (nextSession) {
    const date = new Date(nextSession.planned_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    welcomeInstruction = `L'utilisateur revient sur l'app. Rappelle-lui sa prochaine séance prévue (${nextSession.type}, ${date}${nextSession.planned_distance_km ? `, ${nextSession.planned_distance_km}km` : ""}). Demande-lui comment il se sent pour cette séance. Sois direct et motivant. Maximum 2-3 phrases.`;
  } else if (lastSession) {
    const date = new Date(lastSession.planned_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    welcomeInstruction = `L'utilisateur revient sur l'app. Demande-lui des nouvelles de sa dernière séance (${lastSession.type} du ${date}${lastSession.actual_distance_km ? `, ${lastSession.actual_distance_km}km` : ""}). Sois curieux et engageant. Maximum 2-3 phrases.`;
  } else {
    welcomeInstruction = `L'utilisateur revient sur l'app. Accueille-le chaleureusement par son prénom${profile.name ? ` (${profile.name})` : ""} et propose-lui de planifier ses prochaines séances. Maximum 2-3 phrases.`;
  }

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `[SYSTÈME - ne pas afficher] ${welcomeInstruction}` }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          fullText += chunk.delta.text;
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      // Save welcome message to history
      await supabase.from("messages").insert({
        user_id: user.id,
        role: "assistant",
        content: fullText,
      });
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
