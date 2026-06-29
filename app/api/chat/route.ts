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

  // Load user profile and recent sessions in parallel
  const [profileResult, sessionsResult, historyResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("planned_at", { ascending: false })
      .limit(10),
    supabase
      .from("messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!profileResult.data) {
    return new Response("Profile not found", { status: 404 });
  }

  const systemPrompt = buildSystemPrompt(
    profileResult.data,
    sessionsResult.data ?? []
  );

  // Reverse history so it's chronological, then append the new message
  const conversationHistory = (historyResult.data ?? [])
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  conversationHistory.push({ role: "user", content: message });

  // Save user message to DB
  await supabase.from("messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  // Stream Javier's response
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        // Prompt caching: cache the static system prompt (~60-80% cost reduction on repeat messages)
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
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          fullText += chunk.delta.text;
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }

      // Save assistant message after streaming completes
      await supabase.from("messages").insert({
        user_id: user.id,
        role: "assistant",
        content: fullText,
      });

      // Parse and persist any session logs/plans from Javier's response
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
  // Log completed session
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

  // Plan a future session
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
}
