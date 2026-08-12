// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { feedback, initNative, isNative, syncStatusBar } from './native'

// These assert the *web* half of the contract: on a platform with no Capacitor
// bridge the adapter must be inert, never throw, and never load a plugin.
// The native half is exercised by the Android and iOS builds in CI.

describe('on the web', () => {
  it('does not report itself as native', () => {
    expect(isNative).toBe(false)
  })

  it('resolves initNative without loading any plugin', async () => {
    await expect(initNative()).resolves.toBeUndefined()
  })

  it('makes every feedback call a silent no-op', () => {
    for (const kind of ['move', 'win', 'draw', 'blocked'] as const) {
      expect(() => feedback(kind)).not.toThrow()
    }
  })

  it('leaves the status bar call harmless', () => {
    document.documentElement.dataset.theme = 'dark'
    expect(() => syncStatusBar()).not.toThrow()
  })

  it('stays inert even after init has been awaited', async () => {
    await initNative()
    expect(() => feedback('win')).not.toThrow()
  })
})
