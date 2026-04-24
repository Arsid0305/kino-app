import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_MESSAGE_LENGTH = 12000;
const MAX_MOVIES = 30;
const MAX_REQUESTS_PER_MINUTE = 10;
const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_REASONING_EFFORT = "minimal";

const rateLimits = new Map<string, { count: number; resetAt: number }>();

type ChatMessage = { role: "user" | "assistant"; content: string };

function getAllowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin: string | null): boolean {
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) return true;
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = allowedOrigins.length === 0
    ? "*"
    : origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
  };
}

function jsonResponse(origin: string | null, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown";
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (limit.count >= MAX_REQUESTS_PER_MINUTE) return false;
  limit.count++;
  return true;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string";
}

function buildLegacyChunk(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function createLegacySseProxy(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = stream.getReader();
      let buffer = "";

      const flushEvent = (rawEvent: string) => {
        const lines = rawEvent
          .split("\n")
          .map(line => line.trimEnd())
          .filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;

          const payload = line.slice(5).trim();
          if (!payload) continue;

          try {
            const event = JSON.parse(payload) as Record<string, unknown>;
            if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
              controller.enqueue(encoder.encode(buildLegacyChunk(event.delta)));
            }

            if (event.type === "response.completed") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }

            if (event.type === "error") {
              const message = typeof event.message === "string" ? event.message : "OpenAI stream error";
              controller.enqueue(encoder.encode(buildLegacyChunk(`❌ ${message}`)));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          } catch {
            // Ignore malformed partial events from upstream stream parsing.
          }
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex = buffer.indexOf("\n\n");
          while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);
            flushEvent(rawEvent);
            boundaryIndex = buffer.indexOf("\n\n");
          }
        }

        if (buffer.trim()) flushEvent(buffer);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

serve(async req => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) {
      return jsonResponse(origin, 403, { error: "Origin is not allowed" });
    }

    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(origin, 405, { error: "Method not allowed" });
    }

    if (!isOriginAllowed(origin)) {
      return jsonResponse(origin, 403, { error: "Origin is not allowed" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(origin, 401, { error: "Требуется авторизация" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse(origin, 401, { error: "Неверный токен доступа" });
    }

    const rateLimitKey = `${user.id}:${getClientIp(req)}`;
    if (!checkRateLimit(rateLimitKey)) {
      return jsonResponse(origin, 429, { error: "Слишком много запросов. Подождите минуту." });
    }

    const body = await req.json().catch(() => null) as {
      messages?: unknown
      filters?: unknown
      tasteProfile?: unknown
      watchedMovies?: unknown
      watchlistMovies?: unknown
    } | null;

    if (!body || typeof body !== "object") {
      return jsonResponse(origin, 400, { error: "Некорректное тело запроса" });
    }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return jsonResponse(origin, 400, { error: "Неверные данные запроса" });
    }

    for (const message of messages) {
      if (!isChatMessage(message) || message.content.length > MAX_MESSAGE_LENGTH) {
        return jsonResponse(origin, 400, { error: "Сообщение слишком длинное или имеет неверный формат" });
      }
    }

    const safeMessages = messages as ChatMessage[];
    const totalMessageLength = safeMessages.reduce((sum, message) => sum + message.content.length, 0);
    if (totalMessageLength > MAX_TOTAL_MESSAGE_LENGTH) {
      return jsonResponse(origin, 400, { error: "Диалог слишком длинный для одного запроса" });
    }

    const filters = Array.isArray(body.filters) ? body.filters.map(String).slice(0, 12) : [];
    const tasteProfile = typeof body.tasteProfile === "string" ? body.tasteProfile.slice(0, 6000) : "";
    const watchedMovies = Array.isArray(body.watchedMovies) ? body.watchedMovies.slice(0, MAX_MOVIES) : [];
    const watchlistMovies = Array.isArray(body.watchlistMovies) ? body.watchlistMovies.slice(0, MAX_MOVIES) : [];

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? DEFAULT_OPENAI_MODEL;
    const OPENAI_REASONING_EFFORT = Deno.env.get("OPENAI_REASONING_EFFORT") ?? DEFAULT_REASONING_EFFORT;

    const systemPrompt = `Ты — персональный киносоветник. Отвечай на русском языке.

Твоя задача:
- общаться как опытный кинокуратор
- использовать вкусовой профиль пользователя, его историю оценок, watchlist и активные фильтры
- рекомендовать не только фильмы из его локальной базы, а ориентироваться на весь мир фильмов и сериалов, которые обычно можно найти на Кинопоиске
- не советовать уже просмотренное
- если подходящий вариант уже есть в watchlist пользователя, можешь явно это отметить

Контекст пользователя:
Фильтры: ${filters.length > 0 ? filters.join(", ") : "без жестких ограничений"}
Вкусовой профиль: ${tasteProfile || "еще формируется"}
Просмотренное: ${JSON.stringify(watchedMovies)}
Watchlist: ${JSON.stringify(watchlistMovies)}

Правила ответа:
- отвечай конкретно и по делу
- если рекомендуешь фильм, объясняй, чем он совпадает по режиссуре, актерам, атмосфере, динамике, сложности или сюжету
- можешь предлагать как один сильный вариант, так и 2-3 варианта, если вопрос это подразумевает
- упоминай поиск на Кинопоиске, только если это полезно`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          ...safeMessages.map(message => ({
            role: message.role,
            content: [{ type: "input_text", text: message.content }],
          })),
        ],
        reasoning: { effort: OPENAI_REASONING_EFFORT },
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      if (response.status === 429) {
        return jsonResponse(origin, 429, { error: "Слишком много запросов, попробуйте позже." });
      }

      return jsonResponse(origin, 500, { error: "Ошибка OpenAI API" });
    }

    if (!response.body) {
      return jsonResponse(origin, 500, { error: "OpenAI returned an empty stream" });
    }

    return new Response(createLegacySseProxy(response.body), {
      headers: { ...getCorsHeaders(origin), "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("openai-chat error:", error);
    return jsonResponse(origin, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});
