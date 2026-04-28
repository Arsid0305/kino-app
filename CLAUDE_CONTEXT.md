# Контекст проекта для Claude

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
- Права Actions: Read and write permissions — уже включены

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

## Среда Claude (что доступно в этом чате)

| Инструмент | Статус |
|-----------|--------|
| Node.js v22 | ✅ |
| npm v10 | ✅ |
| Git v2.43 | ✅ |
| Vite v8 | ✅ |
| Supabase CLI | ❌ Не работает |
| Deno | ❌ Не установлен |
| node_modules | ❌ Нет (npm install не запускался) |
| .env реальный | ❌ Только .env.example |

**Вывод**: Claude может писать и пушить код, но не может собрать фронтенд или задеплоить функции вручную. Всё через GitHub Actions + Vercel автоматически.

---

## Рабочий процесс

1. Claude пишет код и пушит в `main`
2. Vercel автоматически деплоит фронтенд (1-2 мин)
3. GitHub Actions автоматически деплоит Edge Functions (1-2 мин)
4. Тестируем на проде

**Ручного деплоя больше не нужно.**

---

## Нерешённые баги (на момент закрытия чата)

- Claude 400 prefill error — должен исчезнуть после автодеплоя через Actions
- Кнопка «Другой» — частично пофикшена (автозагрузка нового фильма)
- AI рекомендует просмотренные — пофикшено клиентской фильтрацией

---

## Папка проекта на машине пользователя

```
C:\DATA\AI_OS\projects\Kino
```
