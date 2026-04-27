import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";
const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_MOVIES = 80;
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

const rateLimits = new Map<string, { count: number; resetAt: number }>();

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
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
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

function isMovieContext(value: unknown): boolean {
  return Boolean(value) && typeof value === "object";
}

serve(async req => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) return jsonResponse(origin, 403, { error: "Origin is not allowed" });
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") return jsonResponse(origin, 405, { error: "Method not allowed" });
    if (!isOriginAllowed(origin)) return jsonResponse(origin, 403, { error: "Origin is not allowed" });

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
    if (authError || !user) return jsonResponse(origin, 401, { error: "Неверный токен доступа" });

    const rateLimitKey = `${user.id}:${getClientIp(req)}`;
    if (!checkRateLimit(rateLimitKey)) {
      return jsonResponse(origin, 429, { error: "Слишком много запросов. Подождите минуту." });
    }

    const body = await req.json().catch(() => null) as {
      filters?: unknown;
      tasteProfile?: unknown;
      watchedMovies?: unknown;
      watchlistMovies?: unknown;
      dismissedMovies?: unknown;
    } | null;

    if (!body || typeof body !== "object") {
      return jsonResponse(origin, 400, { error: "Некорректное тело запроса" });
    }

    const filters = Array.isArray(body.filters) ? body.filters.map(String).slice(0, 12) : [];
    const tasteProfile = typeof body.tasteProfile === "string" ? body.tasteProfile.slice(0, 6000) : "";
    const watchedMovies = Array.isArray(body.watchedMovies)
      ? body.watchedMovies.filter(isMovieContext).slice(0, MAX_MOVIES)
      : [];
    const watchlistMovies = Array.isArray(body.watchlistMovies)
      ? body.watchlistMovies.filter(isMovieContext).slice(0, MAX_MOVIES)
      : [];
    const dismissedMovies = Array.isArray(body.dismissedMovies)
      ? body.dismissedMovies.filter(isMovieContext).slice(0, MAX_MOVIES)
      : [];

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");
    const DEEPSEEK_MODEL = Deno.env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL;

    const prompt = `Ты — персональный кинокритик. Подбери РОВНО 3 фильма или сериала для просмотра — каждый разного жанра и настроения.

Правила:
- Все 3 должны быть разных жанров и разного настроения — не повторяй жанры между вариантами
- Не предлагай фильмы из просмотренного списка
- Не предлагай фильмы из watchlist — они уже в списке
- Не предлагай фильмы из dismissed
- Опирайся на вкусовой профиль и фильтры

Фильтры: ${filters.length > 0 ? filters.join(", ") : "без ограничений"}
Вкусовой профиль: ${tasteProfile || "пуст"}
Просмотренное: ${JSON.stringify(watchedMovies)}
Watchlist: ${JSON.stringify(watchlistMovies)}
Dismissed: ${JSON.stringify(dismissedMovies)}

Верни ТОЛЬКО валидный JSON без markdown, без \`\`\`:
[
  {
    "title": "original title",
    "titleRu": "русское название",
    "year": 2021,
    "type": "film",
    "genres": ["драма"],
    "duration": 120,
    "director": "Director Name",
    "description": "краткий синопсис 2-3 предложения",
    "reasonToWatch": "почему подходит пользователю",
    "mood": ["задумчивое"],
    "timeOfDay": ["evening"],
    "format": "medium",
    "forCompany": "any",
    "kpRating": 7.8,
    "country": "США",
    "predictedRating": 8.6
  }
]``;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek recommendation error:", response.status, errorText);
      if (response.status === 429) {
        return jsonResponse(origin, 429, { error: "Слишком много запросов, попробуйте позже." });
      }
      return jsonResponse(origin, 500, { error: "Ошибка DeepSeek recommendation API" });
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };

    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      return jsonResponse(origin, 500, { error: "DeepSeek вернул пустой ответ" });
    }

    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse DeepSeek response:", clean);
      return jsonResponse(origin, 500, { error: "Не удалось разобрать ответ модели" });
    }

    const recommendations = Array.isArray(parsed) ? parsed : [parsed];
    return jsonResponse(origin, 200, { recommendations });
  } catch (error) {
    console.error("movie-recommendation error:", error);
    return jsonResponse(origin, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});