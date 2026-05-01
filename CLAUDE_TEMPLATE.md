# CLAUDE.md — Шаблон для нового проекта

> **Правило для Claude**: Читай этот файл в начале каждого чата.
> В конце чата — обновляй раздел «Открытые баги»: убирай пофикшенное, добавляй новые.
> Инфраструктуру и стек не трогай без реальных изменений в проекте.

---

## Правила работы

### Общие
- Одно изменение за раз. Сначала план — потом действие.
- Не добавлять фичи, рефакторинг и абстракции сверх задачи.
- Не добавлять обработку ошибок для невозможных ситуаций.
- Комментарии в коде — только если «почему» неочевидно. Не объяснять «что делает код».
- Не трогать `.cursorrules` — используется Cursor.
- Не создавать README и документацию без явного запроса.
- Не выдумывать UI с нуля — брать из design system (папка `design-system/[PROJECT_NAME]/preview/`).

### Git
- Разрабатывать на ветке, указанной в задаче (обычно `claude/...`).
- После пуша — всегда создавать Draft PR, если его нет.
- Никогда не пушить в `main` напрямую без разрешения.
- Никогда не пропускать хуки (`--no-verify`).
- Для синхронизации с main: `git pull origin main` (не rebase).

### UI-правки
- Перед любым изменением UI — открыть соответствующий файл из `design-system/[PROJECT_NAME]/preview/`.
- Если пользователь говорит «не похоже» / «как на телефоне» / «как было» — нарушено это правило, идти в design system.

Структура design system репо (`github.com/Arsid0305/design-system`):
```
design-system/
├── kino-app/       ← папка для kino-app
│   ├── preview/    ← HTML-файлы компонентов
│   ├── ui_kits/    ← JSX-компоненты
│   └── assets/     ← иконки, лого
├── [PROJECT_NAME]/ ← папка для нового проекта
│   └── preview/
└── ...
```

Подключить в проект: `git submodule add https://github.com/Arsid0305/design-system.git design-system`
Обновить: `git submodule update --remote`

| Что меняешь | Файл |
|-------------|------|
| Карточки | `[PROJECT_NAME]/preview/component-cards.html` |
| Кнопки | `[PROJECT_NAME]/preview/component-buttons.html` |
| Чипы, теги | `[PROJECT_NAME]/preview/component-chips.html` |
| Шапка, табы | `[PROJECT_NAME]/preview/component-nav.html` |
| Чат AI | `[PROJECT_NAME]/preview/component-chat.html` |
| Авторизация | `[PROJECT_NAME]/preview/component-auth.html` |
| Цвета | `[PROJECT_NAME]/preview/colors-base.html` |
| Шрифты | `[PROJECT_NAME]/preview/type-display.html` |
| Тени | `[PROJECT_NAME]/preview/shadows-glow.html` |
| Отступы | `[PROJECT_NAME]/preview/spacing-tokens.html` |

---

## Инфраструктура

### Хостинг
- **Фронтенд**: Vercel — подключён к GitHub, деплоит автоматически при пуше в `main`
- **Бэкенд**: Supabase Edge Functions — деплоит через GitHub Actions
- **БД и Auth**: Supabase, проект: `[PROJECT_REF]`
- **Репо**: github.com/Arsid0305/[REPO], основная ветка `main`

### GitHub Actions
- `.github/workflows/deploy.yml` — деплоит Edge Functions при изменении `supabase/functions/**`
- `.github/workflows/automerge.yml` — автомержит любую ветку в `main`
- Секрет `SBP_ACCESS_TOKEN` — добавить в GitHub → Settings → Secrets → Actions
- Права Actions: **Read and write permissions** — включить в Settings → Actions → General

### API ключи (добавить в Supabase → Settings → Edge Functions → Secrets)
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `DEEPSEEK_API_KEY`

### Design System
- Единый репо для всех проектов: `github.com/Arsid0305/design-system`
- Каждый проект — своя подпапка: `design-system/[PROJECT_NAME]/`
- Подключить в новый проект: `git submodule add https://github.com/Arsid0305/design-system.git design-system`
- Обновить: `git submodule update --remote`

---

## Стек

- **Фронтенд**: React + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Бэкенд**: Supabase Edge Functions (Deno)
- **БД**: Supabase Postgres
- **Auth**: Supabase Auth (email OTP + анонимный)
- **AI**: Claude (Anthropic) / GPT-4o (OpenAI) / Gemini (Google) / DeepSeek

---

## Что доступно Claude в чате

| Инструмент | Статус |
|-----------|--------|
| Node.js v22 | ✅ |
| npm v10 | ✅ |
| Git v2.43 | ✅ |
| Supabase CLI | ❌ Не работает |
| Deno | ❌ Не установлен |
| node_modules | ❌ Нет |
| .env реальный | ❌ Только .env.example |

Claude может писать и пушить код. Собрать и задеплоить вручную — не может. Всё через GitHub Actions + Vercel автоматически.

---

## Рабочий процесс

1. Claude пишет код → пушит в ветку `claude/...`
2. `automerge.yml` мержит ветку в `main`
3. Vercel деплоит фронтенд автоматически (1-2 мин)
4. `deploy.yml` деплоит Edge Functions автоматически (1-2 мин)
5. Тестируем на проде

**Локальная синхронизация** (запустить `pull.bat` на компе):
```bat
@echo off
cd /d C:\DATA\AI_OS\projects\[PROJECT_NAME]
git pull origin main
pause
```

---

## Файлы автоматизации

### `.github/workflows/automerge.yml`
```yaml
name: Auto-merge feature branches
on:
  push:
    branches-ignore:
      - main
jobs:
  automerge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      - name: Merge into main
        run: |
          git config user.email "actions@github.com"
          git config user.name "GitHub Actions"
          git checkout main
          git merge --no-ff ${{ github.ref_name }} -m "Auto-merge ${{ github.ref_name }} into main"
          git push origin main
```

### `.github/workflows/deploy.yml`
```yaml
name: Deploy Supabase Functions
on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase functions deploy [FUNCTION_NAME] --project-ref [PROJECT_REF]
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SBP_ACCESS_TOKEN }}
```

---

## Необходимые программы (на компе пользователя)

| Программа | Для чего |
|-----------|----------|
| Git | Синхронизация с репо (`git pull origin main`) |
| VS Code / Cursor | Редактор кода |
| Node.js v22+ | Локальная разработка |
| npm v10+ | Пакетный менеджер |
| GitHub аккаунт | Репо + Actions + Secrets |
| Vercel аккаунт | Деплой фронтенда (подключить к GitHub) |
| Supabase аккаунт | БД + Edge Functions + Auth + Secrets |

**Не нужно локально**: Deno, Supabase CLI — всё деплоится через GitHub Actions.

---

## Папка проекта на компе

```
C:\DATA\AI_OS\projects\[PROJECT_NAME]
```

---

## Открытые баги

_(пусто)_
