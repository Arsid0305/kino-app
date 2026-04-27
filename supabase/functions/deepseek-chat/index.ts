import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_MESSAGE_LENGTH = 12000;
const MAX_MOVIES = 30;
const MAX_REQUESTS_PER_MINUTE = 10;
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

// Search Tavily for fresh movie data. Returns empty string if key missing or
// request fails — DeepSeek then falls back to its own training knowledge.
async function tavilySearch(query: string): Promise<string> {
  const key = Deno.env.get("TAVILY_API_KEY");
  if (!key) {
    console.log("TAVILY_API_KEY not set, skipping search");
    return "";
  }
  console.log("Tavily searching:", query.slice(0, 100));
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 3,
        include_answer: true,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Tavily error:", res.status, err);
      return "";
    }
    const data = await res.json() as {
      answer?: string;
      results?: { title: string; content: string }[];
    };
    const parts: string[] = [];
    if (data.answer) parts.push(data.answer);
    for (const r of data.results?.slice(0, 5) ?? []) {
      parts.push(`${r.title}: ${r.content.slice(0, 500)}`);
    }
    const result = parts.join("\n");
    console.log("Tavily found:", result.slice(0, 300));
    return result;
  } catch (e) {
    console.error("Tavily fetch failed:", e);
    return "";
  }
}

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
    const totalMessageLength = safeMessages.reduce((sum, m) => sum + m.content.length, 0);
    if (totalMessageLength > MAX_TOTAL_MESSAGE_LENGTH) {
      return jsonResponse(origin, 400, { error: "Диалог слишком длинный для одного запроса" });
    }

    const filters = Array.isArray(body.filters) ? body.filters.map(String).slice(0, 12) : [];
    const tasteProfile = typeof body.tasteProfile === "string" ? body.tasteProfile.slice(0, 6000) : "";
    const watchedMovies = Array.isArray(body.watchedMovies) ? body.watchedMovies.slice(0, MAX_MOVIES) : [];
    const watchlistMovies = Array.isArray(body.watchlistMovies) ? body.watchlistMovies.slice(0, MAX_MOVIES) : [];

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const DEEPSEEK_MODEL = Deno.env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL;

    // Use the last user message as the search query to fetch fresh movie data.
    const lastUserMsg = safeMessages.filter(m => m.role === "user").at(-1)?.content ?? "";

    // Map Russian award/event term roots to English so Tavily finds English-language sources.
    // Use word roots (not full words) to handle declensions: каннский, берлинале, etc.
    const awardTermMap: [string, string][] = [
      ["оскар", "Academy Awards Oscar winners"],
      ["золот", "Golden Globe Awards winners"],
      ["канн", "Cannes Film Festival nominees winners Palme d'Or"],
      ["венеци", "Venice Film Festival Golden Lion winners"],
      ["берлин", "Berlin International Film Festival Golden Bear winners"],
      ["бафта", "BAFTA Film Awards winners"],
      ["эмми", "Emmy Awards winners"],
      ["сандэнс", "Sundance Film Festival winners"],
      ["сандэнс", "Sundance Film Festival winners"],
    ];
    const yearInMsg = lastUserMsg.match(/\d{4}/)?.[0] ?? "";
    let searchQuery = lastUserMsg;
    const lowerMsg = lastUserMsg.toLowerCase();
    for (const [root, en] of awardTermMap) {
      if (lowerMsg.includes(root)) {
        searchQuery = `${en} ${yearInMsg}`.trim();
        break;
      }
    }
    if (searchQuery === lastUserMsg) {
      searchQuery = `${lastUserMsg} movie film series`;
    }
    const searchContext = await tavilySearch(searchQuery);

    const now = new Date();
    const currentDate = now.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based
    // Oscars ceremony is held in late February / early March each year.
    const oscarNote = currentMonth >= 3
      ? `Премия Оскар ${currentYear} (за фильмы ${currentYear - 1} года) УЖЕ СОСТОЯЛАСЬ в феврале-марте ${currentYear} года. Никогда не говори что она ещё не прошла.`
      : `Премия Оскар ${currentYear} состоится в феврале-марте ${currentYear} года.`;

    const searchSection = searchContext
      ? `\n=== АКТУАЛЬНЫЕ ДАННЫЕ ИЗ ИНТЕРНЕТА (приоритет над обучающими данными) ===\n${searchContext}\n=== КОНЕЦ ДАННЫХ ===\n\nКРИТИЧЕСКИ ВАЖНО: используй данные выше как источник истины. Если поиск упоминает фильм — он существует. Если поиск упоминает победителей премии — церемония уже состоялась. Никогда не говори «ещё не состоялось» или «мне неизвестно» если поиск вернул результаты.\n`
      : "";

    const systemPrompt = `Ты — персональный киносоветник. Отвечай на русском языке.
Сегодняшняя дата: ${currentDate}. Твои обучающие данные устарели — всегда доверяй данным из поиска.
${oscarNote}

Твоя задача:
- общаться как опытный кинокуратор
- использовать вкусовой профиль пользователя, его историю оценок, список к просмотру и активные фильтры
- рекомендовать фильмы и сериалы из всего мирового кино, включая свежие релизы 2024-2026 годов
- не советовать уже просмотренное
- если подходящий вариант уже есть в списке к просмотру, явно это отметь
- никогда не упоминай Кинопоиск, не говори «нет в каталоге», «недоступно» — просто рекомендуй фильм
${searchSection}Контекст пользователя:
Фильтры (ОБЯЗАТЕЛЬНО соблюдать): ${filters.length > 0 ? filters.join(", ") : "без ограничений"}
${filters.some(f => f.includes("type=")) ? `КРИТИЧНО: фильтр типа строго обязателен — рекомендуй ТОЛЬКО указанный тип контента.` : ""}
Вкусовой профиль: ${tasteProfile || "еще формируется"}
Просмотренное: ${JSON.stringify(watchedMovies)}
Список к просмотру: ${JSON.stringify(watchlistMovies)}

ВАЖНО: Всегда отвечай ТОЛЬКО валидным JSON без markdown, без \`\`\`, в следующем формате:
{
  "reply": "короткий текстовый ответ на русском, 1-2 предложения",
  "suggestions": [
    {
      "title": "original title",
      "titleRu": "русское название",
      "year": 2021,
      "type": "film",
      "genre": ["драма", "триллер"],
      "duration": 120,
      "director": "Имя Режиссёра",
      "description": "краткий синопсис 2-3 предложения",
      "reasonToWatch": "почему это подходит пользователю",
      "mood": ["задумчивое"],
      "timeOfDay": ["evening"],
      "format": "medium",
      "forCompany": "any",
      "kpRating": 7.8,
      "country": "США",
      "predictedRating": 8.1
    }
  ]
}

Правила:
- suggestions: 1 фильм если вопрос конкретный, 2-3 если пользователь просит варианты
- reply: только короткое вступление, детали в карточках
- все поля обязательны
- type: только "film", "series" или "miniseries"
- format: только "short", "medium" или "long"
- forCompany: только "solo", "pair", "group" или "any"
- timeOfDay: массив из "morning", "afternoon", "evening", "night"
- только русские слова в тексте`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...safeMessages,
        ],
        stream: false,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek error:", response.status, errorText);

      if (response.status === 429) {
        return jsonResponse(origin, 429, { error: "Слишком много запросов, попробуйте позже." });
      }

      return jsonResponse(origin, 500, { error: "Ошибка DeepSeek API" });
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };

    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      return jsonResponse(origin, 500, { error: "DeepSeek вернул пустой ответ" });
    }

    // Убираем markdown-обёртку если есть
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: { reply?: string; suggestions?: unknown[] };
    try {
      parsed = JSON.parse(clean);
    } catch {
      return jsonResponse(origin, 200, {
        message: raw,
        suggestions: [],
      });
    }

    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : raw;
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    return jsonResponse(origin, 200, {
      message: reply,
      suggestions,
    });

  } catch (error) {
    console.error("deepseek-chat error:", error);
    return jsonResponse(origin, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});