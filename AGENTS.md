# Контекст проекта для Claude

> **Правило для Claude**: Читай этот файл в начале чата. В конце чата — обновляй раздел «Открытые баги»: убирай то что пофикшено, добавляй новые. Костяк файла (инфраструктура, стек, среда) не трогай — только если реально что-то добавилось или изменилось.

---

## Инфраструктура (настроена, не трогать)

### Хостинг
- **Фронтенд**: Vercel — подключён к GitHub, деплоит автоматически при пуше в `main`
- **Бэкенд**: Supabase Edge Functions — деплоит автоматически через GitHub Actions
- **БД и Auth**: Supabase, проект `ovhwxfdtkzwxfomdlgjv`
- **Репо**: github.com/arsid0305/kino-app, основная ветка `main`

### GitHub Actions (автоматический деплой)
- `.github/workflows/deploy.yml` — деплоит Edge Functions при изменении `supabase/functions/**`
- `.github/workflows/automerge.yml` — автомержит любую ветку в `main`
- Секрет: `SBP_ACCESS_TOKEN` (Supabase Access Token) — уже добавлен в GitHub Secrets
- Права Actions: Read and write permissions — включены

### API ключи (уже в Supabase Secrets)
- `ANTHROPIC_API_KEY` ✅
- `OPENAI_API_KEY` ✅
- `GOOGLE_API_KEY` ✅
- `DEEPSEEK_API_KEY` ✅
- `TAVILY_API_KEY` (опционально)

---

## Стек приложения

- **Фронтенд**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **Анимации**: Framer Motion
- **БД**: Supabase (таблицы: `user_movies`, `chat_messages`)
- **Auth**: Supabase Auth (email OTP + анонимный)
- **Edge Functions** (Deno):
  - `ai-chat` — мультипровайдерный AI чат (Claude / GPT / Gemini / DeepSeek)
  - `movie-recommendation` — подбор фильмов через DeepSeek

---

## Среда Claude (что доступно в чате)

| Инструмент | Статус |
|-----------|--------|
| Node.js v22 | ✅ |
| npm v10 | ✅ |
| Git v2.43 | ✅ |
| Vite v8 | ✅ |
| Supabase CLI | ❌ Не работает |
| Deno | ❌ Не установлен |
| node_modules | ❌ Нет |
| .env реальный | ❌ Только .env.example |

Claude может писать и пушить код. Собрать фронтенд и задеплоить функции вручную — не может. Всё через GitHub Actions + Vercel автоматически.

---

## Рабочий процесс

1. Claude пишет код → пушит в `main`
2. Vercel деплоит фронтенд автоматически (1-2 мин)
3. GitHub Actions деплоит Edge Functions автоматически (1-2 мин)
4. Тестируем на проде

---

## Открытые баги

- **Claude 400 в чате** — должен исчезнуть сам после автодеплоя через Actions. Если нет — проверить что в Supabase задеплоена версия без prefill (коммит после `57b2afc`)

---

## Папка проекта на машине пользователя

```
C:\DATA\AI_OS\projects\Kino
```
