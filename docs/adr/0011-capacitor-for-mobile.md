# 11. Ship the mobile apps with Capacitor

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

Tactix needed to ship on Android and iOS. The web game already existed and was
finished: a pure TypeScript engine, a hand-written DOM UI, one stylesheet
carrying both themes and every animation, and 84 tests.

Three routes were realistic:

1. **React Native / Expo** — reuse the engine, rewrite the UI.
2. **Flutter** — rewrite everything in Dart, including the engine.
3. **Capacitor** — run the existing build inside a native WebView shell.

The engine is portable under all three; it never touches the DOM (ADR 6). The
question is really what happens to the _presentation_ layer, and that is where
this app's quality lives: marks that draw themselves in via `stroke-dashoffset`,
a strike-through line positioned from measured board geometry, two themes, and a
render path that repaints only the cells that changed (ADRs 2, 3, 8).

A rewrite would discard all of it and rebuild it in an unfamiliar idiom — for a
3×3 grid where the user-visible result would be, at best, identical. The usual
argument for going native is performance, and it does not apply: the whole app
is nine buttons and a search that finishes in under a millisecond.

## Decision

Use Capacitor. The existing `dist/` output is bundled into an Android and an
iOS shell, both generated into this repository as `android/` and `ios/`.

The app ships fully offline. There is no `server.url` in `capacitor.config.ts`,
so the WebView loads local assets and the app makes no network requests at all —
consistent with having no backend (ADR 4) and no accounts (ADR 9).

Native capability is reached through four plugins — Haptics, Status Bar, App and
Splash Screen — behind a single adapter (`src/ui/native.ts`).

## Consequences

- One codebase, three targets. A change to the game logic or the UI reaches web,
  Android and iOS with no porting step, and the existing 84 tests keep covering
  the behaviour on all of them.
- Every visual decision already made survives intact.
- The apps are WebView apps. On a game of this size that is invisible to the
  player, but it is a real ceiling: anything needing 60 fps canvas work, heavy
  native APIs or platform-idiomatic navigation would be the point to reconsider.
- Two native projects are now checked in and carry their own upgrade cost —
  Gradle, AGP, CocoaPods and Xcode all move independently of npm.
- The web build pays a small price: the native adapter and its dynamic imports
  add roughly 0.9 kB gzipped to the main chunk. All Capacitor code itself is
  code-split behind a runtime check and never loads in a browser (ADR 12).
