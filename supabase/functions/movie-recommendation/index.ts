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

type MovieCtx = { titleRu?: string; title?: string };

function titlesOf(arr: unknown[]): string {
  return (arr as MovieCtx[]).map(m => m.titleRu ?? m.title ?? "").filter(Boolean).join(", ");
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
      ? body.watchedMovies.filter(isMovieContext).slice(0, MAX_MOVIES) : [];
    const watchlistMovies = Array.isArray(body.watchlistMovies)
      ? body.watchlistMovies.filter(isMovieContext).slice(0, MAX_MOVIES) : [];
    const dismissedMovies = Array.isArray(body.dismissedMovies)
      ? body.dismissedMovies.filter(isMovieContext).slice(0, MAX_MOVIES) : [];

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");
    const DEEPSEEK_MODEL = Deno.env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL;

    // Build unified forbidden titles list (numbered for clarity)
    const forbiddenTitles = [
      ...watchedMovies.slice(0, 40),
      ...watchlistMovies.slice(0, 40),
      ...dismissedMovies.slice(0, 40),
    ].map(m => (m as MovieCtx).titleRu ?? (m as MovieCtx).title ?? "").filter(Boolean);

    const callOnce = async (alreadyShown: string): Promise<Record<string, unknown>> => {
      const allForbidden = alreadyShown
        ? [...forbiddenTitles, alreadyShown]
        : [...forbiddenTitles];
      const forbiddenBlock = allForbidden.length > 0
        ? allForbidden.map((t, i) => `${i + 1}. ${t}`).join("\n")
        : "нет";

      const body = JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "system",
            content: "Ты — кинорекомендательная система. Отвечаешь ТОЛЬКО валидным JSON-объектом без markdown, без пояснений, без лишнего текста.",
          },
          {
            role: "user",
            content: `Порекомендуй ОДИН фильм или сериал.

АБСОЛЮТНЫЙ ЗАПРЕТ — эти фильмы предлагать НЕЛЬЗЯ ни при каких условиях. Сверяйся с каждым пунктом:
${forbiddenBlock}

Если задуманный фильм есть в списке выше — выбери другой. Это обязательное условие.

Фильтры: ${filters.length > 0 ? filters.join(", ") : "без ограничений"}
Вкусовой профиль: ${tasteProfile || "пуст"}

Верни ТОЛЬКО JSON-объект (без массива, без пояснений):
{"title":"Название","titleRu":"Русское название","year":2020,"type":"film","genres":["жанр"],"duration":100,"director":"Режиссёр","description":"Синопсис 2-3 предложения","reasonToWatch":"Почему подходит","mood":["настроение"],"timeOfDay":["evening"],"format":"medium","forCompany":"any","kpRating":7.5,"country":"США","predictedRating":8.0}`,
          },
        ],
        stream: false,
        max_tokens: 800,
        temperature: 1.0,
      });

      // Retry once on transient failures (JSON parse errors, 5xx)
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body,
        });

        if (!res.ok) {
          if (res.status === 429) throw new Error(`DeepSeek 429`);
          if (attempt === 1) throw new Error(`DeepSeek ${res.status}`);
          continue;
        }

        const d = await res.json() as { choices?: { message?: { content?: string } }[] };
        const raw = d.choices?.[0]?.message?.content?.trim() ?? "";
        const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        try {
          const parsed = JSON.parse(clean);
          return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          if (attempt === 1) throw new Error(`JSON parse failed: ${clean.slice(0, 100)}`);
          // retry
        }
      }
      throw new Error("callOnce exhausted retries");
    };

    const picked: Record<string, unknown>[] = [];
    for (let i = 0; i < 2; i++) {
      try {
        const alreadyShown = picked.map(m => (m.titleRu ?? m.title ?? "") as string).join(", ");
        const movie = await callOnce(alreadyShown);
        picked.push(movie);
        console.log(`Recommendation ${i + 1}: ${movie.titleRu ?? movie.title}`);
      } catch (e) {
        console.error(`DeepSeek call ${i + 1} failed:`, e);
      }
    }

    if (picked.length === 0) {
      return jsonResponse(origin, 500, { error: "Не удалось получить рекомендации" });
    }

    return jsonResponse(origin, 200, { recommendations: picked });

  } catch (error) {
    console.error("movie-recommendation error:", error);
    return jsonResponse(origin, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});
