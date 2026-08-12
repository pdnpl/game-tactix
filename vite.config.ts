import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
    // The only dynamic imports are the native plugins, which the web build
    // never loads. Every target browser supports modulepreload natively, so the
    // polyfill is dead weight in the main chunk.
    modulePreload: { polyfill: false },
  },
  test: {
    // The engine is pure and needs no DOM. UI specs opt in with a
    // `@vitest-environment jsdom` docblock, which keeps the suite fast.
    environment: 'node',
  },
})
