# Phase 1: Notification Settings Page

## Overview

Create the notification preferences page where users can manage their notification settings.

**Priority**: P1 (High)
**Estimated Effort**: 0.5 days
**Dependencies**: None

---

## Goals

1. Create notification settings page
2. Allow users to toggle notification types
3. Show browser notification permission status
4. Provide clear all notifications action

---

## 1. Create Settings Page

### File: `pages/settings/notifications.vue`

```vue
<script setup lang="ts">
/**
 * Notification Settings Page
 *
 * Manage notification preferences and browser notification permissions.
 */
import { useNotificationStore } from '~/stores/notifications'

definePageMeta({
  title: 'Notifications',
})

const notificationStore = useNotificationStore()

// Browser notification permission state
const browserPermission = ref<NotificationPermission>('default')
const permissionSupported = ref(false)

onMounted(() => {
  notificationStore.initialize()

  // Check browser notification support
  if ('Notification' in window) {
    permissionSupported.value = true
    browserPermission.value = Notification.permission
  }
})

// Request browser notification permission
async function requestPermission() {
  if (!permissionSupported.value) return

  try {
    const permission = await Notification.requestPermission()
    browserPermission.value = permission
  } catch (e) {
    console.error('Failed to request notification permission:', e)
  }
}

// Permission status display
const permissionStatus = computed(() => {
  switch (browserPermission.value) {
    case 'granted':
      return {
        text: 'Enabled',
        color: 'success',
        icon: 'i-lucide-check-circle',
      }
    case 'denied':
      return { text: 'Blocked', color: 'error', icon: 'i-lucide-x-circle' }
    default:
      return { text: 'Not set', color: 'neutral', icon: 'i-lucide-bell' }
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <UiAppHeroCard
      icon="i-lucide-bell"
      title="Notifications"
      subtitle="Manage your notification preferences"
    />

    <!-- Browser Notifications -->
    <UiAppCard title="Browser Notifications" icon="i-lucide-globe">
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Receive notifications even when the wallet is in the background.
        </p>

        <!-- Permission Status -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              :name="permissionStatus.icon"
              class="w-5 h-5"
              :class="`text-${permissionStatus.color}`"
            />
            <span>{{ permissionStatus.text }}</span>
          </div>

          <UButton
            v-if="browserPermission === 'default' && permissionSupported"
            color="primary"
            size="sm"
            @click="requestPermission"
          >
            Enable
          </UButton>

          <span
            v-else-if="browserPermission === 'denied'"
            class="text-sm text-muted"
          >
            Enable in browser settings
          </span>
        </div>

        <UAlert
          v-if="!permissionSupported"
          color="warning"
          icon="i-lucide-alert-triangle"
          title="Not Supported"
          description="Your browser does not support notifications."
        />
      </div>
    </UiAppCard>

    <!-- Notification Types -->
    <UiAppCard title="Notification Types" icon="i-lucide-list">
      <div class="space-y-4">
        <!-- Transactions -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Transactions</div>
            <p class="text-sm text-muted">Incoming and outgoing transactions</p>
          </div>
          <UToggle
            :model-value="notificationStore.preferences.transactions"
            @update:model-value="
              notificationStore.updatePreferences({ transactions: $event })
            "
          />
        </div>

        <USeparator />

        <!-- Signing Requests -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Signing Requests</div>
            <p class="text-sm text-muted">
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

        <USeparator />

        <!-- Social Activity -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Social Activity</div>
            <p class="text-sm text-muted">RANK votes and social interactions</p>
          </div>
          <UToggle
            :model-value="notificationStore.preferences.social"
            @update:model-value="
              notificationStore.updatePreferences({ social: $event })
            "
          />
        </div>

        <USeparator />

        <!-- System -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">System</div>
            <p class="text-sm text-muted">
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
    </UiAppCard>

    <!-- Notification History -->
    <UiAppCard title="Notification History" icon="i-lucide-history">
      <div class="space-y-4">
        <p class="text-sm text-muted">
          You have {{ notificationStore.notifications.length }} notifications in
          history. {{ notificationStore.unreadCount }} unread.
        </p>

        <div class="flex gap-2">
          <UButton
            v-if="notificationStore.unreadCount > 0"
            color="primary"
            variant="soft"
            size="sm"
            @click="notificationStore.markAllAsRead()"
          >
            Mark All as Read
          </UButton>

          <UButton
            color="error"
            variant="soft"
            size="sm"
            :disabled="notificationStore.notifications.length === 0"
            @click="notificationStore.clearAll()"
          >
            Clear All
          </UButton>
        </div>
      </div>
    </UiAppCard>
  </div>
</template>
```

---

## 2. Add Link to Settings Index

### Update: `pages/settings/index.vue`

Add a link to the notifications settings page in the settings hub.

```vue
<!-- Add to the settings links section -->
<NuxtLink to="/settings/notifications">
  <UiAppCard
    title="Notifications"
    icon="i-lucide-bell"
    description="Manage notification preferences"
    clickable
  />
</NuxtLink>
```

---

## 3. Implementation Checklist

### Page Creation

- [ ] Create `pages/settings/notifications.vue`
- [ ] Add browser permission request functionality
- [ ] Add notification type toggles
- [ ] Add notification history management

### Settings Integration

- [ ] Add link to notifications in settings index
- [ ] Verify navigation works correctly

### Testing

- [ ] Test browser permission request flow
- [ ] Test toggling notification types
- [ ] Test mark all as read
- [ ] Test clear all notifications
- [ ] Verify preferences persist after page refresh

---

## Next Phase

Once this phase is complete, proceed to [02_WALLET_INTEGRATION.md](./02_WALLET_INTEGRATION.md) for transaction notification integration.
