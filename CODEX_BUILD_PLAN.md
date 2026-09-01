# Groups Codex Build Plan

This file is the reusable build plan for the project currently codenamed `Groups`.

Use it by placing it at the repository root or in `/docs/CODEX_BUILD_PLAN.md`, then tell Codex:

```text
Read CODEX_BUILD_PLAN.md and execute Prompt N.
```

Run the prompts sequentially. Let Codex finish, test, and report before moving to the next prompt. If a phase has bugs, fix those before continuing.

## Master Product Context

Groups is not another group-chat application.

The thesis is:

```text
Purpose-built AI groups that turn conversation into action.
```

The core principle is:

```text
A group is not just members plus messages. A group should understand why it exists.
```

A WhatsApp group called "Design Jobs" is fundamentally still only a chat. In Groups, creating a "Jobs & Referrals" group should instantiate a purpose-specific system:

- job database
- application tracker
- referral graph
- career profiles
- AI matching engine
- AI search
- job-specific interface
- job-specific moderation
- job-specific automations
- conversation around jobs

Internally this is called:

```text
Purpose-Native Group Architecture
```

Each future group type should behave like a `Group Engine`.

A Group Engine defines:

1. domain objects
2. member data relevant to that domain
3. available actions
4. AI behavior
5. automations
6. interface and navigation
7. permissions

Only one Group Engine is being built for the MVP:

```text
Jobs & Referrals
```

Potential future engines include Travel, Alumni, Sports Team, Study, Flatmates, Events, Work, Fitness, Gaming, Investment Club, and Startup Founders. Do not implement those engines in the MVP.

## Non-Negotiable Product Constraints

- Do not build automatic job applications.
- Do not build WhatsApp integration.
- Do not build additional group engines during the MVP.
- Do not turn the product into a generic Notion-like configurable workspace.
- Do not imitate Slack, Discord, or enterprise workspace complexity.
- Keep chat lightweight and secondary.
- Model jobs, applications, referrals, career profiles, outcomes, and reputation as first-class objects.
- Keep `Groups` as the temporary product name.
- Keep `Brain` as the temporary AI display name.
- Do not hardcode either name throughout the codebase.
- Use central brand configuration such as `APP_NAME` and `AI_DISPLAY_NAME`.
- Use WhatsApp-level obviousness as the usability benchmark without copying WhatsApp as the product model.

## MVP User Capabilities

Users can:

- create an account
- create a Jobs & Referrals group
- invite people with a simple link
- join a group with minimal friction
- complete career information only once
- reuse that global career profile across every Jobs group they join
- share job URLs
- have AI convert links into structured Job objects
- browse jobs as cards rather than buried messages
- receive a personalized For You job feed
- understand why a job matches them
- save jobs
- mark jobs as applied
- track an application through stages
- request referrals from relevant group members
- discuss individual jobs
- use lightweight general chat
- search and ask questions across the group via Ask this Group
- build contribution reputation based on usefulness
- attribute successful outcomes to people who shared or referred opportunities
- control profile and application privacy

## Core Jobs Group Navigation

- For You
- Jobs
- Tracker
- People
- Chat

Ask this Group is a universal contextual search/intelligence interaction. It is not a separate AI chat page.

## UX Principles

1. Purpose before chat.
2. Objects before messages.
3. Actions over message volume.
4. AI embedded in the experience, not bolted on as a chatbot.
5. Ask once, reuse everywhere.
6. A 60-year-old must understand the key flows.
7. Zero Setup Intelligence.
8. Privacy by architecture.
9. Reputation based on usefulness, never spam.
10. Outcomes matter more than activity.
11. Pop-art personality without compromising usability.
12. Every future group type is an Engine.
13. Do not imitate Slack or Discord complexity.
14. Do not build automatic job applications.
15. Do not build WhatsApp integration.
16. Do not build other group engines in the MVP.

## AI Principles

Use `Brain` as the temporary AI identity.

Examples:

```text
Brain found 4 strong matches for you.
Brain thinks this job looks very similar to one already shared.
```

Brain must not behave like a cheesy floating chatbot. AI should appear contextually.

AI should perform bounded tasks:

- structured job extraction
- semantic matching
- relevance explanations
- Ask this Group retrieval
- duplicate detection assistance
- moderation assistance
- digest generation
- summarization

Do not use an LLM as the system of record. Persist structured database objects. Validate model output with deterministic schemas before persistence.

Model names must be environment-configurable. Do not couple the codebase to one specific model version.

## Privacy Principles

- Privacy must be enforced server-side.
- Hidden UI elements are not security.
- Never allow information from Group A to leak into Group B.
- Never allow AI retrieval to search outside the active group.
- Private career preferences must remain private unless explicitly shared.
- Application status must be private by default.
- Referral requests should only be visible to involved parties unless intentionally shared.
- Successful outcome announcements require user consent.
- Store only the AI prompts and outputs needed for debugging, audit, or product quality.
- Do not store unnecessary sensitive prompt text.

## Visual Direction

Clean modern interface with restrained Pop Art.

Use the 70/20/10 principle:

70%:

- calm neutral surfaces
- excellent typography
- white, off-white, and near-black
- highly readable information architecture

20%:

- brand colors
- graphic borders
- distinctive cards
- navigation highlights
- branded illustrations

10%:

- bold pop-art moments
- halftones
- stickers
- expressive typography
- delightful animation
- celebration states
- AI moments
- reputation badges

Do not make every screen colorful. Avoid visual fatigue. Accessibility remains mandatory.

## Technical Direction

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
- GitHub repository

Testing:

- Vitest
- React Testing Library
- Playwright

Do not introduce:

- Supabase
- Firebase
- a separate vector database
- microservices for the MVP

Use a modular monolith. Keep domain logic separate from React UI. Prefer server components where appropriate. Use client components only where interaction or realtime behavior requires them.

Business logic must be accessible through server-side services/APIs so native apps can later call the same backend. Do not put important business rules directly inside components.

## Prompt Sequence

## PROMPT 0 - Give Codex the entire product brain

```text
You are the principal full-stack engineer, staff product engineer, security engineer and technical architect for a new web application currently codenamed "Groups".

Before writing implementation code, understand this product deeply and create durable product/engineering context inside the repository so future coding sessions do not lose the reasoning behind the product.

PRODUCT THESIS

Groups is not another group-chat application.

Our thesis is:

"Purpose-built AI groups that turn conversation into action."

The underlying architectural principle is:

A WhatsApp group called "Design Jobs" is fundamentally still only a chat.

In Groups, creating a "Jobs & Referrals" group should instantiate an entire purpose-specific system:

- job database
- application tracker
- referral graph
- career profiles
- AI matching engine
- AI search
- job-specific interface
- job-specific moderation
- job-specific automations
- conversation around jobs

We call this internally:

PURPOSE-NATIVE GROUP ARCHITECTURE.

Each future Group Type should behave like a Group Engine.

A Group Engine defines:

1. domain objects
2. member data relevant to that domain
3. available actions
4. AI behaviour
5. automations
6. interface/navigation
7. permissions

Only ONE Group Engine is being built in the MVP:

JOBS & REFERRALS.

However, architecture must make it possible to add future engines such as:

- Travel
- Alumni
- Sports Team
- Study
- Flatmates
- Events
- Work
- Fitness

without rebuilding the application.

DO NOT implement those engines now.

MVP PRODUCT

Users can:

- create an account
- create a Jobs & Referrals group
- invite people with a simple link
- join a group extremely easily
- complete career information only once
- reuse that global career profile across every Jobs group they join
- share job URLs
- have AI convert links into structured Job objects
- browse jobs as cards rather than buried messages
- receive a personalised "For You" job feed
- understand why a job matches them
- save jobs
- mark jobs as applied
- track an application through stages
- request referrals from relevant group members
- discuss individual jobs
- have a lightweight general chat
- search/ask questions across everything shared in the group via "Ask this Group"
- build useful contribution reputation
- attribute successful outcomes to people who shared/refereed opportunities
- control profile/application privacy

KEY UX PRINCIPLES

1. Purpose before chat.
2. Objects before messages.
3. Actions over message volume.
4. AI embedded in the experience, not bolted on as a chatbot.
5. Ask once, reuse everywhere.
6. A 60-year-old must understand the key flows.
7. Zero Setup Intelligence.
8. Privacy by architecture.
9. Reputation based on usefulness, never spam.
10. Outcomes matter more than activity.
11. Pop-art personality without compromising usability.
12. Every future group type is an Engine.
13. Do not imitate Slack or Discord complexity.
14. Use WhatsApp-level obviousness as the usability benchmark.
15. Do not build automatic job applications.
16. Do not build WhatsApp integration.
17. Do not build other group engines.
18. Do not turn this into a generic configurable Notion-like system.

CORE NAVIGATION FOR A JOBS GROUP

- For You
- Jobs
- Tracker
- People
- Chat

"Ask this Group" is a universal contextual search/intelligence interaction, not a separate AI Chat page.

AI PERSONALITY

Use "Brain" as the temporary AI identity.

Examples:

"Brain found 4 strong matches for you."

"Brain thinks this job looks very similar to one already shared."

But Brain must not behave like a cheesy floating chatbot.

AI should appear contextually.

BRAND

Working product name: Groups.

This is NOT final.

Never hardcode the product name throughout the codebase.

Use a central brand configuration such as:

APP_NAME
AI_DISPLAY_NAME

so both can later be changed.

VISUAL DIRECTION

Clean modern interface with restrained Pop Art.

Use the 70/20/10 principle:

70%:
- calm neutral surfaces
- excellent typography
- white / off-white / near-black
- highly readable information architecture

20%:
- brand colours
- graphic borders
- distinctive cards
- navigation highlights
- branded illustrations

10%:
- bold pop-art moments
- halftones
- stickers
- expressive typography
- delightful animation
- celebration states
- AI moments
- reputation badges

Do not make every screen colorful.

Avoid visual fatigue.

Accessibility remains mandatory.

TARGET AUDIENCE

Initially younger users / Gen Z, especially job seekers and early/mid career professionals.

However, usability should be simple enough that a 60-year-old can join and understand a group.

TECHNICAL DIRECTION

Use:

- Next.js App Router
- TypeScript strict mode
- React
- Tailwind CSS
- shadcn/ui where appropriate
- Motion for React for purposeful animation
- Neon Postgres
- Drizzle ORM
- Better Auth
- OpenAI official SDK / Responses API
- Structured Outputs for AI extraction
- pgvector inside Neon
- Ably Chat for realtime messaging
- Zod validation
- Vercel deployment
- GitHub repository

Testing:

- Vitest
- React Testing Library
- Playwright

Do not introduce Supabase.
Do not introduce Firebase.
Do not introduce a separate vector database.
Do not introduce microservices for the MVP.

ARCHITECTURAL PHILOSOPHY

Use a modular monolith.

Keep domain logic separate from React UI.

Create typed domain modules.

Prefer server components when appropriate.

Use client components only where interaction/realtime requires them.

Business logic must be accessible through well-defined server-side services/APIs so native apps can later call the same backend.

Do not put important business rules directly inside components.

Do not over-engineer a generic dynamic schema system.

Create an explicit GroupEngine interface/registry in code and implement only jobsEngine.

DATABASE SECURITY

Privacy is critical.

Never rely on hidden UI elements as security.

Enforce authorization server-side.

Where appropriate use Postgres Row-Level Security in addition to application checks.

Never allow information from Group A to leak into Group B.

Never allow AI retrieval to search outside the active group.

Private career preferences must remain private unless explicitly shared.

Application status must be private by default.

Referral requests should only be visible to involved parties unless intentionally shared.

Successful outcome announcements require user consent.

AI PRINCIPLES

AI should perform bounded tasks:

- structured job extraction
- semantic matching
- summarisation
- relevance explanations
- Ask this Group retrieval
- duplicate detection assistance
- moderation assistance
- digest generation

Do not use an LLM as the system of record.

Persist structured database objects.

Use deterministic validation around model output.

Model names must be environment-configurable.

Do not couple the codebase to one specific model version.

Do not automatically trust model output.

PRODUCT ANALYTICS WE EVENTUALLY CARE ABOUT

- activated groups
- jobs shared per active group
- AI match open rate
- job save rate
- job -> application conversion
- tracker adoption
- referral request conversion
- successful outcomes
- weekly active groups
- invite conversion

Primary philosophical metric:

Useful Actions Per Active Group.

TASK

1. Inspect the repository before changing anything.
2. Preserve good existing conventions if they exist.
3. Create or normalize:
   - /docs/PRODUCT.md
   - /docs/ARCHITECTURE.md
   - /docs/PRIVACY.md
   - /docs/AI.md
   - /docs/DESIGN_SYSTEM.md
4. If similarly named docs already exist, preserve useful content and consolidate into the canonical docs above.
5. Create an AGENTS.md at repository root containing the engineering rules Codex should follow on every subsequent task.
6. Document the MVP scope and explicit non-goals.
7. Document the future Group Engine concept without implementing future engines.
8. Propose the directory structure.
9. Propose the database domain model at a high level.
10. Do NOT implement the product features yet.

At the end tell me:
- what you created
- architectural decisions you made
- any assumptions
- risks you see
- the proposed repository structure

Do not move to implementation until this foundation is complete.
```

## PROMPT 1 - Initialize the actual application

```text
Now implement the engineering foundation described in the repository documentation.

First inspect AGENTS.md and /docs before modifying code.

If this repository is empty, initialize the project.

If it already contains code, adapt instead of unnecessarily replacing working code.

Requirements:

- current stable Next.js with App Router
- TypeScript strict mode
- React
- Tailwind CSS
- shadcn/ui
- Motion for React
- Zod
- React Hook Form where useful
- Lucide icons
- ESLint
- Prettier
- Vitest
- React Testing Library
- Playwright

Prepare integrations, but do not implement their full product functionality yet:

- Drizzle
- Neon
- Better Auth
- OpenAI
- Ably

Create a clean source architecture similar to:

src/
  app/
  components/
  components/ui/
  features/
  domains/
  lib/
  server/
  config/
  styles/
  test/

Prefer domain/feature boundaries over dumping everything in components.

Add centralized configuration:

src/config/brand.ts

with temporary:

APP_NAME = "Groups"
AI_DISPLAY_NAME = "Brain"

Create environment validation using Zod.

Create .env.example without secrets.

Include expected variables for:

DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_EMBEDDING_MODEL
ABLY_API_KEY
NEXT_PUBLIC_APP_URL

Use safe server/client env separation.

Do not expose server secrets to NEXT_PUBLIC variables.

Create package scripts for:

dev
build
lint
typecheck
test
test:e2e

Add CI-friendly configuration.

Create a simple health endpoint.

Create a minimal homepage proving the application runs.

Do not build product UI yet.

Run:

- install
- typecheck
- lint
- unit tests
- production build

Fix every error before finishing.

Report files changed and commands run.
```

## PROMPT 2 - Create the Pop Art design system

```text
Implement the core visual design system for Groups.

Read /docs/DESIGN_SYSTEM.md and product principles first.

The interface must feel:

- youthful
- confident
- playful
- highly polished
- contemporary
- slightly editorial
- Pop Art inspired

But NOT childish and NOT visually exhausting.

Use the 70 / 20 / 10 rule strictly.

70% neutral product UI.
20% branded personality.
10% expressive pop-art moments.

Create design tokens for:

- neutral palette
- primary brand palette
- accent palette
- semantic colors
- typography
- spacing
- radii
- borders
- shadows
- motion timing
- elevation
- focus states

Do not hardcode arbitrary colors repeatedly.

Build reusable components:

- AppShell
- TopBar
- SideNavigation
- MobileBottomNavigation
- PageHeader
- Card
- PopCard
- StickerBadge
- EmptyState
- Avatar
- UserChip
- StatusBadge
- SegmentedControl
- SearchInput
- CommandSearch
- Drawer
- Modal
- Tooltip
- Toast
- Skeleton
- ErrorState
- LoadingState

Create expressive but restrained decorative primitives:

- halftone background
- comic burst
- sticker outline
- offset shadow
- highlighted text marker

These should be optional decoration, not everywhere.

Motion:

Use Motion for React.

Add:
- subtle page transitions
- card entrance
- hover/tap feedback
- drawer transitions
- celebration animation primitives

Respect prefers-reduced-motion.

Create a /design-system development route showing all components and states.

Ensure WCAG-friendly contrast.

Keyboard navigation must work.

The UI must remain usable at:

- 320px width
- mobile
- tablet
- desktop

Do not implement business functionality yet.

Run visual/component tests where appropriate, lint, typecheck and build.
```

## PROMPT 3 - Neon and database architecture

```text
Implement the database foundation using Neon Postgres and Drizzle ORM.

Read the architecture/privacy documentation before proceeding.

Use:

- Neon
- @neondatabase/serverless where appropriate
- Drizzle
- drizzle-kit

Do NOT use Supabase.

Enable pgvector via migration:

CREATE EXTENSION IF NOT EXISTS vector;

Create a production-quality schema for the MVP.

Required domain concepts:

Authentication-managed user/account/session tables as required by Better Auth.

Application tables:

profiles
groups
group_memberships
group_invites
jobs
job_shares
job_embeddings
user_job_states
applications
application_status_events
referral_requests
messages
message_threads
reputation_events
user_reputation_summaries
outcomes
notifications
activity_events
ai_usage_events

Important concepts:

PROFILES

One global career profile per user.

Include:
- display name
- headline
- current role
- current company optional
- years experience
- location
- skills
- desired roles
- preferred locations
- remote preference
- profile completeness
- privacy settings

Separate public profile data from private matching preferences where sensible.

GROUPS

Must contain:

- id
- name
- slug
- engine_key
- owner_id
- created_at
- settings

Only engine_key "jobs" is supported now.

Do not use a database enum that makes future engine migrations unnecessarily difficult if a typed text field with validation is cleaner.

GROUP MEMBERSHIP

Roles:

- owner
- admin
- member

INVITES

Secure random token.
Expiry.
Revocation.
Optional max uses.
Track inviter.

JOBS

Structured fields:

- id
- canonical_url
- company
- title
- description_summary
- description_text
- location
- work_mode
- employment_type
- experience_min
- experience_max
- skills
- salary text optional
- posted_at optional
- expires_at optional
- source
- status
- created_at

JOB SHARES

Critical:

A Job object and a Share are not the same thing.

The same canonical job may be shared by multiple users.

Store:

- group
- job
- sharer
- optional note
- timestamp

USER JOB STATES

Per user:

- seen
- saved
- dismissed

APPLICATIONS

Per user/job:

- not_applied
- applied
- interviewing
- offer
- rejected
- withdrawn
- hired

Use a proper status timeline rather than losing history.

REFERRAL REQUESTS

Include:

- requester
- potential referrer
- job
- group
- message
- state
- timestamps

OUTCOMES

Support attribution:

job shared by X
referred by Y
user Z got hired

But outcome sharing must require explicit consent.

REPUTATION EVENTS

Use append-only events.

Do NOT store an easily editable arbitrary reputation score as the sole source of truth.

Examples:

job_shared
job_saved_by_member
application_attributed
referral_completed
interview_helped
hire_helped

Design reputation so it can later be recalculated.

MESSAGES

Support:

- general group messages
- job discussion threads

Model conversations around objects.

Do not force everything into one giant chat table without context.

AI USAGE

Track:

- user
- group
- feature
- model alias
- token/cost metadata where available
- timestamp

Never store unnecessary prompts containing sensitive data.

Add timestamps and indexes.

Add unique constraints.

Add foreign keys.

Use soft deletion only where it provides genuine value.

Create migrations.

Create development seed data for:

- 8 sample people
- 1 Jobs group
- 15 realistic jobs
- applications
- referral examples
- discussion messages
- reputation events

Use obviously fictional demo data.

Add database tests for critical constraints.

Do not build UI yet.

At completion provide an ERD in /docs/ARCHITECTURE.md using Mermaid.
```

## PROMPT 4 - Authentication

```text
Implement secure authentication using Better Auth.

Read AGENTS.md and privacy documentation first.

Support:

1. Google sign-in.
2. Email/password sign-up and sign-in.

Architect authentication so Expo/native support remains possible later.

Requirements:

- secure sessions
- CSRF-safe flows
- email normalization
- password requirements
- logout
- protected routes
- authenticated server utilities
- authorization helpers
- session expiry
- account deletion path placeholder
- user profile bootstrap after signup

Create:

- sign-in page
- sign-up page
- auth callback route
- logout action
- protected app layout
- current-user server helper
- tests for auth guards and profile bootstrap

Do not build group functionality yet except what is needed to prove protected routing.

Never expose auth secrets to the client.

Run lint, typecheck, tests, and build.
```

## PROMPT 5 - Group Engine registry and Jobs engine contract

```text
Implement the Group Engine architecture without building other engines.

Read /docs/ARCHITECTURE.md and AGENTS.md first.

Create an explicit GroupEngine interface and registry.

The Jobs & Referrals engine is the only active engine.

The engine contract should define:

- engine key
- display name
- description
- navigation tabs
- supported object types
- supported actions
- permission hooks or policy identifiers
- AI capability identifiers
- empty states
- onboarding requirements

Register only:

engine_key: "jobs"

Do not create fake implementations for Travel, Alumni, Work, or any other engine. They can appear as "Coming soon" options in controlled UX later, but not as implemented engines.

Add validation so unknown engine keys fail safely.

Add unit tests for:

- engine registry lookup
- only jobs engine enabled
- unknown engine handling
- navigation generated from the engine contract

Do not build full UI yet.

Run lint, typecheck, tests, and build.
```

## PROMPT 6 - Onboarding, group creation, invites, and joining

```text
Build the first end-to-end product flow:

Create account -> create Jobs & Referrals group -> invite people -> join group.

Read product, privacy, architecture, and engine docs first.

Group creation flow:

1. User clicks Create.
2. User selects group type.
3. Jobs & Referrals is selectable.
4. Other group types may be shown as Coming Soon but must not be functional.
5. User enters group name.
6. Group is created.
7. Invite link is generated.

Invite flow:

- secure random invite token
- expiry
- revocation support
- optional max-use support
- copy link UI
- join preview page
- clear group identity and member count
- require authentication before joining if needed
- membership creation after accepted invite

Joining should be extremely easy.

Do not ask for full career profile information during group creation. Ask only what is required. Profile completion should happen as a guided next step.

Create routes and UI using the design system:

- create group
- invite management
- join invite
- group home redirect
- protected group layout

Enforce authorization server-side.

Add tests for:

- group creation
- invite token behavior
- joining
- duplicate membership protection
- expired/revoked invites
- unauthorized access

Run lint, typecheck, tests, and build.
```

## PROMPT 7 - Global career profile

```text
Implement the global career profile experience.

Read privacy and product docs first.

Principle:

Ask once, reuse everywhere.

A user should complete career information one time and reuse it across every Jobs group they join.

Fields:

- display name
- headline
- current role
- current company optional
- years of experience
- location
- skills
- desired roles
- preferred locations
- remote/hybrid/onsite preference
- resume URL optional
- portfolio URL optional
- LinkedIn URL optional
- personal website optional
- private matching notes/preferences
- visibility/privacy settings

Separate public profile data from private matching preferences.

Create:

- profile setup flow
- edit profile page
- profile completeness indicator
- privacy controls
- reusable profile summary component
- server-side profile service
- validations

Profile visibility must be enforced server-side.

Do not leak private matching preferences to other members.

Add tests for:

- validation
- profile creation/update
- completeness calculation
- privacy enforcement

Run lint, typecheck, tests, and build.
```

## PROMPT 8 - Jobs sharing and structured job objects

```text
Implement job sharing and structured Job objects.

Read architecture and AI docs first.

Core principle:

A Job object and a Job Share are not the same thing.

Users can paste a job URL and optional note into a Jobs group.

The system should:

- normalize/canonicalize the URL
- create or reuse a Job object
- create a Job Share in the current group
- show the job as a card
- preserve sharer attribution
- support multiple shares of the same job
- support job discussion threads later

For this prompt, use deterministic fallback extraction from URL/title/manual fields if live AI or scraping is unavailable.

The UI must support:

- share job form
- URL validation
- optional user note
- loading state
- error state
- success state
- jobs list
- job card
- job detail page
- shared-by attribution

Do not build personalized matching yet.

Authorization:

- only group members can share into a group
- only group members can view group job shares
- no cross-group leakage

Add tests for:

- URL validation/canonicalization
- creating/reusing jobs
- job share attribution
- group-scoped access

Run lint, typecheck, tests, and build.
```

## PROMPT 9 - AI job extraction

```text
Implement AI-assisted job extraction using the OpenAI official SDK and Responses API.

Read /docs/AI.md, /docs/PRIVACY.md, and AGENTS.md first.

Use environment-configurable model names:

- OPENAI_MODEL
- OPENAI_EMBEDDING_MODEL

Requirements:

- extract structured job fields from a provided URL and/or provided job text
- use Structured Outputs or strict schema validation
- validate model output with Zod before persistence
- fall back gracefully when AI fails
- never treat AI output as automatically trusted
- never require AI success for the user to share a job
- track AI usage events
- avoid storing unnecessary sensitive prompt content

Structured output should include:

- company
- title
- description summary
- location
- work mode
- employment type
- experience range
- skills
- salary text optional
- source
- confidence
- warnings or missing fields

If scraping job pages is implemented, keep it bounded, timeout-protected, and resilient. Respect basic failure cases.

Create:

- AI extraction service
- schema definitions
- usage logging
- retry/fallback behavior
- job review/edit UI before saving when confidence is low

Add tests with mocked AI responses for:

- valid extraction
- invalid extraction
- low confidence
- AI failure fallback
- usage event recording

Run lint, typecheck, tests, and build.
```

## PROMPT 10 - Personalized For You job feed

```text
Build the For You experience for Jobs groups.

Read product, AI, privacy, and design docs first.

The For You feed should rank jobs for the current user using their global career profile and group-shared jobs.

For MVP, implement a pragmatic ranking system that combines:

- desired roles
- skills overlap
- experience fit
- location preference
- remote/hybrid/onsite preference
- dismissed/saved/applied state
- recency

Use deterministic matching first. Add AI-generated explanations where useful and safe.

Each card should show:

- role
- company
- location
- work mode
- employment type
- shared by
- referral availability if known
- match score or strength
- concise explanation
- save action
- apply/open job action
- dismiss action

Brain copy should be contextual and restrained.

Do not expose private profile preferences to other members.

Create:

- ranking service
- explanation service
- For You route
- feed filters
- empty states
- saved/dismissed state handling
- tests for ranking behavior and privacy

Run lint, typecheck, tests, and build.
```

## PROMPT 11 - Job detail, discussions, and duplicate detection

```text
Implement job detail pages, job-specific discussion threads, and duplicate detection assistance.

Read architecture and AI docs first.

Job detail should include:

- structured job information
- share history in the current group
- sharer attribution
- AI summary if available
- match explanation for the current user
- save/apply/dismiss actions
- referral request entry point
- discussion thread

Discussion model:

- support messages attached to a job object
- keep general chat separate from object discussion
- only group members can view or participate

Duplicate detection:

- exact duplicate by canonical URL
- near-duplicate heuristic using title/company/location
- optional AI assistance for ambiguous duplicates
- merge or reuse existing job records where appropriate
- never lose original sharer attribution

Add tests for:

- job detail authorization
- discussion creation
- duplicate URL handling
- near-duplicate detection
- attribution preservation

Run lint, typecheck, tests, and build.
```

## PROMPT 12 - Application tracker

```text
Implement the application tracker for Jobs groups.

Read product and privacy docs first.

Application state belongs to the user and is private by default.

Statuses:

- saved
- applied
- interviewing
- offer
- rejected
- withdrawn
- hired

Use a status timeline so history is not lost.

Users can:

- mark a job as applied
- move an application across stages
- add private notes
- add next action/date optional
- see a board/list tracker
- filter by status
- open the job from the tracker

The tracker should be useful even without AI.

Privacy:

- other members must not see a user's application status unless explicitly shared
- referrers may see only the referral-related context required for the referral workflow
- enforce this server-side

Add tests for:

- status transitions
- timeline events
- private notes
- authorization
- group scoping

Run lint, typecheck, tests, and build.
```

## PROMPT 13 - Referral requests

```text
Implement referral request workflows.

Read privacy and product docs first.

The system should identify potential referrers using public/profile-visible data such as current company, past company if available, role, or group context.

Users can request a referral from a relevant member for a specific job.

Referral request fields:

- requester
- potential referrer
- group
- job
- message
- state
- timestamps

States:

- requested
- accepted
- declined
- needs_info
- referred
- closed

UI:

- referral availability on job cards/details
- request referral flow
- incoming referral request inbox
- accept/decline/respond actions
- status history
- privacy-friendly context preview

Rules:

- do not spam every possible referrer
- do not expose private application notes
- only involved parties and allowed admins may see request details
- group membership is required

Add tests for:

- potential referrer matching
- request creation
- state transitions
- privacy and authorization
- duplicate request prevention

Run lint, typecheck, tests, and build.
```

## PROMPT 14 - People directory and reputation

```text
Implement the People directory and contribution reputation.

Read product, privacy, and design docs first.

People directory:

- show group members
- show visible profile summary
- show skills/current role/current company where visibility allows
- show contribution highlights
- show referral availability signals where appropriate
- search/filter members

Reputation:

Use append-only reputation events as the source of truth.

Do not store an arbitrary editable score as the only source of truth.

Examples:

- job_shared
- job_saved_by_member
- application_attributed
- referral_completed
- interview_helped
- hire_helped

Build a recalculable summary from events.

Reputation must reward usefulness, not spam or message volume.

UI:

- contribution badges
- helpful sharer indicators
- referral helper indicators
- privacy-respecting member profile page

Add tests for:

- event creation
- summary calculation
- anti-spam guardrails
- privacy enforcement
- member directory access

Run lint, typecheck, tests, and build.
```

## PROMPT 15 - General chat with Ably Chat

```text
Implement lightweight general chat for Jobs groups using Ably Chat.

Read architecture and product docs first.

Chat is not the primary product surface. It supports the group, but jobs and actions remain first-class.

Requirements:

- group-scoped realtime chat
- authenticated access
- only group members can connect/read/write
- message persistence in the database as needed
- basic moderation hooks
- loading/reconnect states
- message timestamps
- sender identity
- empty state
- mobile-friendly composer

Keep general chat separate from job discussion threads.

Do not build Slack-like channels, complex workspaces, or Discord-style server features.

Add tests/mocks for:

- authorization token issuance
- group-scoped chat access
- message persistence
- non-member denial

Run lint, typecheck, tests, and build.
```

## PROMPT 16 - Ask this Group retrieval

```text
Implement Ask this Group.

Read AI, privacy, and architecture docs first.

Ask this Group is contextual intelligence across the active group. It is not a generic chatbot page.

Users can ask questions such as:

- Show me product design roles posted this week that are remote.
- Which jobs are good for someone with React and 3 years experience?
- Who might be able to refer me to Razorpay?
- What jobs did I save but not apply to?

Retrieval scope:

- current group only
- current user's authorization only
- do not search across other groups
- do not expose private application state or private profile preferences

Use pgvector embeddings in Neon.

Index relevant content:

- jobs
- job shares
- public job discussions
- visible profile snippets
- allowed reputation/outcome data

Implementation:

- embedding service
- retrieval service
- answer generation service
- source citations/linked result cards
- usage logging
- graceful fallback if AI fails
- tests with mocked model responses

Answers should be concise and action-oriented. Prefer showing relevant cards and next actions over long AI prose.

Run lint, typecheck, tests, and build.
```

## PROMPT 17 - Notifications, digests, and activity

```text
Implement notifications, digests, and activity events.

Read product and privacy docs first.

Notifications should help users act, not create noise.

Events to support:

- new strong job match
- referral request received
- referral request updated
- application follow-up reminder
- job saved by member
- job likely closing soon
- outcome shared with consent
- invite accepted

Create activity_events as the canonical event stream where useful.

Digest:

- daily or weekly group catch-up
- number of jobs shared
- strong matches for current user
- referral opportunities
- saved jobs needing action
- group contribution highlights

Brain can summarize, but deterministic data should drive the digest.

Privacy:

- do not include private application states in group-wide digest
- do not reveal private preferences
- enforce recipient-specific digest generation

Add tests for:

- event creation
- notification routing
- digest privacy
- user preferences
- disabled notifications

Run lint, typecheck, tests, and build.
```

## PROMPT 18 - Outcomes and attribution

```text
Implement outcome tracking and attribution.

Read product and privacy docs first.

Outcomes are important because useful actions matter more than activity.

Supported outcome examples:

- user got interview
- user got offer
- user got hired
- job shared by member X helped user Y
- referral by member Z helped user Y

Outcome sharing must require explicit user consent.

Requirements:

- create private outcome records
- allow user to share outcome with group if they consent
- attribute job sharer
- attribute referrer where applicable
- create reputation events from confirmed outcomes
- prevent fake/easily gamed attribution where reasonable
- provide success/celebration UI using restrained Pop Art

Do not automatically announce outcomes.

Do not reveal salary or sensitive details unless the user explicitly adds and shares them.

Add tests for:

- consent enforcement
- attribution
- reputation event creation
- private vs shared visibility
- authorization

Run lint, typecheck, tests, and build.
```

## PROMPT 19 - Admin, moderation, and group settings

```text
Implement group admin, settings, and moderation controls.

Read product, privacy, and architecture docs first.

Roles:

- owner
- admin
- member

Admin capabilities:

- edit group name
- manage invite links
- revoke invites
- remove members
- change member role where permitted
- archive inappropriate job shares
- moderate general chat messages
- configure basic group settings

Moderation:

- keep Jobs & Referrals groups high-signal
- flag off-topic content
- allow admin review
- optionally use Brain for moderation suggestions
- never let AI silently delete content without clear rules/admin control

Settings:

- group name
- invite settings
- basic privacy defaults
- notification preferences defaults
- engine key is not changeable after creation for MVP

Add tests for:

- role permissions
- invite revocation
- member removal
- moderation actions
- settings validation

Run lint, typecheck, tests, and build.
```

## PROMPT 20 - Mobile responsiveness and core UX polish

```text
Polish the end-to-end MVP user experience.

Read design and product docs first.

Focus on:

- 320px mobile usability
- mobile bottom navigation
- desktop sidebar navigation
- readable job cards
- clean tracker interactions
- simple invite/join flow
- fast profile completion
- empty states
- loading states
- error states
- skeletons
- keyboard navigation
- focus states
- accessible labels
- reduced-motion support
- responsive typography without viewport-scaling font hacks

Make the interface feel polished and Gen-Z friendly while preserving the 70/20/10 Pop Art rule.

Do not turn every screen into a loud illustration.

Test key flows manually and with Playwright where possible:

- sign up/sign in
- create group
- invite/join group
- complete profile
- share job
- view For You
- save/apply job
- request referral
- use tracker
- use Ask this Group

Fix visual overlap, broken layouts, inaccessible contrast, and mobile problems before finishing.

Run lint, typecheck, tests, Playwright, and build.
```

## PROMPT 21 - Security, privacy, and AI audit

```text
Perform a security, privacy, and AI behavior audit of the MVP.

Read AGENTS.md, /docs/PRIVACY.md, /docs/AI.md, and /docs/ARCHITECTURE.md first.

Audit:

- authentication boundaries
- protected routes
- group membership authorization
- invite token security
- profile visibility
- application status privacy
- referral request privacy
- outcome consent
- cross-group data leakage
- AI retrieval scope
- AI prompt storage
- secret handling
- NEXT_PUBLIC exposure
- database constraints
- rate-limit needs
- abuse cases

Create or update tests for critical risks:

- non-member cannot view group data
- member of Group A cannot retrieve Group B data
- AI retrieval is group-scoped
- private application status is not exposed
- private profile preferences are not exposed
- revoked/expired invite cannot be used
- unauthorized admin actions fail

Document remaining risks and recommended next hardening tasks in /docs/PRIVACY.md or /docs/SECURITY_AUDIT.md.

Do not add unrelated features.

Run lint, typecheck, tests, Playwright where relevant, and build.
```

## PROMPT 22 - MVP launch readiness, deployment, and README

```text
Prepare the MVP for launch readiness and Vercel deployment.

Read all docs and AGENTS.md first.

Tasks:

- update README with setup instructions
- document environment variables
- document database setup with Neon
- document Drizzle migration flow
- document Better Auth setup
- document OpenAI setup
- document Ably setup
- document Vercel deployment steps
- add production readiness checklist
- add troubleshooting notes
- verify .env.example is complete and contains no secrets
- verify app name and AI name are centralized
- verify no Supabase/Firebase references exist
- verify no future engines are implemented
- verify no automatic job application functionality exists

Create a concise MVP demo script covering:

1. create account
2. create Jobs & Referrals group
3. invite member
4. complete career profile
5. share job
6. see structured job card
7. view For You match
8. save/apply job
9. request referral
10. Ask this Group
11. track application
12. share outcome with consent

Run the full verification suite:

- lint
- typecheck
- unit tests
- integration tests where available
- Playwright tests
- production build

Fix all blocking issues.

At the end provide:

- changed files
- commands run
- test/build status
- environment variables still needed from me
- deployment status or exact next deployment step
- known MVP limitations
```

## Optional Later Prompts After MVP

Do not run these until the Jobs & Referrals MVP is validated.

### FUTURE PROMPT A - Chrome extension or Share to Groups

```text
Design and implement a Share to Groups workflow for job links.

This may eventually become a browser extension or mobile share-sheet integration, but do not start until the web MVP job sharing loop has been validated.

The goal is to reduce sharing friction from LinkedIn/company career pages into a selected Jobs group.
```

### FUTURE PROMPT B - Resume-assisted profile setup

```text
Implement optional resume-assisted career profile setup.

Users may upload a resume, Brain extracts draft profile fields, and the user must review/confirm before saving.

Do not expose resume contents to group members unless the user explicitly shares a resume link or profile field.
```

### FUTURE PROMPT C - New Group Engine discovery

```text
Research and design the next Group Engine after Jobs & Referrals.

Do not implement it.

Compare Alumni, Travel, Study, Flatmates, Sports Team, and Work Updates against adoption likelihood, retention loop, AI usefulness, and implementation complexity.
```
