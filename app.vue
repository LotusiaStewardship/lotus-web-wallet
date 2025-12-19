<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'
import { useNotificationStore } from '~/stores/notifications'

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const notificationStore = useNotificationStore()
const colorMode = useColorMode()

// Keyboard shortcuts modal state
const shortcutsModalOpen = ref(false)

// Register global keyboard shortcut for help modal (Cmd+/)
onKeyStroke('/', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    shortcutsModalOpen.value = true
  }
})

// Initialize stores on app mount
onMounted(async () => {
  // Initialize onboarding state first (sync, from localStorage)
  onboardingStore.initialize()

  // Initialize notification store
  notificationStore.initialize()

  // Initialize wallet (async, may create new or load existing)
  await walletStore.initialize()

  // Set up service worker message handler
  setupServiceWorkerMessageHandler()
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
    <CommonKeyboardShortcutsModal v-model:open="shortcutsModalOpen" />
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
  height: 8px;
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
