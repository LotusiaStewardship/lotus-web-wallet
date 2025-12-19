/**
 * Service Worker Composable
 *
 * Client-side composable for interacting with the service worker.
 * Provides registration status, message passing, and event handling.
 */
import type {
  SWMessage,
  SWStatusResponse,
  NetworkMonitorConfig,
} from '~/types/service-worker'

// ============================================================================
// Composable
// ============================================================================

export function useServiceWorker() {
  const isSupported = computed(
    () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  )
  const registration = ref<ServiceWorkerRegistration | null>(null)
  const isReady = ref(false)
  const status = ref<SWStatusResponse | null>(null)

  /**
   * Initialize the service worker connection
   * Registration is handled by @vite-pwa/nuxt automatically
   */
  async function initialize() {
    if (!isSupported.value) {
      console.warn('[useServiceWorker] Service workers not supported')
      return
    }

    try {
      // Wait for the service worker to be ready
      const reg = await navigator.serviceWorker.ready
      registration.value = reg
      isReady.value = true

      // Get initial status
      await refreshStatus()

      console.log('[useServiceWorker] Service worker ready')
    } catch (error) {
      console.error('[useServiceWorker] Failed to initialize:', error)
    }
  }

  /**
   * Post a message to the service worker
   */
  function postMessage(message: SWMessage) {
    if (!registration.value?.active) {
      console.warn('[useServiceWorker] No active service worker')
      return
    }
    registration.value.active.postMessage(message)
  }

  /**
   * Post a message and wait for a response
   */
  function postMessageWithResponse<T>(message: SWMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!registration.value?.active) {
        reject(new Error('No active service worker'))
        return
      }

      const messageChannel = new MessageChannel()

      messageChannel.port1.onmessage = event => {
        resolve(event.data as T)
      }

      registration.value.active.postMessage(message, [messageChannel.port2])

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service worker response timeout'))
      }, 5000)
    })
  }

  /**
   * Refresh the service worker status
   */
  async function refreshStatus() {
    try {
      const response = await postMessageWithResponse<SWStatusResponse>({
        type: 'GET_STATUS',
      })
      status.value = response
    } catch (error) {
      console.warn('[useServiceWorker] Failed to get status:', error)
    }
  }

  /**
   * Request the service worker to skip waiting and activate
   */
  function skipWaiting() {
    postMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * Register a message event listener
   * Returns a cleanup function to remove the listener
   */
  function onMessage(callback: (event: MessageEvent) => void): () => void {
    if (!isSupported.value) return () => {}

    navigator.serviceWorker.addEventListener('message', callback)
    return () =>
      navigator.serviceWorker.removeEventListener('message', callback)
  }

  /**
   * Check if there's a waiting service worker (update available)
   */
  const hasUpdate = computed(() => {
    return registration.value?.waiting !== null
  })

  /**
   * Apply pending update by activating the waiting service worker
   */
  function applyUpdate() {
    if (registration.value?.waiting) {
      registration.value.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  // =========================================================================
  // Network Monitor Helpers
  // =========================================================================

  /**
   * Start network monitoring in the service worker
   */
  function startNetworkMonitoring(config: NetworkMonitorConfig) {
    postMessage({
      type: 'START_MONITORING',
      payload: config,
    })
  }

  /**
   * Stop network monitoring in the service worker
   */
  function stopNetworkMonitoring() {
    postMessage({ type: 'STOP_MONITORING' })
  }

  /**
   * Update monitored addresses
   */
  function updateMonitoredAddresses(addresses: string[]) {
    postMessage({
      type: 'UPDATE_ADDRESSES',
      payload: { addresses },
    })
  }

  /**
   * Update script payload for monitoring
   */
  function updateMonitoredScript(
    scriptPayload: string,
    scriptType: 'p2pkh' | 'p2tr-commitment',
  ) {
    postMessage({
      type: 'UPDATE_SCRIPT',
      payload: { scriptPayload, scriptType },
    })
  }

  /**
   * Notify SW of pending transactions (increases polling frequency)
   */
  function setPendingTransactions(hasPending: boolean) {
    postMessage({
      type: 'SET_PENDING_TRANSACTIONS',
      payload: { hasPending },
    })
  }

  /**
   * Notify SW of active signing sessions (increases polling frequency)
   */
  function setActiveSigningSessions(hasActive: boolean) {
    postMessage({
      type: 'SET_ACTIVE_SIGNING_SESSIONS',
      payload: { hasActive },
    })
  }

  /**
   * Notify SW that tab is going to background
   */
  function notifyTabBackgrounded() {
    postMessage({ type: 'TAB_BACKGROUNDED' })
  }

  /**
   * Initialize UTXO cache in SW
   */
  function initUtxoCache(scriptPayload: string, utxoIds: string[]) {
    postMessage({
      type: 'INIT_UTXO_CACHE',
      payload: { scriptPayload, utxoIds },
    })
  }

  // =========================================================================
  // Session Monitor Helpers
  // =========================================================================

  /**
   * Register a session with the service worker for monitoring
   */
  function registerSession(session: {
    id: string
    type: 'musig2' | 'p2p_presence' | 'signing_request'
    expiresAt: number
    warningAt?: number
    data?: Record<string, unknown>
  }) {
    postMessage({
      type: 'REGISTER_SESSION',
      payload: {
        ...session,
        warningAt: session.warningAt ?? session.expiresAt - 60_000, // Default 1 min warning
        data: session.data ?? {},
      },
    })
  }

  /**
   * Unregister a session from monitoring
   */
  function unregisterSession(sessionId: string) {
    postMessage({
      type: 'UNREGISTER_SESSION',
      payload: { id: sessionId },
    })
  }

  /**
   * Register a signing request for tracking
   */
  function registerSigningRequest(request: {
    id: string
    fromPeerId: string
    fromNickname?: string
    walletId: string
    walletName?: string
    amount?: string
    expiresAt: number
  }) {
    postMessage({
      type: 'REGISTER_SIGNING_REQUEST',
      payload: {
        ...request,
        receivedAt: Date.now(),
        status: 'pending',
      },
    })
  }

  /**
   * Update signing request status
   */
  function updateSigningRequestStatus(
    requestId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'expired',
  ) {
    postMessage({
      type: 'UPDATE_SIGNING_REQUEST_STATUS',
      payload: { requestId, status },
    })
  }

  /**
   * Start presence refresh signaling from SW
   */
  function startPresenceRefresh(intervalMs: number = 30_000) {
    postMessage({
      type: 'START_PRESENCE_REFRESH',
      payload: { intervalMs },
    })
  }

  /**
   * Stop presence refresh signaling
   */
  function stopPresenceRefresh() {
    postMessage({ type: 'STOP_PRESENCE_REFRESH' })
  }

  /**
   * Get pending signing requests from SW
   */
  async function getPendingRequests(): Promise<
    Array<{
      id: string
      fromPeerId: string
      fromNickname?: string
      walletId: string
      walletName?: string
      amount?: string
      receivedAt: number
      expiresAt: number
      status: string
    }>
  > {
    try {
      const response = await postMessageWithResponse<{
        requests: Array<{
          id: string
          fromPeerId: string
          fromNickname?: string
          walletId: string
          walletName?: string
          amount?: string
          receivedAt: number
          expiresAt: number
          status: string
        }>
      }>({ type: 'GET_PENDING_REQUESTS' })
      return response.requests
    } catch {
      return []
    }
  }

  // =========================================================================
  // Push Notification Helpers
  // =========================================================================

  /**
   * Show a push notification via the service worker
   */
  function showPushNotification(event: {
    type:
      | 'transaction_received'
      | 'transaction_sent'
      | 'signing_request'
      | 'session_expiring'
      | 'session_expired'
      | 'vote_received'
      | 'vote_confirmed'
      | 'profile_linked'
      | 'system'
    title?: string
    body?: string
    data?: Record<string, unknown>
  }) {
    postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: event,
    })
  }

  /**
   * Clear the app badge
   */
  function clearBadge() {
    postMessage({ type: 'CLEAR_BADGE' })
  }

  return {
    // State
    isSupported,
    registration,
    isReady,
    status,
    hasUpdate,

    // Actions
    initialize,
    postMessage,
    postMessageWithResponse,
    refreshStatus,
    skipWaiting,
    onMessage,
    applyUpdate,

    // Network Monitor
    startNetworkMonitoring,
    stopNetworkMonitoring,
    updateMonitoredAddresses,
    updateMonitoredScript,
    setPendingTransactions,
    setActiveSigningSessions,
    notifyTabBackgrounded,
    initUtxoCache,

    // Session Monitor
    registerSession,
    unregisterSession,
    registerSigningRequest,
    updateSigningRequestStatus,
    startPresenceRefresh,
    stopPresenceRefresh,
    getPendingRequests,

    // Push Notifications
    showPushNotification,
    clearBadge,
  }
}
