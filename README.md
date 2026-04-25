# Screen Suggestion Star

Приложение для персонального подбора фильмов и сериалов с двумя режимами:

- Без подключения используется встроенная база фильмов
- глобальный AI-подбор по всему пространству фильмов, которые пользователь обычно ищет на Кинопоиске

Главная идея: пользователь импортирует свою историю и watchlist, хранит их в Supabase и получает рекомендации с любого устройства. OpenAI использует его оценки, любимые жанры, режиссеров, актеров, динамику, сложность и текущие фильтры, а не только локальную базу проекта.

## Что уже реализовано

- импорт `xlsx`, `csv`, `json`
- локальная история и watchlist
- дедупликация фильмов по `titleRu + year + type`
- вход по email magic link через Supabase Auth
- облачное хранение библиотеки пользователя в Supabase
- глобальная рекомендация через OpenAI + Supabase Edge Function
- AI-чат с учетом фильтров, истории и watchlist

## Стек

- Vite
- React
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + Edge Functions
- OpenAI API
- Vercel

## Локальный запуск

```sh
npm install
npm run dev
```

## Проверка

```sh
npm run build
npm test
```

## Клиентские переменные окружения

Скопируйте `.env.example` в `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Для Vercel эти же значения нужно добавить в Project Settings → Environment Variables.

## Что нужно создать в Supabase

1. Включить Auth provider для Email.
2. Настроить redirect URL на домен Vercel.
3. Применить SQL-миграцию:

```sql
supabase/migrations/20260423_cloud_sync.sql
```

Она создает таблицу `public.user_movies` с RLS для хранения:

- просмотренных фильмов
- оценок и заметок
- watchlist пользователя

## Edge Functions

В проекте есть две функции:

- `openai-chat` — AI-чат
- `movie-recommendation` — главный глобальный подбор

## Server-side secrets для Supabase

Добавьте в Supabase Secrets:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_REASONING_EFFORT=minimal
OPENAI_RECOMMENDATION_MODEL=gpt-4o-mini
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

## Deploy функций

```sh
supabase functions deploy openai-chat
supabase functions deploy movie-recommendation
```

## Важное ограничение

Глобальный подбор сейчас не использует официальный API Кинопоиска и не сканирует их каталог напрямую. Логика такая:

- OpenAI рекомендует фильм глобально по вкусовому профилю пользователя
- prompt заставляет выбирать фильмы, которые обычно можно найти или искать на Кинопоиске
- в карточке дается переход в поиск Кинопоиска

То есть это уже глобальный подбор по вкусу пользователя, но без жесткой серверной верификации наличия фильма в каталоге Кинопоиска. Если захочешь следующий шаг, нужно подключать отдельный источник каталога Кинопоиска или собственный индекс.
