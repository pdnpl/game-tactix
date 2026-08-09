import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
  },
  test: {
    // The engine is pure and needs no DOM. UI specs opt in with a
    // `@vitest-environment jsdom` docblock, which keeps the suite fast.
    environment: 'node',
  },
})
