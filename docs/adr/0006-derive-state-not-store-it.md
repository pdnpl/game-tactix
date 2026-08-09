# 6. Derive whose turn it is from the board

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

The obvious model carries the active player in state alongside the board, and
flips it on every move. That introduces a second source of truth which can
disagree with the first. The classic failure is a rejected or replayed move that
updates one and not the other, after which the game silently plays two marks for
the same side.

The round also alternates who opens, so "X moves on even counts" is not
sufficient on its own.

## Decision

Do not store the active player. Derive it:

```ts
currentPlayer(board, starter) // starter moves on even placed-counts
```

State holds only the board, the mode, the difficulty, the outcome, the round's
`starter` and the score. Everything else — whose turn it is, whether the AI owes
a move, whether a cell is playable — is computed from those.

State transitions are pure functions returning new state, and return the _same
object reference_ when a move is illegal. The UI treats an unchanged reference
as "nothing happened" and skips both the re-render and the AI scheduling.

## Consequences

- Turn and board cannot drift apart, because there is only one of them.
- Illegal moves are inert by construction rather than by a guard the caller has
  to remember, and the identity check gives the UI a free no-op signal.
- Alternating the opening move is one field (`starter`) rather than a special
  case threaded through the move logic.
- Deriving costs a nine-element scan per query. At this size that is free, and
  it is the kind of cost worth paying for an invariant that holds by
  construction.
