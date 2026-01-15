/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NetworkMonitor } from './modules/network-monitor'
import { SessionMonitor } from './modules/session-monitor'
import { stateSync } from './modules/state-sync'
import {
  PushNotificationManager,
  setupNotificationClickHandler,
} from './modules/push-notifications'

declare let self: ServiceWorkerGlobalScope

// Version for tracking updates
const SW_VERSION = '1.3.0'

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Initialize modules
const networkMonitor = new NetworkMonitor()
const sessionMonitor = new SessionMonitor()
const pushNotificationManager = new PushNotificationManager()

// Setup notification click handler
setupNotificationClickHandler(pushNotificationManager)

// Message handling
self.addEventListener('message', async function (this, ev) {
  const { type, payload } = ev.data || {}

  switch (type) {
    case 'SKIP_WAITING':
      this.skipWaiting()
      break

    case 'GET_STATUS':
      ev.ports[0]?.postMessage({
        registered: true,
        active: true,
        version: SW_VERSION,
        networkMonitorActive: networkMonitor.isPolling(),
        sessionMonitorActive: sessionMonitor.isMonitoring(),
        activeSessionCount: sessionMonitor.getSessionCount(),
      })
      break

    // Network Monitor Messages
    case 'START_MONITORING':
      networkMonitor.configure(payload)
      networkMonitor.startPolling()
      break

    case 'STOP_MONITORING':
      networkMonitor.stopPolling()
      break

    case 'UPDATE_ADDRESSES':
      networkMonitor.updateAddresses(payload.addresses)
      break

    case 'UPDATE_SCRIPT':
      networkMonitor.updateScriptPayload(
        payload.scriptPayload,
        payload.scriptType,
      )
      break

    case 'SET_PENDING_TRANSACTIONS':
      networkMonitor.setPendingTransactions(payload.hasPending)
      break

    case 'SET_ACTIVE_SIGNING_SESSIONS':
      networkMonitor.setActiveSigningSessions(payload.hasActive)
      break

    case 'TAB_BACKGROUNDED':
      networkMonitor.markRecentlyBackgrounded()
      break

    case 'INIT_UTXO_CACHE':
      networkMonitor.initializeFromCache(payload.scriptPayload, payload.utxoIds)
      break

    // Session Monitor Messages
    case 'REGISTER_SESSION':
      sessionMonitor.addSession(payload)
      break

    case 'UNREGISTER_SESSION':
      sessionMonitor.removeSession(payload.id)
      break

    case 'REGISTER_SIGNING_REQUEST':
      sessionMonitor.addSigningRequest(payload)
      break

    case 'UPDATE_SIGNING_REQUEST_STATUS':
      sessionMonitor.updateSigningRequestStatus(
        payload.requestId,
        payload.status,
      )
      break

    case 'START_PRESENCE_REFRESH':
      sessionMonitor.startPresenceRefresh(payload?.intervalMs)
      break

    case 'STOP_PRESENCE_REFRESH':
      sessionMonitor.stopPresenceRefresh()
      break

    case 'GET_PENDING_REQUESTS':
      ev.ports[0]?.postMessage({
        requests: sessionMonitor.getPendingRequests(),
      })
      break

    // Push Notification Messages
    case 'SHOW_NOTIFICATION':
      pushNotificationManager.showNotification(payload)
      break

    case 'CLEAR_BADGE':
      pushNotificationManager.clearBadge()
      break

    // State Sync Messages
    case 'CACHE_STATE':
      stateSync.cacheState(payload)
      break

    case 'GET_CACHED_STATE':
      stateSync.getAllState().then(state => {
        ev.ports[0]?.postMessage({
          type: 'CACHED_STATE',
          payload: state,
        })
      })
      break

    case 'CLEAR_CACHED_STATE':
      stateSync.clearState()
      break

    case 'CACHE_UTXOS':
      stateSync.cacheUtxos(payload.scriptPayload, payload.utxos)
      break

    case 'GET_CACHED_UTXOS':
      stateSync.getUtxos(payload.scriptPayload).then(utxos => {
        ev.ports[0]?.postMessage({
          type: 'CACHED_UTXOS',
          payload: { utxos },
        })
      })
      break

    default:
      // Unknown message type
      break
  }
})

// Install event
self.addEventListener('install', () => {
  console.log(`[SW] Installing service worker v${SW_VERSION}`)
})

// Activate event
self.addEventListener('activate', event => {
  console.log(`[SW] Activating service worker v${SW_VERSION}`)
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim())
})

// All modules initialized:
// - Network Monitor (Phase 3)
// - Session Monitor (Phase 5)
// - Push Notifications (Phase 8)
// - State Sync (Phase 10)
