// Rewrites the local package paths in the iOS SPM manifest to forward slashes.
//
// `cap sync` regenerates ios/App/CapApp-SPM/Package.swift using the *host*
// path separator. Run on Windows it emits entries like
//
//   .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app")
//
// which Swift Package Manager cannot resolve on macOS, so the iOS build fails
// on the only machine that can perform it. Forward slashes are valid on every
// platform including Windows, so normalising is safe unconditionally.
//
// Chained after `cap sync` in the `sync` script; harmless when sync ran on a
// Mac or Linux box, where there is nothing to change.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MANIFEST = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'ios',
  'App',
  'CapApp-SPM',
  'Package.swift',
)

let source
try {
  source = readFileSync(MANIFEST, 'utf8')
} catch (error) {
  if (error.code === 'ENOENT') {
    // The iOS platform is optional; nothing to do if it has not been added.
    process.exit(0)
  }
  throw error
}

// Only touch the quoted path arguments, never the rest of the manifest.
const fixed = source.replace(/path:\s*"([^"]*)"/g, (match, path) =>
  match.replace(path, path.replaceAll('\\', '/')),
)

if (fixed === source) {
  console.log('SPM paths already POSIX-style')
} else {
  writeFileSync(MANIFEST, fixed)
  console.log('Normalised SPM package paths to forward slashes')
}
