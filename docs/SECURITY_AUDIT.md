# MVP Security, Privacy, And AI Audit

Audit date: 2026-09-05

Scope: authentication, protected routes, group authorization, invites, profile
and application privacy, referrals, outcome consent, cross-group isolation, AI
retrieval and storage, secrets, database constraints, rate limits, and abuse
cases.

## Verified Controls

| Area                | Result                                                                                                                                                                  | Evidence                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Authentication      | Better Auth uses database sessions, explicit trusted origins, secure production cookies, normalized email, and server-side password validation.                         | `src/server/auth/auth.ts`                                                         |
| Protected routes    | Proxy redirects are only an optimization; protected layouts, actions, and APIs resolve the server session.                                                              | `src/proxy.ts`, `src/server/auth/current-user.ts`                                 |
| Group isolation     | SQL services require active membership and bind reads/writes to `group_id`. Group A membership does not authorize Group B.                                              | `src/server/search/service.test.ts`, `src/server/search/retrieval.test.ts`        |
| Admin authorization | Owner/admin/member distinctions are server-enforced; peers, outsiders, and admins acting outside their authority fail.                                                  | `src/server/groups/admin-service.test.ts`                                         |
| Invites             | Raw tokens are never stored. Expiry, revocation, use count, policy, and removed-member checks are enforced atomically.                                                  | `src/server/groups/service.test.ts`                                               |
| Profile privacy     | Shared DTOs explicitly omit preferences, resume URL, and private notes and apply visibility and per-field controls.                                                     | `src/server/profiles/service.test.ts`                                             |
| Application privacy | Tracker queries are owner-scoped; another member cannot read status, timeline, notes, or next actions.                                                                  | `src/server/applications/service.test.ts`, `src/server/jobs/feed-service.test.ts` |
| Referral privacy    | Requests are group-scoped and limited to authorized workflow actors; private application notes are excluded.                                                            | `src/server/referrals/service.test.ts`                                            |
| Outcome consent     | Private outcomes require owner action; group visibility requires explicit consent and can be withdrawn. Admins have no privacy override.                                | `src/server/outcomes/service.test.ts`                                             |
| AI retrieval        | Membership is checked before model calls. Sources are group-scoped and revalidated; private preferences, applications, private outcomes, and general chat are excluded. | `src/server/search/service.test.ts`, `src/server/search/retrieval.test.ts`        |
| AI storage          | Responses use `store: false`; telemetry uses a strict allowlist of operational metadata fields.                                                                         | `src/server/ai/*.ts`, `src/server/ai/usage.test.ts`                               |
| Secrets             | Server credentials are validated in server-only modules; only `NEXT_PUBLIC_APP_URL` crosses the public env boundary; env files are ignored.                             | `src/config/env*.ts`, `.gitignore`, `.env.example`                                |
| Database integrity  | UUID foreign keys, enum checks, uniqueness constraints, group/message composite keys, consent checks, and workflow constraints backstop services.                       | `src/server/db/schema`, `src/server/db/schema.test.ts`                            |
| Browser hardening   | Responses deny framing, disable MIME sniffing and sensitive browser capabilities, and use a strict referrer policy. Protected/group responses are not cacheable.        | `next.config.ts`, `src/test/e2e/home.spec.ts`                                     |

## Abuse Cases Reviewed

- IDOR attempts with another group, user, job, application, referral, or outcome
  identifier are denied by compound identity and membership predicates.
- A removed or paused member cannot keep reading chat/search data or reactivate
  membership with an old invite.
- Prompt injection in listing or group content is treated as untrusted text;
  structured output and source-key validation constrain its effect.
- Repeated invite acceptance and application transitions are idempotent or
  constraint-backed.
- Hidden/withdrawn content is rechecked at retrieval, and stale indexed rows are
  pruned or filtered.
- Private data does not become visible merely because the viewer is an admin.

## Hardening Added In This Audit

- Added explicit cross-group AI authorization coverage before any model call.
- Added a telemetry schema guard and test preventing raw prompt-like fields.
- Added browser security headers and `private, no-store` for protected/group
  responses, with Playwright coverage.
- Added canonical privacy and AI contracts for future changes.

## Verification

- TypeScript, ESLint, Prettier, and Drizzle migration checks passed.
- 156 Vitest tests and 10 Playwright tests passed.
- The production Next.js build passed.
- `npm audit --omit=dev --audit-level=moderate` reported zero known
  vulnerabilities on the audit date.

## Remaining Risks And Required Follow-Up

### P0 before public launch

1. Add distributed rate limits and quotas for Better Auth, AI search/extraction,
   chat writes, Ably token issuance, invite creation/acceptance, and moderation.
   In-memory per-instance limits are insufficient on Vercel.
2. Define production secret rotation and incident response for Better Auth,
   Google, OpenAI, Ably, Neon, and Vercel. Ensure preview environments use
   separate credentials and databases.
3. Establish retention/deletion policy and implement recently authenticated
   account deletion, including backups and shared-object ownership semantics.

### P1 hardening

1. Deploy a nonce-based Content Security Policy compatible with Next.js and
   Ably. The current headers reduce common browser risks but do not mitigate all
   script injection paths.
2. Add email verification and recovery abuse controls before opening password
   signup broadly.
3. Add structured security telemetry, cost/anomaly alerts, moderation escalation,
   and audit-event retention without logging private content.
4. Review Neon roles and consider row-level security as defense in depth. Current
   authorization is intentionally enforced in the data-access layer.
5. Replace polymorphic moderation/source references with stronger database
   integrity where practical, or add scheduled orphan/invariant checks.
6. Add automated dependency and secret scanning, CodeQL/SAST, and migration
   checks to CI with a documented vulnerability response SLA.

### P2 operational maturity

1. Add concurrency and race tests against production Postgres for invite use
   limits, referral transitions, outcome withdrawal, and reputation rebuilds.
2. Add authorization matrix tests at HTTP boundaries in addition to the current
   service-level database tests.
3. Document provider data-processing settings, regional storage, backup access,
   and least-privilege operator roles.
