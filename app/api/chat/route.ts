// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/javier-prompt";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return new Response("Message required", { status: 400 });
  }

  const [profileResult, sessionsResult, historyResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("sessions").select("*").eq("user_id", user.id).order("planned_at", { ascending: false }).limit(10),
    supabase.from("messages").select("role, content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileResult.data as any;
  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = (sessionsResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = (historyResult.data ?? []) as any[];

  const systemPrompt = buildSystemPrompt(profile, sessions);

  const conversationHistory = history
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  conversationHistory.push({ role: "user", content: message });

  await supabase.from("messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: conversationHistory,
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

      await supabase.from("messages").insert({
        user_id: user.id,
        role: "assistant",
        content: fullText,
      });

      await parseAndPersistActions(supabase, user.id, fullText);
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function parseAndPersistActions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  text: string
) {
  const logMatch = text.match(/<log_session>(.*?)<\/log_session>/s);
  if (logMatch) {
    try {
      const data = JSON.parse(logMatch[1]);
      await supabase.from("sessions").insert({
        user_id: userId,
        planned_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: "completed",
        ...data,
      });
    } catch {}
  }

  const planMatch = text.match(/<plan_session>(.*?)<\/plan_session>/s);
  if (planMatch) {
    try {
      const data = JSON.parse(planMatch[1]);
      await supabase.from("sessions").insert({
        user_id: userId,
        status: "planned",
        ...data,
      });
    } catch {}
  }

  const goalMatch = text.match(/<set_goal>(.*?)<\/set_goal>/s);
  if (goalMatch) {
    try {
      const data = JSON.parse(goalMatch[1]);
      await supabase.from("profiles").update({
        goal_label: data.label,
        goal_date: data.date,
      }).eq("id", userId);
    } catch {}
  }
}
