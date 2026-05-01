# Передача контекста — Kino App
> Этот файл создан в конце сессии. Прочитай его целиком перед началом работы.

---

## Проект

**Kino App** — персональный AI-рекомендатор фильмов на русском языке.
- Прод: https://kino-app-eight.vercel.app
- Репо: github.com/Arsid0305/kino-app
- Supabase проект: `ovhwxfdtkzwxfomdlgjv`

---

## Стек

- React + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Supabase (БД: `user_movies`, `chat_messages`) + Auth (email OTP + анонимный)
- Edge Functions (Deno): `ai-chat`, `movie-recommendation`
- AI провайдеры: Claude (claude-sonnet-4-6) / GPT (gpt-4.1 или новее) / Gemini (gemini-2.5-flash) / DeepSeek (deepseek-chat)
- Деплой: Vercel (фронт) + GitHub Actions (Edge Functions)

---

## Автоматизация (настроена, не трогать)

- `.github/workflows/automerge.yml` — любая ветка автоматически мержится в `main`
- `.github/workflows/deploy.yml` — деплоит Edge Functions при изменении `supabase/functions/**`
- Vercel деплоит фронт автоматически при пуше в `main`
- Секрет `SBP_ACCESS_TOKEN` уже в GitHub Secrets

**Рабочий процесс:**
1. Claude пишет код → пушит в ветку
2. automerge.yml мержит в main
3. Vercel + GitHub Actions деплоят (1-2 мин)
4. Тестируем на проде

---

## Design System

- Отдельный репо: `github.com/Arsid0305/design-system`
- Подключён как git submodule в папку `kino-design-system/`
- Файлы kino-app лежат в `kino-design-system/kino-app/preview/`
- При UI-правках ВСЕГДА читать соответствующий html-файл из этой папки

| Что меняешь | Файл |
|-------------|------|
| Карточки | `kino-design-system/kino-app/preview/component-cards.html` |
| Кнопки | `kino-design-system/kino-app/preview/component-buttons.html` |
| Чипы, теги | `kino-design-system/kino-app/preview/component-chips.html` |
| Шапка, табы | `kino-design-system/kino-app/preview/component-nav.html` |
| Чат AI | `kino-design-system/kino-app/preview/component-chat.html` |
| Авторизация | `kino-design-system/kino-app/preview/component-auth.html` |
| Цвета | `kino-design-system/kino-app/preview/colors-base.html` |

---

## Что сделано в последних двух сессиях

### Баги
- ✅ Dismissed movies не фильтровались в локальном движке (`getRecommendation` принимает 4-й параметр)
- ✅ Тип `miniseries` добавлен в MovieTypes
- ✅ RatingModal всегда показывал 7 — теперь берёт реальный рейтинг из `movie.rating`
- ✅ Mood-теги на карточках были на английском (HAPPY/CALM) — теперь через `MOOD_OPTIONS` lookup → русские
- ✅ Описания от AI были на английском — усилены промпты в обоих Edge Functions
- ✅ Gemini возвращал пустой ответ — фильтруем `thought`-части в ответе gemini-2.5-flash
- ✅ GPT "Load failed" — модель требует `max_completion_tokens`, не `max_tokens` (оставлено `useCompletionTokens=true`)

### UI
- ✅ Фильтры-чипы переведены на grid-layout (`cols` prop в FilterSection)
- ✅ Жанры: 3 колонки (3 строки × 3), Настроение: 3 колонки (2 строки × 3), Время/Контекст: в 1 строку
- ✅ Жанр «Документальный» удалён, добавлены «Спорт» и «Исторический»
- ✅ Кнопка «Буду смотреть» в AI-чате → «Смотрю!» со звёздочкой (как в предлагаторе)

### Чистка репо
- ✅ Удалены: `CLAUDE_CONTEXT.md`, `AGENTS.md`, `package-lock.json`
- ✅ Удалены мусорные иконки: `1.ico`, `2.ico`, `icon_192.png`, `icon_512.png`, `icon_ios.png`, `icon_rounded.png`, `placeholder.svg`
- ✅ `kino-design-system` стал git submodule (отдельный репо)
- ✅ Создан `CLAUDE_TEMPLATE.md` — шаблон для новых проектов

---

## Среда Claude

| Инструмент | Статус |
|-----------|--------|
| Node.js v22 | ✅ |
| npm v10 | ✅ |
| Git v2.43 | ✅ |
| Supabase CLI | ❌ Не работает |
| Deno | ❌ Не установлен |
| node_modules | ❌ Нет |
| .env реальный | ❌ Только .env.example |
| kino-design-system файлы | ❌ Submodule не загружен локально |

---

## Незавершённая чистка (следующие шаги, низкий риск)

### Шаг 1 — мёртвые компоненты (никуда не импортируются)
```
src/components/MovieListSheet.tsx
src/components/NavLink.tsx
src/hooks/use-mobile.tsx
```

### Шаг 2 — неиспользуемые shadcn/ui компоненты
Папка `src/components/ui/` — оставить только:
`button, dialog, input, label, separator, sheet, skeleton, sonner, toast, toaster, toggle, tooltip`
Остальные ~36 файлов удалить.

### Шаг 3 — устаревшие Edge Functions
- `supabase/functions/deepseek-chat/` — заменена функцией `ai-chat`
- `supabase/functions/openai-chat/` — заменена функцией `ai-chat`
⚠️ Сначала удалить в Supabase Dashboard, потом из репо.

---

## Правила работы

- Одно изменение за раз. Сначала план — потом действие.
- Не трогать `.cursorrules` — используется Cursor.
- Не выдумывать UI — только из design system.
- Перед UI-правками читать `kino-design-system/kino-app/preview/`.
- Пушить в ветку `claude/...`, automerge сделает остальное.
- Не создавать документацию без запроса.

---

## Папка на компе пользователя

```
C:\DATA\AI_OS\projects\Kino
```
Синхронизация: `git pull origin main`
