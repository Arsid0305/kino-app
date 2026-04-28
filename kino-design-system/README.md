# КИНО — Kino Design System

## Overview

**Kino** (Screen Suggestion Star) is a Russian-language mobile-first PWA for personalised movie and TV recommendations. Users set mood/context filters, tap a button, and get an AI-powered suggestion drawn from their personal watch history and watchlist. A floating AI chat advisor (supporting Claude, GPT-4o, Gemini, and DeepSeek) lets users ask free-form questions. The library syncs to Supabase for cross-device access.

**Product surfaces:**
- Mobile web app (max-width 448px, single-page, dark cinema theme)
- Progressive Web App (installable, iOS safe-area aware)

**Source repo:** `github.com/Arsid0305/kino-app` (main branch)

---

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- Framer Motion (animations)
- Lucide React (icons)
- Supabase Auth + Postgres + Edge Functions
- OpenAI / Anthropic / Google / DeepSeek APIs (via Edge Functions)

---

## Content Fundamentals

**Language:** Russian throughout. All UI labels, filter names, status messages, and CTAs are in Russian.

**Tone:** Direct, warm, minimal. Short phrases. No marketing fluff. The app speaks like a knowledgeable friend — not a sales funnel.

**Casing:** Headings use `Bebas Neue` ALL-CAPS. Body text is sentence case. Button labels in the primary action are ALL-CAPS (e.g. `ПОДОБРАТЬ ФИЛЬМ`, `ИЩУ ФИЛЬМ...`). Section labels use `text-xs font-semibold uppercase tracking-widest`.

**Voice:** Second-person informal ("ты", not "Вы"). Examples from the codebase:
- _"Спроси, что посмотреть."_
- _"Я отвечаю только про фильмы, сериалы, мультфильмы и похожий видеоконтент."_
- _"Пришлём код на email — вводишь его здесь, никаких браузеров."_
- _"Войдите, чтобы синхронизировать базу"_

**Emoji:** Used as icons inside filter chips (e.g. 🎬 🌅 🌙 💪 😂) — but only in these filter contexts. Not used decoratively in prose.

**Error messages:** Short and informative. Toast notifications for async failures.

**Numbers:** Ratings shown as `КП 7.8`, predicted rating as `Прогноз: 8.2`.

**Vibe:** Cinema-obsessed, slightly editorial, unpretentious. A Letterboxd for people who want fast answers.

---

## Visual Foundations

### Colors
Dark cinema palette. One background, one amber-gold primary, no light mode.

| Token | HSL | Approx Hex | Role |
|---|---|---|---|
| `--background` | 220 20% 6% | `#0d1117` | Page background |
| `--foreground` | 40 20% 92% | `#ece9e0` | Body text |
| `--card` | 220 18% 10% | `#141920` | Card backgrounds |
| `--primary` | 38 90% 55% | `#f3a825` | Gold accent, CTAs, active states |
| `--primary-foreground` | 220 20% 6% | `#0d1117` | Text on primary |
| `--secondary` | 220 15% 16% | `#222833` | Secondary surfaces, pill tabs |
| `--secondary-foreground` | 40 15% 80% | `#d6d0c4` | Secondary text |
| `--muted` | 220 15% 14% | `#1e242e` | Muted backgrounds |
| `--muted-foreground` | 220 10% 50% | `#787e8a` | Placeholder/hint text |
| `--accent` | 38 70% 45% | `#c9841a` | Darker amber, accents |
| `--border` | 220 15% 18% | `#262d38` | Dividers and outlines |
| `--destructive` | 0 70% 50% | `#e53e3e` | Error / destructive actions |
| `--cinema-glow` | 38 90% 55% | `#f3a825` | Box-shadow glow color |
| `--cinema-warm` | 25 80% 50% | `#e07420` | Warm accent, gradient |
| `--cinema-surface` | 220 18% 12% | `#181f28` | Elevated surfaces |
| `--cinema-highlight` | 220 15% 20% | `#2a3240` | Highlights / hover bg |

### Typography
- **Display / Headings (h1, h2, h3):** `Bebas Neue` — bold, all-caps, `letter-spacing: 0.04em`. Used for movie titles, section headers, the app logo.
- **Body / UI:** `Inter` — 300/400/500/600/700 weights. Clean, legible at small sizes.
- Both fonts served from Google Fonts CDN.

**Type scale used in-app:**
| Usage | Class | Size |
|---|---|---|
| App logo | `font-display text-2xl` | 24px |
| Movie title | `font-display text-2xl` | 24px |
| CTA button | `font-display text-xl` | 20px |
| AI advisor header | `font-display text-lg` | 18px |
| Body text | `text-sm` | 14px |
| Metadata / tags | `text-xs` | 12px |
| Micro labels | `text-[10px]` | 10px |

### Spacing & Layout
- Max content width: `448px` (max-w-md) centred
- Horizontal padding: `16px` (px-4)
- Card padding: `20px` (p-5)
- Card inner gap: `12px` (space-y-3)
- Section gap: `24px` (space-y-6)
- Border radius: `0.75rem` (12px) for most components; `1rem` (16px) for large cards/modals; `xl` = 12px, `2xl` = 16px, `full` for pills

### Backgrounds & Surfaces
- Page: flat dark (`--background`)
- Cards: slightly lighter (`--card`) with `border border-border`
- Glass surface (navbar, chat panel header): `backdrop-filter: blur(20px)`, `background: hsl(220 18% 10% / 0.8)`
- Card image area: gradient `from-primary/20 via-cinema-surface to-cinema-highlight`

### Shadows & Glow
- **cinema-glow:** `box-shadow: 0 0 30px -5px hsl(38 90% 55% / 0.2)` — used on active cards and primary button
- **cinema-text-glow:** `text-shadow: 0 0 20px hsl(38 90% 55% / 0.4)` — used sparingly on headings
- No elevation shadow system; depth is implied by background color delta only

### Animation
- Powered by **Framer Motion**
- `whileTap={{ scale: 0.95 }}` — all interactive buttons
- `whileTap={{ scale: 0.97 }}` — large primary CTA
- Tab/panel transitions: `opacity: 0 → 1`, `x: ±20` over default Framer spring
- Movie card entry: `opacity: 0, y: 30, scale: 0.95 → 1` over `0.4s ease-out`
- Movie card exit: `opacity: 0, y: -20, scale: 0.95`
- AI chat panel: `y: 40 → 0, opacity: 0 → 1`
- `pulse-glow`: `opacity 0.6 → 1 → 0.6` over `2s ease-in-out infinite`
- No complex spring configs; mostly `ease-out` and default Framer springs

### Hover / Press States
- Buttons: `transition-all duration-200`, hover shows `hover:border-muted-foreground/40` or `hover:bg-secondary/60`
- Active filter chips: `bg-primary/15 border-primary text-primary` + cinema-glow
- No hover colour changes on text links (opacity dimming instead)

### Corner Radii
- `rounded-xl` (12px): most chips, inputs, small buttons
- `rounded-2xl` (16px): cards, modals, major panels
- `rounded-full`: circular FABs
- `rounded-lg` (12px = `--radius`): tabs, pill selectors

### Cards
- Background: `bg-card` (`hsl(220 18% 10%)`)
- Border: `border border-border`
- Radius: `rounded-2xl`
- Glow: `cinema-glow` class (on active/recommended cards)
- No drop shadow; depth via border + background delta

### Imagery
- No real movie poster images in the codebase — the `Film` icon from Lucide is used as placeholder art
- Gradient header in cards: `bg-gradient-to-br from-primary/20 via-cinema-surface to-cinema-highlight`
- App icon uses clapperboard motif (SVG) in amber-gold on dark background

### Blur & Transparency
- Glass surface: `backdrop-filter: blur(20px)` — used only on the sticky nav and chat panel
- `glass-surface` utility: `bg-card/0.8 + blur`

### Colour of Imagery
- No real imagery in use; designed for warm/amber tones if posters are added

---

## Iconography

**Library:** Lucide React (stroke-based, 1.5-2px stroke, 16–24px, consistent feather-like style)

**Icons used in-app:**
| Icon | Usage |
|---|---|
| `Clapperboard` | App logo/header mark |
| `Sparkles` | "Подбор" tab, AI advisor header |
| `History` | "История" tab |
| `Bot` | AI chat FAB |
| `Film` | Movie card placeholder |
| `Star` | Watchlist/rating CTA, KP rating display |
| `Clock` | Movie duration |
| `User` | Director metadata |
| `Cloud` | Auth panel sync status |
| `LogOut` | Sign out |
| `Mail` | Email input field |
| `Send` | Chat submit |
| `Loader2` | Loading spinner (animated spin) |
| `Trash2` | Clear chat history |
| `X` | Close modal/panel |

**Usage rules:**
- Always inline SVG via Lucide component
- Size classes: `w-3.5 h-3.5` (metadata), `w-4 h-4` (buttons), `w-5 h-5` (nav), `w-6 h-6` (FAB)
- Colour: inherits from text colour or explicit `text-primary`, `text-muted-foreground`
- No emoji used as icons outside filter chips
- No custom hand-drawn SVG icons; all from Lucide

**App logo:** Custom SVG clapperboard — dark rect background (`#0f1218`), amber-gold (`#f3a825`) film-strip top and film-reel body. See `assets/logo.svg`.

---

## File Index

```
README.md               — this file
SKILL.md                — agent skill descriptor
colors_and_type.css     — CSS custom properties (color tokens + type scale)

assets/
  logo.svg              — app clapperboard icon (SVG)
  icon_192.png          — PWA icon 192×192
  icon_512.png          — PWA icon 512×512

preview/
  colors-base.html      — base color palette swatches
  colors-semantic.html  — semantic color tokens
  type-display.html     — Bebas Neue display type specimens
  type-body.html        — Inter body / UI type scale
  spacing-tokens.html   — border-radius + spacing tokens
  shadows-glow.html     — glow / shadow system
  component-buttons.html     — button variants
  component-chips.html       — filter chips
  component-cards.html       — movie card
  component-auth.html        — auth panel
  component-chat.html        — AI advisor chat panel
  component-nav.html         — navigation bar + tabs
  brand-logo.html            — logo + icon showcase

ui_kits/
  kino-app/
    README.md           — UI kit notes
    index.html          — interactive prototype (main recommend screen)
    MovieCard.jsx       — movie card component
    FilterChip.jsx      — filter chip component
    AiAdvisor.jsx       — AI chat panel component
    AuthPanel.jsx       — auth panel component
    WatchHistory.jsx    — watch history component
```
