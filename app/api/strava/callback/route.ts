// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?strava=error`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?strava=error`);
  }

  const tokens = await tokenRes.json();

  // Save tokens in Supabase
  const supabase = await createClient();
  await supabase.from("profiles").update({
    strava_access_token: tokens.access_token,
    strava_refresh_token: tokens.refresh_token,
    strava_token_expires_at: tokens.expires_at,
    strava_athlete_id: String(tokens.athlete?.id),
  }).eq("id", userId);

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?strava=connected`);
}
