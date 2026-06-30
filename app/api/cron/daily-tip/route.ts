// @ts-nocheck
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();
const resend = new Resend(process.env.RESEND_API_KEY);

// Use service role client to bypass RLS for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get all users with their profiles and recent sessions
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_completed", true);

  if (!profiles || profiles.length === 0) {
    return new Response("No profiles found", { status: 200 });
  }

  const results = [];

  for (const profile of profiles) {
    try {
      // Get user email from auth
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id);
      if (!user?.email) continue;

      // Get recent sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", profile.id)
        .order("planned_at", { ascending: false })
        .limit(5);

      // Generate tip with Claude
      const levelLabel = { beginner: "débutant", intermediate: "intermédiaire", advanced: "confirmé" };
      const goalLabel = {
        general_fitness: "forme générale",
        lose_weight: "perte de poids",
        run_race: "préparer une course",
        improve_time: "améliorer les chronos",
      };

      const sessionSummary = sessions && sessions.length > 0
        ? sessions.map((s) => `- ${s.type} | ${s.status}${s.actual_distance_km ? ` | ${s.actual_distance_km}km` : ""}`).join("\n")
        : "Aucune séance récente.";

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Tu es Javier, coach de running. Génère un tip de coaching court et actionnable pour ${profile.name ?? "un coureur"}.

Profil : niveau ${levelLabel[profile.level] ?? profile.level}, objectif ${goalLabel[profile.goal] ?? profile.goal}, ${profile.weekly_frequency} sorties/semaine.

Séances récentes :
${sessionSummary}

Génère UN seul tip pratique, adapté au niveau, en 2-3 phrases maximum. Commence directement par le conseil, sans introduction. Sois concret et motivant.`,
        }],
      });

      const tip = response.content[0].type === "text" ? response.content[0].text : "";
      if (!tip) continue;

      // Send email
      await resend.emails.send({
        from: "Coach Javier <javier@coachJavier.fr>",
        to: user.email,
        subject: `💡 Tip du jour — Coach Javier`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: #1db954; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="color: #fff; font-weight: 900; font-size: 22px;">J</span>
            </div>

            <p style="font-size: 13px; font-weight: 700; color: #1db954; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px;">Tip du jour</p>
            <h1 style="font-size: 22px; font-weight: 800; color: #111; margin: 0 0 20px; line-height: 1.3;">
              Bonjour ${profile.name ?? ""} 👋
            </h1>

            <div style="background: #f7f7f5; border-radius: 16px; padding: 20px; margin-bottom: 28px; border-left: 4px solid #1db954;">
              <p style="font-size: 16px; color: #111; line-height: 1.6; margin: 0;">
                ${tip}
              </p>
            </div>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/chat" style="display: block; background: #1db954; color: #fff; text-align: center; padding: 14px 24px; border-radius: 14px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 16px rgba(29,185,84,0.3);">
              Discuter avec Javier →
            </a>

            <p style="font-size: 12px; color: #aaa; text-align: center; margin-top: 24px; line-height: 1.6;">
              Coach Javier · Ton coach running personnel<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #aaa;">coachJavier.fr</a>
            </p>
          </div>
        `,
      });

      results.push({ user: user.email, status: "sent" });
    } catch (err) {
      results.push({ user: profile.id, status: "error", error: String(err) });
    }
  }

  return Response.json({ sent: results.length, results });
}
