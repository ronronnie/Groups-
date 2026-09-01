# Groups Design System

## Direction

The interface uses restrained Pop Art: 70% neutral product surfaces, 20% brand personality, and 10% expressive moments. It should feel youthful, confident, polished, and editorial without becoming childish or visually tiring.

## Typography

- Primary: Inconsolata, configured in `src/config/fonts.ts`
- Secondary: Lato for supporting copy and dense information
- Font choices are centralized so experimentation does not require component changes

## Tokens

All global tokens live in `src/styles/globals.css` and are exposed to Tailwind through semantic names.

- Neutral surfaces: `background`, `surface`, `surface-subtle`, `foreground`, `muted`
- Brand: `brand`, `brand-blue`
- Accents: `accent`, `accent-mint`, `accent-pink`
- Semantic states: `success`, `warning`, `info`, `destructive`
- Structure: `border`, `border-strong`, radii, spacing, elevation, and focus ring
- Motion: fast, base, slow, and celebration timings with reduced-motion support

Do not repeat raw colors in components. Add a semantic token when a new reusable visual role is required.

## Component Rules

- Keep cards at an 8px radius or less.
- Use familiar Lucide icons for icon actions and label unfamiliar controls with tooltips.
- Use Lato for supporting prose where Inconsolata becomes visually dense.
- Maintain visible keyboard focus and native semantic roles.
- Keep controls at least 40px tall for reliable touch use.
- Do not nest cards or use cards as generic page-section containers.

## Expressive Primitives

Halftone, comic burst, sticker outline, offset shadow, and marker treatments are optional. Use them for emphasis, celebrations, AI moments, or reputation, never as the default surface language.

## Responsive Baseline

Layouts must work from 320px through desktop. Side navigation collapses to bottom navigation, content must not overflow horizontally, and fixed-format controls must retain stable dimensions.
