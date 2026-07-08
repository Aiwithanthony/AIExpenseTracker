# ExpenseTracker — Project Guide

AI-powered expense tracker monorepo: `backend/` (NestJS 11 + TypeORM + Neon Postgres),
`mobile/` (Expo SDK 54 / React Native), `admin-dashboard/` (React + Vite + Tailwind v4),
`shared/types.ts` (shared TS types). Clients call the backend REST API on port 3000 (no URL prefix).

## Skill library — read the matching skill BEFORE starting work

Project skills live in `.claude/skills/`. They encode the project's engineering standard;
follow them rather than improvising:

| Task | Skill |
|---|---|
| Orienting in the codebase, "where does X live" | `project-map` |
| Running the apps, connection/IP problems, stale processes | `run-and-debug` |
| Entities, schema changes, migrations, DB queries | `db-and-migrations` |
| Adding/extending backend endpoints or modules | `backend-feature-recipe` |
| Building/modifying mobile screens or API calls | `mobile-ui-conventions` |
| Auth flows, admin access, security-sensitive changes | `auth-and-security` |
| Voice/receipt/chat AI features, OpenAI errors | `ai-pipelines` |
| Stripe, premium subscriptions, upgrade flow | `payments-and-premium` |
| Telegram / WhatsApp / Google OAuth setup & debugging | `integrations` |
| Verifying ANY change before calling it done | `verification-playbook` |

## Non-negotiable rules (details + rationale in the skills)

1. **Verify before claiming done** — run the ladder in `verification-playbook` (typecheck/build per
   project, boot + curl smoke tests for backend changes). Never report success without real output.
2. **The Neon database holds real user data.** No destructive SQL without explicit user consent.
3. **Security invariants** (see `auth-and-security`): admin routes need `AdminGuard`; uploads are served
   only through the authenticated `UploadsController`; all webhooks verify authenticity (Stripe signature,
   WhatsApp HMAC, Telegram secret token); Telegram linking uses one-time codes; no fallback JWT secrets;
   never commit `.db` files or `.env`.
4. **Every `decimal` column needs `DecimalTransformer`; nullable `Date | null` columns need an explicit
   `type: 'timestamp'`** (see `db-and-migrations` for why).
5. **New request fields must be declared in DTOs** — the global ValidationPipe rejects/strips undeclared
   fields silently.
6. **Mobile: use theme tokens, never hardcode colors**; all HTTP through `mobile/src/services/api.ts`;
   don't render a custom in-screen title on screens that already have a native stack header.
7. **Register new entities in `backend/src/database/entities.ts`** or they silently don't exist.

## Quick start

```bash
# backend (kill stale first — old processes on :3000 are a recurring trap)
lsof -ti:3000 | xargs kill; cd backend && npm run start:dev
# admin dashboard → http://localhost:5173 (login requires an isAdmin user)
cd admin-dashboard && npm run dev
# mobile (phone on same Wi-Fi; EXPO_PUBLIC_API_URL in mobile/.env = your LAN IP)
cd mobile && npx expo start
```

Known state: OpenAI quota exhausted (AI features 503 until billing added); Stripe/WhatsApp keys empty
(code complete); Android OAuth client not yet created. See `.env.example` files for every key.
