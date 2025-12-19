# Phase 1: Service Worker Foundation

## Overview

This phase establishes the core service worker infrastructure for the lotus-web-wallet using the official `@vite-pwa/nuxt` module. The service worker is written in TypeScript and transpiled by Vite during the build process, ensuring type safety and proper integration with the Nuxt build pipeline.

**Priority**: P0 (Critical)
**Estimated Effort**: 1-2 days
**Dependencies**: None

---

## Objectives

1. Install and configure `@vite-pwa/nuxt` module
2. Create TypeScript service worker with `injectManifest` strategy
3. Implement typed message passing between SW and client
4. Set up lifecycle management (install, activate, update)
5. Integrate with Nuxt's `$pwa` plugin for reactive SW state

---

## 1. Install @vite-pwa/nuxt Module

### Installation

```bash
npx nuxi@latest module add @vite-pwa/nuxt
```

### Update: `nuxt.config.ts`

Add the PWA module and configure for `injectManifest` strategy with TypeScript.

```ts
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineNuxtConfig({
  // ... existing config ...

  modules: [
    '@nuxt/ui-pro',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt', // Add PWA module
  ],

  // PWA Configuration
  pwa: {
    // Use injectManifest for custom service worker logic
    strategies: 'injectManifest',

    // Service worker source location (TypeScript)
    srcDir: 'service-worker',
    filename: 'sw.ts',

    // Register type for prompt-based updates
    registerType: 'prompt',

    // Manifest configuration
    manifest: {
      name: 'Lotus Web Wallet',
      short_name: 'Lotus Wallet',
      description:
        'The key to the Lotusia ecosystem - P2P wallet with service discovery',
      theme_color: '#10b981',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/icon/192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon/512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icon/512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },

    // Workbox options for injectManifest
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      // Increase max file size for larger bundles
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
    },

    // Client-side options
    client: {
      // Enable install prompt interception
      installPrompt: true,
      // Periodic sync for updates (in seconds)
      periodicSyncForUpdates: 3600, // 1 hour
    },

    // Development options
    devOptions: {
      enabled: true,
      type: 'module',
      navigateFallback: 'index.html',
    },
  },

  // ... rest of existing config ...
})
```

---

## 2. Update TypeScript Configuration

### Update: `tsconfig.json`

Add `WebWorker` to the lib array for service worker type support.

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "WebWorker"]
  }
}
```

---

## 3. Service Worker Message Types

### File: `types/service-worker.ts`

Define typed interfaces for all SW communication.

```ts
/**
 * Service Worker Message Types
 *
 * Defines the contract for communication between
 * the service worker and client application.
 */

// ============================================================================
// Client → Service Worker Messages
// ============================================================================

export interface SWConfigureMessage {
  type: 'CONFIGURE'
  payload: {
    chronikUrl: string
    scriptPayload: string
    scriptType: 'p2pkh' | 'p2tr-commitment'
    address: string
  }
}

export interface SWStartMonitoringMessage {
  type: 'START_MONITORING'
  payload: {
    /** Polling interval in milliseconds */
    pollInterval?: number
  }
}

export interface SWStopMonitoringMessage {
  type: 'STOP_MONITORING'
}

export interface SWRegisterSessionMessage {
  type: 'REGISTER_SESSION'
  payload: {
    sessionId: string
    expiresAt: number
    /** Minutes before expiry to warn */
    warnBeforeMinutes?: number
  }
}

export interface SWUnregisterSessionMessage {
  type: 'UNREGISTER_SESSION'
  payload: {
    sessionId: string
  }
}

export interface SWUpdatePresenceMessage {
  type: 'UPDATE_PRESENCE'
  payload: {
    walletAddress: string
    nickname?: string
    /** TTL in milliseconds */
    ttl: number
  }
}

export type ClientToSWMessage =
  | SWConfigureMessage
  | SWStartMonitoringMessage
  | SWStopMonitoringMessage
  | SWRegisterSessionMessage
  | SWUnregisterSessionMessage
  | SWUpdatePresenceMessage

// ============================================================================
// Service Worker → Client Messages
// ============================================================================

export interface SWTransactionDetectedMessage {
  type: 'TRANSACTION_DETECTED'
  payload: {
    txid: string
    isIncoming: boolean
    amount: string
    timestamp: number
  }
}

export interface SWSessionExpiringMessage {
  type: 'SESSION_EXPIRING'
  payload: {
    sessionId: string
    expiresAt: number
    minutesRemaining: number
  }
}

export interface SWBalanceUpdatedMessage {
  type: 'BALANCE_UPDATED'
  payload: {
    total: string
    spendable: string
    utxoCount: number
  }
}

export interface SWNotificationClickMessage {
  type: 'NOTIFICATION_CLICK'
  payload: {
    url?: string
    notificationId?: string
    action?: string
  }
}

export interface SWPresenceRefreshedMessage {
  type: 'PRESENCE_REFRESHED'
  payload: {
    success: boolean
    nextRefreshAt: number
  }
}

export interface SWErrorMessage {
  type: 'ERROR'
  payload: {
    code: string
    message: string
    context?: string
  }
}

export type SWToClientMessage =
  | SWTransactionDetectedMessage
  | SWSessionExpiringMessage
  | SWBalanceUpdatedMessage
  | SWNotificationClickMessage
  | SWPresenceRefreshedMessage
  | SWErrorMessage

// Union type for all messages
export type ServiceWorkerMessage = ClientToSWMessage | SWToClientMessage
```

---

## 4. Core Service Worker (TypeScript)

### File: `service-worker/sw.ts`

The main service worker file, written in TypeScript. Vite will transpile this during build.

```ts
/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import type {
  ClientToSWMessage,
  SWToClientMessage,
  SWConfigureMessage,
  SWStartMonitoringMessage,
  SWRegisterSessionMessage,
  SWUpdatePresenceMessage,
} from '../types/service-worker'

// Declare service worker global scope
declare let self: ServiceWorkerGlobalScope

/**
 * Lotus Web Wallet Service Worker
 *
 * Provides background operations for:
 * - Network monitoring (transaction detection)
 * - Session monitoring (MuSig2 timeouts)
 * - Push notifications
 */

// Version for cache busting
const SW_VERSION = '1.0.0'

// Workbox precaching - injects manifest at build time
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Take control immediately
self.skipWaiting()
clientsClaim()

// ============================================================================
// State
// ============================================================================

interface WalletConfig {
  chronikUrl: string
  scriptPayload: string
  scriptType: 'p2pkh' | 'p2tr-commitment'
  address: string
}

interface SessionInfo {
  sessionId: string
  expiresAt: number
  warnAt: number
  warned: boolean
  sessionType?: string
  metadata?: Record<string, unknown>
}

let config: WalletConfig | null = null
let monitoringActive = false
let monitoringInterval: ReturnType<typeof setTimeout> | null = null
const registeredSessions = new Map<string, SessionInfo>()
let presenceConfig: {
  walletAddress: string
  nickname?: string
  ttl: number
} | null = null
let presenceInterval: ReturnType<typeof setInterval> | null = null

// ============================================================================
// Lifecycle Events
// ============================================================================

self.addEventListener('install', (event: ExtendableEvent) => {
  console.log(`[SW] Installing version ${SW_VERSION}`)
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log(`[SW] Activating version ${SW_VERSION}`)
})

// ============================================================================
// Message Handling
// ============================================================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data as ClientToSWMessage

  switch (message.type) {
    case 'CONFIGURE':
      handleConfigure(message.payload)
      break

    case 'START_MONITORING':
      handleStartMonitoring(message.payload)
      break

    case 'STOP_MONITORING':
      handleStopMonitoring()
      break

    case 'REGISTER_SESSION':
      handleRegisterSession(message.payload)
      break

    case 'UNREGISTER_SESSION':
      handleUnregisterSession(message.payload)
      break

    case 'UPDATE_PRESENCE':
      handleUpdatePresence(message.payload)
      break

    default:
      console.log('[SW] Unknown message type:', (message as any).type)
  }
})

// ============================================================================
// Configuration
// ============================================================================

function handleConfigure(payload: SWConfigureMessage['payload']): void {
  config = {
    chronikUrl: payload.chronikUrl,
    scriptPayload: payload.scriptPayload,
    scriptType: payload.scriptType,
    address: payload.address,
  }
  console.log('[SW] Configured for address:', config.address)
}

// ============================================================================
// Network Monitoring (Phase 2 implementation)
// ============================================================================

function handleStartMonitoring(
  payload: SWStartMonitoringMessage['payload'],
): void {
  if (!config) {
    broadcastToClients({
      type: 'ERROR',
      payload: {
        code: 'NOT_CONFIGURED',
        message: 'Service worker not configured',
        context: 'START_MONITORING',
      },
    })
    return
  }

  if (monitoringActive) {
    return
  }

  const pollInterval = payload?.pollInterval || 30000 // Default 30s

  monitoringActive = true
  monitoringInterval = setInterval(() => {
    checkForUpdates()
  }, pollInterval)

  // Initial check
  checkForUpdates()

  console.log(`[SW] Monitoring started (interval: ${pollInterval}ms)`)
}

function handleStopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = null
  }
  monitoringActive = false
  console.log('[SW] Monitoring stopped')
}

async function checkForUpdates(): Promise<void> {
  // Implementation in Phase 2
  // Will poll Chronik for new transactions
}

// ============================================================================
// Session Monitoring (Phase 3 implementation)
// ============================================================================

function handleRegisterSession(
  payload: SWRegisterSessionMessage['payload'],
): void {
  const { sessionId, expiresAt, warnBeforeMinutes = 5 } = payload

  // Calculate warning time
  const warnAt = expiresAt - warnBeforeMinutes * 60 * 1000

  registeredSessions.set(sessionId, {
    sessionId,
    expiresAt,
    warnAt,
    warned: false,
  })

  console.log(`[SW] Session registered: ${sessionId}`)

  // Start session monitor if not running
  startSessionMonitor()
}

function handleUnregisterSession(
  payload: SWUnregisterSessionMessage['payload'],
): void {
  registeredSessions.delete(payload.sessionId)
  console.log(`[SW] Session unregistered: ${payload.sessionId}`)
}

let sessionMonitorInterval: ReturnType<typeof setInterval> | null = null

function startSessionMonitor(): void {
  if (sessionMonitorInterval) return

  sessionMonitorInterval = setInterval(() => {
    checkSessions()
  }, 10000) // Check every 10 seconds
}

function checkSessions(): void {
  const now = Date.now()

  for (const [sessionId, session] of registeredSessions) {
    // Check if session expired
    if (now >= session.expiresAt) {
      registeredSessions.delete(sessionId)
      continue
    }

    // Check if we should warn
    if (!session.warned && now >= session.warnAt) {
      session.warned = true
      const minutesRemaining = Math.ceil((session.expiresAt - now) / 60000)

      broadcastToClients({
        type: 'SESSION_EXPIRING',
        payload: {
          sessionId,
          expiresAt: session.expiresAt,
          minutesRemaining,
        },
      })

      // Also show notification
      showNotification('Session Expiring', {
        body: `MuSig2 session expires in ${minutesRemaining} minutes`,
        tag: `session-${sessionId}`,
        requireInteraction: true,
        data: { url: '/people/p2p', sessionId },
      })
    }
  }

  // Stop monitor if no sessions
  if (registeredSessions.size === 0 && sessionMonitorInterval) {
    clearInterval(sessionMonitorInterval)
    sessionMonitorInterval = null
  }
}

// ============================================================================
// Presence Management (Phase 3 implementation)
// ============================================================================

function handleUpdatePresence(
  payload: SWUpdatePresenceMessage['payload'],
): void {
  presenceConfig = payload

  // Clear existing interval
  if (presenceInterval) {
    clearInterval(presenceInterval)
  }

  // Refresh presence at half the TTL
  const refreshInterval = payload.ttl / 2
  presenceInterval = setInterval(() => {
    refreshPresence()
  }, refreshInterval)

  console.log(`[SW] Presence configured (refresh: ${refreshInterval}ms)`)
}

async function refreshPresence(): Promise<void> {
  // Implementation in Phase 3
  // Will call P2P service to refresh presence
}

// ============================================================================
// Notifications (Phase 4 implementation)
// ============================================================================

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const data = event.notification.data || {}

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window if available
      for (const client of clientList) {
        if ('focus' in client) {
          ;(client as WindowClient).focus()
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            payload: {
              url: data.url,
              notificationId: data.notificationId,
              action: event.action,
            },
          })
          return
        }
      }

      // Open new window if no existing window
      if (self.clients.openWindow && data.url) {
        return self.clients.openWindow(data.url)
      }
    }),
  )
})

interface NotificationOptions {
  body?: string
  tag?: string
  requireInteraction?: boolean
  data?: Record<string, unknown>
}

async function showNotification(
  title: string,
  options: NotificationOptions = {},
): Promise<void> {
  // Check permission
  if (Notification.permission !== 'granted') {
    return
  }

  try {
    await self.registration.showNotification(title, {
      icon: '/icon/128.png',
      badge: '/icon/32.png',
      ...options,
    })
  } catch (e) {
    console.error('[SW] Failed to show notification:', e)
  }
}

// ============================================================================
// Utilities
// ============================================================================

async function broadcastToClients(message: SWToClientMessage): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' })
  for (const client of clients) {
    client.postMessage(message)
  }
}

// ============================================================================
// Push Events (Phase 4 - for future server-sent push)
// ============================================================================

self.addEventListener('push', (event: PushEvent) => {
  // Handle push notifications from server
  // Implementation in Phase 4 if server-sent push is needed
})
```

---

## 5. Composable for Service Worker Access

### File: `composables/useServiceWorker.ts`

Provide a composable for components to interact with the service worker.
This integrates with the `$pwa` plugin provided by `@vite-pwa/nuxt`.

```ts
/**
 * Service Worker Composable
 *
 * Provides reactive access to service worker functionality.
 * Integrates with @vite-pwa/nuxt's $pwa plugin.
 */

import type {
  ClientToSWMessage,
  SWToClientMessage,
} from '~/types/service-worker'

export function useServiceWorker() {
  const nuxtApp = useNuxtApp()

  // Access PWA plugin (provided by @vite-pwa/nuxt)
  const pwa = computed(() => nuxtApp.$pwa)

  // Check if SW is available and activated
  const isSupported = computed(() => 'serviceWorker' in navigator)
  const isActivated = computed(() => pwa.value?.swActivated ?? false)
  const needRefresh = computed(() => pwa.value?.needRefresh ?? false)
  const offlineReady = computed(() => pwa.value?.offlineReady ?? false)

  /**
   * Get the service worker registration
   */
  function getRegistration(): ServiceWorkerRegistration | undefined {
    return pwa.value?.getSWRegistration?.()
  }

  /**
   * Send a message to the service worker
   */
  function postMessage(message: ClientToSWMessage): void {
    if (!isSupported.value) {
      console.warn('[useServiceWorker] Service worker not supported')
      return
    }
    navigator.serviceWorker.controller?.postMessage(message)
  }

  /**
   * Configure the service worker with wallet details
   */
  function configure(config: {
    chronikUrl: string
    scriptPayload: string
    scriptType: 'p2pkh' | 'p2tr-commitment'
    address: string
  }): void {
    postMessage({
      type: 'CONFIGURE',
      payload: config,
    })
  }

  /**
   * Start background monitoring
   */
  function startMonitoring(pollInterval?: number): void {
    postMessage({
      type: 'START_MONITORING',
      payload: { pollInterval },
    })
  }

  /**
   * Stop background monitoring
   */
  function stopMonitoring(): void {
    postMessage({ type: 'STOP_MONITORING' })
  }

  /**
   * Register a MuSig2 session for timeout monitoring
   */
  function registerSession(
    sessionId: string,
    expiresAt: number,
    warnBeforeMinutes?: number,
  ): void {
    postMessage({
      type: 'REGISTER_SESSION',
      payload: { sessionId, expiresAt, warnBeforeMinutes },
    })
  }

  /**
   * Unregister a session (completed or cancelled)
   */
  function unregisterSession(sessionId: string): void {
    postMessage({
      type: 'UNREGISTER_SESSION',
      payload: { sessionId },
    })
  }

  /**
   * Update presence configuration
   */
  function updatePresence(config: {
    walletAddress: string
    nickname?: string
    ttl: number
  }): void {
    postMessage({
      type: 'UPDATE_PRESENCE',
      payload: config,
    })
  }

  /**
   * Update service worker (when new version available)
   */
  async function updateServiceWorker(reloadPage = true): Promise<void> {
    await pwa.value?.updateServiceWorker(reloadPage)
  }

  /**
   * Close the update/offline prompt
   */
  async function closePrompt(): Promise<void> {
    await pwa.value?.cancelPrompt()
  }

  /**
   * Listen for service worker messages
   */
  function onMessage(
    type: SWToClientMessage['type'],
    handler: (payload: unknown) => void,
  ): void {
    const eventName = `sw-${type.toLowerCase().replace(/_/g, '-')}`

    const listener = (event: CustomEvent) => {
      handler(event.detail)
    }

    onMounted(() => {
      window.addEventListener(eventName, listener as EventListener)
    })

    onUnmounted(() => {
      window.removeEventListener(eventName, listener as EventListener)
    })
  }

  /**
   * Setup message listener from service worker
   * Call this once in app.vue or a layout
   */
  function setupMessageListener(): void {
    if (!isSupported.value) return

    navigator.serviceWorker.addEventListener('message', event => {
      const message = event.data as SWToClientMessage
      const eventName = `sw-${message.type.toLowerCase().replace(/_/g, '-')}`
      window.dispatchEvent(
        new CustomEvent(eventName, { detail: message.payload }),
      )
    })
  }

  return {
    // State
    isSupported,
    isActivated,
    needRefresh,
    offlineReady,
    // Methods
    getRegistration,
    postMessage,
    configure,
    startMonitoring,
    stopMonitoring,
    registerSession,
    unregisterSession,
    updatePresence,
    updateServiceWorker,
    closePrompt,
    onMessage,
    setupMessageListener,
  }
}
```

---

## 6. Setup Message Listener in App

### Update: `app.vue`

Setup the service worker message listener at app startup.

```vue
<script setup lang="ts">
const { setupMessageListener, isSupported } = useServiceWorker()

onMounted(() => {
  if (isSupported.value) {
    setupMessageListener()
  }
})
</script>
```

---

## 7. Integration with Wallet Store

### Update: `stores/wallet.ts`

Add service worker configuration when wallet initializes.

```ts
// In initializeChronik() method, after WebSocket connection:

// Configure service worker for background monitoring
if (typeof window !== 'undefined') {
  const { configure, startMonitoring, isSupported } = useServiceWorker()

  if (isSupported.value) {
    const networkStore = useNetworkStore()

    configure({
      chronikUrl: networkStore.config.chronikUrl,
      scriptPayload: this.scriptPayload,
      scriptType: this.getChronikScriptType(),
      address: this.address,
    })

    // Start background monitoring
    startMonitoring(30000) // 30 second polling
  }
}
```

---

## 8. Implementation Checklist

### Module Setup

- [ ] Install `@vite-pwa/nuxt` module
- [ ] Configure PWA options in `nuxt.config.ts`
- [ ] Update `tsconfig.json` with WebWorker lib
- [ ] Create `service-worker/` directory

### Service Worker

- [ ] Create `service-worker/sw.ts` with TypeScript
- [ ] Import workbox modules for precaching
- [ ] Implement message handlers with proper types
- [ ] Create `types/service-worker.ts` with message types

### Client Integration

- [ ] Create `composables/useServiceWorker.ts`
- [ ] Setup message listener in `app.vue`
- [ ] Configure SW from wallet store on initialization
- [ ] Handle SW update notifications via `$pwa`

### Message Passing

- [ ] Implement client → SW message handling
- [ ] Implement SW → client broadcasting
- [ ] Add custom event dispatching for SW messages
- [ ] Test message round-trip

### Testing

- [ ] Test SW registration in development (`devOptions.enabled: true`)
- [ ] Test SW registration in production build
- [ ] Test message passing between SW and client
- [ ] Test SW survives page refresh
- [ ] Test SW update flow with `needRefresh`

---

## Notes

- Service worker runs in a separate thread with no DOM access
- Use IndexedDB for persistent storage in SW (Phase 5)
- SW may be terminated when idle - don't rely on in-memory state
- Development requires HTTPS or localhost

---

## Next Phase

Once this phase is complete, proceed to [02_NETWORK_MONITOR.md](./02_NETWORK_MONITOR.md) for Chronik polling and transaction detection.
