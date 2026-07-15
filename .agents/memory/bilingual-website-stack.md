---
name: Bilingual website stack
description: Key decisions and constraints for Mohammad Ghanayem's personal website + CMS (personal-website artifact + api-server artifact)
---

# Bilingual Personal Website Stack

## Architecture
- Public site: `artifacts/personal-website` (React + Vite, Tailwind, Wouter) at previewPath `/`
- API server: `artifacts/api-server` (Express 5, Drizzle ORM, PostgreSQL) at `/api`
- Session: `express-session` + `connect-pg-simple` (PostgreSQL session store, table auto-created)
- Auth: bcrypt (rounds=12); seeded admin account must be rotated on first login
- File uploads: multer → `/public/uploads` (dev) or `artifacts/personal-website/dist/public/uploads` (prod)

## Languages
- Arabic primary: `/` and `/p/:slug`, dir="rtl", font=Cairo
- English secondary: `/en/` and `/en/p/:slug`, dir="ltr", font=Inter
- Language context: `useLang()` hook, driven by URL path prefix

## Section types
All 7 types are in both DB, OpenAPI spec enum, and the frontend renderer:
`hero`, `text`, `text_with_image`, `image_gallery`, `cards_grid`, `timeline`, `contact_strip`

## XSS sanitization (defense-in-depth)
- Backend write path: `artifacts/api-server/src/lib/sanitize.ts` uses `xss` package, applied in sections create/update routes.
- Frontend render path: `dompurify` wraps all `dangerouslySetInnerHTML` calls in `RenderSection.tsx`.
- Allowlist: common formatting tags only — no script, iframe, style, event handlers.

## Seed
Run with: `pnpm --filter @workspace/scripts run seed`
- Creates one admin user (default credentials must be changed on first login) and all homepage sections
- Safe to re-run (skips if data already exists)

**Why:** bcrypt requires `onlyBuiltDependencies` entry in pnpm-workspace.yaml or build is skipped.

## Security decisions
- CORS origin locked to `REPLIT_DEV_DOMAIN` / `ORIGIN` env vars; `origin: false` if neither is set
- Cookie: `sameSite: "lax"` + `httpOnly: true` + `secure` in production
- CSRF guard: middleware in `app.ts` rejects cross-origin state-changing requests via Origin header check
- XSS: `xss` package on backend write path; `dompurify` on frontend render path
