/**
 * Notification Store
 *
 * Manages persistent notifications for important wallet events.
 */
import { computed, ref } from 'vue'
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

export const useNotificationStore = defineStore('notifications', () => {
  // === STATE ===
  const notifications = ref<Notification[]>([])
  const preferences = ref<NotificationPreferences>({
    transactions: true,
    signingRequests: true,
    social: true,
    system: true,
    browserNotifications: true,
  })
  const browserPermission = ref<NotificationPermission>('default')
  const initialized = ref(false)

  // === GETTERS ===
  /**
   * Count of unread notifications
   */
  const unreadCount = computed(
    () => notifications.value.filter(n => !n.read).length,
  )

  /**
   * All unread notifications
   */
  const unreadNotifications = computed(() =>
    notifications.value.filter(n => !n.read),
  )

  /**
   * Notifications grouped by date (Today, Yesterday, Earlier)
   */
  const groupedNotifications = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const groups: { label: string; notifications: Notification[] }[] = []

    const todayNotifs = notifications.value.filter(
      n => new Date(n.timestamp) >= today,
    )
    if (todayNotifs.length > 0) {
      groups.push({ label: 'Today', notifications: todayNotifs })
    }

    const yesterdayNotifs = notifications.value.filter(n => {
      const date = new Date(n.timestamp)
      return date >= yesterday && date < today
    })
    if (yesterdayNotifs.length > 0) {
      groups.push({ label: 'Yesterday', notifications: yesterdayNotifs })
    }

    const earlierNotifs = notifications.value.filter(
      n => new Date(n.timestamp) < yesterday,
    )
    if (earlierNotifs.length > 0) {
      groups.push({ label: 'Earlier', notifications: earlierNotifs })
    }

    return groups
  })

  /**
   * Check if browser notifications are available and enabled
   */
  const browserNotificationsAvailable = computed(
    () =>
      typeof window !== 'undefined' &&
      'Notification' in window &&
      browserPermission.value === 'granted' &&
      preferences.value.browserNotifications,
  )

  // === PARAMETERIZED GETTERS (as functions) ===
  /**
   * Check if a notification type is enabled
   */
  function isTypeEnabled(type: NotificationType): boolean {
    switch (type) {
      case 'transaction':
        return preferences.value.transactions
      case 'signing_request':
        return preferences.value.signingRequests
      case 'social':
        return preferences.value.social
      case 'system':
        return preferences.value.system
      default:
        return true
    }
  }

  // === ACTIONS ===
  /**
   * Initialize store from localStorage
   */
  function initialize() {
    if (initialized.value) return

    const saved = getItem<{
      notifications?: Notification[]
      preferences?: Partial<NotificationPreferences>
    }>(STORAGE_KEYS.NOTIFICATIONS, {})

    if (saved.notifications) {
      notifications.value = saved.notifications
    }
    if (saved.preferences) {
      preferences.value = { ...preferences.value, ...saved.preferences }
    }

    // Check browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      browserPermission.value = Notification.permission
    }

    initialized.value = true
  }

  /**
   * Save state to localStorage
   */
  function save() {
    setItem(STORAGE_KEYS.NOTIFICATIONS, {
      notifications: notifications.value.slice(0, 100), // Keep last 100
      preferences: preferences.value,
    })
  }

  /**
   * Add a new notification
   */
  function addNotification(
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & {
      persistent?: boolean
    },
  ): Notification | null {
    // Check if this type is enabled
    if (!isTypeEnabled(notification.type)) {
      return null
    }

    const { persistent, ...notificationData } = notification
    const newNotification: Notification = {
      ...notificationData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
    }

    notifications.value.unshift(newNotification)
    save()

    // Show browser notification for persistent notifications
    if (persistent) {
      showBrowserNotification(newNotification)
    }

    return newNotification
  }

  /**
   * Add a transaction notification
   */
  function addTransactionNotification(
    txid: string,
    amount: string,
    isSend: boolean,
  ) {
    return addNotification({
      type: 'transaction',
      title: isSend ? 'Transaction Sent' : 'Transaction Received',
      message: `${isSend ? 'Sent' : 'Received'} ${amount} XPI`,
      actionUrl: `/explore/explorer/tx/${txid}`,
      actionLabel: 'View Transaction',
      data: { txid, amount, isSend },
      persistent: true,
    })
  }

  /**
   * Add a signing request notification
   */
  function addSigningRequestNotification(requestId: string, fromPeer: string) {
    return addNotification({
      type: 'signing_request',
      title: 'Signing Request',
      message: `${fromPeer} is requesting your signature`,
      actionUrl: '/people/p2p',
      actionLabel: 'View Request',
      data: { requestId, fromPeer },
      persistent: true,
    })
  }

  /**
   * Add a system notification
   */
  function addSystemNotification(title: string, message: string) {
    return addNotification({
      type: 'system',
      title,
      message,
    })
  }

  /**
   * Add a vote received notification (for linked profiles)
   */
  function addVoteReceivedNotification(
    platform: string,
    profileId: string,
    amount: string,
    txid: string,
  ) {
    return addNotification({
      type: 'social',
      title: 'Vote Received',
      message: `Someone voted ${amount} XPI on your ${platform} profile`,
      actionUrl: `/explore/social/${platform}/${profileId}`,
      actionLabel: 'View Profile',
      data: { platform, profileId, amount, txid, eventType: 'vote_received' },
      persistent: true,
    })
  }

  /**
   * Add a vote confirmed notification (user's own vote)
   */
  function addVoteConfirmedNotification(
    platform: string,
    profileId: string,
    profileName: string,
    amount: string,
    txid: string,
  ) {
    return addNotification({
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
  }

  /**
   * Add a profile linked notification
   */
  function addProfileLinkedNotification(platform: string, profileId: string) {
    return addNotification({
      type: 'social',
      title: 'Profile Linked',
      message: `Your ${platform} profile has been linked`,
      actionUrl: `/explore/social/${platform}/${profileId}`,
      actionLabel: 'View Profile',
      data: { platform, profileId, eventType: 'profile_linked' },
      persistent: false,
    })
  }

  /**
   * Mark a notification as read
   */
  function markAsRead(id: string) {
    const notification = notifications.value.find(n => n.id === id)
    if (notification && !notification.read) {
      notification.read = true
      save()
    }
  }

  /**
   * Mark all notifications as read
   */
  function markAllAsRead() {
    let changed = false
    for (const notification of notifications.value) {
      if (!notification.read) {
        notification.read = true
        changed = true
      }
    }
    if (changed) {
      save()
    }
  }

  /**
   * Delete a notification
   */
  function deleteNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
      save()
    }
  }

  /**
   * Clear all notifications
   */
  function clearAll() {
    notifications.value = []
    save()
  }

  /**
   * Update notification preferences
   */
  function updatePreferences(newPreferences: Partial<NotificationPreferences>) {
    preferences.value = { ...preferences.value, ...newPreferences }
    save()
  }

  /**
   * Request browser notification permission
   */
  async function requestBrowserPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }

    try {
      browserPermission.value = await Notification.requestPermission()
      return browserPermission.value
    } catch {
      return 'denied'
    }
  }

  /**
   * Show a browser notification via service worker
   */
  async function showBrowserNotification(
    notification: Notification,
  ): Promise<void> {
    // Check permission and preference
    if (browserPermission.value !== 'granted') return
    if (!preferences.value.browserNotifications) return

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
  }

  /**
   * Clear the browser notification badge
   */
  function clearBrowserBadge(): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_BADGE',
      })
    }
  }

  // === RETURN ===
  return {
    // State
    notifications,
    preferences,
    browserPermission,
    initialized,
    // Getters
    unreadCount,
    unreadNotifications,
    groupedNotifications,
    browserNotificationsAvailable,
    // Parameterized getters (functions)
    isTypeEnabled,
    // Actions
    initialize,
    save,
    addNotification,
    addTransactionNotification,
    addSigningRequestNotification,
    addSystemNotification,
    addVoteReceivedNotification,
    addVoteConfirmedNotification,
    addProfileLinkedNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updatePreferences,
    requestBrowserPermission,
    showBrowserNotification,
    clearBrowserBadge,
  }
})
