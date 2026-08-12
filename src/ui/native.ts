/**
 * True inside the Android or iOS shell, false in a browser.
 *
 * Read off the global the native runtime injects rather than by importing
 * `@capacitor/core`. A static import of core would land in the main chunk and
 * cost the web build several kilobytes for a bridge that can never exist there;
 * this keeps every byte of Capacitor behind the dynamic imports below.
 */
type CapacitorGlobal = { isNativePlatform?: () => boolean }

export const isNative = Boolean(
  (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor?.isNativePlatform?.(),
)

export type Feedback = 'move' | 'win' | 'draw' | 'blocked'

type Bridge = {
  impact: (style: 'light' | 'medium' | 'heavy') => void
  notify: (type: 'success' | 'warning') => void
  setStatusBarDark: (dark: boolean) => void
}

let bridge: Bridge | null = null

/**
 * Loads the native plugins and wires up platform behaviour.
 *
 * Everything is imported dynamically and only when actually running natively,
 * so the browser bundle never pays for code it cannot use — the web build stays
 * at its original size and the plugins land in a separate chunk.
 */
export async function initNative(): Promise<void> {
  if (!isNative) return

  const [
    { Haptics, ImpactStyle, NotificationType },
    { StatusBar, Style },
    { App },
    { SplashScreen },
  ] = await Promise.all([
    import('@capacitor/haptics'),
    import('@capacitor/status-bar'),
    import('@capacitor/app'),
    import('@capacitor/splash-screen'),
  ])

  const impactStyles = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  } as const

  bridge = {
    impact: (style) => void Haptics.impact({ style: impactStyles[style] }).catch(() => {}),
    notify: (type) =>
      void Haptics.notification({
        type: type === 'success' ? NotificationType.Success : NotificationType.Warning,
      }).catch(() => {}),
    setStatusBarDark: (dark) => {
      // Style.Dark means light content on a dark bar.
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
    },
  }

  // Android hardware back. The default would finish the activity and destroy
  // the app, taking the session score with it (ADR 9 keeps the score in memory
  // only). Minimising instead sends it to the background with the round and the
  // tally intact, which is what a game is expected to do.
  void App.addListener('backButton', () => {
    void App.minimizeApp().catch(() => {})
  })

  syncStatusBar()
  await SplashScreen.hide().catch(() => {})
}

/** Matches the status bar to the current theme. Safe to call on the web. */
export function syncStatusBar(): void {
  bridge?.setStatusBarDark(document.documentElement.dataset.theme === 'dark')
}

/**
 * A short physical response to a game event. Silent on the web, and never
 * allowed to reject — haptics are a nicety and must not break a turn.
 */
export function feedback(kind: Feedback): void {
  if (!bridge) return
  switch (kind) {
    case 'move':
      return bridge.impact('light')
    case 'blocked':
      return bridge.impact('heavy')
    case 'win':
      return bridge.notify('success')
    case 'draw':
      return bridge.notify('warning')
  }
}
