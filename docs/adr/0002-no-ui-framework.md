# 2. Build the UI without a framework

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

The brief named UI/UX quality and performance as the top priorities, and fixed
the scope hard: one screen, a 3×3 grid, no accounts, no backend, no persistence
beyond the current session.

React was the obvious default and was already proven on this machine. But its
runtime costs roughly 45 kB gzipped before a single line of game code — on an
application whose entire mutable state is nine cells, a mode, a difficulty and
three counters.

The reason to reach for a framework is to tame state that has outgrown manual
DOM work. That pressure does not exist here: the render is a pure function of a
state object small enough to print, and the DOM it produces is nine buttons.

## Decision

Build with TypeScript and Vite and no UI framework.

The render path keeps a mirror of the last painted board and touches only cells
whose mark actually changed, so a move mutates two cells rather than rebuilding
the grid. State transitions live in a pure module (`src/game/`) that never
touches the DOM; `src/ui/` is the only layer that does.

## Consequences

- The shipped bundle is about 3.5 kB of JavaScript gzipped, roughly a
  thirteenth of what the framework runtime alone would have cost.
- No hydration step and no framework boot: the first paint is the game.
- The pure/DOM split keeps the interesting logic testable without a DOM, which
  is why the engine suite runs in Node and finishes in milliseconds.
- The cost is paid in manual wiring — event delegation, roving tabindex and
  paint diffing are hand-written and hand-tested rather than free.
- This choice is scoped to an application this size. Anything that grows real
  routing, server state or many screens should supersede this record rather than
  stretch the pattern.
