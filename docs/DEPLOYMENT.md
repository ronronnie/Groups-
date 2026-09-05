# Vercel Deployment Runbook

This runbook prepares a controlled MVP preview or production deployment. It
does not waive the P0 items in `SECURITY_AUDIT.md` for unrestricted public use.

## Deployment Model

- Vercel builds the Next.js application from the GitHub repository.
- Node.js 22 is pinned in `package.json` and `.nvmrc` to match CI.
- Neon stores application data and pgvector indexes.
- Database migrations are an explicit release step, not part of `next build`.
- Better Auth, OpenAI, and Ably credentials remain server-only.

No `vercel.json` is required for the current application. Vercel detects Next.js
and reads the Node version from `package.json`.

## 1. Prepare Production Services

1. Create a production Neon branch/database and copy its pooled connection URL.
2. Create separate production credentials for Google OAuth, OpenAI, and Ably.
3. Generate a new Better Auth secret with `openssl rand -base64 32`.
4. Choose the canonical HTTPS domain before configuring authentication.
5. Choose a Vercel function region close to the Neon region.

Use separate Neon branches and provider credentials for Preview and Production
where possible. Do not point arbitrary pull-request previews at production data.

## 2. Import Or Link The Project

Dashboard path:

1. In Vercel, choose **New Project**.
2. Import `ronronnie/Groups-` from GitHub.
3. Keep the repository root as the root directory and the Next.js framework
   preset.
4. Confirm `main` is the Production Branch.

CLI equivalent:

```bash
vercel link
vercel env ls
```

Vercel creates previews for non-production branches and production deployments
from the configured production branch. See the
[Vercel Git deployment guide](https://vercel.com/docs/git).

## 3. Configure Environment Variables

Add every key from `.env.example` in Vercel Project Settings. Apply secrets only
to the environments that need them.

For Production:

```text
DATABASE_URL=<production Neon pooled URL>
BETTER_AUTH_SECRET=<production random secret>
BETTER_AUTH_URL=https://YOUR_DOMAIN
GOOGLE_CLIENT_ID=<production web client ID>
GOOGLE_CLIENT_SECRET=<production client secret>
OPENAI_API_KEY=<production project key>
OPENAI_MODEL=<available response model alias>
OPENAI_EMBEDDING_MODEL=<available embedding model alias>
ABLY_API_KEY=<production server key>
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
```

`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must be the same exact canonical
origin. Environment changes apply only to new deployments, so redeploy after a
change. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

For OAuth-enabled previews, use a stable branch domain, give that branch its own
URL variables, and register its exact Google callback URI. Per-commit preview
domains are unsuitable for one fixed Google redirect URI.

## 4. Configure Google OAuth

Register these production values on the Google OAuth web client:

```text
Authorized JavaScript origin: https://YOUR_DOMAIN
Authorized redirect URI:      https://YOUR_DOMAIN/api/auth/callback/google
```

Google requires exact redirect matching. Before opening OAuth to public users,
publish owner-approved Terms and Privacy pages on the verified production domain
and complete any required consent-screen verification. Do not invent legal copy
for these pages.

## 5. Apply Database Migrations

Run migrations once from a trusted release environment before sending traffic
to a deployment that expects the new schema:

```bash
npm run db:check
npm run db:migrate
```

Use `vercel env run -e production -- npm run db:migrate` or another controlled
release runner so the URL is not written to shell history.
Review generated SQL and create a Neon restore point or branch before destructive
migrations. Never run `npm run db:seed` in Production.

## 6. Deploy And Verify A Preview

Push a non-production branch or run:

```bash
vercel deploy
```

Verify:

1. `GET /api/health` returns `200` with `{ "ok": true }`.
2. Email signup, sign-in, sign-out, and Google OAuth work on the chosen origin.
3. Create a group and accept an invite with a second account.
4. Complete the full flow in `docs/MVP_DEMO.md`.
5. Confirm protected routes redirect when signed out.
6. Confirm browser logs and Vercel function logs contain no secrets or private
   request content.
7. Check Neon, OpenAI, and Ably dashboards for errors and unexpected usage.

## 7. Release Production

After CI and preview acceptance pass:

```bash
vercel deploy --prod
```

With Git integration, merging to the configured Production Branch can perform
the same deployment. Verify the custom domain, health endpoint, OAuth callback,
and one authenticated group flow after release.

## Production Readiness Checklist

### Build And Data

- [ ] CI passes format, typecheck, migration check, lint, unit, browser, build,
      and production dependency audit steps.
- [ ] Production uses Node.js 22 and a lockfile-backed install.
- [ ] Production Neon database/branch is separate from local development.
- [ ] Migrations were reviewed, backed up, and applied exactly once.
- [ ] Seed data was not run against Production.
- [ ] Vercel functions run near the Neon region.

### Authentication And Secrets

- [ ] All `.env.example` keys exist in Vercel Production.
- [ ] Preview and Production use separate secrets where practical.
- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` match the canonical HTTPS
      origin exactly.
- [ ] Google origin and callback URI match the deployed domain exactly.
- [ ] API keys are least privilege, server-only, and have rotation owners.
- [ ] No secret appears in Git history, browser bundles, logs, or screenshots.

### Privacy, AI, And Abuse

- [ ] Cross-group, private-profile, private-application, invite, and admin tests
      pass.
- [ ] OpenAI requests use `store: false` and telemetry remains metadata-only.
- [ ] Ably clients receive scoped short-lived tokens, never the server key.
- [ ] Owner-approved Privacy and Terms pages are public on the production domain.
- [ ] Retention, deletion, incident response, and key rotation are documented.
- [ ] Distributed rate limits, AI cost ceilings, and anomaly alerts are enabled.
- [ ] Email verification and recovery abuse controls are enabled before broad
      password signup.
- [ ] A nonce-based CSP has been tested with Next.js, Google OAuth, and Ably.

### Operations

- [ ] Health endpoint and critical user journey are monitored.
- [ ] Neon restore procedure and Vercel rollback procedure have been tested.
- [ ] Provider billing alerts and quotas are configured.
- [ ] A support contact and incident owner are assigned.
- [ ] Known limitations are accepted for the intended launch audience.

## Rollback

1. Stop promotion or restore the prior Vercel deployment.
2. If a migration is involved, prefer a forward fix. Restore a Neon branch only
   after evaluating data written by the new version.
3. Rotate a credential immediately if exposure is suspected.
4. Record the incident without copying private user content into tickets.

## Deployment Troubleshooting

- **Vercel build cannot validate env:** add all variables to the target Vercel
  environment and redeploy; old deployments do not receive new values.
- **Preview OAuth fails:** use a stable preview domain and register its exact
  callback, or test email authentication on per-commit previews.
- **Database tables are missing:** point the migration command at the same Neon
  branch used by the deployment and run `npm run db:migrate` once.
- **Slow database calls:** confirm `DATABASE_URL` uses Neon's pooled `-pooler`
  endpoint and place functions close to the database.
- **Chat connects but cannot publish:** verify the server key can issue publish
  and subscribe capabilities for `groups:<uuid>:general` channels.
- **AI features fall back:** check model availability, project budget, provider
  logs, and server-only environment variables.
