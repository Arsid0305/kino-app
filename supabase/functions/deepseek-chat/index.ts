import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiting: 20 req/min per user
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);
  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (limit.count >= 20) return false;
  limit.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Требуется авторизация" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    // Allow anonymous anon key usage (app doesn't require login, so we accept the anon key)
    const isAnonKey = token === Deno.env.get("SUPABASE_ANON_KEY") ||
      token === (Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "");
    const userId = user?.id ?? (isAnonKey ? "anon" : null);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Неверный токен" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Rate limit ────────────────────────────────────────────────────────
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Слишком много запросов. Подождите минуту." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Input validation ──────────────────────────────────────────────────
    const body = await req.json();
    const { messages, movies } = body;

    if (!Array.isArray(messages) || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Неверные данные запроса" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const msg of messages) {
      if (typeof msg.content !== "string" || msg.content.length > 2000) {
        return new Response(JSON.stringify({ error: "Сообщение слишком длинное (макс. 2000 символов)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── DeepSeek API ──────────────────────────────────────────────────────
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const systemPrompt = `Ты — киноэксперт и советник по фильмам. Твоё имя — КиноГуру. Отвечай на русском языке.

Пользователь обращается к тебе за рекомендациями фильмов. У тебя есть доступ к его базе фильмов для просмотра.

${movies ? `База фильмов пользователя (${movies.length} шт.):\n${JSON.stringify(movies.slice(0, 30), null, 0)}` : "База фильмов пока не загружена."}

Правила:
- Давай конкретные рекомендации, объясняй почему именно этот фильм
- Учитывай настроение и контекст пользователя
- Если фильм есть в базе — упомяни его рейтинг КП и прогнозную оценку
- Будь дружелюбным и увлечённым кино
- Отвечай кратко, 2-4 предложения, если не просят подробнее`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Ошибка DeepSeek API" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("deepseek-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
