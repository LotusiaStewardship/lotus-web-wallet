<script setup lang="ts">
/**
 * Permission Prompt Component
 *
 * First-time prompt to enable browser notifications.
 * Shows when permission hasn't been requested yet.
 */
import { useNotificationStore } from '~/stores/notifications'

const notificationStore = useNotificationStore()
const toast = useToast()

// Track if user has dismissed the prompt this session
const dismissed = ref(false)

// Check if we should show the prompt
const shouldShow = computed(() => {
  // Don't show if dismissed this session
  if (dismissed.value) return false

  // Don't show if notifications not supported
  if (typeof window === 'undefined' || !('Notification' in window)) return false

  // Don't show if already granted or denied
  if (notificationStore.browserPermission !== 'default') return false

  // Don't show if user has previously dismissed (check localStorage)
  if (typeof localStorage !== 'undefined') {
    const dismissedAt = localStorage.getItem('lotus-notification-prompt-dismissed')
    if (dismissedAt) {
      // Show again after 7 days
      const dismissedTime = parseInt(dismissedAt, 10)
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return false
      }
    }
  }

  return true
})

// Dismiss the prompt
function dismiss() {
  dismissed.value = true
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(
      'lotus-notification-prompt-dismissed',
      Date.now().toString(),
    )
  }
}

// Enable notifications
async function enable() {
  const permission = await notificationStore.requestBrowserPermission()

  if (permission === 'granted') {
    toast.add({
      title: 'Notifications Enabled',
      description: 'You will now receive browser notifications for important events',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } else if (permission === 'denied') {
    toast.add({
      title: 'Notifications Blocked',
      description: 'You can enable notifications in your browser settings',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
  }

  dismissed.value = true
}

// Initialize store on mount
onMounted(() => {
  notificationStore.initialize()
})
</script>

<template>
  <UCard v-if="shouldShow" class="border-l-4 border-l-primary">
    <div class="flex items-start gap-4">
      <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <UIcon name="i-lucide-bell" class="w-5 h-5 text-primary" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm">Enable Notifications</p>
        <p class="text-xs text-muted mt-1">
          Get notified about incoming transactions and signing requests even when the app is in the
          background.
        </p>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <UButton variant="ghost" size="sm" @click="dismiss">
          Later
        </UButton>
        <UButton size="sm" @click="enable">
          Enable
        </UButton>
      </div>
    </div>
  </UCard>
</template>
