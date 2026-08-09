# 10. Protect `main` and gate it on CI

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

The brief asked for enforced PR rules with review and merge handled
autonomously. Those two pull against each other: a rule that only a human can
satisfy would stall unattended work, and a rule an automated actor can simply
bypass is not enforcement.

The distinction that resolves it is between _judgement_ gates and _evidence_
gates. Requiring a second human's approval is a judgement gate — it cannot be
self-satisfied without becoming theatre. Requiring that the branch typechecks,
passes its tests and builds is an evidence gate: it is objective, it is produced
by a third party (CI, not the author), and it blocks a bad merge whether the
author is a person or an agent.

## Decision

Work trunk-based: short-lived branches off `main`, one pull request each, no
direct pushes to `main`.

Enforce with a GitHub ruleset on `main` that requires a pull request, requires
the `ci` status check to pass, and blocks force-pushes and deletion. CI runs
`format:check`, `tsc`, the full Vitest suite and a production build on every PR.

Merges are squash-only, so `main` keeps one commit per reviewed change and the
branch's intermediate history stays out of it.

Review and merge may be performed by the automated author once the checks are
green. What makes the merge trustworthy is the evidence, not the identity of
whoever clicked it.

## Consequences

- `main` is always green: nothing lands that has not typechecked, tested and
  built.
- Unattended work is not blocked on a human being awake, while the substantive
  gate still holds.
- Self-review is explicitly _not_ treated as equivalent to independent review.
  If a second maintainer joins, requiring an approving review from someone other
  than the author is a one-line ruleset change and should be made.
- Rulesets on a private repository need a paid plan. The repository is public,
  which is also what the brief's deployment story implies.
