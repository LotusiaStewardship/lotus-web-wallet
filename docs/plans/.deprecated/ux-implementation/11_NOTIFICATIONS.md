# Phase 11: Notification System

## Overview

The wallet needs a persistent notification system beyond toast messages. This phase implements a notification center for important events like incoming transactions and signing requests.

**Priority**: P3 (Lower)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 10 (Settings), all previous phases

---

## Goals

1. Notification center in header
2. Persistent notifications for important events
3. Notification preferences
4. Mark as read functionality
5. Notification grouping by type
6. Push notifications (PWA, future)

---

## 1. Notification Store

### File: `stores/notifications.ts`

```ts
import { defineStore } from 'pinia'

export interface Notification {
  id: string
  type: 'transaction' | 'signing_request' | 'system' | 'social'
  title: string
  message: string
  timestamp: number
  read: boolean
  actionUrl?: string
  actionLabel?: string
  data?: Record<string, any>
}

interface NotificationState {
  notifications: Notification[]
  preferences: {
    transactions: boolean
    signingRequests: boolean
    social: boolean
    system: boolean
  }
}

export const useNotificationStore = defineStore('notifications', {
  state: (): NotificationState => ({
    notifications: [],
    preferences: {
      transactions: true,
      signingRequests: true,
      social: true,
      system: true,
    },
  }),

  getters: {
    unreadCount: state => state.notifications.filter(n => !n.read).length,

    unreadNotifications: state => state.notifications.filter(n => !n.read),

    groupedNotifications: state => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const groups: { label: string; notifications: Notification[] }[] = []

      const todayNotifs = state.notifications.filter(
        n => new Date(n.timestamp) >= today,
      )
      if (todayNotifs.length > 0) {
        groups.push({ label: 'Today', notifications: todayNotifs })
      }

      const yesterdayNotifs = state.notifications.filter(n => {
        const date = new Date(n.timestamp)
        return date >= yesterday && date < today
      })
      if (yesterdayNotifs.length > 0) {
        groups.push({ label: 'Yesterday', notifications: yesterdayNotifs })
      }

      const earlierNotifs = state.notifications.filter(
        n => new Date(n.timestamp) < yesterday,
      )
      if (earlierNotifs.length > 0) {
        groups.push({ label: 'Earlier', notifications: earlierNotifs })
      }

      return groups
    },
  },

  actions: {
    initialize() {
      const saved = localStorage.getItem('notifications')
      if (saved) {
        const data = JSON.parse(saved)
        this.$patch(data)
      }
    },

    save() {
      localStorage.setItem(
        'notifications',
        JSON.stringify({
          notifications: this.notifications.slice(0, 100), // Keep last 100
          preferences: this.preferences,
        }),
      )
    },

    addNotification(
      notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
    ) {
      // Check preferences
      if (!this.preferences[notification.type]) return

      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      }

      this.notifications.unshift(newNotification)
      this.save()

      // Could trigger browser notification here
      this.showBrowserNotification(newNotification)
    },

    markAsRead(id: string) {
      const notification = this.notifications.find(n => n.id === id)
      if (notification) {
        notification.read = true
        this.save()
      }
    },

    markAllAsRead() {
      this.notifications.forEach(n => (n.read = true))
      this.save()
    },

    deleteNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
        this.save()
      }
    },

    clearAll() {
      this.notifications = []
      this.save()
    },

    updatePreferences(preferences: Partial<NotificationState['preferences']>) {
      this.preferences = { ...this.preferences, ...preferences }
      this.save()
    },

    async showBrowserNotification(notification: Notification) {
      if (!('Notification' in window)) return
      if (Notification.permission !== 'granted') return

      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        })
      } catch (e) {
        // Browser notification failed
      }
    },

    async requestPermission() {
      if (!('Notification' in window)) return false
      if (Notification.permission === 'granted') return true
      if (Notification.permission === 'denied') return false

      const permission = await Notification.requestPermission()
      return permission === 'granted'
    },
  },
})
```

---

## 2. Notification Center Component

### File: `components/layout/NotificationCenter.vue`

```vue
<script setup lang="ts">
import { useNotificationStore } from '~/stores/notifications'

const notificationStore = useNotificationStore()
const router = useRouter()

const open = ref(false)

// Initialize on mount
onMounted(() => {
  notificationStore.initialize()
})

// Handle notification click
function handleNotificationClick(notification: Notification) {
  notificationStore.markAsRead(notification.id)
  if (notification.actionUrl) {
    router.push(notification.actionUrl)
    open.value = false
  }
}

// Get icon for notification type
function getIcon(type: string) {
  switch (type) {
    case 'transaction':
      return 'i-lucide-arrow-left-right'
    case 'signing_request':
      return 'i-lucide-pen-tool'
    case 'social':
      return 'i-lucide-thumbs-up'
    default:
      return 'i-lucide-bell'
  }
}

// Get color for notification type
function getColor(type: string) {
  switch (type) {
    case 'transaction':
      return 'text-green-500'
    case 'signing_request':
      return 'text-warning-500'
    case 'social':
      return 'text-blue-500'
    default:
      return 'text-gray-500'
  }
}
</script>

<template>
  <UPopover v-model:open="open">
    <!-- Trigger -->
    <UButton color="neutral" variant="ghost" size="sm" class="relative">
      <UIcon name="i-lucide-bell" class="w-5 h-5" />
      <span
        v-if="notificationStore.unreadCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
      >
        {{
          notificationStore.unreadCount > 9
            ? '9+'
            : notificationStore.unreadCount
        }}
      </span>
    </UButton>

    <!-- Content -->
    <template #content>
      <div class="w-80 max-h-96 overflow-hidden flex flex-col">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
        >
          <h3 class="font-semibold">Notifications</h3>
          <button
            v-if="notificationStore.unreadCount > 0"
            class="text-sm text-primary hover:underline"
            @click="notificationStore.markAllAsRead()"
          >
            Mark all read
          </button>
        </div>

        <!-- Notifications List -->
        <div class="flex-1 overflow-y-auto">
          <template v-if="notificationStore.groupedNotifications.length > 0">
            <div
              v-for="group in notificationStore.groupedNotifications"
              :key="group.label"
            >
              <div
                class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800"
              >
                {{ group.label }}
              </div>
              <div
                v-for="notification in group.notifications"
                :key="notification.id"
                class="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800"
                :class="{
                  'bg-primary-50 dark:bg-primary-900/10': !notification.read,
                }"
                @click="handleNotificationClick(notification)"
              >
                <!-- Icon -->
                <div
                  class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0"
                >
                  <UIcon
                    :name="getIcon(notification.type)"
                    class="w-4 h-4"
                    :class="getColor(notification.type)"
                  />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm truncate">{{
                      notification.title
                    }}</span>
                    <span
                      v-if="!notification.read"
                      class="w-2 h-2 rounded-full bg-primary shrink-0"
                    />
                  </div>
                  <p class="text-sm text-gray-500 line-clamp-2">
                    {{ notification.message }}
                  </p>
                  <p class="text-xs text-gray-400 mt-1">
                    {{ new Date(notification.timestamp).toLocaleTimeString() }}
                  </p>
                </div>

                <!-- Delete -->
                <button
                  class="text-gray-400 hover:text-red-500 shrink-0"
                  @click.stop="
                    notificationStore.deleteNotification(notification.id)
                  "
                >
                  <UIcon name="i-lucide-x" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </template>

          <!-- Empty State -->
          <div v-else class="p-8 text-center text-gray-500">
            <UIcon
              name="i-lucide-bell-off"
              class="w-12 h-12 mx-auto mb-2 opacity-50"
            />
            <p>No notifications</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-gray-200 dark:border-gray-700">
          <NuxtLink
            to="/settings/notifications"
            class="text-sm text-primary hover:underline"
            @click="open = false"
          >
            Notification settings
          </NuxtLink>
        </div>
      </div>
    </template>
  </UPopover>
</template>
```

---

## 3. Notification Preferences Page

### File: `pages/settings/notifications.vue`

```vue
<script setup lang="ts">
import { useNotificationStore } from '~/stores/notifications'

definePageMeta({
  title: 'Notifications',
})

const notificationStore = useNotificationStore()

// Browser notification permission
const browserPermission = ref<'granted' | 'denied' | 'default'>('default')

onMounted(() => {
  if ('Notification' in window) {
    browserPermission.value = Notification.permission
  }
})

async function requestBrowserPermission() {
  const granted = await notificationStore.requestPermission()
  browserPermission.value = granted ? 'granted' : 'denied'
}
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-bell"
      title="Notifications"
      subtitle="Manage your notification preferences"
    />

    <!-- Browser Notifications -->
    <AppCard title="Browser Notifications" icon="i-lucide-globe">
      <div class="space-y-4">
        <p class="text-sm text-gray-500">
          Receive notifications even when the wallet is in the background.
        </p>

        <div
          v-if="browserPermission === 'granted'"
          class="flex items-center gap-2 text-green-600"
        >
          <UIcon name="i-lucide-check-circle" class="w-5 h-5" />
          <span>Browser notifications enabled</span>
        </div>

        <div
          v-else-if="browserPermission === 'denied'"
          class="flex items-center gap-2 text-red-600"
        >
          <UIcon name="i-lucide-x-circle" class="w-5 h-5" />
          <span
            >Browser notifications blocked. Enable in browser settings.</span
          >
        </div>

        <UButton v-else color="primary" @click="requestBrowserPermission">
          Enable Browser Notifications
        </UButton>
      </div>
    </AppCard>

    <!-- Notification Types -->
    <AppCard title="Notification Types" icon="i-lucide-list">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Transactions</div>
            <p class="text-sm text-gray-500">
              Incoming and outgoing transactions
            </p>
          </div>
          <UToggle
            :model-value="notificationStore.preferences.transactions"
            @update:model-value="
              notificationStore.updatePreferences({ transactions: $event })
            "
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Signing Requests</div>
            <p class="text-sm text-gray-500">
              Multi-signature signing requests from peers
            </p>
          </div>
          <UToggle
            :model-value="notificationStore.preferences.signingRequests"
            @update:model-value="
              notificationStore.updatePreferences({ signingRequests: $event })
            "
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Social Activity</div>
            <p class="text-sm text-gray-500">
              RANK votes and social interactions
            </p>
          </div>
          <UToggle
            :model-value="notificationStore.preferences.social"
            @update:model-value="
              notificationStore.updatePreferences({ social: $event })
            "
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">System</div>
            <p class="text-sm text-gray-500">
              Backup reminders and important updates
            </p>
          </div>
          <UToggle
            :model-value="notificationStore.preferences.system"
            @update:model-value="
              notificationStore.updatePreferences({ system: $event })
            "
          />
        </div>
      </div>
    </AppCard>

    <!-- Clear Notifications -->
    <AppCard title="Notification History" icon="i-lucide-trash-2">
      <div class="space-y-4">
        <p class="text-sm text-gray-500">
          You have {{ notificationStore.notifications.length }} notifications in
          history.
        </p>
        <UButton
          color="error"
          variant="soft"
          :disabled="notificationStore.notifications.length === 0"
          @click="notificationStore.clearAll()"
        >
          Clear All Notifications
        </UButton>
      </div>
    </AppCard>
  </div>
</template>
```

---

## 4. Integration with Other Stores

### Wallet Store Integration

```ts
// In stores/wallet.ts - add notification triggers

import { useNotificationStore } from './notifications'

// After receiving a transaction
function onTransactionReceived(tx: Transaction) {
  const notificationStore = useNotificationStore()
  notificationStore.addNotification({
    type: 'transaction',
    title: 'Payment Received',
    message: `You received ${(tx.amount / 1e6).toFixed(2)} XPI`,
    actionUrl: `/explore/explorer/tx/${tx.txid}`,
    actionLabel: 'View Transaction',
    data: { txid: tx.txid, amount: tx.amount },
  })
}
```

### MuSig2 Store Integration

```ts
// In stores/musig2.ts - add notification triggers

import { useNotificationStore } from './notifications'

// When receiving a signing request
function onSigningRequestReceived(request: SigningRequest) {
  const notificationStore = useNotificationStore()
  notificationStore.addNotification({
    type: 'signing_request',
    title: 'Signing Request',
    message: `${request.fromPeer} wants you to co-sign a transaction`,
    actionUrl: '/people/p2p?tab=requests',
    actionLabel: 'View Request',
    data: { requestId: request.id },
  })
}
```

---

## 5. Implementation Checklist

### Store

- [ ] Create `stores/notifications.ts`
- [ ] Add persistence to localStorage
- [ ] Add browser notification support

### Components

- [ ] Create `components/layout/NotificationCenter.vue`
- [ ] Integrate into layout navbar

### Pages

- [ ] Create `pages/settings/notifications.vue`

### Integration

- [ ] Add notification triggers to wallet store
- [ ] Add notification triggers to musig2 store
- [ ] Add notification triggers to p2p store
- [ ] Add backup reminder notification

### Features

- [ ] Notification center popover
- [ ] Mark as read
- [ ] Mark all as read
- [ ] Delete notification
- [ ] Clear all
- [ ] Notification preferences
- [ ] Browser notification permission
- [ ] Grouped by date

### Testing

- [ ] Test notification creation
- [ ] Test mark as read
- [ ] Test browser notifications
- [ ] Test preferences
- [ ] Test persistence

---

## Next Phase

Once this phase is complete, proceed to [12_POLISH_ACCESSIBILITY.md](./12_POLISH_ACCESSIBILITY.md) for final polish and accessibility improvements.
