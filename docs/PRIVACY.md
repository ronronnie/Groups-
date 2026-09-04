# Privacy Model

Privacy is a server-side authorization contract. Hiding a field or control in
the browser is never sufficient.

## Data Classes

### Group-visible purpose data

- Active job shares and structured job facts
- Job-scoped discussions and lightweight general chat
- Profile fields the subject has made visible to groups, further limited by
  per-field controls and the group's visibility ceiling
- Contribution summaries derived from eligible domain events
- Outcomes shared with explicit consent

This data may be returned only to an active member of the requested group. A
membership in one group never grants access to another group.

### User-private data

- Career preferences, resume URL, and private profile notes
- Saved, dismissed, and seen job state
- Application status, timeline, notes, and next actions
- Private outcomes before consent and sharing
- Authentication, session, and provider records

Private data is selected by user identity as well as group and object identity.
Group owners and admins do not gain access merely because of their role.

### Restricted workflow data

Referral requests and their history are limited to the requester, potential
referrer, and the minimum admin view required for moderation. A user's private
application notes and profile preferences are never included in referral DTOs.

## Enforcement Rules

- Protected layouts and every protected server action or route resolve the
  authoritative Better Auth session.
- Data services enforce active membership in SQL before returning group data.
- Group-scoped queries bind both `group_id` and the authenticated `user_id`.
- Public profile DTOs use explicit field selection; private profile tables are
  not joined into member-facing responses.
- Applications default to `private`. The current MVP tracker is owner-only even
  though the schema reserves future visibility values.
- Invite tokens are high-entropy bearer secrets. Only SHA-256 hashes are stored;
  expiry, revocation, use limits, invite policy, and removed-member denial are
  checked on acceptance.
- Group-visible outcomes require the subject's explicit consent and a sharing
  timestamp. Withdrawing consent removes them from group views and search.
- Protected pages and group APIs are marked `private, no-store` to reduce cache
  disclosure risk.

## AI Data Use

Ask this Group receives only sources authorized for the requesting member and
the requested group. Group sources exclude private profile preferences,
application records, private outcomes, general chat, and hidden content. A
requester's own saved-job state may be added only for that request.

OpenAI requests use `store: false`. The application records model, token,
request, status, and count metadata, but does not persist raw prompts, answers,
messages, source text, or job listing text in AI telemetry. See
[`AI.md`](./AI.md) for the complete AI contract.

## Retention And Deletion

Account deletion is intentionally disabled until a recently authenticated,
verified deletion workflow defines cascading deletion, legally required
retention, backups, audit records, and shared-object ownership. Before launch,
the product must publish retention periods for messages, applications,
referrals, AI usage metadata, moderation records, and database backups.

## Required Regression Coverage

Tests must continue to prove that non-members receive no group data, Group A
members cannot retrieve Group B data, private profile and application fields do
not enter shared DTOs or AI sources, expired/revoked invites fail, and admin
roles cannot override private ownership.
