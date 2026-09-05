# Groups

Groups is a purpose-native group product. The MVP implements one Group Engine:
Jobs & Referrals.

> Purpose-built AI groups that turn conversation into action.

Jobs, applications, referrals, profiles, discussions, outcomes, and reputation
are first-class objects. Chat is intentionally lightweight and secondary to
those workflows. `Brain` provides contextual extraction, matching, and group
retrieval; it is not an autonomous job-application agent.

## MVP Capabilities

- Email/password and Google authentication through Better Auth
- Jobs & Referrals group creation, invitation, joining, and administration
- Reusable career profiles with server-enforced field visibility
- Structured job sharing with validated OpenAI extraction and duplicate checks
- Personalized For You ranking, explanations, saving, and private applications
- Job discussions, Ably-backed general chat, and referral workflows
- Group-scoped AI retrieval with validated citations
- Notifications, personal digests, contribution reputation, and consented outcomes
- Responsive layouts from 320px through desktop

The MVP does not include automatic applications, WhatsApp integration, a generic
workspace builder, or additional Group Engines.

## Stack

- Next.js 16 App Router, React 19, and strict TypeScript
- Tailwind CSS, shadcn/ui patterns, Motion, and Lucide icons
- Neon Postgres, Drizzle ORM, and pgvector
- Better Auth with Google OAuth
- OpenAI Responses API and embeddings
- Ably Chat and token authentication
- Zod and React Hook Form
- Vitest, React Testing Library, Playwright, ESLint, and Prettier

## Repository Structure

```text
src/app/             App Router pages, layouts, and route handlers
src/components/      Shared layout and UI primitives
src/features/        User-facing feature components
src/domains/         Pure domain contracts, validation, and policy
src/server/          Auth, data access, integrations, and server actions
src/config/          Brand, font, and environment configuration
src/styles/          Global design tokens and styles
src/test/            Shared test setup and Playwright tests
drizzle/             Ordered SQL migrations and Drizzle snapshots
docs/                Product, architecture, privacy, AI, and runbook docs
```

## Local Setup

### Prerequisites

- Node.js 22 (`nvm use` reads `.nvmrc`)
- npm and a Neon Postgres database
- Google OAuth, OpenAI, and Ably credentials

Install dependencies and create the local environment file:

```bash
nvm use
npm ci
cp .env.example .env.local
```

Fill `.env.local`, then prepare the database and run the app:

```bash
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. The health endpoint is
`http://localhost:3000/api/health`.

`npm run db:seed` is optional and inserts idempotent fictional records. Do not
run the seed command against a production database.

## Environment Variables

All variables are validated with Zod. Only `NEXT_PUBLIC_APP_URL` is exposed to
the browser.

| Variable                 | Scope  | Purpose                                                                                       |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Server | Neon Postgres connection string. Use the pooled `-pooler` endpoint for serverless deployment. |
| `BETTER_AUTH_SECRET`     | Server | Random secret of at least 32 characters used by Better Auth.                                  |
| `BETTER_AUTH_URL`        | Server | Exact canonical app origin, such as `https://groups.example.com`.                             |
| `GOOGLE_CLIENT_ID`       | Server | Google OAuth web client ID.                                                                   |
| `GOOGLE_CLIENT_SECRET`   | Server | Google OAuth web client secret.                                                               |
| `OPENAI_API_KEY`         | Server | OpenAI project API key.                                                                       |
| `OPENAI_MODEL`           | Server | Responses API model alias used for extraction and answers.                                    |
| `OPENAI_EMBEDDING_MODEL` | Server | Embedding model alias used by job and group retrieval.                                        |
| `ABLY_API_KEY`           | Server | Ably server key used only to issue scoped, short-lived client tokens.                         |
| `NEXT_PUBLIC_APP_URL`    | Public | Exact canonical browser origin. This should match `BETTER_AUTH_URL`.                          |

Never put database, authentication, Google, OpenAI, or Ably secrets in a
`NEXT_PUBLIC_*` variable. `.env.local` is ignored by Git.

## Integration Setup

### Neon And Drizzle

1. Create a Neon project and database.
2. Copy a pooled connection string from Neon's Connect dialog into
   `DATABASE_URL`.
3. Run `npm run db:migrate`. Migration `0000` enables pgvector before the tables
   and vector indexes are created.

The schema lives in `src/server/db/schema`. Use this migration workflow:

```bash
# After changing the TypeScript schema
npm run db:generate

# Validate snapshots before review
npm run db:check

# Apply committed migrations to the configured database
npm run db:migrate
```

Review generated SQL before applying it. Migrations are not run during the
Vercel build because concurrent preview builds must not mutate production data.
See [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
for the serverless connection format.

### Better Auth And Google

Generate a local auth secret with `openssl rand -base64 32`. Set
`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the same origin.

In Google Cloud, create an OAuth client with application type **Web
application**. Configure:

```text
Authorized JavaScript origin: http://localhost:3000
Authorized redirect URI:      http://localhost:3000/api/auth/callback/google
```

For production, add the HTTPS production origin and
`https://YOUR_DOMAIN/api/auth/callback/google`. The URI must match exactly.
See the [Better Auth Google guide](https://better-auth.com/docs/authentication/google)
and [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies).

### OpenAI

Create a project API key in the
[OpenAI dashboard](https://platform.openai.com/api-keys). Configure response and
embedding model aliases available to that project. Requests use structured
outputs where applicable and set `store: false`; see [docs/AI.md](docs/AI.md).

### Ably

Create an Ably app and a dedicated server key allowed to issue `publish` and
`subscribe` capabilities for the app's group chat channels. Store the full key
as `ABLY_API_KEY`. Never expose it in browser code. Clients receive one-hour,
group-scoped token requests after server-side membership checks, following
[Ably token authentication](https://ably.com/docs/auth/token).

## Commands

| Command               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Start local Next.js development            |
| `npm run build`       | Create the production build                |
| `npm run lint`        | Run ESLint                                 |
| `npm run typecheck`   | Run strict TypeScript checks               |
| `npm run format`      | Check Prettier formatting                  |
| `npm run test`        | Run Vitest and React Testing Library tests |
| `npm run test:e2e`    | Run Playwright tests                       |
| `npm run db:check`    | Validate Drizzle migration snapshots       |
| `npm run db:generate` | Generate a migration after schema changes  |
| `npm run db:migrate`  | Apply committed migrations                 |
| `npm run db:seed`     | Insert fictional development data          |
| `npm run db:studio`   | Open Drizzle Studio                        |

## Verification

Before merging or deploying, run:

```bash
npm run format
npm run typecheck
npm run db:check
npm run lint
npm run test
npm run test:e2e
npm run build
npm audit --omit=dev --audit-level=high
```

GitHub Actions runs the same checks on pull requests and pushes to `main`.

## Deployment And Demo

- [Vercel deployment runbook and production checklist](docs/DEPLOYMENT.md)
- [12-step MVP demo script](docs/MVP_DEMO.md)
- [Security, privacy, and AI audit](docs/SECURITY_AUDIT.md)

## Troubleshooting

- **Environment validation error:** compare `.env.local` with `.env.example`,
  then restart `npm run dev`. Do not paste secret values into issues or chat.
- **Auth request returns 500:** apply migrations and verify `DATABASE_URL`,
  `BETTER_AUTH_SECRET`, and both app URL variables use one consistent origin.
- **Google `redirect_uri_mismatch`:** register the exact callback URI shown
  above. `localhost` and `127.0.0.1` are different origins.
- **Database or pgvector error:** run `npm run db:migrate` with a Neon role that
  may create extensions and tables, then run `npm run db:check`.
- **Ably token or connection failure:** verify the full server key has publish
  and subscribe capability and that the current user is an active group member.
- **AI fallback response:** verify the OpenAI key and model aliases. The product
  intentionally returns deterministic linked results when AI is unavailable.
- **Playwright cannot bind port 3000:** stop the existing process or run
  `PORT=3100 npm run test:e2e`.

## Known MVP Limitations

- Job URLs are references only; users may need to paste listing text or confirm
  extracted fields because arbitrary pages are not fetched server-side.
- Applications, milestones, and outcome attribution are self-reported.
- Referral workflow coordination is in-product; it does not submit a referral
  to an employer system.
- Notifications and digests are in-app only.
- Account deletion, email verification, distributed rate limiting, and a strict
  nonce-based CSP remain required before unrestricted public launch.
- Public Google OAuth launch requires owner-approved Terms and Privacy pages on
  the production domain.
- The MVP supports only the Jobs & Referrals engine and web application.

## Durable Rules

Read [AGENTS.md](AGENTS.md) before making changes. Architecture, privacy, AI,
and design contracts live under [docs](docs/).
