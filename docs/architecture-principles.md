# Architecture Principles

## Purpose-Native Group Architecture

Groups should be built around engines, not generic chat rooms.

The MVP Jobs & Referrals engine owns its domain model, member profile needs, permissions, actions, AI behavior, automations, and navigation. Chat exists, but it is not the primary organizing primitive.

## Engine Shape

Each Group Engine should eventually define:

- Domain objects
- Engine-specific member data
- Actions
- AI behavior
- Automations
- Navigation and interface surfaces
- Permission rules

The codebase should make this structure explicit enough that additional engines can be added later without rebuilding the application. It should not expose a generic end-user engine builder in the MVP.

## MVP Engine: Jobs & Referrals

Expected domain objects include:

- Group
- Membership
- Global career profile
- Job
- Saved job
- Application
- Application stage
- Referral request
- Job discussion
- Chat message
- Contribution or reputation event

AI-assisted workflows include:

- Job extraction from URLs
- Duplicate or near-duplicate job detection
- Personalized matching
- Match explanations
- Ask this Group retrieval and answer generation
- Contextual moderation signals

## Privacy By Architecture

Career profile data is global and reusable, but visibility must be scoped deliberately.

Application state is sensitive. Users need clear controls over what is private, visible to relevant referrers, or visible to a group.

The architecture should avoid relying only on frontend hiding for privacy-sensitive state.

## Brand Configuration

Working product labels must be centralized:

- `APP_NAME`
- `AI_DISPLAY_NAME`

Do not scatter hardcoded product or AI names throughout implementation code.

## Explicit Non-Goals

- No automatic job applications
- No WhatsApp integration
- No Supabase
- No Firebase
- No additional group engines in the MVP
- No generic configurable workspace builder
