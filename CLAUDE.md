# Контекст проекта для Claude

## ⛔ ГЛАВНОЕ ПРАВИЛО

**Никаких изменений без явного согласования с пользователем.**
Claude меняет только то, что обсудили и что пользователь подтвердил. Никаких инициативных правок, «заодно», рефакторинга или отката чужих решений.
Заметил баг или улучшение — сообщи и жди разрешения. Не трогай.

---

> **Правило для Claude**: Читай этот файл в начале чата. В конце чата — обновляй раздел «Открытые баги»: убирай то что пофикшено, добавляй новые. Костяк файла (инфраструктура, стек, среда) не трогай — только если реально что-то добавилось или изменилось.

---

## ⚠️ ОБЯЗАТЕЛЬНО ПРИ ЛЮБЫХ UI-ПРАВКАХ

**Перед изменением любого UI-компонента (карточки, кнопки, плашки, чипы, шапка, чат, формы)** — сначала прочитай соответствующий файл из папки `kino-design-system/kino-app/preview/`:

| Что меняешь | Файл в design system |
|-------------|---------------------|
| Карточка фильма (MovieCard, чат-карточки) | `kino-design-system/kino-app/preview/component-cards.html` |
| Кнопки (action buttons) | `kino-design-system/kino-app/preview/component-buttons.html` |
| Чипы (фильтры, теги жанров/настроений) | `kino-design-system/kino-app/preview/component-chips.html` |
| Шапка + табы + stat-карточки счётчиков | `kino-design-system/kino-app/preview/component-nav.html` |
| Чат-окно AI | `kino-design-system/kino-app/preview/component-chat.html` |
| Форма входа / OTP / профиль | `kino-design-system/kino-app/preview/component-auth.html` |
| Цвета, фоны, primary/secondary | `kino-design-system/kino-app/preview/colors-base.html`, `colors-semantic.html` |
| Шрифты (display/body) | `kino-design-system/kino-app/preview/type-display.html`, `type-body.html` |
| Тени, glow | `kino-design-system/kino-app/preview/shadows-glow.html` |
| Отступы | `kino-design-system/kino-app/preview/spacing-tokens.html` |

**Никогда не выдумывай UI с нуля.** Открой нужный файл, скопируй классы/токены, перевоплоти в Tailwind. Если пользователь говорит «как на телефоне» / «как было» / «не похоже» — точно нарушено это правило, иди в design system.

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
- **Excel-парсинг**: xlsx (runtime)
- **БД**: Supabase (таблицы: `user_movies`, `chat_messages`)
- **Auth**: Supabase Auth (email OTP + анонимный)
- **Edge Functions** (Deno):
  - `ai-chat` — мультипровайдерный AI чат (Claude / GPT / Gemini / DeepSeek)
  - `movie-recommendation` — подбор фильмов через DeepSeek

### devDependencies (не в рантайме)
- `@resvg/resvg-js` — конвертация SVG → PNG для генерации PWA-иконок (`public/icon-192.png`, `public/icon-512.png`). Запускать через `node scripts/...` при смене иконки.

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
| node_modules | ❌ Нет (есть package-lock.json, установить через `npm ci`) |
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

_(пусто — фикси по мере поступления)_

---

## Чистка репо — выполнено ✅

Всё из этого списка уже удалено:
- Мёртвые компоненты: `MovieListSheet`, `NavLink`, `use-mobile`
- Неиспользуемые shadcn/ui компоненты (~36 файлов)
- Устаревшие Edge Functions: `deepseek-chat`, `openai-chat`

---

## Папка проекта на машине пользователя

```
C:\DATA\AI_OS\projects\Kino
```
