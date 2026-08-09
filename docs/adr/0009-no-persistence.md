# 9. Keep the score in memory only

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

The brief ruled out accounts, users and leaderboards. It did not explicitly rule
on the running score across rounds in a single sitting, or on the theme choice.

A running tally is not a leaderboard — it is the thing that makes a second round
worth playing, and without it "Play again" has no stakes. But persisting it
across sessions starts to look like the record-keeping the brief excluded, and
it raises questions the game should not have to answer: whose score is this on a
shared device, and what resets it.

## Decision

Keep the score in memory for the session only. It survives "Play again" and it
resets when the mode or difficulty changes — a score is only meaningful against
a fixed opponent — and it disappears on reload.

Persist exactly one thing: the theme choice, under `tactix.theme`. That is a
display preference rather than game state, and it would be actively irritating
to re-set on every visit.

Changing mode or difficulty also abandons the round in progress, since carrying
a half-played board across an opponent change has no sensible meaning.

## Consequences

- No storage schema, no migration path, and nothing to clear. The game has no
  memory of anyone.
- Reload is a guaranteed clean slate, which also makes the app trivially
  shareable on a public or borrowed device.
- Scores are lost on an accidental refresh. Accepted deliberately: persisting
  them would be a larger commitment than the feature is worth.
- `localStorage` access is wrapped in try/catch. In private-browsing modes that
  throw, the theme silently stops persisting rather than breaking the game.
