/**
 * Notification Store
 *
 * Manages persistent notifications for important wallet events.
 */
import { defineStore } from 'pinia'
import { getItem, setItem, STORAGE_KEYS } from '~/utils/storage'

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'transaction'
  | 'signing_request'
  | 'system'
  | 'social'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
  actionUrl?: string
  actionLabel?: string
  data?: Record<string, unknown>
}

export interface NotificationPreferences {
  transactions: boolean
  signingRequests: boolean
  social: boolean
  system: boolean
  browserNotifications: boolean
}

interface NotificationState {
  notifications: Notification[]
  preferences: NotificationPreferences
  browserPermission: NotificationPermission
  initialized: boolean
}

// ============================================================================
// Store
// ============================================================================

export const useNotificationStore = defineStore('notifications', {
  state: (): NotificationState => ({
    notifications: [],
    preferences: {
      transactions: true,
      signingRequests: true,
      social: true,
      system: true,
      browserNotifications: true,
    },
    browserPermission: 'default' as NotificationPermission,
    initialized: false,
  }),

  getters: {
    /**
     * Count of unread notifications
     */
    unreadCount: (state): number =>
      state.notifications.filter(n => !n.read).length,

    /**
     * All unread notifications
     */
    unreadNotifications: (state): Notification[] =>
      state.notifications.filter(n => !n.read),

    /**
     * Notifications grouped by date (Today, Yesterday, Earlier)
     */
    groupedNotifications: (
      state,
    ): { label: string; notifications: Notification[] }[] => {
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

    /**
     * Check if a notification type is enabled
     */
    isTypeEnabled:
      state =>
      (type: NotificationType): boolean => {
        switch (type) {
          case 'transaction':
            return state.preferences.transactions
          case 'signing_request':
            return state.preferences.signingRequests
          case 'social':
            return state.preferences.social
          case 'system':
            return state.preferences.system
          default:
            return true
        }
      },

    /**
     * Check if browser notifications are available and enabled
     */
    browserNotificationsAvailable: (state): boolean =>
      typeof window !== 'undefined' &&
      'Notification' in window &&
      state.browserPermission === 'granted' &&
      state.preferences.browserNotifications,
  },

  actions: {
    /**
     * Initialize store from localStorage
     */
    initialize() {
      if (this.initialized) return

      const saved = getItem<{
        notifications?: Notification[]
        preferences?: Partial<NotificationPreferences>
      }>(STORAGE_KEYS.NOTIFICATIONS, {})

      if (saved.notifications) {
        this.notifications = saved.notifications
      }
      if (saved.preferences) {
        this.preferences = { ...this.preferences, ...saved.preferences }
      }

      // Check browser notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        this.browserPermission = Notification.permission
      }

      this.initialized = true
    },

    /**
     * Save state to localStorage
     */
    save() {
      setItem(STORAGE_KEYS.NOTIFICATIONS, {
        notifications: this.notifications.slice(0, 100), // Keep last 100
        preferences: this.preferences,
      })
    },

    /**
     * Add a new notification
     */
    addNotification(
      notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & {
        persistent?: boolean
      },
    ): Notification | null {
      // Check if this type is enabled
      if (!this.isTypeEnabled(notification.type)) {
        return null
      }

      const { persistent, ...notificationData } = notification
      const newNotification: Notification = {
        ...notificationData,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      }

      this.notifications.unshift(newNotification)
      this.save()

      // Show browser notification for persistent notifications
      if (persistent) {
        this.showBrowserNotification(newNotification)
      }

      return newNotification
    },

    /**
     * Add a transaction notification
     */
    addTransactionNotification(txid: string, amount: string, isSend: boolean) {
      return this.addNotification({
        type: 'transaction',
        title: isSend ? 'Transaction Sent' : 'Transaction Received',
        message: `${isSend ? 'Sent' : 'Received'} ${amount} XPI`,
        actionUrl: `/explore/explorer/tx/${txid}`,
        actionLabel: 'View Transaction',
        data: { txid, amount, isSend },
        persistent: true,
      })
    },

    /**
     * Add a signing request notification
     */
    addSigningRequestNotification(requestId: string, fromPeer: string) {
      return this.addNotification({
        type: 'signing_request',
        title: 'Signing Request',
        message: `${fromPeer} is requesting your signature`,
        actionUrl: '/people/p2p',
        actionLabel: 'View Request',
        data: { requestId, fromPeer },
        persistent: true,
      })
    },

    /**
     * Add a system notification
     */
    addSystemNotification(title: string, message: string) {
      return this.addNotification({
        type: 'system',
        title,
        message,
      })
    },

    /**
     * Add a vote received notification (for linked profiles)
     */
    addVoteReceivedNotification(
      platform: string,
      profileId: string,
      amount: string,
      txid: string,
    ) {
      return this.addNotification({
        type: 'social',
        title: 'Vote Received',
        message: `Someone voted ${amount} XPI on your ${platform} profile`,
        actionUrl: `/explore/social/${platform}/${profileId}`,
        actionLabel: 'View Profile',
        data: { platform, profileId, amount, txid, eventType: 'vote_received' },
        persistent: true,
      })
    },

    /**
     * Add a vote confirmed notification (user's own vote)
     */
    addVoteConfirmedNotification(
      platform: string,
      profileId: string,
      profileName: string,
      amount: string,
      txid: string,
    ) {
      return this.addNotification({
        type: 'social',
        title: 'Vote Confirmed',
        message: `Your vote of ${amount} XPI on ${profileName} was confirmed`,
        actionUrl: `/explore/explorer/tx/${txid}`,
        actionLabel: 'View Transaction',
        data: {
          platform,
          profileId,
          profileName,
          amount,
          txid,
          eventType: 'vote_confirmed',
        },
        persistent: false,
      })
    },

    /**
     * Add a profile linked notification
     */
    addProfileLinkedNotification(platform: string, profileId: string) {
      return this.addNotification({
        type: 'social',
        title: 'Profile Linked',
        message: `Your ${platform} profile has been linked`,
        actionUrl: `/explore/social/${platform}/${profileId}`,
        actionLabel: 'View Profile',
        data: { platform, profileId, eventType: 'profile_linked' },
        persistent: false,
      })
    },

    /**
     * Mark a notification as read
     */
    markAsRead(id: string) {
      const notification = this.notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        notification.read = true
        this.save()
      }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
      let changed = false
      for (const notification of this.notifications) {
        if (!notification.read) {
          notification.read = true
          changed = true
        }
      }
      if (changed) {
        this.save()
      }
    },

    /**
     * Delete a notification
     */
    deleteNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
        this.save()
      }
    },

    /**
     * Clear all notifications
     */
    clearAll() {
      this.notifications = []
      this.save()
    },

    /**
     * Update notification preferences
     */
    updatePreferences(preferences: Partial<NotificationPreferences>) {
      this.preferences = { ...this.preferences, ...preferences }
      this.save()
    },

    /**
     * Request browser notification permission
     */
    async requestBrowserPermission(): Promise<NotificationPermission> {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied'
      }

      try {
        this.browserPermission = await Notification.requestPermission()
        return this.browserPermission
      } catch {
        return 'denied'
      }
    },

    /**
     * Show a browser notification via service worker
     */
    async showBrowserNotification(notification: Notification): Promise<void> {
      // Check permission and preference
      if (this.browserPermission !== 'granted') return
      if (!this.preferences.browserNotifications) return

      // Map notification type to push notification event type
      const eventTypeMap: Record<NotificationType, string> = {
        transaction: notification.data?.isSend
          ? 'transaction_sent'
          : 'transaction_received',
        signing_request: 'signing_request',
        social: 'vote_received',
        system: 'system',
      }

      // Send to service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: eventTypeMap[notification.type] || 'system',
            title: notification.title,
            body: notification.message,
            data: {
              ...notification.data,
              notificationId: notification.id,
              actionUrl: notification.actionUrl,
            },
          },
        })
      }
    },

    /**
     * Clear the browser notification badge
     */
    clearBrowserBadge(): void {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_BADGE',
        })
      }
    },
  },
})
