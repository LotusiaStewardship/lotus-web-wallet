declare let self: ServiceWorkerGlobalScope

/**
 * Notification templates for each push notification event type
 * Each template function takes event data and returns a PushNotificationConfig
 */
const templates: Record<
  PushNotificationEventType,
  (data: Record<string, unknown>) => PushNotificationConfig
> = {
  /**
   * Template for received transaction notifications
   * @param data - Event data containing amount and transaction details
   */
  transaction_received: data => ({
    title: 'Received Lotus',
    body: `You received ${data.amount || '?'} XPI`,
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'transaction',
    data: { ...data, eventType: 'transaction_received' },
    actions: [{ action: 'view', title: 'View' }],
  }),

  /**
   * Template for sent transaction notifications
   * @param data - Event data containing amount and transaction details
   */
  transaction_sent: data => ({
    title: 'Transaction Sent',
    body: `Sent ${data.amount || '?'} XPI`,
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'transaction',
    data: { ...data, eventType: 'transaction_sent' },
    actions: [{ action: 'view', title: 'View' }],
  }),

  /**
   * Template for MuSig2 signing request notifications
   * @param data - Event data containing requester info and transaction details
   */
  signing_request: data => ({
    title: 'Signing Request',
    body: `${data.from || 'Someone'} wants you to sign ${
      data.amount || 'a transaction'
    }`,
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'signing',
    data: { ...data, eventType: 'signing_request' },
    requireInteraction: true,
    actions: [
      { action: 'review', title: 'Review' },
      { action: 'reject', title: 'Reject' },
    ],
  }),

  /**
   * Template for session expiring warning notifications
   * @param data - Event data containing session info and time remaining
   */
  session_expiring: data => ({
    title: 'Session Expiring',
    body: `Signing session expires in ${data.minutes || '?'} minute(s)`,
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'session',
    data: { ...data, eventType: 'session_expiring' },
    actions: [{ action: 'extend', title: 'Extend' }],
  }),

  /**
   * Template for session expired notifications
   * @param data - Event data containing session and wallet info
   */
  session_expired: data => ({
    title: 'Session Expired',
    body: data.walletName
      ? `Session for "${data.walletName}" has expired`
      : 'A signing session has expired',
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'session',
    data: { ...data, eventType: 'session_expired' },
  }),

  /**
   * Template for vote received on profile notifications
   * @param data - Event data containing vote amount and profile info
   */
  vote_received: data => ({
    title: 'Vote on Your Profile',
    body: `Someone voted ${data.amount || '?'} XPI on ${
      data.profile || 'your profile'
    }`,
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'social',
    data: { ...data, eventType: 'vote_received' },
    actions: [{ action: 'view', title: 'View' }],
  }),

  /**
   * Template for vote confirmation notifications
   * @param data - Event data containing vote amount and profile name
   */
  vote_confirmed: data => ({
    title: 'Vote Confirmed',
    body: `Your vote of ${data.amount || '?'} XPI on ${
      data.profileName || 'a profile'
    } was confirmed`,
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'social',
    data: { ...data, eventType: 'vote_confirmed' },
  }),

  /**
   * Template for profile linked notifications
   * @param data - Event data containing platform information
   */
  profile_linked: data => ({
    title: 'Profile Linked',
    body: `Your ${data.platform || ''} profile has been linked`,
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'social',
    data: { ...data, eventType: 'profile_linked' },
  }),

  /**
   * Template for generic system notifications
   * @param data - Event data containing title and body overrides
   */
  system: data => ({
    title: (data.title as string) || 'Lotusia',
    body: (data.body as string) || 'System notification',
    icon: '/icon/192.png',
    badge: '/icon/72.png',
    tag: 'system',
    data: { ...data, eventType: 'system' },
  }),
}

/**
 * Push Notification Manager
 *
 * Handles browser push notifications from the service worker.
 * Provides notification templates, display logic, and click handling.
 */
export class PushNotificationManager {
  private badgeCount = 0

  /**
   * Show a notification using a template
   */
  async showNotification(event: PushNotificationEventData): Promise<void> {
    const template = templates[event.type]
    if (!template) {
      console.warn(`[PushNotifications] Unknown event type: ${event.type}`)
      return
    }

    const config = template(event.data || {})

    // Override with custom title/body if provided
    if (event.title) config.title = event.title
    if (event.body) config.body = event.body

    await this.showRawNotification(config)
  }

  /**
   * Show a notification with raw config
   */
  async showRawNotification(config: PushNotificationConfig): Promise<void> {
    try {
      // Check for action support (Safari doesn't support actions)
      const supportsActions =
        'actions' in Notification.prototype ||
        (typeof Notification !== 'undefined' &&
          Notification.prototype.hasOwnProperty('actions'))

      const options: NotificationOptions & {
        actions?: Array<{ action: string; title: string }>
      } = {
        body: config.body,
        icon: config.icon || '/icon/192.png',
        badge: config.badge || '/icon/72.png',
        tag: config.tag,
        data: config.data,
        requireInteraction: config.requireInteraction ?? false,
      }

      // Only add actions if supported
      if (supportsActions && config.actions) {
        options.actions = config.actions
      }

      await self.registration.showNotification(config.title, options)

      // Update badge count
      this.badgeCount++
      await this.updateBadge(this.badgeCount)
    } catch (error) {
      console.error('[PushNotifications] Failed to show notification:', error)
    }
  }

  /**
   * Update the app badge count
   */
  async updateBadge(count: number): Promise<void> {
    this.badgeCount = count

    // Badge API is not available in all browsers
    if ('setAppBadge' in navigator) {
      try {
        if (count > 0) {
          await (
            navigator as Navigator & {
              setAppBadge: (count: number) => Promise<void>
            }
          ).setAppBadge(count)
        } else {
          await (
            navigator as Navigator & { clearAppBadge: () => Promise<void> }
          ).clearAppBadge()
        }
      } catch {
        // Badge API not supported or failed
      }
    }
  }

  /**
   * Clear the app badge
   */
  async clearBadge(): Promise<void> {
    await this.updateBadge(0)
  }

  /**
   * Get URL for notification click based on action and data
   */
  getClickUrl(
    action: string | undefined,
    data: Record<string, unknown> | undefined,
  ): string {
    const eventType = data?.eventType as PushNotificationEventType | undefined

    // Handle specific actions
    switch (action) {
      case 'view':
        if (data?.txid) return `/explore/explorer/tx/${data.txid}`
        if (data?.profileId && data?.platform) {
          return `/explore/social/${data.platform}/${data.profileId}`
        }
        break
      case 'review':
        return '/people/p2p?tab=requests'
      case 'reject':
        // Reject action - still navigate to requests page
        return '/people/p2p?tab=requests'
      case 'extend':
        if (data?.walletId) return `/people/shared-wallets/${data.walletId}`
        return '/people/shared-wallets'
    }

    // Default URLs based on event type
    switch (eventType) {
      case 'transaction_received':
      case 'transaction_sent':
        if (data?.txid) return `/explore/explorer/tx/${data.txid}`
        return '/transact/history'
      case 'signing_request':
        return '/people/p2p?tab=requests'
      case 'session_expiring':
      case 'session_expired':
        if (data?.walletId) return `/people/shared-wallets/${data.walletId}`
        return '/people/shared-wallets'
      case 'vote_received':
      case 'vote_confirmed':
      case 'profile_linked':
        if (data?.profileId && data?.platform) {
          return `/explore/social/${data.platform}/${data.profileId}`
        }
        return '/explore/social'
      default:
        return '/'
    }
  }
}

// ============================================================================
// Click Handler Setup
// ============================================================================

/**
 * Setup notification click handler
 * Call this in sw.ts to enable click handling
 */
export function setupNotificationClickHandler(
  manager: PushNotificationManager,
): void {
  self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close()

    const action = event.action
    const data = event.notification.data as Record<string, unknown> | undefined

    const url = manager.getClickUrl(action, data)

    // Decrement badge count
    manager.updateBadge(Math.max(0, (manager as any).badgeCount - 1))

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Try to focus an existing window
          for (const client of clientList) {
            if (
              client.url.includes(self.location.origin) &&
              'focus' in client
            ) {
              return client.navigate(url).then(() => client.focus())
            }
          }
          // Open a new window if none exists
          return self.clients.openWindow(url)
        }),
    )
  })

  // Handle notification close (user dismissed)
  self.addEventListener('notificationclose', () => {
    manager.updateBadge(Math.max(0, (manager as any).badgeCount - 1))
  })
}
