# Phase 4: Browser Notifications

## Overview

Add native browser notification support so users receive alerts even when the wallet tab is in the background.

**Priority**: P3 (Lower)
**Estimated Effort**: 0.5 days
**Dependencies**: Phase 1 (Settings Page), Phase 2 (Wallet Integration)

---

## Goals

1. Request browser notification permission
2. Show native notifications for important events
3. Handle notification clicks to focus the app
4. Respect user preferences

---

## 1. Extend Notification Store

### Update: `stores/notifications.ts`

Add browser notification support to the store.

```ts
// Add to the actions section

/**
 * Show a native browser notification
 */
async showBrowserNotification(notification: Notification): Promise<void> {
  // Check if browser notifications are supported
  if (!('Notification' in window)) {
    return
  }

  // Check if permission is granted
  if (Notification.permission !== 'granted') {
    return
  }

  // Check if this notification type should trigger browser notification
  // Only show for high-priority types
  const browserNotificationTypes: NotificationType[] = [
    'transaction',
    'signing_request',
  ]

  if (!browserNotificationTypes.includes(notification.type)) {
    return
  }

  try {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id, // Prevents duplicate notifications
      requireInteraction: notification.type === 'signing_request',
      data: {
        url: notification.actionUrl,
        notificationId: notification.id,
      },
    })

    // Handle click - focus app and navigate
    browserNotification.onclick = (event) => {
      event.preventDefault()
      window.focus()

      if (notification.actionUrl) {
        // Use router to navigate
        const router = useRouter()
        router.push(notification.actionUrl)
      }

      // Mark as read
      this.markAsRead(notification.id)

      browserNotification.close()
    }
  } catch (e) {
    console.warn('Failed to show browser notification:', e)
  }
},

/**
 * Request browser notification permission
 */
async requestBrowserPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (e) {
    console.warn('Failed to request notification permission:', e)
    return false
  }
},

/**
 * Check if browser notifications are available
 */
get browserNotificationsAvailable(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
},
```

---

## 2. Trigger Browser Notifications

### Update: `addNotification` action

Modify the `addNotification` action to also trigger browser notifications.

```ts
addNotification(
  notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
): Notification | null {
  // Check if this type is enabled
  if (!this.isTypeEnabled(notification.type)) {
    return null
  }

  const newNotification: Notification = {
    ...notification,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    read: false,
  }

  this.notifications.unshift(newNotification)
  this.save()

  // Also show browser notification if available
  this.showBrowserNotification(newNotification)

  return newNotification
},
```

---

## 3. Service Worker Integration (Optional - PWA)

For full PWA support with background notifications, a service worker is needed.

### File: `public/sw.js` (if not already present)

```js
// Handle notification clicks from service worker
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: url,
            notificationId: event.notification.data?.notificationId,
          })
          return
        }
      }

      // Open new window if no existing window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})
```

### Handle Service Worker Messages

```ts
// In app.vue or a plugin

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'NOTIFICATION_CLICK') {
      const router = useRouter()
      router.push(event.data.url)

      if (event.data.notificationId) {
        const notificationStore = useNotificationStore()
        notificationStore.markAsRead(event.data.notificationId)
      }
    }
  })
}
```

---

## 4. Notification Preferences for Browser

### Update: `stores/notifications.ts`

Add a preference for browser notifications.

```ts
export interface NotificationPreferences {
  transactions: boolean
  signingRequests: boolean
  social: boolean
  system: boolean
  browserNotifications: boolean // Add this
}

// Default state
preferences: {
  transactions: true,
  signingRequests: true,
  social: true,
  system: true,
  browserNotifications: true, // Default to true if permission granted
},
```

### Update: `showBrowserNotification`

```ts
async showBrowserNotification(notification: Notification): Promise<void> {
  // Check preference
  if (!this.preferences.browserNotifications) {
    return
  }

  // ... rest of the function
}
```

---

## 5. Update Settings Page

### Update: `pages/settings/notifications.vue`

Add toggle for browser notifications.

```vue
<!-- Add after browser permission section -->
<div v-if="browserPermission === 'granted'" class="flex items-center justify-between mt-4">
  <div>
    <div class="font-medium">Show Browser Notifications</div>
    <p class="text-sm text-muted">
      Display native notifications for important events
    </p>
  </div>
  <UToggle
    :model-value="notificationStore.preferences.browserNotifications"
    @update:model-value="
      notificationStore.updatePreferences({ browserNotifications: $event })
    "
  />
</div>
```

---

## 6. Implementation Checklist

### Store Updates

- [ ] Add `showBrowserNotification` action
- [ ] Add `requestBrowserPermission` action
- [ ] Add `browserNotificationsAvailable` getter
- [ ] Add `browserNotifications` preference
- [ ] Call `showBrowserNotification` in `addNotification`

### Settings Page Updates

- [ ] Add browser notification toggle
- [ ] Show toggle only when permission is granted

### Service Worker (Optional)

- [ ] Create or update service worker for notification handling
- [ ] Handle notification click events
- [ ] Handle service worker messages in app

### Testing

- [ ] Test permission request flow
- [ ] Test browser notification appears when app is in background
- [ ] Test clicking notification focuses app and navigates
- [ ] Test browser notification preference toggle
- [ ] Test notifications don't appear when preference is off

---

## Notes

- Browser notifications require HTTPS in production
- Safari has different notification behavior than Chrome/Firefox
- Service worker integration is optional but recommended for PWA
- Consider rate limiting browser notifications to avoid spam

---

## Next Phase

Once this phase is complete, proceed to [05_SOCIAL_INTEGRATION.md](./05_SOCIAL_INTEGRATION.md) for RANK voting notification integration.
