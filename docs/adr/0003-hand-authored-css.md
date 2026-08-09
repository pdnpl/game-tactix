# 3. Hand-author CSS with custom properties

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

With no UI framework (ADR 2), the styling layer was still open. A utility
framework such as Tailwind would have worked and is the default reach for most
projects.

Tactix has one screen and roughly a dozen distinct components. Its visual
ambition is concentrated in things utilities express poorly: a two-layer radial
glow behind a translucent card, marks that draw themselves in via
`stroke-dashoffset`, a strike-through line positioned from measured geometry,
and a full second theme.

## Decision

Write plain CSS in a single stylesheet, with design tokens as custom properties
on `:root` and both themes defined as overrides on `[data-theme]`.

Theming is therefore free at runtime: switching themes rewrites one attribute on
`<html>`, and every colour follows from the cascade. No class rewriting, no
recomputation in script.

Animation is restricted to `transform`, `opacity`, `stroke-dashoffset` and
colour, so the compositor handles motion without layout or paint work.

## Decision on theme boot

The theme is resolved by a tiny inline script in `<head>`, before first paint,
reading `localStorage` and falling back to `prefers-color-scheme`. Doing this in
the module bundle instead would paint the wrong theme first and then correct it.

## Consequences

- The stylesheet is about 2.3 kB gzipped and has no build-time generation step.
- Both themes stay in sync by construction, since each is only a token block.
- No purge step and no risk of a utility class being dropped by a scan that
  cannot see it.
- The inline boot script is duplicated logic — it must agree with the toggle in
  `app.ts` about the storage key. That coupling is noted in both places.
- Without utilities there is no automatic guard against one-off values drifting
  apart; the token block is the discipline that replaces it.
