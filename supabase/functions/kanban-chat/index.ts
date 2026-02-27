import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const { messages, tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const taskSummary = tasks && tasks.length > 0
      ? `\n\nCurrent board tasks:\n${tasks.map((t: any) => `- "${t.title}" [${t.status}] priority:${t.priority} category:${t.category || "none"} due:${t.due_date || "none"}`).join("\n")}`
      : "\n\nThe board currently has no tasks.";

    const systemPrompt = `You are FlowBoard AI, a productivity assistant for a Kanban board app. You help users manage tasks and provide productivity insights.

You can:
1. Help users create tasks by using the create_task tool
2. Provide productivity insights based on their current board state
3. Give task management advice
4. Answer general productivity questions

When creating tasks, extract: title, description, priority (low/medium/high), category (Design/Dev/Media/Marketing/Research), status (todo/in_progress), and due_date (YYYY-MM-DD format).

Always be concise, helpful, and encouraging.${taskSummary}`;

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      tools: [
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Create a new task on the Kanban board",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title" },
                description: { type: "string", description: "Task description" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                category: { type: "string", enum: ["Design", "Dev", "Media", "Marketing", "Research"] },
                status: { type: "string", enum: ["todo", "in_progress"], description: "Column to place the task in" },
                due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
              },
              required: ["title", "priority", "status"],
              additionalProperties: false,
            },
          },
        },
      ],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // We need to intercept tool calls to create tasks in DB
    // For streaming, we'll collect tool call data and handle it
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let toolCallArgs = "";
    let toolCallName = "";
    let hasToolCall = false;

    // Create a TransformStream to pass through content and handle tool calls
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            if (line.trim() === "" || line.startsWith(":")) {
              await writer.write(encoder.encode(line + "\n"));
              continue;
            }

            if (!line.startsWith("data: ")) {
              await writer.write(encoder.encode(line + "\n"));
              continue;
            }

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              // Before sending done, handle tool call if any
              if (hasToolCall && toolCallName === "create_task") {
                try {
                  const args = JSON.parse(toolCallArgs);
                  const { error: insertError } = await supabase.from("tasks").insert({
                    user_id: userId,
                    title: args.title,
                    description: args.description || "",
                    priority: args.priority || "medium",
                    category: args.category || "",
                    status: args.status || "todo",
                    due_date: args.due_date || null,
                    position: 0,
                  });
                  if (insertError) {
                    console.error("Failed to create task:", insertError);
                  }
                  // Send a message about the created task
                  const confirmMsg = `data: ${JSON.stringify({ choices: [{ delta: { content: `✅ Task "${args.title}" created!` } }] })}\n`;
                  await writer.write(encoder.encode(confirmMsg));
                } catch (e) {
                  console.error("Failed to parse tool call:", e);
                }
              }
              await writer.write(encoder.encode(line + "\n"));
              continue;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.tool_calls) {
                hasToolCall = true;
                for (const tc of delta.tool_calls) {
                  if (tc.function?.name) toolCallName = tc.function.name;
                  if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                }
                // Don't forward tool call chunks to client
                continue;
              }

              // Forward content chunks
              await writer.write(encoder.encode(line + "\n"));
            } catch {
              await writer.write(encoder.encode(line + "\n"));
            }
          }
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
