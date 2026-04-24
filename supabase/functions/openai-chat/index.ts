import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_MESSAGE_LENGTH = 12000;
const MAX_MOVIES = 30;
const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_SUGGESTIONS = 3;
const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_REASONING_EFFORT = "minimal";

const rateLimits = new Map<string, { count: number; resetAt: number }>();

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatMovieSuggestion = {
  title: string;
  titleRu: string;
  year: number;
  type: "film" | "series";
  genre: string[];
  duration: number;
  mood: string[];
  description: string;
  director: string;
  forCompany: "solo" | "pair" | "group" | "any";
  timeOfDay: ("morning" | "afternoon" | "evening" | "night")[];
  format: "short" | "medium" | "long";
  kpRating: number | null;
  country: string | null;
  predictedRating: number | null;
  reasonToWatch: string;
  kpQuery: string;
};

type StructuredChatResponse = {
  reply: string;
  suggestions: ChatMovieSuggestion[];
};

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

function extractOutputText(responseData: Record<string, unknown>): { text?: string; refusal?: string } {
  const output = Array.isArray(responseData.output) ? responseData.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const message = item as Record<string, unknown>;
    const content = Array.isArray(message.content) ? message.content : [];

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const chunk = part as Record<string, unknown>;

      if (chunk.type === "output_text" && typeof chunk.text === "string") {
        return { text: chunk.text };
      }

      if (chunk.type === "refusal" && typeof chunk.refusal === "string") {
        return { refusal: chunk.refusal };
      }
    }
  }

  return {};
}

function normalizeSuggestions(value: unknown): ChatMovieSuggestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_SUGGESTIONS)
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const movie = item as Record<string, unknown>;

      return {
        title: String(movie.title ?? movie.titleRu ?? "Untitled"),
        titleRu: String(movie.titleRu ?? movie.title ?? "Untitled"),
        year: Number(movie.year ?? 0),
        type: movie.type === "series" ? "series" : "film",
        genre: Array.isArray(movie.genre) ? movie.genre.map(String) : [],
        duration: Number(movie.duration ?? 0),
        mood: Array.isArray(movie.mood) ? movie.mood.map(String) : [],
        description: String(movie.description ?? ""),
        director: String(movie.director ?? ""),
        forCompany: movie.forCompany === "solo" || movie.forCompany === "pair" || movie.forCompany === "group"
          ? movie.forCompany
          : "any",
        timeOfDay: Array.isArray(movie.timeOfDay)
          ? movie.timeOfDay.filter(value =>
            value === "morning" || value === "afternoon" || value === "evening" || value === "night"
          ) as ChatMovieSuggestion["timeOfDay"]
          : ["evening"],
        format: movie.format === "short" || movie.format === "long" ? movie.format : "medium",
        kpRating: typeof movie.kpRating === "number" ? movie.kpRating : null,
        country: typeof movie.country === "string" ? movie.country : null,
        predictedRating: typeof movie.predictedRating === "number" ? movie.predictedRating : null,
        reasonToWatch: String(movie.reasonToWatch ?? ""),
        kpQuery: String(movie.kpQuery ?? movie.titleRu ?? movie.title ?? ""),
      } satisfies ChatMovieSuggestion;
    })
    .filter((movie): movie is ChatMovieSuggestion => Boolean(movie));
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
      messages?: unknown;
      filters?: unknown;
      tasteProfile?: unknown;
      watchedMovies?: unknown;
      watchlistMovies?: unknown;
      dismissedMovies?: unknown;
    } | null;

    if (!body || typeof body !== "object") {
      return jsonResponse(origin, 400, { error: "Некорректное тело запроса" });
    }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return jsonResponse(origin, 400, { error: "Некорректные данные запроса" });
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
    const dismissedMovies = Array.isArray(body.dismissedMovies) ? body.dismissedMovies.slice(0, MAX_MOVIES) : [];

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? DEFAULT_OPENAI_MODEL;
    const OPENAI_REASONING_EFFORT = Deno.env.get("OPENAI_REASONING_EFFORT") ?? DEFAULT_REASONING_EFFORT;

    const systemPrompt = `You are a specialized movie and TV advisor. Always answer in Russian.

Domain rules:
- This chat is only about films, TV series, miniseries, animation, anime, documentaries, and similar screen content.
- Never switch to food, recipes, drinks, books, music, games, shopping, or generic lifestyle advice.
- If the user asks something ambiguous like "I want something light", "for lunch", "for the evening", "dynamic", "background", or "not too heavy", interpret it as a request for screen content.
- If the user explicitly asks for something outside cinema or screen content, briefly say that you only help with movies and series, then redirect to a relevant screen recommendation.

Recommendation rules:
- Use the user's taste profile, watched history, watchlist, dismissed list, and active filters.
- Recommend titles from the broader world of movies and series, not only from the local list.
- Never recommend titles already watched by the user.
- Never recommend titles from the dismissed list.
- If a title from watchlist is the best fit, you may mention it.
- Keep the prose concise and useful.
- Return up to 3 suggestions only when the user asks for options. Otherwise return 1 strong suggestion.

Response format rules:
- Return valid JSON matching the provided schema.
- "reply" must be normal Russian text for the user.
- "suggestions" must contain concrete titles from the reply.

User context:
Filters: ${filters.length > 0 ? filters.join(", ") : "no strict filters"}
Taste profile: ${tasteProfile || "still forming"}
Watched: ${JSON.stringify(watchedMovies)}
Watchlist: ${JSON.stringify(watchlistMovies)}
Dismissed: ${JSON.stringify(dismissedMovies)}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: systemPrompt,
        input: safeMessages.map(message => ({
          role: message.role,
          content: [
            message.role === "assistant"
              ? { type: "output_text", text: message.content }
              : { type: "input_text", text: message.content },
          ],
        })),
        reasoning: { effort: OPENAI_REASONING_EFFORT },
        text: {
          format: {
            type: "json_schema",
            name: "movie_chat_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["reply", "suggestions"],
              properties: {
                reply: { type: "string" },
                suggestions: {
                  type: "array",
                  maxItems: MAX_SUGGESTIONS,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "title",
                      "titleRu",
                      "year",
                      "type",
                      "genre",
                      "duration",
                      "mood",
                      "description",
                      "director",
                      "forCompany",
                      "timeOfDay",
                      "format",
                      "kpRating",
                      "country",
                      "predictedRating",
                      "reasonToWatch",
                      "kpQuery",
                    ],
                    properties: {
                      title: { type: "string" },
                      titleRu: { type: "string" },
                      year: { type: "integer" },
                      type: { type: "string", enum: ["film", "series"] },
                      genre: { type: "array", items: { type: "string" } },
                      duration: { type: "integer" },
                      mood: { type: "array", items: { type: "string" } },
                      description: { type: "string" },
                      director: { type: "string" },
                      forCompany: { type: "string", enum: ["solo", "pair", "group", "any"] },
                      timeOfDay: {
                        type: "array",
                        items: { type: "string", enum: ["morning", "afternoon", "evening", "night"] },
                      },
                      format: { type: "string", enum: ["short", "medium", "long"] },
                      kpRating: { anyOf: [{ type: "number" }, { type: "null" }] },
                      country: { anyOf: [{ type: "string" }, { type: "null" }] },
                      predictedRating: { anyOf: [{ type: "number" }, { type: "null" }] },
                      reasonToWatch: { type: "string" },
                      kpQuery: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      let upstreamMessage = "Ошибка OpenAI API";
      try {
        const parsed = JSON.parse(errorText) as {
          error?: { message?: string; code?: string; type?: string };
        };
        const details = [
          parsed.error?.message,
          parsed.error?.code,
          parsed.error?.type,
        ].filter(Boolean).join(" | ");

        if (details) upstreamMessage = details;
      } catch {
        if (errorText.trim()) upstreamMessage = errorText.trim();
      }

      return jsonResponse(origin, response.status === 429 ? 429 : 500, { error: upstreamMessage });
    }

    const responseData = await response.json() as Record<string, unknown>;
    const { text, refusal } = extractOutputText(responseData);

    if (refusal) {
      return jsonResponse(origin, 200, { message: refusal, suggestions: [] });
    }

    if (!text) {
      return jsonResponse(origin, 500, { error: "OpenAI returned an empty response" });
    }

    const parsed = JSON.parse(text) as Partial<StructuredChatResponse>;
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    const suggestions = normalizeSuggestions(parsed.suggestions);

    if (!reply) {
      return jsonResponse(origin, 500, { error: "Structured chat response is missing reply text" });
    }

    return jsonResponse(origin, 200, {
      message: reply,
      suggestions,
    });
  } catch (error) {
    console.error("openai-chat error:", error);
    return jsonResponse(origin, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});
