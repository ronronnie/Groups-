# Engineering Decisions

## Initial Stack

Use:

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

Testing:

- Vitest
- React Testing Library
- Playwright

## Disallowed Choices

Do not introduce:

- Supabase
- Firebase
- Automatic job application agents
- WhatsApp integration
- Additional group engines during the MVP

## Implementation Biases

- Model jobs, applications, referrals, and career profiles as first-class objects.
- Keep chat lightweight and secondary to purpose-native actions.
- Centralize app and AI display names.
- Treat privacy as a backend authorization concern, not only a UI concern.
- Make AI outputs structured and validated before persistence.
- Prefer explicit engine contracts over generic runtime configurability.

