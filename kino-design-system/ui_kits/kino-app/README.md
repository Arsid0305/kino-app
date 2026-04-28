# Kino App — UI Kit

Interactive prototype of the Kino mobile web app.

## Coverage
- Main recommendation screen (filter chips + CTA + movie card)
- Watch history tab
- Auth panel (email OTP + Google)
- AI Advisor floating chat panel
- Rating modal
- Movie list sheet (watchlist / dismissed)

## Design notes
- Max width: 448px (mobile-first, centred on desktop)
- Dark cinema theme only — no light mode
- Fonts: Bebas Neue (display), Inter (body) — Google Fonts CDN
- Icons: Lucide (inline SVG, stroke-based)
- Animations: CSS transitions replicating Framer Motion behaviour

## Files
- `index.html` — full interactive prototype
- `MovieCard.jsx` — movie recommendation card
- `FilterChip.jsx` — filter chip + section
- `AiAdvisor.jsx` — floating chat panel
- `AuthPanel.jsx` — auth / sign-in panel
- `WatchHistory.jsx` — history list

## Source
Recreated from `github.com/Arsid0305/kino-app` source code (main branch).
