<script setup lang="ts">
/**
 * PWA Install Button Component
 *
 * Displays a button to install the app as a PWA.
 * Only shows when the PWA is not installed and the install prompt is available.
 */

const props = defineProps<{
  showDebugInfo?: boolean
}>()

const { canInstall, isInstalled, showInstallPrompt, install, dismiss } = usePWAInstall()
const nuxtApp = useNuxtApp()
const isLoading = ref(false)
const showDismissDialog = ref(false)

// Debug info for development
const debugInfo = computed(() => {
  if (!props.showDebugInfo) return null

  return {
    pwaPluginAvailable: !!nuxtApp.$pwa,
    canInstall: canInstall.value,
    isInstalled: isInstalled.value,
    showInstallPrompt: showInstallPrompt.value,
  }
})

async function handleInstall() {
  isLoading.value = true
  try {
    await install()
  } catch (error) {
    console.error('[PWAInstallButton] Installation failed:', error)
  } finally {
    isLoading.value = false
  }
}

function handleDismiss() {
  dismiss()
  showDismissDialog.value = false
}

function toggleDismissDialog() {
  showDismissDialog.value = !showDismissDialog.value
}
</script>

<template>
  <div v-if="canInstall" class="relative flex items-center gap-2">
    <UButton @click="handleInstall" :loading="isLoading" icon="i-lucide-download" color="primary" variant="soft"
      size="sm" aria-label="Install app">
      Install
    </UButton>

    <UButton @click="toggleDismissDialog" icon="i-lucide-x" color="neutral" variant="ghost" size="sm"
      aria-label="Dismiss install prompt" />

    <!-- Dismissal confirmation dialog -->
    <Teleport to="body">
      <div v-if="showDismissDialog" class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="showDismissDialog = false">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="showDismissDialog = false" />

        <!-- Dialog -->
        <UCard class="relative w-80 max-w-[90vw]">
          <template #header>
            <h3 class="text-lg font-semibold">Hide Install Prompt?</h3>
          </template>

          <p class="text-sm text-gray-600 dark:text-gray-400">
            The install prompt will be hidden for 7 days. You can always install the app later from Settings.
          </p>

          <template #footer>
            <div class="flex gap-2 justify-end">
              <UButton @click="showDismissDialog = false" variant="ghost" size="sm">
                Cancel
              </UButton>
              <UButton @click="handleDismiss" color="primary" variant="soft" size="sm">
                Hide for 7 days
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </Teleport>
  </div>
</template>
