# Product Context

## Thesis

Groups is not another group-chat application.

The product thesis is:

> Purpose-built AI groups that turn conversation into action.

The architectural principle is that a group should not only contain messages. A Jobs & Referrals group should instantiate a purpose-specific system with jobs, applications, referrals, people, AI matching, search, moderation, and automations.

This is called Purpose-Native Group Architecture.

## Group Engines

Each future group type should behave like a Group Engine.

A Group Engine defines:

- Domain objects
- Member data relevant to that domain
- Available actions
- AI behavior
- Automations
- Interface and navigation
- Permissions

Only one Group Engine is in scope for the MVP: Jobs & Referrals.

Potential future engines include Travel, Alumni, Sports Team, Study, Flatmates, Events, Work, and Fitness. These are not part of the MVP and should not be implemented now.

## MVP User Capabilities

Users can:

- Create an account
- Create a Jobs & Referrals group
- Invite people with a simple link
- Join a group with minimal friction
- Complete career information once
- Reuse a global career profile across Jobs groups
- Share job URLs
- Have AI convert shared links into structured Job objects
- Browse jobs as cards instead of buried messages
- Receive a personalized For You job feed
- Understand why a job matches them
- Save jobs
- Mark jobs as applied
- Track an application through stages
- Request referrals from relevant group members
- Discuss individual jobs
- Use lightweight general chat
- Ask questions across group content through Ask this Group
- Build contribution reputation based on usefulness
- Attribute successful outcomes to people who shared or referred opportunities
- Control profile and application privacy

## Product Boundaries

Do not build:

- Automatic job applications
- WhatsApp integration
- Other group engines in the MVP
- A generic configurable Notion-like system
- Slack or Discord-style complexity

## UX Principles

- Purpose before chat
- Objects before messages
- Actions over message volume
- AI embedded in the experience, not bolted on as a chatbot
- Ask once, reuse everywhere
- A 60-year-old must understand key flows
- Zero Setup Intelligence
- Privacy by architecture
- Reputation based on usefulness, never spam
- Outcomes matter more than activity
- Pop-art personality without compromising usability
- Every future group type is an Engine
- WhatsApp-level obviousness is the usability benchmark

## AI Identity

Use `Brain` as the temporary AI display identity.

Example product copy:

- Brain found 4 strong matches for you.
- Brain thinks this job looks very similar to one already shared.

Brain must not behave like a cheesy floating chatbot. AI should appear contextually where it helps the user act.
