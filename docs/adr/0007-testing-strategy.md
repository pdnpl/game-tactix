# 7. Split the test suite by what it actually needs

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

The codebase divides cleanly into a pure engine (`src/game/`) that never touches
the DOM and a UI layer (`src/ui/`) that does nothing else. Running the whole
suite under jsdom is the path of least resistance, but measurably wasteful: the
first version of this suite spent 79 seconds standing up jsdom for tests that
never used it, against 2.9 seconds of actual assertions.

There was also a subtler risk. An early UI test looked like it verified the
unbeatable AI never loses, but the render path had a bug that left every cell
without its `data-playable` flag. The test searched for a playable cell, found
none, exited its loop immediately and asserted nothing — passing green while
covering nothing.

## Decision

Default the Vitest environment to `node`. UI specs opt into a DOM with a
`// @vitest-environment jsdom` docblock.

UI tests load the real `index.html` via a `?raw` import and mount against its
actual body, rather than a hand-written fixture. A change to the shipped markup
that breaks the wiring therefore fails in the suite instead of in the browser.

Loop-driven tests must assert that the loop ran. The AI test now requires a
minimum number of moves and that the round visibly ended, so it cannot pass by
doing nothing.

## Consequences

- The full suite runs in about 2.3 seconds, which keeps it usable on every save
  and inside the PR gate.
- Engine tests cannot accidentally depend on a DOM, because there is not one.
- Binding to the real markup means `index.html` and `app.ts` cannot drift apart
  silently; the cost is that reformatting the HTML can require touching tests.
- Guarding loop tests against vacuity is a manual discipline, not something the
  runner enforces. It is applied wherever a test drives a loop to completion.
