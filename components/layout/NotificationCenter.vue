<script setup lang="ts">
/**
 * Notification Center
 *
 * Dropdown showing recent notifications with mark as read functionality.
 */
import { useNotificationStore, type Notification } from '~/stores/notifications'

const notificationStore = useNotificationStore()
const router = useRouter()

// Initialize on mount
onMounted(() => {
  notificationStore.initialize()
})

// Format relative time
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}

// Get icon for notification type
function getIcon(type: Notification['type']): string {
  switch (type) {
    case 'transaction':
      return 'i-lucide-arrow-left-right'
    case 'signing_request':
      return 'i-lucide-pen-tool'
    case 'social':
      return 'i-lucide-users'
    case 'system':
      return 'i-lucide-bell'
    default:
      return 'i-lucide-bell'
  }
}

// Get color for notification type
function getColor(type: Notification['type']): string {
  switch (type) {
    case 'transaction':
      return 'text-primary'
    case 'signing_request':
      return 'text-warning'
    case 'social':
      return 'text-info'
    case 'system':
      return 'text-muted'
    default:
      return 'text-muted'
  }
}

// Handle notification click
function handleClick(notification: Notification) {
  notificationStore.markAsRead(notification.id)
  if (notification.actionUrl) {
    router.push(notification.actionUrl)
  }
}
</script>

<template>
  <UPopover>
    <UButton color="neutral" variant="ghost" icon="i-lucide-bell" class="relative">
      <!-- Unread badge -->
      <span v-if="notificationStore.unreadCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
        {{ notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount }}
      </span>
    </UButton>

    <template #content>
      <div class="w-80 max-h-96 overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-3 border-b border-default">
          <h3 class="font-semibold">Notifications</h3>
          <UButton v-if="notificationStore.unreadCount > 0" size="xs" variant="ghost" color="primary"
            @click="notificationStore.markAllAsRead()">
            Mark all read
          </UButton>
        </div>

        <!-- Notifications List -->
        <div class="flex-1 overflow-y-auto">
          <!-- Empty State -->
          <div v-if="notificationStore.notifications.length === 0" class="p-8 text-center">
            <UIcon name="i-lucide-bell-off" class="w-10 h-10 mx-auto mb-2 text-muted" />
            <p class="text-sm text-muted">No notifications yet</p>
          </div>

          <!-- Grouped Notifications -->
          <div v-else>
            <div v-for="group in notificationStore.groupedNotifications" :key="group.label">
              <div class="px-3 py-1.5 text-xs font-medium text-muted bg-muted/30">
                {{ group.label }}
              </div>
              <div v-for="notification in group.notifications" :key="notification.id"
                class="flex items-start gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                :class="{ 'bg-primary/5': !notification.read }" @click="handleClick(notification)">
                <!-- Icon -->
                <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <UIcon :name="getIcon(notification.type)" class="w-4 h-4" :class="getColor(notification.type)" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm truncate">{{ notification.title }}</span>
                    <span v-if="!notification.read" class="w-2 h-2 rounded-full bg-primary shrink-0" />
                  </div>
                  <p class="text-xs text-muted truncate">{{ notification.message }}</p>
                  <p class="text-xs text-muted mt-0.5">{{ formatTime(notification.timestamp) }}</p>
                </div>

                <!-- Delete button -->
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x"
                  class="shrink-0 opacity-0 group-hover:opacity-100"
                  @click.stop="notificationStore.deleteNotification(notification.id)" />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="notificationStore.notifications.length > 0" class="p-2 border-t border-default">
          <UButton block size="sm" variant="ghost" color="neutral" @click="notificationStore.clearAll()">
            Clear All
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
