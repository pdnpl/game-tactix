// Renders every launcher icon and splash asset from one vector source.
//
// Replaces the placeholder art that `cap add` drops in. Run after adding or
// re-adding a platform:  npm run icons
//
// Uses @resvg/resvg-js (prebuilt binaries) rather than @capacitor/assets, whose
// sharp dependency needs a native toolchain this project does not otherwise
// require.

import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BG = '#08080c'
const X = '#38bdf8'
const O = '#fb7185'

/**
 * The mark pair, drawn in a 100x100 box.
 * `inset` shrinks the artwork toward the centre, which is how the adaptive
 * foreground keeps clear of Android's mask.
 */
function marks(inset = 0) {
  const s = (100 - inset * 2) / 100
  return `
    <g transform="translate(${inset} ${inset}) scale(${s})">
      <g fill="none" stroke-linecap="round" stroke-width="9.5">
        <path d="M20 20 L46 46 M46 20 L20 46" stroke="${X}" />
        <circle cx="66" cy="66" r="19" stroke="${O}" />
      </g>
    </g>`
}

const svg = {
  /** Opaque square. iOS masks its own corners and rejects alpha. */
  square: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${BG}"/>${marks(14)}</svg>`,

  /** Legacy Android launcher, with its own rounded corners. */
  rounded: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="22" fill="${BG}"/>${marks(14)}</svg>`,

  round: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${BG}"/>${marks(18)}</svg>`,

  /** Adaptive foreground: transparent, artwork inside the 72/108 safe zone. */
  foreground: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      ${marks(28)}</svg>`,

  /** Splash: one centred mark pair on the app background. */
  splash: (w, h) => {
    const d = Math.min(w, h)
    const x = (w - d * 0.38) / 2
    const y = (h - d * 0.38) / 2
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="${BG}"/>
      <svg x="${x}" y="${y}" width="${d * 0.38}" height="${d * 0.38}" viewBox="0 0 100 100">${marks(6)}</svg>
    </svg>`
  },
}

/** Rasterises an SVG string to a PNG buffer at the given pixel width. */
function renderExact(source, width) {
  return new Resvg(source, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(0,0,0,0)',
  })
    .render()
    .asPng()
}

function write(relPath, buffer) {
  const full = join(ROOT, relPath)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, buffer)
  return relPath
}

const written = []

/* ------------------------------------------------------------- Android --- */

// Legacy + round launcher icons, and the adaptive foreground (108dp grid).
const DENSITIES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
]

for (const [density, legacy, adaptive] of DENSITIES) {
  const dir = `android/app/src/main/res/mipmap-${density}`
  written.push(write(`${dir}/ic_launcher.png`, renderExact(svg.rounded(), legacy)))
  written.push(write(`${dir}/ic_launcher_round.png`, renderExact(svg.round(), legacy)))
  written.push(write(`${dir}/ic_launcher_foreground.png`, renderExact(svg.foreground(), adaptive)))
}

// The adaptive icon's background is a colour resource, not an image.
write(
  'android/app/src/main/res/values/ic_launcher_background.xml',
  Buffer.from(
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
  ),
)
written.push('android/app/src/main/res/values/ic_launcher_background.xml')

// Splash screens, portrait and landscape, per density.
const SPLASH = [
  ['mdpi', 320, 480],
  ['hdpi', 480, 800],
  ['xhdpi', 720, 1280],
  ['xxhdpi', 960, 1600],
  ['xxxhdpi', 1280, 1920],
]

for (const [density, shortSide, longSide] of SPLASH) {
  written.push(
    write(
      `android/app/src/main/res/drawable-port-${density}/splash.png`,
      renderExact(svg.splash(shortSide, longSide), shortSide),
    ),
  )
  written.push(
    write(
      `android/app/src/main/res/drawable-land-${density}/splash.png`,
      renderExact(svg.splash(longSide, shortSide), longSide),
    ),
  )
}

written.push(
  write('android/app/src/main/res/drawable/splash.png', renderExact(svg.splash(480, 800), 480)),
)

/* ----------------------------------------------------------------- iOS --- */

written.push(
  write(
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
    renderExact(svg.square(), 1024),
  ),
)

for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  written.push(
    write(
      `ios/App/App/Assets.xcassets/Splash.imageset/${name}`,
      renderExact(svg.splash(2732, 2732), 2732),
    ),
  )
}

/* --------------------------------------------------------------- web ----- */

written.push(write('public/favicon.png', renderExact(svg.rounded(), 512)))

console.log(`Generated ${written.length} assets`)
