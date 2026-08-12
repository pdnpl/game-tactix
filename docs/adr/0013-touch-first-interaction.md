# 13. Treat touch as its own input mode, not a mouse without a cursor

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

The web UI was built for a pointer. Dropping it into a WebView unchanged would
have shipped several defects that only exist on touch — none of which a desktop
browser can reveal.

The worst is latching hover. On a touch device `:hover` is applied on tap and
stays applied until the user taps elsewhere. Tactix leaned on hover for two
things: cells lift on hover, and a hovered cell shows a faint ghost of the mark
you would place. On a phone, tapping a cell would leave it permanently raised
and, worse, leave a ghost mark sitting on a square that is already played.

Beyond that: iOS paints a grey box over any tapped element, a long press on the
board selects text like a document, the page rubber-bands vertically even though
it never scrolls, double-tap costs ~300 ms before a tap registers, notches and
home indicators overlap the card, and a phone in landscape is shorter than the
card is tall.

Touch targets were also sized for a mouse — the theme toggle was 33.6 px against
a 44 px guideline.

## Decision

Treat pointer capability as a first-class media query rather than assuming one
input model.

- Every `:hover` rule is wrapped in `@media (hover: hover)`. Keyboard focus
  keeps its own rule, so `:focus-visible` still reveals the ghost everywhere.
- `-webkit-tap-highlight-color: transparent`, `user-select: none`,
  `overscroll-behavior: none` and `touch-action: manipulation` on `<body>`.
- Padding uses `max(…, env(safe-area-inset-*))` against `viewport-fit=cover`.
- `@media (pointer: coarse)` grows hit areas without changing how anything
  looks.
- `@media (max-height: 34rem)` — landscape phones — tightens spacing, compacts
  the scoreboard and lets the page scroll rather than clipping the board.

## Consequences

- The same stylesheet serves mouse, touch and keyboard, with no runtime branch
  and no user-agent sniffing.
- The web build gets these fixes too: the same defects were always present on a
  phone browser, they were simply never the target.
- Hover states are unreachable on touch by design, so nothing may hide behind
  hover alone. The ghost preview is decoration; the playable state is carried by
  `data-playable` and the aria attributes.
- `@media (hover: hover)` blocks add nesting to the stylesheet and are easy to
  forget when adding a rule. Any new `:hover` must go inside one.
- The scoreboard compacts rather than disappearing in landscape: the running
  tally is the reason to start another round (ADR 9), so hiding it would remove
  the point of the mode.
