<div align="center">

# Tactix

**Tic-tac-toe, done properly.** Play solo against an opponent that cannot lose,
or pass the device and play a human.

Web · Android · iOS — one codebase

8.3 kB gzipped · no framework · no backend · no accounts · fully offline

</div>

---

## Play

```bash
npm install && npm run dev
```

Then open http://localhost:5173.

## What's in it

- **Two ways to play** — solo against the AI, or two players on one device.
- **Three difficulties.** `Easy` moves at random. `Medium` takes wins and blocks
  threats but plans no further. `Unbeatable` is full alpha-beta minimax and is
  provably impossible to beat — the test suite plays 340 games to prove it.
- **Marks that draw themselves in**, and a strike-through line measured from the
  real board geometry so it lands on the winning marks at any size.
- **Light and dark themes**, resolved before first paint so the wrong one is
  never shown and then corrected.
- **Playable entirely from the keyboard** — arrow keys, `Home`/`End`, `Enter`.
  Every cell is labelled by position for screen readers.
- **Respects `prefers-reduced-motion`.**

## Scripts

| Script                | Does                                                  |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Dev server with HMR                                   |
| `npm test`            | Full Vitest suite                                     |
| `npm run test:watch`  | Tests in watch mode                                   |
| `npm run build`       | Typecheck, then production build to `dist/`           |
| `npm run preview`     | Serve the built bundle                                |
| `npm run cf:dev`      | Build, then serve through Wrangler as Cloudflare will |
| `npm run deploy`      | Build and deploy to Cloudflare Workers                |
| `npm run format`      | Prettier over the repo                                |
| `npm run sync`        | Build, then copy the web bundle into both native apps |
| `npm run android`     | Sync, then open the project in Android Studio         |
| `npm run android:apk` | Sync, then assemble a debug APK                       |
| `npm run ios`         | Sync, then open the project in Xcode (macOS only)     |
| `npm run icons`       | Regenerate every launcher icon and splash from vector |

## Deploying

The app is a static-asset Worker — there is no server code, so Cloudflare serves
`dist/` from the edge without invoking a Worker at all ([ADR 4](docs/adr/0004-cloudflare-workers-static-assets.md)).

```bash
npx wrangler login
npm run deploy
```

## Mobile

Android and iOS run the same build inside a Capacitor shell
([ADR 11](docs/adr/0011-capacitor-for-mobile.md)). The bundle ships inside the
app, so both play offline and make no network requests at all.

```bash
npm run android:apk   # debug APK, needs the Android SDK + JDK 21
npm run ios           # opens Xcode, macOS only
```

Native touches beyond the web build:

- **Haptics** — a light tap per move, a distinct notification on a win or a draw.
- **Status bar** follows the theme, and the splash hides the moment the game is
  ready rather than on a timer.
- **Android back** minimises instead of destroying the activity, so the session
  score survives ([ADR 9](docs/adr/0009-no-persistence.md)).
- **Touch is treated as its own input mode**, not a mouse without a cursor —
  hover states are gated behind `@media (hover: hover)` so they cannot latch on
  tap, safe-area insets keep the card clear of notches, and hit areas grow on
  coarse pointers ([ADR 13](docs/adr/0013-touch-first-interaction.md)).

None of the native code reaches the web bundle: Capacitor is code-split behind a
runtime check, so a browser never downloads a byte of it
([ADR 12](docs/adr/0012-keep-capacitor-out-of-the-web-bundle.md)).

CI builds both apps on every pull request — the Android APK on Linux and the iOS
target on a macOS runner — and uploads the APK as a downloadable artifact.

## How it fits together

```
src/
  game/          Pure engine. No DOM, anywhere.
    board.ts     Rules: win detection, legal moves, whose turn it is
    ai.ts        Alpha-beta minimax and the easier difficulty policies
    session.ts   State transitions: play, AI reply, next round, settings
  ui/
    app.ts       Mounts the board, owns events and the paint diff
    marks.ts     Builds the X and O as inline SVG
    copy.ts      All player-facing wording, in one place
  style.css      Design tokens, both themes, every animation
```

The engine is a set of pure functions over an immutable board; the UI is the
only thing that knows the DOM exists. Whose turn it is is _derived_ from the
board rather than stored beside it, so the two cannot disagree
([ADR 6](docs/adr/0006-derive-state-not-store-it.md)).

Renders touch only the cells whose mark actually changed, so a move mutates two
cells rather than rebuilding the grid.

## Tests

84 tests, about 2 seconds. The engine suite runs in Node — no DOM to stand up —
and UI specs opt into jsdom, mounting against the real `index.html` so the
markup and the wiring cannot drift apart ([ADR 7](docs/adr/0007-testing-strategy.md)).

The headline assertion: the unbeatable AI is played out over 300 randomised
games on both sides, plus 40 full sessions, and is required never to lose one.

## Decisions

Every non-obvious technical decision is written down in [`docs/adr/`](docs/adr/):

| #                                                            | Decision                                         |
| ------------------------------------------------------------ | ------------------------------------------------ |
| [1](docs/adr/0001-record-architecture-decisions.md)          | Record architecture decisions                    |
| [2](docs/adr/0002-no-ui-framework.md)                        | Build the UI without a framework                 |
| [3](docs/adr/0003-hand-authored-css.md)                      | Hand-author CSS with custom properties           |
| [4](docs/adr/0004-cloudflare-workers-static-assets.md)       | Deploy as a static-asset Worker                  |
| [5](docs/adr/0005-minimax-opponent.md)                       | Minimax opponent with heuristic difficulty tiers |
| [6](docs/adr/0006-derive-state-not-store-it.md)              | Derive whose turn it is from the board           |
| [7](docs/adr/0007-testing-strategy.md)                       | Split the test suite by what it needs            |
| [8](docs/adr/0008-svg-marks-and-strike-geometry.md)          | Draw marks as SVG and measure the strike line    |
| [9](docs/adr/0009-no-persistence.md)                         | Keep the score in memory only                    |
| [10](docs/adr/0010-trunk-based-flow-with-required-checks.md) | Protect `main` and gate it on CI                 |
| [11](docs/adr/0011-capacitor-for-mobile.md)                  | Ship the mobile apps with Capacitor              |
| [12](docs/adr/0012-keep-capacitor-out-of-the-web-bundle.md)  | Keep Capacitor out of the web bundle             |
| [13](docs/adr/0013-touch-first-interaction.md)               | Treat touch as its own input mode                |
| [14](docs/adr/0014-verifying-mobile-builds-in-ci.md)         | Verify both mobile builds in CI                  |

## Contributing

`main` is protected: no direct pushes, and every change lands through a pull
request whose checks have passed. CI runs formatting, types, tests and a
production build, and builds both mobile apps — the Android APK on Linux and the
iOS target on a macOS runner, which is the only place the iOS project gets
compiled at all ([ADR 14](docs/adr/0014-verifying-mobile-builds-in-ci.md)).

```bash
git switch -c your-change
# ...
gh pr create
```
