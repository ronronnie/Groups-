# AI Behavior And Safety

`Brain` is the temporary display identity configured in
`src/config/brand.ts`. It is an embedded intelligence layer, not a general
chatbot or autonomous agent.

## Allowed MVP Uses

- Extract structured job facts from user-supplied listing text and hints
- Rank jobs against the requesting user's private career preferences
- Explain deterministic or model-assisted matches
- Retrieve and answer questions from authorized group knowledge
- Identify likely duplicate jobs
- Assist moderation without silently deleting content

AI must not apply to jobs, contact employers, change application state, grant
access, change membership, publish outcomes, or perform another consequential
action without an explicit user action and normal server authorization.

## Input Boundaries

- Treat every URL, listing, message, profile, and retrieved source as untrusted
  data, never as instructions.
- A job URL is a reference unless server code has safely fetched and validated
  its content. The current extraction path does not fetch arbitrary URLs.
- Send only fields required for the feature. Do not include secrets,
  authentication records, resume contents, private notes, or unrelated group
  content.
- Ask this Group must authorize active membership before embedding or answer
  generation. Retrieval is keyed by `group_id` and rechecks source visibility at
  query time so stale indexed content cannot bypass current policy.
- Requester-private saved-job context may be used only for that request and is
  not added to the shared group index.

## Output Boundaries

- Use Structured Outputs and Zod for extraction and classification responses.
- Validate citations against the supplied source keys; a model cannot create a
  new trusted source by naming one.
- Fall back to deterministic linked results when AI is unavailable or invalid.
- Never persist an unvalidated model output as a domain object.
- AI suggestions do not replace authorization or database constraints.

## Storage And Observability

- OpenAI Responses requests set `store: false`.
- Application telemetry may contain model aliases, provider request IDs, token
  counts, feature names, status, and aggregate counts.
- AI telemetry must not contain raw prompts, questions, messages, source
  content, answers, responses, or job text. The telemetry schema is a strict
  allowlist of operational fields.
- Logs and error reports must not print request bodies, retrieved sources, API
  keys, session tokens, invite tokens, or provider credentials.

## Abuse Controls

Input length limits, schema validation, same-origin mutation checks, membership
authorization, timeouts, and provider retry limits are required. Before public
launch, add distributed per-user and per-group quotas for AI, chat, token, auth,
and invite endpoints; cost ceilings and anomaly alerts; and a documented abuse
response process.

Any future expansion of AI inputs, retrieval sources, storage, or autonomous
actions requires a privacy and threat-model review plus regression tests.
