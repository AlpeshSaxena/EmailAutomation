# MailFlow AI

Email automation platform for sending personalized bulk email campaigns via Gmail, with template management, recipient CSV upload, and real-time delivery tracking.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/mailflow run dev` — run the frontend (port 19570, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui, Wouter routing
- API: Express 5, mounted at `/api`
- DB: PostgreSQL + Drizzle ORM (4 tables: email_templates, campaigns, recipients, email_logs)
- Email: Gmail OAuth2 via googleapis
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks)
- Charts: Recharts
- CSV import: Papaparse

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema files (campaigns, email_templates, recipients, email_logs)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/gmail.ts` — Gmail OAuth2 send logic
- `artifacts/mailflow/src/pages/` — React page components
- `artifacts/mailflow/src/components/` — Layout and StatusBadge shared components

## Architecture decisions

- Contract-first API: OpenAPI spec drives codegen for both Zod schemas (server) and React Query hooks (frontend)
- Gmail sending is async — `/send` and `/retry` return immediately and process recipients in background via `setImmediate`
- Template personalization uses `{{variable}}` syntax, replaced at send time with recipient fields
- The generated API URLs already include `/api` prefix (from the OpenAPI spec `servers[0].url`), so `setBaseUrl` is NOT called in main.tsx
- All routes are mounted at `/api` on the api-server (Express: `app.use("/api", router)`)

## Product

- **Dashboard**: Stats overview (sent, failed, pending, campaigns, templates) + activity feed + 7-day bar chart
- **Campaigns**: Create/edit campaigns, import recipients from CSV, send/retry/test campaigns
- **Templates**: Rich HTML email templates with `{{variable}}` personalization and tag support
- **Email Logs**: Searchable/filterable log of all sent emails with status and error details
- **Gmail Setup**: Step-by-step guide to configure Gmail OAuth credentials

## Gmail Setup

Set these environment variables in Replit Secrets:
- `GOOGLE_CLIENT_ID` — OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET` — OAuth 2.0 Client Secret
- `GOOGLE_REFRESH_TOKEN` — OAuth 2.0 Refresh Token (Gmail send scope)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, always re-run codegen before touching frontend or backend code
- Do NOT call `setBaseUrl` in main.tsx — the generated URLs already include the `/api` prefix from the spec
- `pnpm --filter @workspace/db run push` applies schema to dev DB; production schema is managed by Replit Publish flow
- The `useGetTemplate` hook requires a `queryKey` in its options object (TanStack Query v5 requirement); pass `getGetTemplateQueryKey(id)` alongside `enabled`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
