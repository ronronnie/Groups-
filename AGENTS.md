# Repository Rules for Codex

These rules apply to every future task in this repository.

## Product Thesis

Groups is a purpose-native group product, not a generic chat app.

The core thesis is: purpose-built AI groups that turn conversation into action.

The MVP is limited to one Group Engine: Jobs & Referrals.

## Non-Negotiable Scope Rules

- Do not build additional group engines during the MVP.
- Do not build automatic job applications.
- Do not build WhatsApp integration.
- Do not turn the product into a generic configurable workspace or Notion-like builder.
- Do not imitate Slack or Discord complexity.
- Do not introduce Supabase or Firebase.
- Do not hardcode the working product name or AI name throughout the codebase.

## Architecture Rules

- Build around explicit Group Engines, not generic chat rooms.
- Treat jobs, applications, referrals, career profiles, discussions, reputation events, and group membership as first-class domain objects.
- Keep chat lightweight and secondary to purpose-native objects and actions.
- Prefer clear domain and feature boundaries over dumping code into shared components.
- Keep engine concepts explicit enough that future engines can be added later without rebuilding the app.
- Centralize brand labels in configuration, including `APP_NAME` and `AI_DISPLAY_NAME`.
- Use structured validation at boundaries, especially for user input, environment variables, and AI output.

## Security and Privacy Rules

- Privacy must be enforced on the server, not only hidden in the UI.
- Career profile data is global and reusable, but visibility must be intentionally scoped.
- Application state is sensitive and must default to conservative visibility.
- Never expose server secrets through `NEXT_PUBLIC_*` variables.
- Keep server-only integrations and credentials out of client components.
- Validate environment configuration with Zod before use.

## AI Rules

- Use `Brain` as the temporary AI display identity through centralized configuration.
- Brain is an embedded intelligence layer, not a floating chatbot persona.
- AI should appear contextually to extract, match, explain, search, moderate, and help users act.
- AI extraction and classification outputs must be structured and validated before persistence.
- Do not let AI perform automatic job applications.

## UX and Design Rules

- Purpose before chat.
- Objects before messages.
- Actions over message volume.
- Ask once, reuse everywhere.
- Use WhatsApp-level obviousness as the usability benchmark without copying WhatsApp as the product model.
- A 60-year-old should understand the key flows.
- Use restrained Pop Art: mostly calm neutral UI, selective brand expression, rare bold moments.
- Accessibility and readability are mandatory.
- Do not make every screen colorful or visually noisy.

## Technical Stack Rules

Use the documented stack unless a future task explicitly changes it:

- Next.js App Router
- TypeScript strict mode
- React
- Tailwind CSS
- shadcn/ui where appropriate
- Motion for React
- Zod
- Neon Postgres
- Drizzle ORM
- Better Auth
- OpenAI official SDK and Responses API
- pgvector inside Neon
- Ably Chat
- Vercel deployment

## Testing Rules

- Add or update tests when behavior changes.
- Prefer focused tests for narrow changes and broader coverage for shared contracts or user-facing flows.
- Expected test tools are Vitest, React Testing Library, and Playwright.
- Run relevant checks before finishing and report any command that could not be run.

## Working Rules

- Inspect existing code and docs before changing files.
- Adapt existing working code instead of replacing it unnecessarily.
- Keep changes scoped to the task.
- Do not push to GitHub without explicit user confirmation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
