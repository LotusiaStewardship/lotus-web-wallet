<script setup lang="ts">
/**
 * Service Worker Update Prompt Component
 *
 * Uses Nuxt UI 3 Pro UBanner to display an update notification.
 * The `id` prop enables built-in localStorage persistence — once
 * dismissed, the banner will not reappear on page reload.
 *
 * Follows human-centered UX principles:
 * - Clear purpose: "What can I do here?" → Update to latest version
 * - Clear action: Update now or dismiss
 * - Respects autonomy: Dismissible with persistent preference (via UBanner id)
 * - Non-blocking: User can continue using the app
 *
 * Per 07_HUMAN_CENTERED_UX.md Principle 8 (Anti-Annoyance):
 * - Dismissible with persistence
 * - Re-enablable in Settings (via useDismissible reset)
 */

const { needRefresh, updateServiceWorker } = usePWAInstall()
const { isDismissed } = useDismissible('sw:update-available')

const showBanner = computed(() => {
  return needRefresh.value && !isDismissed.value
})

async function handleUpdate() {
  await updateServiceWorker()
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <UBanner
      v-if="showBanner"
      id="sw-update-available"
      color="primary"
      icon="i-lucide-refresh-cw"
      close
    >
      <template #title>
        <span>Update Available</span>
        <span class="hidden sm:inline text-sm text-inverted/80 ml-2 font-normal">
          A new version is ready. Update now for the latest features and improvements.
        </span>
      </template>

      <template #actions>
        <UButton
          label="Update Now"
          color="neutral"
          size="xs"
          loading-auto
          @click="handleUpdate"
        />
      </template>
    </UBanner>
  </Transition>
</template>
