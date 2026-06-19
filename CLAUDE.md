@AGENTS.md

# mims-dashboard

Web app with login where each business (client) sees and manages its own reservation
agent. Every business logs in and sees ONLY its own data: WhatsApp message history,
reservation calendar, and reservation management.

## Stack

- **Next.js** (App Router, `src/` dir) + **TypeScript** + **Tailwind**
- **Drizzle ORM** over **PostgreSQL** — the DB already exists (mims_app); we introspect
  it (`npm run db:pull`) rather than owning migrations. The only table this app owns is
  `users` (created in F1).
- **Auth: hand-rolled stateless session** (Next 16's documented pattern) — `jose`
  (HS256 JWT in an HttpOnly cookie) + `bcryptjs` for passwords + a DAL. NOT Auth.js:
  Next 16 renamed `middleware.ts` → `proxy.ts` and made `cookies()` async, and NextAuth
  v5 (beta) compatibility was a risk. Revisit Auth.js in v2 if OAuth/social login is needed.
- **FullCalendar** for the reservation calendar (day/week/month, drag-to-move).

### Auth / multi-tenant layout (F1)

- `src/lib/auth/session.ts` — jose encrypt/decrypt, cookie create/delete/read.
- `src/lib/auth/dal.ts` — `verifySession()` (redirects to /login), `getNegocioId()`,
  `getCurrentUser()`. **The DAL is the only sanctioned source of the tenant `negocioId`.**
- `src/lib/auth/actions.ts` — `login` / `logout` server actions.
- `src/proxy.ts` — Next 16 proxy (former middleware): optimistic cookie-only redirect.
  Real enforcement is the DAL, close to the data.
- `src/lib/db/auth-schema.ts` — the app-owned `users` table (kept out of `schema.ts`
  so `db:pull` won't clobber it). DDL in `db/users.sql`.
- Dev logins: `npm run db:seed:users` → one per negocio, `<slug>@demo.mims` / `demo1234`.

> Note: this Next.js version has breaking changes vs. older knowledge (see `@AGENTS.md`).
> Read `node_modules/next/dist/docs/` before writing Next.js code.

## v1 architecture: Postgres + Chatwoot

Two data sources:

- **Reservations** → read/write Postgres table `reservas`.
- **WhatsApp messages** → read/write the **Chatwoot Application API** (self-hosted at
  `https://inbox.mims.studio`). The old Postgres `historial` view was REPLACED by Chatwoot
  (the `src/lib/historial/*` code is left orphaned, not deleted). Retell/calls still v2.

### Chatwoot integration

- Server-side only. `CHATWOOT_BASE_URL` + `CHATWOOT_TOKEN` (super-admin api_access_token) in
  `.env.local`. The token can read EVERY account, so SECURITY rests on always using the
  `accountId` derived from the session — a foreign `conversation_id` yields a 404 (the
  cross-tenant guard, verified). Token never reaches the browser (no `NEXT_PUBLIC_`).
- Mapping: `negocios.chatwoot_account_id` (existing) + `negocios.chatwoot_inbox_id` (added,
  cache of the auto-detected WhatsApp inbox). A negocio with no account / no WhatsApp inbox
  (404, e.g. number released) renders "no configurado".
- `src/lib/chatwoot/`: `client.ts` (fetch + `ChatwootError` + server guard), `inboxes.ts`
  (detect WhatsApp inbox), `conversations.ts` (list open+pending), `messages.ts` (`getThread`),
  `tenant.ts` (`getNegocioChatwoot(negocioId)` resolver). Test: `npm run chatwoot:test`.
- "Live" = polling (`Poller`, 10s), no websockets in v1. Handoff = conversation `status`
  (open = human/bot quiet, pending = bot answers); `negocios.agente_activo` left separate.

## Multi-tenancy (CRITICAL — security)

Every query MUST be scoped by the `negocio_id` taken from the authenticated session.
NEVER trust a `negocio_id` (or any business identifier) sent by the client. The session
is the only source of truth for which business the user belongs to. A leak here means
business A sees business B's data.

`users.negocio_id` (FK → `negocios.id`) ties each login to exactly one business.

## Database

- Dev DB: **`mims_dashboard_dev`** in local Docker (postgres:16), host port **5433**.
- Loaded from `db/dump.sql` (+ `db/extensions.sql`: pgcrypto, pg_trgm, unaccent).
- `DATABASE_URL` in `.env.local` (git-ignored).
- Commands: `npm run db:up`, `npm run db:down`, `npm run db:pull`, `npm run db:smoke`.
- **NEVER connect to production.** No production credentials in this repo or any env file.

### Reservation states (`reservas.estado`)

`pendiente_confirmacion_cliente`, `confirmado`, `cancelado`, `descartado_cliente`.
Active (calendar-visible / overlap-counting) states are `confirmado` and
`pendiente_confirmacion_cliente`.

### Key tables

`negocios` (tenants), `users` (own, F1), `reservas`, `servicios`, `profesionales`,
`profesional_servicios`, `historial` (WhatsApp log), `agent_alerts` (escalations, no FK).

## Deployment (future, do last)

Self-hosted **VPS on Hetzner** with auto-deploy on git push (NOT Vercel). Connect to
Postgres with pooler + SSL as appropriate. Not set up yet.

## Current status

- **F0 — DONE:** Next.js + TS + Tailwind + Drizzle scaffolded; dev DB up from `db/dump.sql`;
  schema introspected to `src/lib/db/schema.ts`; smoke test reading `negocios` passes.
- **F1 — DONE:** `users` table (own) + email/password login (jose session, bcrypt) +
  multi-tenant session. Verified: unauth → /login; tampered cookie rejected; each tenant's
  `/dashboard` shows only its own negocio + reservas counts (no cross-tenant leak).
- **F2 — DONE:** read-only reservation calendar at `/dashboard/calendario` (FullCalendar v6,
  Spanish, color by estado, click→detail panel). `src/lib/reservas/queries.ts` reads `reservas`
  scoped by `negocioId`; `src/lib/reservas/estado.ts` holds shared estado labels/colors.
  Verified tenant isolation (each negocio sees only its reservas) + unauth guard, and the
  calendar grid confirmed working in the browser.
- **F3 — DONE:** reserva CRUD from the calendar — create (select slot / "Nueva reserva"
  modal), move (drag → `eventDrop`), cancel (detail panel). Server actions in
  `src/lib/reservas/actions.ts`; overlap guard in `src/lib/reservas/overlap.ts`. Every
  write is scoped by `negocioId` from the session AND re-checks the row belongs to the
  tenant. Overlap rule: same professional (by `profesional_id`, else `profesional` text)
  can't double-book on a date; also guards past dates. Overlap SQL verified by 5 scenarios
  (`src/lib/reservas/verify-f3.ts`). KNOWN LIMITATION: no-professional businesses (restaurant)
  are NOT capacity-checked — overlapping table bookings are allowed; a soft notice is shown in
  the create modal. See Technical debt (still bypasses the n8n Motor; overlap is the v1 mitigation).
- **F4 (Postgres historial) — SUPERSEDED** by the Chatwoot integration below. The
  `src/lib/historial/*` code remains but `/dashboard/mensajes` no longer uses it.
- **F5 — pending:** polish (loading/error states, pagination, search, responsive).

### Chatwoot integration (replaces F4) — block by block

- **Block 1 — DONE:** server-side API client + `listConversations` + WhatsApp inbox
  auto-detect. `npm run chatwoot:test` lists real conversations for accounts 6 (Dentos) & 7
  (Tasqueta); account 5 (Baobab) has no WhatsApp inbox → handled as "no configurado" (404→null).
- **Block 2 — DONE:** `getThread(accountId, conversationId)` — message thread with direction
  (in/out/activity), private notes, templates, attachments.
- **Block 3 — DONE:** `/dashboard/mensajes` now reads Chatwoot, scoped by session (account +
  inbox via `getNegocioChatwoot`). Conversation list + thread, polling every 10s, "no
  configurado" state. VERIFIED multi-tenant isolation: Dentos session sees only Dentos
  conversations; accessing a Tasqueta `conv` id under Dentos → 404 → "no encontrada" (no leak);
  Baobab → "no configurado".
- **Block 4 — DONE:** reply — `sendReply` (POST outgoing) + server action
  `replyToConversation` (scoped by session account; foreign conv → 404), composer
  `reply-box.tsx` (Enter sends, refresh after). 24h-window: friendly error
  ("el cliente debe escribir primero") when Chatwoot/Meta rejects synchronously
  (`isWindowError` heuristic); note that Chatwoot often accepts and reports delivery failure
  ASYNC instead, shown later in the thread. Verified WITHOUT delivering real messages
  (`verify-block4.ts`: POST to absent conv ids → 404, nothing sent) + composer renders.
- **Block 5 — DONE:** handoff — `setConversationStatus` (Chatwoot `toggle_status` with an
  explicit `status`), server action `setHandoff` (scoped; foreign conv → 404), button
  `handoff-button.tsx` in the thread header next to the bot/humano badge. open = human (bot
  quiet), pending = bot answers — same mechanism as the n8n Motor. Verified without changing
  any live conversation (`verify-block5.ts`: 404 guard + no-op set-to-current-status).

**Chatwoot integration COMPLETE** (view + reply + handoff, WhatsApp only). Calls/Retell and
the rest stay in Chatwoot, out of scope.

### Next.js 16 gotchas (this repo)

- `middleware.ts` is now **`proxy.ts`** (`export default function proxy(req)`).
- `cookies()` and `headers()` are **async** — always `await cookies()`.
- Server Actions + `useActionState` for forms; secure cookies must be `secure:false` on
  http localhost (we key off `NODE_ENV === 'production'`).

## Technical debt (tracked)

- **Reservation CRUD bypasses the n8n "Motor".** The dashboard writes Postgres directly,
  skipping the booking logic the bot uses (overlap, capacity, past-hours). v1 mitigation
  (done in F3): validate overlaps by professional — same `profesional_id` (or `profesional`
  text when id is NULL) cannot have two active reservas whose time ranges overlap on the
  same `fecha`. v2: call the same n8n Motor so there is one source of booking logic.
- **Restaurant table capacity is NOT validated (known v1 limitation).** The overlap check
  is per-professional (clinics/beauty/hair salons OK). A restaurant (La Tasqueta) has no
  professional and the schema has no count of physical tables per size, so the dashboard
  does NOT enforce table capacity — a restaurant owner could create overbooking from the
  dashboard. We accept this: reimplementing restaurant capacity (combinable tables, per-size
  quota) would duplicate complex logic that already lives in the n8n Motor; the core market
  (clinics/beauty/hair) works by professional, which is validated. A soft notice is shown in
  the create modal when the negocio has no professional. Solution v2: the dashboard calls the
  n8n Motor instead of reimplementing capacity logic.
- **Customer management** (clientes) is out of scope for v1 (v2).
- **`historial` contains real personal data** (names, phone numbers, message content).
  GDPR/RGPD handling is a future concern.
