# 14. Verify both mobile builds in CI, because one of them cannot be built here

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

Tactix is developed on Windows. Android can be built there once a JDK and the
SDK are installed. **iOS cannot be built on Windows at all** — Xcode is macOS
only, and no configuration, plugin or emulator changes that.

So the iOS project could be generated, configured and committed, and its icons
and splash screens produced, without anything ever confirming that it compiles.
That is a bad place to leave a shipped target: the first person to open it on a
Mac would discover the breakage, and nothing in the repository would have
flagged it.

`main` is already gated on evidence rather than on judgement (ADR 10). Extending
that to the mobile targets is the same argument applied to a platform the author
cannot reach.

## Decision

CI builds both apps on every pull request, as jobs alongside `ci`:

- **`android`** — Ubuntu runner, **JDK 21**, `npm run sync` then
  `./gradlew assembleDebug`. The APK is uploaded as a workflow artifact, so a
  build can be downloaded and installed on a device without a local toolchain.

  The JDK version is not a free choice. Capacitor 8's Android libraries are
  compiled with source release 21, and JDK 17 fails the build outright at
  `:capacitor-android:compileDebugJavaWithJavac` with `invalid source release:
21`. This was found by building locally first; had the workflow been trusted
  unverified, it would have failed on its first run.

- **`ios`** — macOS runner, `npm run sync`, `pod install`, then `xcodebuild`
  against the simulator SDK with `CODE_SIGNING_ALLOWED=NO`.

The iOS job is a **simulator** build. It proves the project configures,
compiles and links, and that the Capacitor plugins resolve. It deliberately does
not produce a distributable archive, because that needs an Apple Developer
signing identity, which is an account credential rather than a build input.

## Consequences

- The iOS target is compiled on every change despite no Mac being involved in
  development. That is the only thing standing between "the iOS folder exists"
  and "the iOS app builds".
- A downloadable APK per pull request makes real-device testing possible for
  anyone, with no Android SDK installed.
- CI is slower and consumes macOS runner minutes. On a public repository that is
  free; if this repo ever goes private the iOS job becomes the expensive one and
  would likely need to move to a nightly or release-only trigger.
- Neither job runs the app. They prove it builds, not that it plays correctly on
  a device — that gap is covered by the 89 tests running against the same web
  bundle both shells load, plus manual checks on a real handset.
- Signing, store metadata and release archives are out of scope here and remain
  manual. This ADR covers verification, not distribution.
