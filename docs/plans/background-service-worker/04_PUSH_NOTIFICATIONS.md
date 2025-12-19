# Phase 4: Push Notifications

## Overview

This phase implements enhanced browser notification support through the service worker, enabling true background notifications that work even when no wallet tabs are open. This phase builds upon and enhances the `notification-system/04_BROWSER_NOTIFICATIONS.md` plan.

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Dependencies**: Phase 1 (Service Worker Foundation), Phase 3 (Session Monitor)

---

## Objectives

1. Implement service worker-based notifications (works when tab is closed)
2. Add notification actions (approve/reject signing requests)
3. Implement notification badges for unread count
4. Handle notification clicks with proper navigation

---

## Relationship to notification-system Plan

### What notification-system/04_BROWSER_NOTIFICATIONS.md Covers

- Basic `Notification` API usage from client
- Permission request flow
- Notification preferences in store

### What This Phase Adds

- Service worker-based notifications (true background support)
- Notification actions (buttons in notifications)
- Badge API for unread count
- Centralized notification dispatch from SW
- Enhanced click handling with client focus

---

## 1. Service Worker Notification System

### Update: `public/sw.js`

Enhance notification capabilities.

```js
// ============================================================================
// Enhanced Notification System
// ============================================================================

/**
 * Show a notification from the service worker
 * This works even when no tabs are open
 */
async function showNotification(title, options = {}) {
  // Check permission
  if (Notification.permission !== 'granted') {
    console.log('[SW] Notification permission not granted')
    return null
  }

  const defaultOptions = {
    icon: '/icon/128.png',
    badge: '/icon/32.png',
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
  }

  try {
    await self.registration.showNotification(title, {
      ...defaultOptions,
      ...options,
    })

    // Update badge count
    await updateBadge()

    return true
  } catch (e) {
    console.error('[SW] Failed to show notification:', e)
    return false
  }
}

/**
 * Notification templates for common scenarios
 */
const NotificationTemplates = {
  transactionReceived: (amount, txid) => ({
    title: 'Transaction Received',
    options: {
      body: `Received ${amount} XPI`,
      tag: `tx-${txid}`,
      data: {
        type: 'transaction',
        url: `/explore/explorer/tx/${txid}`,
        txid,
      },
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    },
  }),

  signingRequest: (fromNickname, requestId, sessionId) => ({
    title: 'Signing Request',
    options: {
      body: fromNickname
        ? `${fromNickname} is requesting your signature`
        : 'New signing request received',
      tag: `request-${requestId}`,
      requireInteraction: true,
      data: {
        type: 'signing_request',
        url: '/people/p2p',
        requestId,
        sessionId,
      },
      actions: [
        { action: 'view', title: 'View' },
        { action: 'reject', title: 'Reject' },
      ],
    },
  }),

  sessionExpiring: (sessionId, minutesRemaining) => ({
    title: 'Session Expiring',
    options: {
      body: `Signing session expires in ${minutesRemaining} minute${
        minutesRemaining > 1 ? 's' : ''
      }`,
      tag: `session-${sessionId}`,
      requireInteraction: minutesRemaining <= 2,
      data: {
        type: 'session_expiring',
        url: '/people/p2p',
        sessionId,
      },
      actions: [{ action: 'view', title: 'View Session' }],
    },
  }),

  sessionExpired: sessionId => ({
    title: 'Session Expired',
    options: {
      body: 'A signing session has expired',
      tag: `session-expired-${sessionId}`,
      data: {
        type: 'session_expired',
        url: '/people/p2p',
        sessionId,
      },
    },
  }),

  balanceChange: (newBalance, change) => ({
    title: change > 0 ? 'Balance Increased' : 'Balance Decreased',
    options: {
      body: `New balance: ${newBalance} XPI`,
      tag: 'balance-change',
      data: {
        type: 'balance',
        url: '/',
      },
    },
  }),
}

/**
 * Show notification using template
 */
async function showTemplateNotification(templateName, ...args) {
  const template = NotificationTemplates[templateName]
  if (!template) {
    console.error(`[SW] Unknown notification template: ${templateName}`)
    return
  }

  const { title, options } = template(...args)
  return showNotification(title, options)
}
```

---

## 2. Notification Click Handling

### Update: `public/sw.js`

Enhanced click handling with action support.

```js
// ============================================================================
// Notification Click Handling
// ============================================================================

self.addEventListener('notificationclick', event => {
  const notification = event.notification
  const action = event.action
  const data = notification.data || {}

  notification.close()

  event.waitUntil(handleNotificationClick(action, data))
})

async function handleNotificationClick(action, data) {
  // Handle specific actions
  if (action === 'reject' && data.type === 'signing_request') {
    // Broadcast rejection to client
    broadcastToClients({
      type: 'SIGNING_REQUEST_ACTION',
      payload: {
        action: 'reject',
        requestId: data.requestId,
        sessionId: data.sessionId,
      },
    })
    return
  }

  if (action === 'dismiss') {
    // Just close notification, no navigation
    return
  }

  // Default action: focus/open app and navigate
  const urlToOpen = data.url || '/'

  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  // Try to focus an existing window
  for (const client of clients) {
    if ('focus' in client) {
      await client.focus()
      client.postMessage({
        type: 'NOTIFICATION_CLICK',
        payload: {
          url: urlToOpen,
          notificationId: data.notificationId,
          action: action || 'default',
          data,
        },
      })
      return
    }
  }

  // No existing window, open a new one
  if (self.clients.openWindow) {
    await self.clients.openWindow(urlToOpen)
  }
}

// Handle notification close (dismissed without clicking)
self.addEventListener('notificationclose', event => {
  const data = event.notification.data || {}

  // Could track dismissed notifications for analytics
  console.log('[SW] Notification dismissed:', data.type)
})
```

---

## 3. Badge API Integration

### Update: `public/sw.js`

Add badge management for unread notification count.

```js
// ============================================================================
// Badge Management
// ============================================================================

let unreadCount = 0

/**
 * Update the app badge with unread count
 */
async function updateBadge(count) {
  if (count !== undefined) {
    unreadCount = count
  }

  // Check if Badge API is supported
  if (!('setAppBadge' in navigator)) {
    return
  }

  try {
    if (unreadCount > 0) {
      await navigator.setAppBadge(unreadCount)
    } else {
      await navigator.clearAppBadge()
    }
  } catch (e) {
    console.error('[SW] Failed to update badge:', e)
  }
}

/**
 * Increment badge count
 */
async function incrementBadge() {
  unreadCount++
  await updateBadge()
}

/**
 * Clear badge
 */
async function clearBadge() {
  unreadCount = 0
  await updateBadge()
}

// Handle badge sync message from client
// In message handler:
case 'SYNC_BADGE':
  updateBadge(message.payload.count)
  break

case 'CLEAR_BADGE':
  clearBadge()
  break
```

---

## 4. Message Types

### Update: `types/service-worker.ts`

Add notification-related message types.

```ts
// ============================================================================
// Notification Message Types
// ============================================================================

export interface SWSyncBadgeMessage {
  type: 'SYNC_BADGE'
  payload: {
    count: number
  }
}

export interface SWClearBadgeMessage {
  type: 'CLEAR_BADGE'
}

export interface SWShowNotificationMessage {
  type: 'SHOW_NOTIFICATION'
  payload: {
    title: string
    body: string
    tag?: string
    requireInteraction?: boolean
    actions?: Array<{ action: string; title: string }>
    data?: Record<string, unknown>
  }
}

export interface SWSigningRequestActionMessage {
  type: 'SIGNING_REQUEST_ACTION'
  payload: {
    action: 'reject' | 'accept'
    requestId: string
    sessionId: string
  }
}

// Add to unions
export type ClientToSWMessage =
  | /* existing */
  | SWSyncBadgeMessage
  | SWClearBadgeMessage
  | SWShowNotificationMessage

export type SWToClientMessage =
  | /* existing */
  | SWSigningRequestActionMessage
```

---

## 5. Integration with Notification Store

### Update: `stores/notifications.ts`

Integrate with service worker for background notifications.

```ts
// Add to actions:

/**
 * Sync badge count with service worker
 */
syncBadge() {
  if (typeof window !== 'undefined') {
    const { postMessage } = useServiceWorker()
    postMessage({
      type: 'SYNC_BADGE',
      payload: { count: this.unreadCount },
    })
  }
},

/**
 * Clear badge via service worker
 */
clearBadge() {
  if (typeof window !== 'undefined') {
    const { postMessage } = useServiceWorker()
    postMessage({ type: 'CLEAR_BADGE' })
  }
},

/**
 * Show notification via service worker (for background support)
 */
showViaServiceWorker(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  if (typeof window !== 'undefined') {
    const { postMessage } = useServiceWorker()
    postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title: notification.title,
        body: notification.message,
        tag: `notification-${Date.now()}`,
        data: {
          type: notification.type,
          url: notification.actionUrl,
          ...notification.data,
        },
      },
    })
  }
},

// Update addNotification to sync badge:
addNotification(notification) {
  // ... existing implementation ...

  // Sync badge count with SW
  this.syncBadge()

  return newNotification
},

// Update markAsRead to sync badge:
markAsRead(id: string) {
  // ... existing implementation ...

  // Sync badge count with SW
  this.syncBadge()
},

// Update markAllAsRead to clear badge:
markAllAsRead() {
  // ... existing implementation ...

  // Clear badge
  this.clearBadge()
},
```

---

## 6. Update Composable

### Update: `composables/useServiceWorker.ts`

Add notification methods.

```ts
/**
 * Sync badge count with service worker
 */
function syncBadge(count: number) {
  postMessage({
    type: 'SYNC_BADGE',
    payload: { count },
  })
}

/**
 * Clear badge
 */
function clearBadge() {
  postMessage({ type: 'CLEAR_BADGE' })
}

/**
 * Show notification via service worker
 */
function showNotification(options: {
  title: string
  body: string
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string }>
  data?: Record<string, unknown>
}) {
  postMessage({
    type: 'SHOW_NOTIFICATION',
    payload: options,
  })
}

// Add to return object
return {
  // ... existing
  syncBadge,
  clearBadge,
  showNotification,
}
```

---

## 7. Handle Signing Request Actions

### Update: `stores/musig2.ts` or `stores/p2p.ts`

Handle signing request actions from notification.

```ts
// In initialize():

if (typeof window !== 'undefined') {
  window.addEventListener('sw-signing-request-action', ((
    event: CustomEvent,
  ) => {
    const { action, requestId, sessionId } = event.detail

    if (action === 'reject') {
      // Reject the signing request
      this.rejectSigningRequest(requestId, sessionId)
    }
  }) as EventListener)
}
```

---

## 8. Permission Request UI

### Component: `components/settings/NotificationPermission.vue`

Create a component for requesting notification permission.

```vue
<script setup lang="ts">
const { isSupported } = useServiceWorker()

const permission = ref<NotificationPermission>('default')
const requesting = ref(false)

onMounted(() => {
  if ('Notification' in window) {
    permission.value = Notification.permission
  }
})

async function requestPermission() {
  if (!('Notification' in window)) return

  requesting.value = true
  try {
    const result = await Notification.requestPermission()
    permission.value = result
  } finally {
    requesting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-medium">Browser Notifications</h3>
        <p class="text-sm text-muted">
          Receive alerts for transactions and signing requests
        </p>
      </div>

      <template v-if="permission === 'granted'">
        <UBadge color="success" variant="soft">
          <UIcon name="i-lucide-check" class="mr-1" />
          Enabled
        </UBadge>
      </template>

      <template v-else-if="permission === 'denied'">
        <UBadge color="error" variant="soft">
          <UIcon name="i-lucide-x" class="mr-1" />
          Blocked
        </UBadge>
      </template>

      <template v-else>
        <UButton :loading="requesting" @click="requestPermission">
          Enable
        </UButton>
      </template>
    </div>

    <p v-if="permission === 'denied'" class="text-sm text-warning-500">
      Notifications are blocked. Please enable them in your browser settings.
    </p>

    <p v-if="!isSupported" class="text-sm text-muted">
      Background notifications require a modern browser with service worker
      support.
    </p>
  </div>
</template>
```

---

## 9. Implementation Checklist

### Service Worker Updates

- [ ] Implement `showNotification()` with default options
- [ ] Create notification templates for common scenarios
- [ ] Implement enhanced click handling with actions
- [ ] Add notification close event handling
- [ ] Implement badge management (`updateBadge`, `incrementBadge`, `clearBadge`)
- [ ] Handle `SHOW_NOTIFICATION` message
- [ ] Handle `SYNC_BADGE` message
- [ ] Handle `CLEAR_BADGE` message

### Message Types

- [ ] Add `SYNC_BADGE` message type
- [ ] Add `CLEAR_BADGE` message type
- [ ] Add `SHOW_NOTIFICATION` message type
- [ ] Add `SIGNING_REQUEST_ACTION` message type

### Store Integration

- [ ] Add `syncBadge()` action to notification store
- [ ] Add `clearBadge()` action to notification store
- [ ] Add `showViaServiceWorker()` action
- [ ] Update `addNotification()` to sync badge
- [ ] Update `markAsRead()` to sync badge
- [ ] Update `markAllAsRead()` to clear badge
- [ ] Handle signing request actions from SW

### Composable Updates

- [ ] Add `syncBadge()` method
- [ ] Add `clearBadge()` method
- [ ] Add `showNotification()` method

### UI Components

- [ ] Create `NotificationPermission.vue` component
- [ ] Add to settings page

### Testing

- [ ] Test notification appears when tab is closed
- [ ] Test notification click opens/focuses app
- [ ] Test notification action buttons work
- [ ] Test badge updates with unread count
- [ ] Test badge clears when all read
- [ ] Test permission request flow
- [ ] Test notification templates for all scenarios

---

## Notes

- Service worker notifications work even when all tabs are closed
- Badge API has limited browser support (Chrome, Edge)
- Safari has different notification behavior
- `requireInteraction` keeps notification visible until user interacts

---

## Relationship to notification-system Plan

This phase **supersedes** `notification-system/04_BROWSER_NOTIFICATIONS.md` by providing:

- True background notification support via service worker
- Notification actions for quick responses
- Badge API integration
- Centralized notification dispatch

The notification-system plan's Phase 4 can be marked as "Superseded by background-service-worker Phase 4".

---

## Next Phase

Once this phase is complete, proceed to [05_STATE_SYNCHRONIZATION.md](./05_STATE_SYNCHRONIZATION.md) for IndexedDB caching and state synchronization.
