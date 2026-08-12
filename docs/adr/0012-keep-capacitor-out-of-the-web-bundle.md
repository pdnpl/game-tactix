# 12. Keep Capacitor out of the web bundle

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

The first working version of the native adapter opened with the obvious import:

```ts
import { Capacitor } from '@capacitor/core'
export const isNative = Capacitor.isNativePlatform()
```

That one line moved the web build's main chunk from 3.45 kB gzipped to 7.31 kB —
it more than doubled, because a static import of `@capacitor/core` pulls the
whole bridge into the entry chunk. Every browser visitor would download a native
bridge that cannot exist in a browser, on a project whose stated priority is
performance (ADR 2).

The plugin imports were already dynamic and correctly split. The leak was
entirely the platform check at the top of the file.

## Decision

Detect the native platform from the global the native runtime injects, rather
than by importing the library that reads it:

```ts
export const isNative = Boolean(
  (
    globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.(),
)
```

Everything else — core included — sits behind `await import(...)` calls that only
run when that check passes. Vite's module preload polyfill is also disabled,
since the sole dynamic imports are native-only and every target browser supports
`modulepreload`.

The adapter exposes plain no-op functions (`feedback`, `syncStatusBar`) that the
UI calls unconditionally. On the web they do nothing and cost nothing.

## Consequences

- The main chunk is 4.34 kB gzipped: about 0.9 kB above the pre-mobile build,
  which is the adapter itself rather than the framework.
- Capacitor's runtime lands in a separate chunk that a browser never requests.
- The UI needs no branching. It calls `feedback('move')` everywhere and the
  adapter decides whether anything happens.
- The platform check depends on Capacitor continuing to expose
  `window.Capacitor.isNativePlatform`, which is its documented runtime contract
  but is not enforced by the type system. It is optional-chained throughout, so
  the failure mode if it ever changes is "haptics stop working", not a crash.
- Bundle size is not currently asserted by CI. If it regresses, nothing will
  catch it automatically — a size budget check would be the fix.
