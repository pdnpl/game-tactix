# 1. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

Tactix was specified in a single brief and built in one pass, with the explicit
instruction that the implementer make the technical calls unattended. That
leaves no meeting record and no review thread explaining why the code looks the
way it does. Six months from now the reasoning behind a frameworkless build or a
particular hosting target will not be recoverable from the diff alone.

## Decision

We record every non-obvious technical decision as an Architecture Decision
Record in `docs/adr/`, using Michael Nygard's format: context, decision,
consequences. Records are numbered sequentially and never edited once accepted —
a decision that no longer holds is superseded by a new record that links back to
it.

An ADR is warranted when a choice closes off alternatives that a reasonable
engineer would otherwise reach for. Routine choices that follow directly from an
existing ADR do not need their own record.

## Consequences

- The reasoning survives independently of whoever wrote the code.
- Reversing a decision means writing a superseding ADR, which forces the cost of
  the reversal to be stated rather than discovered.
- There is a standing cost: every architectural change now has a small writing
  task attached to it.
