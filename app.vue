<script setup lang="ts">
const peopleStore = usePeopleStore()
const activityStore = useActivityStore()
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const notificationStore = useNotificationStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const settingsStore = useSettingsStore()
const colorMode = useColorMode()

// Keyboard shortcuts modal state
const shortcutsModalOpen = ref(false)

// Register global keyboard shortcut for help modal (Cmd+/)
// TODO: this shows the modal, but the shortcuts don't work, so disable it for now
/* onKeyStroke('/', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    shortcutsModalOpen.value = true
  }
}) */

// Initialize non-async stores before app is mounted
onBeforeMount(() => {
  // Initialize onboarding state first (sync, from localStorage)
  onboardingStore.initialize()

  // Initialize notification store
  notificationStore.initialize()

  // Initialize UI settings store
  settingsStore.initialize()

  // Load P2P settings from storage (before wallet init)
  p2pStore.loadSettings()

  // Initialize people store
  peopleStore.initialize()

  // Initialize activity store
  activityStore.initialize()

  // Set up service worker message handler
  setupServiceWorkerMessageHandler()

  // Pre-warm overlay instances during idle time to eliminate first-click delay
  // Use requestIdleCallback if available, otherwise fall back to setTimeout
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => prewarmOverlays(), { timeout: 2000 })
  } else {
    setTimeout(prewarmOverlays, 100)
  }
})

// Initialize stores on app mount (async)
onMounted(async () => {

  // Crypto worker initialization moved to `plugins/crypto-init.client.ts`

  // Initialize new wallet or restore existing wallet
  await walletStore.initialize()

  // After wallet is ready, conditionally initialize P2P if autoConnect is enabled
  if (p2pStore.settings.autoConnect && !p2pStore.initialized) {
    try {
      await p2pStore.initialize()
      console.log('[App] P2P auto-connected based on settings')

      // If P2P connected and signer was previously enabled, initialize MuSig2
      if (p2pStore.connected && musig2Store.signerConfig) {
        try {
          await musig2Store.initialize()
          console.log('[App] MuSig2 auto-initialized for signer restoration')
        } catch (musig2Error) {
          console.warn('[App] Failed to auto-initialize MuSig2:', musig2Error)
        }
      }
    } catch (p2pError) {
      console.warn('[App] Failed to auto-connect P2P:', p2pError)
    }
  }
})

// Handle messages from service worker
function setupServiceWorkerMessageHandler() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.addEventListener('message', event => {
    const { type, payload } = event.data || {}

    switch (type) {
      case 'TRANSACTION_DETECTED':
        // Handle transaction detected by SW background polling
        walletStore.handleBackgroundTransaction(payload)
        break

      case 'BALANCE_CHANGED':
        // Refresh balance when SW detects changes
        walletStore.refreshUtxos()
        break
    }
  })
}

// Provide color mode to components
provide('colorMode', colorMode)
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Global Onboarding Modal -->
    <!-- <ClientOnly>
      <OnboardingModal />
    </ClientOnly> -->

    <!-- Keyboard Shortcuts Help Modal -->
    <!-- TODO: the modal shows shortcut keys that don't work, so just disable it -->
    <!-- <UiKeyboardShortcutsModal v-model:open="shortcutsModalOpen" /> -->
  </UApp>
</template>

<style>
/* Global styles */
html,
body,
#__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  /*height: 8px;*/
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgb(var(--color-gray-300));
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb {
  background: rgb(var(--color-gray-700));
}
</style>
