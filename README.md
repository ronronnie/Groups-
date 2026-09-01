# Groups

Groups is the working name for a purpose-native group product.

The core thesis is:

> Purpose-built AI groups that turn conversation into action.

This repository currently starts with product and engineering context before implementation code. The first product engine is Jobs & Referrals.

## MVP Engine

Jobs & Referrals groups should make job discovery, referrals, applications, and discussion easier than a generic chat thread.

Core navigation for a Jobs group:

- For You
- Jobs
- Tracker
- People
- Chat

`Ask this Group` is a universal contextual search and intelligence interaction, not a separate chatbot page.

## Brand Configuration

The working app name and AI identity must stay centralized in configuration, not hardcoded throughout the codebase.

Initial values:

- `APP_NAME`: `Groups`
- `AI_DISPLAY_NAME`: `Brain`

## Technical Direction

Planned stack:

- Next.js App Router
- TypeScript strict mode
- React
- Tailwind CSS
- shadcn/ui where appropriate
- Motion for React
- Neon Postgres
- Drizzle ORM
- Better Auth
- OpenAI official SDK and Responses API
- Structured Outputs for AI extraction
- pgvector inside Neon
- Ably Chat for realtime messaging
- Zod validation
- Vercel deployment

Planned testing:

- Vitest
- React Testing Library
- Playwright

Do not introduce Supabase or Firebase.

## Database Development

The PostgreSQL schema is defined under `src/server/db/schema` and managed with Drizzle Kit.

```bash
npm run db:check
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` and `db:seed` require a valid `DATABASE_URL`. Seed records are fictional and use reserved `example.test` identities and URLs.
