/**
 * PWA Installation Management Composable
 *
 * Provides reactive access to PWA installation state and methods.
 * Manages install prompt visibility, dismissal tracking, and installation.
 */

const PWA_DISMISSAL_KEY = 'pwa:install-dismissed'
const PWA_DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface UsePWAInstallReturn {
  isInstalled: ComputedRef<boolean>
  canInstall: ComputedRef<boolean>
  isDismissed: ComputedRef<boolean>
  showInstallPrompt: ComputedRef<boolean | undefined>
  swActivated: ComputedRef<boolean>
  needRefresh: ComputedRef<boolean>
  offlineReady: ComputedRef<boolean>
  install: () => Promise<void>
  dismiss: () => void
  resetDismissal: () => void
  updateServiceWorker: () => Promise<void>
}

export function usePWAInstall(): UsePWAInstallReturn {
  const nuxtApp = useNuxtApp()

  // Access the $pwa plugin from nuxtApp
  // The plugin is provided by @vite-pwa/nuxt and may be undefined in dev mode
  // or when PWA is not properly configured
  const pwaPlugin = computed(() => {
    const plugin = nuxtApp.$pwa

    // Debug logging to help diagnose issues
    if (process.dev && !plugin) {
      console.warn(
        '[usePWAInstall] $pwa plugin is not available. This is expected in dev mode unless devOptions.enabled is true.',
      )
    }

    return plugin || null
  })

  // Check if PWA is already installed
  const isInstalled = computed(() => {
    return pwaPlugin.value?.isPWAInstalled === true
  })

  // Check if install prompt is available from PWA plugin
  const showInstallPrompt = computed(() => {
    const hasPrompt = pwaPlugin.value?.showInstallPrompt

    if (process.dev) {
      console.log('[usePWAInstall] showInstallPrompt:', hasPrompt)
      console.log('[usePWAInstall] pwaPlugin available:', !!pwaPlugin.value)
      if (pwaPlugin.value) {
        console.log(
          '[usePWAInstall] pwaPlugin properties:',
          Object.keys(pwaPlugin.value),
        )
      }
    }

    return hasPrompt
  })

  // Check if user can install (all conditions met)
  const canInstall = computed(() => {
    if (!pwaPlugin.value) {
      if (process.dev) {
        console.log('[usePWAInstall] canInstall: false - no pwaPlugin')
      }
      return false
    }

    if (isInstalled.value) {
      if (process.dev) {
        console.log('[usePWAInstall] canInstall: false - already installed')
      }
      return false
    }

    if (!showInstallPrompt.value) {
      if (process.dev) {
        console.log(
          '[usePWAInstall] canInstall: false - no install prompt available',
        )
      }
      return false
    }

    if (isDismissed.value) {
      if (process.dev) {
        console.log('[usePWAInstall] canInstall: false - user dismissed')
      }
      return false
    }

    if (process.dev) {
      console.log('[usePWAInstall] canInstall: true')
    }

    return true
  })

  // Check if user has dismissed the install prompt
  const isDismissed = computed(() => {
    if (typeof localStorage === 'undefined') return false

    const dismissedAt = localStorage.getItem(PWA_DISMISSAL_KEY)
    if (!dismissedAt) return false

    const timestamp = parseInt(dismissedAt, 10)
    const now = Date.now()

    // If dismissal period has expired, allow showing again
    if (now - timestamp > PWA_DISMISSAL_DURATION) {
      localStorage.removeItem(PWA_DISMISSAL_KEY)
      return false
    }

    return true
  })

  // Check if service worker is activated
  const swActivated = computed(() => {
    return pwaPlugin.value?.swActivated === true
  })

  // Check if update is needed
  const needRefresh = computed(() => {
    return pwaPlugin.value?.needRefresh === true
  })

  // Check if app is ready for offline use
  const offlineReady = computed(() => {
    return pwaPlugin.value?.offlineReady === true
  })

  /**
   * Trigger PWA installation
   * Calls the $pwa.install() method to show the native install prompt
   */
  async function install(): Promise<void> {
    try {
      if (pwaPlugin.value && typeof pwaPlugin.value.install === 'function') {
        await pwaPlugin.value.install()
      }
    } catch (error) {
      console.error('[PWA] Installation failed:', error)
      throw error
    }
  }

  /**
   * Dismiss the install prompt for a period of time
   * Stores dismissal timestamp in localStorage
   */
  function dismiss(): void {
    if (typeof localStorage === 'undefined') return

    localStorage.setItem(PWA_DISMISSAL_KEY, Date.now().toString())
  }

  /**
   * Reset the dismissal state
   * Allows the install prompt to show again immediately
   */
  function resetDismissal(): void {
    if (typeof localStorage === 'undefined') return

    localStorage.removeItem(PWA_DISMISSAL_KEY)
  }

  /**
   * Update the service worker to the latest version
   * Only works when registerType is set to 'prompt'
   */
  async function updateServiceWorker(): Promise<void> {
    try {
      if (
        pwaPlugin.value &&
        typeof pwaPlugin.value.updateServiceWorker === 'function'
      ) {
        await pwaPlugin.value.updateServiceWorker()
      }
    } catch (error) {
      console.error('[PWA] Service worker update failed:', error)
      throw error
    }
  }

  return {
    // State
    isInstalled,
    canInstall,
    isDismissed,
    showInstallPrompt,
    swActivated,
    needRefresh,
    offlineReady,

    // Methods
    install,
    dismiss,
    resetDismissal,
    updateServiceWorker,
  }
}
