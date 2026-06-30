// @ts-nocheck
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state: user.id,
  });

  return Response.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
