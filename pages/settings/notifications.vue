<script setup lang="ts">
/**
 * Notification Settings Page
 *
 * Configure notification preferences and browser permissions.
 */
import { useNotificationStore } from '~/stores/notifications'

definePageMeta({
  title: 'Notifications',
})

const notificationStore = useNotificationStore()
const toast = useToast()

// Browser notification permission state (use store state)
const isRequestingPermission = ref(false)

// Computed for browser permission from store
const browserPermission = computed(() => notificationStore.browserPermission)

// Initialize
onMounted(() => {
  notificationStore.initialize()
})

// Request browser notification permission
async function requestBrowserPermission() {
  if (!('Notification' in window)) {
    toast.add({
      title: 'Not Supported',
      description: 'Browser notifications are not supported in this browser',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  isRequestingPermission.value = true

  try {
    const permission = await notificationStore.requestBrowserPermission()

    if (permission === 'granted') {
      toast.add({
        title: 'Notifications Enabled',
        description: 'You will now receive browser notifications',
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
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to request notification permission',
      color: 'error',
      icon: 'i-lucide-x',
    })
  } finally {
    isRequestingPermission.value = false
  }
}

// Toggle preference handlers
function toggleTransactions(value: boolean) {
  notificationStore.updatePreferences({ transactions: value })
}

function toggleSigningRequests(value: boolean) {
  notificationStore.updatePreferences({ signingRequests: value })
}

function toggleSocial(value: boolean) {
  notificationStore.updatePreferences({ social: value })
}

function toggleSystem(value: boolean) {
  notificationStore.updatePreferences({ system: value })
}

function toggleBrowserNotifications(value: boolean) {
  notificationStore.updatePreferences({ browserNotifications: value })
}

// Clear all notifications
function clearAllNotifications() {
  notificationStore.clearAll()
  toast.add({
    title: 'Cleared',
    description: 'All notifications have been cleared',
    color: 'success',
    icon: 'i-lucide-check',
  })
}

// Mark all as read
function markAllAsRead() {
  notificationStore.markAllAsRead()
  toast.add({
    title: 'Done',
    description: 'All notifications marked as read',
    color: 'success',
    icon: 'i-lucide-check',
  })
}

// Permission status display
const permissionStatus = computed(() => {
  switch (browserPermission.value) {
    case 'granted':
      return { text: 'Enabled', color: 'success', icon: 'i-lucide-check-circle' }
    case 'denied':
      return { text: 'Blocked', color: 'error', icon: 'i-lucide-x-circle' }
    default:
      return { text: 'Not Set', color: 'warning', icon: 'i-lucide-alert-circle' }
  }
})
</script>

<template>
  <div class="space-y-6 max-w-lg mx-auto">
    <!-- Header -->
    <UiAppHeroCard icon="i-lucide-bell" title="Notifications" subtitle="Configure how you receive alerts and updates" />

    <!-- Browser Permission -->
    <UiAppCard title="Browser Notifications" icon="i-lucide-globe">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-sm">Permission Status</p>
            <p class="text-xs text-muted">Allow notifications from this app</p>
          </div>
          <UBadge :color="permissionStatus.color as any" variant="subtle" :icon="permissionStatus.icon">
            {{ permissionStatus.text }}
          </UBadge>
        </div>

        <UButton v-if="browserPermission !== 'granted'" :loading="isRequestingPermission"
          :disabled="browserPermission === 'denied'" icon="i-lucide-bell-ring" block @click="requestBrowserPermission">
          {{ browserPermission === 'denied' ? 'Blocked in Browser Settings' : 'Enable Browser Notifications' }}
        </UButton>

        <UAlert v-if="browserPermission === 'denied'" color="warning" variant="subtle" icon="i-lucide-info">
          <template #description>
            Notifications are blocked. To enable them, click the lock icon in your browser's address bar and allow
            notifications.
          </template>
        </UAlert>

        <!-- Browser notification toggle (only if granted) -->
        <div v-if="browserPermission === 'granted'"
          class="flex items-center justify-between pt-2 border-t border-default">
          <div>
            <p class="font-medium text-sm">Show Browser Notifications</p>
            <p class="text-xs text-muted">Display system notifications for important events</p>
          </div>
          <USwitch :model-value="notificationStore.preferences.browserNotifications"
            @update:model-value="toggleBrowserNotifications" />
        </div>
      </div>
    </UiAppCard>

    <!-- Notification Types -->
    <UiAppCard title="Notification Types" icon="i-lucide-settings-2">
      <div class="space-y-4">
        <!-- Transactions -->
        <div class="flex items-center justify-between py-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-arrow-left-right" class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="font-medium text-sm">Transactions</p>
              <p class="text-xs text-muted">Incoming and outgoing payments</p>
            </div>
          </div>
          <USwitch :model-value="notificationStore.preferences.transactions" @update:model-value="toggleTransactions" />
        </div>

        <!-- Signing Requests -->
        <div class="flex items-center justify-between py-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-success" />
            </div>
            <div>
              <p class="font-medium text-sm">Signing Requests</p>
              <p class="text-xs text-muted">Multi-signature transaction requests</p>
            </div>
          </div>
          <USwitch :model-value="notificationStore.preferences.signingRequests"
            @update:model-value="toggleSigningRequests" />
        </div>

        <!-- Social / RANK -->
        <div class="flex items-center justify-between py-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <UIcon name="i-lucide-users" class="w-5 h-5 text-info" />
            </div>
            <div>
              <p class="font-medium text-sm">Social Activity</p>
              <p class="text-xs text-muted">RANK votes and social updates</p>
            </div>
          </div>
          <USwitch :model-value="notificationStore.preferences.social" @update:model-value="toggleSocial" />
        </div>

        <!-- System -->
        <div class="flex items-center justify-between py-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <UIcon name="i-lucide-info" class="w-5 h-5 text-warning" />
            </div>
            <div>
              <p class="font-medium text-sm">System Alerts</p>
              <p class="text-xs text-muted">Updates and important announcements</p>
            </div>
          </div>
          <USwitch :model-value="notificationStore.preferences.system" @update:model-value="toggleSystem" />
        </div>
      </div>
    </UiAppCard>

    <!-- Notification History -->
    <UiAppCard title="Notification History" icon="i-lucide-history">
      <div class="space-y-4">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">Total notifications</span>
          <span class="font-medium">{{ notificationStore.notifications.length }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">Unread</span>
          <UBadge v-if="notificationStore.unreadCount > 0" color="primary" variant="subtle">
            {{ notificationStore.unreadCount }}
          </UBadge>
          <span v-else class="text-muted">None</span>
        </div>

        <div class="flex gap-2 pt-2">
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-check-check" class="flex-1"
            :disabled="notificationStore.unreadCount === 0" @click="markAllAsRead">
            Mark All Read
          </UButton>
          <UButton color="error" variant="soft" size="sm" icon="i-lucide-trash-2" class="flex-1"
            :disabled="notificationStore.notifications.length === 0" @click="clearAllNotifications">
            Clear All
          </UButton>
        </div>
      </div>
    </UiAppCard>

    <!-- Info -->
    <UAlert color="info" variant="subtle" icon="i-lucide-info">
      <template #description>
        Notification preferences are saved locally on your device. Browser notifications require permission and may not
        work in all browsers.
      </template>
    </UAlert>
  </div>
</template>
