# Phase 8: Push and Browser Notifications

## Overview

This phase implements service worker push notifications and browser notification integration, along with social notification support. Users will receive native browser notifications for important events even when the tab is in the background.

**Priority**: P1 (High)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 3 (Network and Wallet Integration), Phase 6 (Signing Flow and Notifications)

---

## Source Phases

| Source Plan               | Phase | Component             |
| ------------------------- | ----- | --------------------- |
| background-service-worker | 4     | Push Notifications    |
| notification-system       | 4     | Browser Notifications |
| notification-system       | 5     | Social Integration    |

---

## Tasks

### 8.1 Service Worker Push Notifications

**Source**: background-service-worker/04_PUSH_NOTIFICATIONS.md
**Effort**: 1 day

#### SW Notification System

- [ ] Create `service-worker/modules/push-notifications.ts`

  ```typescript
  interface NotificationConfig {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, unknown>
    actions?: Array<{ action: string; title: string }>
  }

  class PushNotificationManager {
    async showNotification(config: NotificationConfig) {
      const registration = await self.registration

      await registration.showNotification(config.title, {
        body: config.body,
        icon: config.icon || '/icon-192.png',
        badge: config.badge || '/badge-72.png',
        tag: config.tag,
        data: config.data,
        actions: config.actions,
        requireInteraction: true,
      })
    }
  }
  ```

#### Notification Templates

- [ ] Create notification templates for each event type
  ```typescript
  const templates = {
    transaction_received: (data: { amount: string }) => ({
      title: 'Received Lotus',
      body: `You received ${data.amount} XPI`,
      icon: '/icons/receive.png',
      tag: 'transaction',
      actions: [{ action: 'view', title: 'View' }],
    }),

    signing_request: (data: { from: string; amount: string }) => ({
      title: 'Signing Request',
      body: `${data.from} wants you to sign ${data.amount} XPI`,
      icon: '/icons/sign.png',
      tag: 'signing',
      actions: [
        { action: 'review', title: 'Review' },
        { action: 'reject', title: 'Reject' },
      ],
    }),

    session_expiring: (data: { minutes: number }) => ({
      title: 'Session Expiring',
      body: `Signing session expires in ${data.minutes} minute(s)`,
      icon: '/icons/warning.png',
      tag: 'session',
    }),

    vote_received: (data: { profile: string; amount: string }) => ({
      title: 'Vote on Your Profile',
      body: `Someone voted ${data.amount} XPI on ${data.profile}`,
      icon: '/icons/vote.png',
      tag: 'social',
    }),
  }
  ```

#### Click Handling with Actions

- [ ] Implement notification click handling in SW
  ```typescript
  self.addEventListener('notificationclick', event => {
    event.notification.close()

    const action = event.action
    const data = event.notification.data

    let url = '/'

    switch (action) {
      case 'view':
        if (data?.txid) url = `/explore/explorer/tx/${data.txid}`
        break
      case 'review':
        url = '/people/p2p?tab=requests'
        break
      case 'reject':
        // Handle reject action
        break
      default:
        // Default click - open relevant page based on tag
        if (event.notification.tag === 'transaction') {
          url = '/transact/history'
        } else if (event.notification.tag === 'signing') {
          url = '/people/p2p?tab=requests'
        }
    }

    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Focus existing window or open new one
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        return clients.openWindow(url)
      }),
    )
  })
  ```

#### Badge Management

- [ ] Implement badge updates
  ```typescript
  async function updateBadge(count: number) {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count)
      } else {
        await navigator.clearAppBadge()
      }
    }
  }
  ```

---

### 8.2 Browser Notification Store Integration

**Source**: notification-system/04_BROWSER_NOTIFICATIONS.md
**Effort**: 0.5 days

#### Store Updates

- [ ] Add browser notification actions to `stores/notifications.ts`

  ```typescript
  // Add to store state
  browserPermission: ref<NotificationPermission>('default'),

  // Add to store actions
  async requestBrowserPermission() {
    if (!('Notification' in window)) return 'denied'

    this.browserPermission = await Notification.requestPermission()
    return this.browserPermission
  },

  async showBrowserNotification(notification: AppNotification) {
    // Check permission and preference
    if (this.browserPermission !== 'granted') return
    if (!this.preferences.browserNotifications) return

    // Send to service worker
    const { postMessage } = useServiceWorker()
    postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        type: notification.type,
        title: notification.title,
        body: notification.message,
        data: notification.data,
      }
    })
  },
  ```

- [ ] Add `browserNotificationsAvailable` getter

  ```typescript
  browserNotificationsAvailable: state =>
    'Notification' in window && state.browserPermission === 'granted'
  ```

- [ ] Add `browserNotifications` preference
  ```typescript
  // In preferences
  browserNotifications: true, // Default on if permission granted
  ```

#### Integration with addNotification

- [ ] Call `showBrowserNotification` in `addNotification`
  ```typescript
  async addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false,
    }

    this.notifications.push(newNotification)

    // Show browser notification if enabled
    if (notification.persistent) {
      await this.showBrowserNotification(newNotification)
    }

    return newNotification
  }
  ```

---

### 8.3 Permission Request UI

**Effort**: 0.5 days

#### Settings Page Update

- [ ] Add browser notification toggle to `pages/settings/notifications.vue`
  ```vue
  <template>
    <UCard>
      <template #header>Browser Notifications</template>

      <div class="space-y-4">
        <!-- Permission Status -->
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Browser Notifications</p>
            <p class="text-sm text-gray-500">
              Receive notifications even when the tab is in the background
            </p>
          </div>

          <UBadge v-if="browserPermission === 'granted'" color="green">
            Enabled
          </UBadge>
          <UBadge v-else-if="browserPermission === 'denied'" color="red">
            Blocked
          </UBadge>
          <UButton v-else @click="requestPermission"> Enable </UButton>
        </div>

        <!-- Toggle (only if granted) -->
        <div
          v-if="browserPermission === 'granted'"
          class="flex items-center justify-between"
        >
          <span>Show browser notifications</span>
          <UToggle v-model="preferences.browserNotifications" />
        </div>

        <!-- Blocked message -->
        <UAlert v-if="browserPermission === 'denied'" color="yellow">
          Browser notifications are blocked. Please enable them in your browser
          settings.
        </UAlert>
      </div>
    </UCard>
  </template>
  ```

#### First-Time Permission Prompt

- [ ] Create permission prompt component
  ```vue
  <!-- components/notifications/PermissionPrompt.vue -->
  <template>
    <UCard v-if="shouldShow" class="border-l-4 border-blue-500">
      <div class="flex items-start gap-4">
        <UIcon name="i-heroicons-bell" class="w-8 h-8 text-blue-500" />
        <div class="flex-1">
          <p class="font-medium">Enable Notifications</p>
          <p class="text-sm text-gray-500">
            Get notified about incoming transactions and signing requests even
            when the app is in the background.
          </p>
        </div>
        <div class="flex gap-2">
          <UButton variant="ghost" @click="dismiss">Later</UButton>
          <UButton @click="enable">Enable</UButton>
        </div>
      </div>
    </UCard>
  </template>
  ```

---

### 8.4 Social Notification Integration

**Source**: notification-system/05_SOCIAL_INTEGRATION.md
**Effort**: 1 day

#### RANK Store Notifications

- [ ] Import notification store in rank store/composable

  ```typescript
  import { useNotificationStore } from '@/stores/notifications'
  ```

- [ ] Add notification for incoming votes on linked profiles

  ```typescript
  function handleIncomingVote(vote: Vote) {
    const notificationStore = useNotificationStore()

    // Only notify if this is a profile the user has linked
    if (!isLinkedProfile(vote.profileId)) return

    notificationStore.addNotification({
      type: 'vote_received',
      title: 'Vote Received',
      message: `Someone voted ${formatAmount(vote.amount)} on your ${
        vote.platform
      } profile`,
      data: { voteId: vote.id, profileId: vote.profileId },
      persistent: true,
    })
  }
  ```

- [ ] Add notification for confirmed votes (user's own votes)

  ```typescript
  function handleVoteConfirmed(vote: Vote) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'vote_confirmed',
      title: 'Vote Confirmed',
      message: `Your vote of ${formatAmount(vote.amount)} on ${
        vote.profileName
      } was confirmed`,
      data: { txid: vote.txid },
      persistent: false,
    })
  }
  ```

- [ ] Add notification for profile linking

#### Vote Polling for Linked Profiles

- [ ] Implement vote polling

  ```typescript
  class VotePoller {
    private linkedProfiles: string[] = []
    private lastCheckTimestamp: number = 0
    private pollInterval: number | null = null

    startPolling(profiles: string[]) {
      this.linkedProfiles = profiles
      this.lastCheckTimestamp = Date.now()

      this.pollInterval = setInterval(
        () => this.checkForNewVotes(),
        60_000, // Check every minute
      )
    }

    async checkForNewVotes() {
      for (const profileId of this.linkedProfiles) {
        const votes = await rankApi.getVotesSince(
          profileId,
          this.lastCheckTimestamp,
        )

        for (const vote of votes) {
          handleIncomingVote(vote)
        }
      }

      this.lastCheckTimestamp = Date.now()
    }
  }
  ```

- [ ] Track last vote check timestamp
- [ ] Integrate with service worker for background polling (optional)

---

## File Changes Summary

### New Files

| File                                            | Purpose                      |
| ----------------------------------------------- | ---------------------------- |
| `service-worker/modules/push-notifications.ts`  | SW notification system       |
| `components/notifications/PermissionPrompt.vue` | First-time permission prompt |

### Modified Files

| File                               | Changes                             |
| ---------------------------------- | ----------------------------------- |
| `service-worker/sw.ts`             | Import push notifications, handlers |
| `stores/notifications.ts`          | Browser notification actions        |
| `pages/settings/notifications.vue` | Browser notification toggle         |
| `stores/rank.ts` or composable     | Vote notifications                  |

---

## Notification Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BROWSER NOTIFICATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EVENT OCCURS (e.g., incoming transaction)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Store detects event                                                 │   │
│  │  └─► addNotification()                                               │   │
│  │       └─► showBrowserNotification()                                  │   │
│  │            └─► postMessage to SW                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  SERVICE WORKER                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Receives SHOW_NOTIFICATION message                                  │   │
│  │  └─► PushNotificationManager.showNotification()                      │   │
│  │       └─► registration.showNotification()                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  BROWSER NOTIFICATION                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────────────────────────────────────────┐               │   │
│  │  │ 🔔 Lotus Wallet                              X   │               │   │
│  │  │ ────────────────────────────────────────────────│               │   │
│  │  │ Received Lotus                                   │               │   │
│  │  │ You received 100.00 XPI                          │               │   │
│  │  │                                                  │               │   │
│  │  │ [View]                                           │               │   │
│  │  └──────────────────────────────────────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  USER CLICKS NOTIFICATION                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SW notificationclick handler                                        │   │
│  │  └─► Determine URL based on action/tag                               │   │
│  │       └─► Focus existing window or open new                          │   │
│  │            └─► Navigate to relevant page                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Browser Compatibility

| Feature              | Chrome | Firefox | Safari     | Edge |
| -------------------- | ------ | ------- | ---------- | ---- |
| Notification API     | ✅     | ✅      | ✅         | ✅   |
| SW showNotification  | ✅     | ✅      | ⚠️ Limited | ✅   |
| Notification actions | ✅     | ✅      | ❌         | ✅   |
| Badge API            | ✅     | ❌      | ❌         | ✅   |

### Safari Limitations

- No notification actions (buttons)
- Limited background notification support
- Requires user to add to home screen for full PWA features

### Fallback Strategy

```typescript
// Check for action support
const supportsActions = 'actions' in Notification.prototype

// Show notification without actions on unsupported browsers
if (!supportsActions) {
  delete config.actions
}
```

---

## Verification Checklist

### Service Worker Push

- [ ] SW can show notifications
- [ ] Notification templates render correctly
- [ ] Click handling navigates to correct page
- [ ] Action buttons work (where supported)
- [ ] Badge updates correctly

### Browser Notification Store

- [ ] Permission request works
- [ ] Permission state persists
- [ ] Toggle respects permission
- [ ] Notifications sent to SW correctly

### Permission UI

- [ ] Settings page shows correct status
- [ ] Enable button requests permission
- [ ] Blocked state shows instructions
- [ ] First-time prompt appears appropriately

### Social Notifications

- [ ] Vote received triggers notification
- [ ] Vote confirmed triggers notification
- [ ] Polling works for linked profiles
- [ ] Notifications link to correct pages

---

## Notes

- Safari has limited support - graceful degradation required
- Badge API not universally supported
- Notification actions provide quick responses
- Social polling can be moved to SW for background operation

---

## Next Phase

After completing Phase 8, proceed to:

- **Phase 9**: Contact and Cross-Feature Integration

---

_Source: background-service-worker/04_PUSH_NOTIFICATIONS.md, notification-system/04_BROWSER_NOTIFICATIONS.md, notification-system/05_SOCIAL_INTEGRATION.md_
