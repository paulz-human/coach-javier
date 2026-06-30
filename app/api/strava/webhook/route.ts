// @ts-nocheck
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Strava webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return Response.json({ "hub.challenge": challenge });
  }
  return new Response("Forbidden", { status: 403 });
}

// Strava webhook event (new activity)
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Only handle new activities
  if (body.object_type !== "activity" || body.aspect_type !== "create") {
    return new Response("OK", { status: 200 });
  }

  const stravaAthleteId = String(body.owner_id);
  const stravaActivityId = String(body.object_id);

  // Find user by strava athlete id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("strava_athlete_id", stravaAthleteId)
    .single();

  if (!profile) return new Response("OK", { status: 200 });

  // Refresh token if expired
  let accessToken = profile.strava_access_token;
  if (Date.now() / 1000 > profile.strava_token_expires_at - 60) {
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: profile.strava_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (refreshRes.ok) {
      const refreshed = await refreshRes.json();
      accessToken = refreshed.access_token;
      await supabase.from("profiles").update({
        strava_access_token: refreshed.access_token,
        strava_refresh_token: refreshed.refresh_token,
        strava_token_expires_at: refreshed.expires_at,
      }).eq("id", profile.id);
    }
  }

  // Fetch activity details from Strava
  const activityRes = await fetch(`https://www.strava.com/api/v3/activities/${stravaActivityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!activityRes.ok) return new Response("OK", { status: 200 });
  const activity = await activityRes.json();

  // Only import runs
  if (activity.type !== "Run" && activity.sport_type !== "Run") {
    return new Response("OK", { status: 200 });
  }

  // Map Strava activity to our session format
  const distanceKm = Math.round((activity.distance / 1000) * 10) / 10;
  const durationMin = Math.round(activity.moving_time / 60);
  const avgPaceSecPerKm = activity.distance > 0 ? activity.moving_time / (activity.distance / 1000) : null;
  const avgPaceStr = avgPaceSecPerKm
    ? `${Math.floor(avgPaceSecPerKm / 60)}'${String(Math.round(avgPaceSecPerKm % 60)).padStart(2, "0")}''/km`
    : null;

  // Guess session type from pace
  let sessionType = "easy";
  if (avgPaceSecPerKm) {
    if (avgPaceSecPerKm < 270) sessionType = "intervals"; // < 4'30/km
    else if (avgPaceSecPerKm < 330) sessionType = "tempo"; // < 5'30/km
    else if (distanceKm > 15) sessionType = "long";
  }

  await supabase.from("sessions").insert({
    user_id: profile.id,
    planned_at: activity.start_date,
    completed_at: activity.start_date,
    status: "completed",
    type: sessionType,
    actual_distance_km: distanceKm,
    actual_duration_min: durationMin,
    notes: `Importé depuis Strava — ${activity.name}${avgPaceStr ? ` — allure moyenne ${avgPaceStr}` : ""}`,
  });

  return new Response("OK", { status: 200 });
}
