# 5. Minimax for the opponent, with heuristic difficulty tiers

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

Solo play needs an opponent. Tic-tac-toe is small enough to solve exactly: the
game tree from an empty board is at most 9! = 362,880 leaf paths, and alpha-beta
pruning cuts that to a few thousand nodes. A perfect opponent is affordable in
well under a millisecond, on the main thread, on a phone.

A perfect opponent is also unloseable, which makes it a poor _only_ option — a
player who can never win has no reason to play twice.

## Decision

Implement full alpha-beta minimax as the `unbeatable` tier, and express the two
easier tiers as deliberately weaker policies rather than as depth limits:

| Tier         | Policy                                                           |
| ------------ | ---------------------------------------------------------------- |
| `easy`       | Uniformly random legal move                                      |
| `medium`     | Take an immediate win, else block an immediate loss, else random |
| `unbeatable` | Full alpha-beta minimax                                          |

Depth is folded into the score — a win is worth `10 - depth`, a loss
`depth - 10` — so the engine prefers the fastest win and the slowest loss.
Without that term every forced win scores identically and the AI will idle
instead of closing the game out.

Ties among equally-scored best moves are broken randomly, through an injectable
`Rng` that defaults to `Math.random`, so repeat games do not replay one line.

## Consequences

- `unbeatable` provably cannot lose. This is asserted directly: the suite plays
  300 randomised games on both sides plus 40 full sessions and requires that the
  engine never loses one.
- Difficulty tiers degrade in a legible way. Depth-limiting would have produced
  an opponent that is weak in a way players experience as arbitrary; "misses
  threats it cannot see one move ahead" is a mistake a human recognises.
- Injecting the RNG makes every AI test deterministic without freezing global
  randomness.
- Search runs synchronously on the main thread. At this size that is correct and
  a Web Worker would only add latency; the 420 ms "thinking" pause in the UI is
  presentation, not computation.
