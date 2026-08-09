# 8. Draw marks as SVG and measure the strike line

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

The marks and the winning strike-through carry most of the game's visual
character, so how they are drawn matters more here than the line count suggests.

Text glyphs (`×`, `○`) were rejected early: they cannot be stroke-animated, they
sit on a baseline rather than centred in their cell, and their weight and shape
vary with whatever font the platform resolves.

The strike line raised a separate problem. Drawing it in a fixed `0 0 3 3`
viewBox and assuming cell centres fall on `x.5` is only correct when the grid
gap is zero. With a real gap the centres shift inward by roughly the gap over
the board width — around 2.5% at the shipped sizes, which reads as a line that
misses the marks it is supposed to strike through.

## Decision

Draw both marks as inline SVG built in script, and give every shape
`pathLength="1"`. That normalises an X's diagonal (~79 units) and an O's
circumference (~176 units) to the same nominal length, so a single CSS rule —
`stroke-dasharray: 1; stroke-dashoffset: 1 → 0` — animates both, with the second
stroke of the X delayed to draw in sequence.

Position the strike line from measured geometry rather than assumed geometry:
read the winning cells' `offsetLeft`/`offsetTop`/`offsetWidth`, set the SVG
viewBox to the board's pixel box, and extend the endpoints past both centres so
it reads as a strike-through rather than a connector. A `ResizeObserver`
recomputes it when the board changes size.

## Consequences

- One animation rule covers both marks, whatever their real path length, and
  new mark shapes would inherit it for free.
- The strike lands on the marks at any viewport size, including after a resize
  or an orientation change.
- Marks are vector at every scale and inherit theme colour through
  `currentColor`-style custom properties, with no image requests.
- The geometry depends on layout being measurable, so jsdom — which has no
  layout — needs `clientWidth`/`clientHeight` stubbed in the UI tests. That is
  the one place the tests know they are not in a browser.
