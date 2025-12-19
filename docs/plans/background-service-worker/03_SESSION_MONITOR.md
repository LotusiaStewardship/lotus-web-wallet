# Phase 3: Session Monitor

## Overview

This phase implements session monitoring for MuSig2 signing sessions and P2P presence management. The service worker will track session timeouts and proactively warn users before sessions expire, even when the browser tab is inactive.

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Dependencies**: Phase 1 (Service Worker Foundation)

---

## Objectives

1. Monitor MuSig2 session timeouts and warn before expiry
2. Maintain P2P presence advertisements in the background
3. Track signing request deadlines
4. Provide session state recovery on tab reactivation

---

## Current State Analysis

### MuSig2 Session Timeouts

From `types/musig2.ts`:

- `SESSION_TIMEOUT` constant defines session expiry time
- Sessions have `createdAt` and computed `expiresAt` timestamps
- No proactive timeout warnings exist

### P2P Presence

From `services/p2p.ts`:

- `PRESENCE_TTL = 60 * 60 * 1000` (1 hour)
- Presence must be refreshed before TTL expires
- Currently only refreshes when tab is active

---

## 1. Enhanced Session Monitoring

### Update: `public/sw.js`

Expand session monitoring with detailed state tracking.

```js
// ============================================================================
// Session Monitoring Implementation
// ============================================================================

// Session state
const registeredSessions = new Map()
const signingRequests = new Map()

// Warning thresholds (in milliseconds)
const SESSION_WARN_THRESHOLDS = [
  { minutes: 10, notified: false },
  { minutes: 5, notified: false },
  { minutes: 2, notified: false },
  { minutes: 1, notified: false },
]

/**
 * Register a MuSig2 session for monitoring
 */
function handleRegisterSession(payload) {
  const {
    sessionId,
    expiresAt,
    warnBeforeMinutes = 5,
    sessionType = 'signing',
    metadata = {},
  } = payload

  // Create warning thresholds for this session
  const warnings = SESSION_WARN_THRESHOLDS.map(t => ({
    ...t,
    warnAt: expiresAt - t.minutes * 60 * 1000,
  }))

  registeredSessions.set(sessionId, {
    sessionId,
    expiresAt,
    sessionType,
    metadata,
    warnings,
    registeredAt: Date.now(),
  })

  console.log(
    `[SW] Session registered: ${sessionId} (expires: ${new Date(
      expiresAt,
    ).toISOString()})`,
  )

  // Ensure session monitor is running
  startSessionMonitor()
}

/**
 * Unregister a session (completed, cancelled, or expired)
 */
function handleUnregisterSession(payload) {
  const { sessionId, reason = 'unregistered' } = payload
  registeredSessions.delete(sessionId)
  console.log(`[SW] Session unregistered: ${sessionId} (${reason})`)
}

/**
 * Register an incoming signing request
 */
function handleRegisterSigningRequest(payload) {
  const {
    requestId,
    sessionId,
    fromPeerId,
    fromNickname,
    expiresAt,
    amount,
    purpose,
  } = payload

  signingRequests.set(requestId, {
    requestId,
    sessionId,
    fromPeerId,
    fromNickname,
    expiresAt,
    amount,
    purpose,
    notifiedAt: Date.now(),
  })

  // Show immediate notification for new signing request
  showNotification('Signing Request', {
    body: fromNickname
      ? `${fromNickname} is requesting your signature`
      : 'New signing request received',
    tag: `request-${requestId}`,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      url: '/people/p2p',
      requestId,
      sessionId,
    },
  })

  console.log(`[SW] Signing request registered: ${requestId}`)
}

/**
 * Session monitor interval
 */
let sessionMonitorInterval = null
const SESSION_CHECK_INTERVAL = 10000 // 10 seconds

function startSessionMonitor() {
  if (sessionMonitorInterval) return

  sessionMonitorInterval = setInterval(() => {
    checkSessions()
    checkSigningRequests()
  }, SESSION_CHECK_INTERVAL)

  console.log('[SW] Session monitor started')
}

function stopSessionMonitor() {
  if (sessionMonitorInterval) {
    clearInterval(sessionMonitorInterval)
    sessionMonitorInterval = null
    console.log('[SW] Session monitor stopped')
  }
}

/**
 * Check all registered sessions for warnings/expiry
 */
function checkSessions() {
  const now = Date.now()

  for (const [sessionId, session] of registeredSessions) {
    // Check if session expired
    if (now >= session.expiresAt) {
      registeredSessions.delete(sessionId)

      broadcastToClients({
        type: 'SESSION_EXPIRED',
        payload: {
          sessionId,
          sessionType: session.sessionType,
        },
      })

      showNotification('Session Expired', {
        body: 'A signing session has expired',
        tag: `session-expired-${sessionId}`,
        data: { url: '/people/p2p', sessionId },
      })

      continue
    }

    // Check warning thresholds
    for (const warning of session.warnings) {
      if (!warning.notified && now >= warning.warnAt) {
        warning.notified = true
        const minutesRemaining = warning.minutes

        broadcastToClients({
          type: 'SESSION_EXPIRING',
          payload: {
            sessionId,
            expiresAt: session.expiresAt,
            minutesRemaining,
            sessionType: session.sessionType,
          },
        })

        // Only show notification for significant warnings (5 min, 2 min, 1 min)
        if (minutesRemaining <= 5) {
          showNotification('Session Expiring Soon', {
            body: `Signing session expires in ${minutesRemaining} minute${
              minutesRemaining > 1 ? 's' : ''
            }`,
            tag: `session-warning-${sessionId}`,
            requireInteraction: minutesRemaining <= 2,
            data: { url: '/people/p2p', sessionId },
          })
        }
      }
    }
  }

  // Stop monitor if no sessions
  if (registeredSessions.size === 0 && signingRequests.size === 0) {
    stopSessionMonitor()
  }
}

/**
 * Check signing requests for expiry
 */
function checkSigningRequests() {
  const now = Date.now()

  for (const [requestId, request] of signingRequests) {
    if (now >= request.expiresAt) {
      signingRequests.delete(requestId)

      broadcastToClients({
        type: 'SIGNING_REQUEST_EXPIRED',
        payload: {
          requestId,
          sessionId: request.sessionId,
        },
      })
    }
  }
}
```

---

## 2. P2P Presence Management

### Update: `public/sw.js`

Add presence refresh logic.

```js
// ============================================================================
// P2P Presence Management
// ============================================================================

let presenceConfig = null
let presenceInterval = null
let lastPresenceRefresh = 0

/**
 * Configure presence for background refresh
 */
function handleUpdatePresence(payload) {
  const { walletAddress, nickname, avatar, ttl, peerId } = payload

  presenceConfig = {
    walletAddress,
    nickname,
    avatar,
    ttl,
    peerId,
    refreshInterval: Math.floor(ttl * 0.4), // Refresh at 40% of TTL
  }

  // Clear existing interval
  if (presenceInterval) {
    clearInterval(presenceInterval)
  }

  // Start presence refresh
  presenceInterval = setInterval(() => {
    refreshPresence()
  }, presenceConfig.refreshInterval)

  // Immediate refresh
  refreshPresence()

  console.log(
    `[SW] Presence configured (refresh every ${
      presenceConfig.refreshInterval / 1000
    }s)`,
  )
}

/**
 * Stop presence management
 */
function handleStopPresence() {
  if (presenceInterval) {
    clearInterval(presenceInterval)
    presenceInterval = null
  }
  presenceConfig = null
  console.log('[SW] Presence management stopped')
}

/**
 * Refresh presence advertisement
 * Note: This is a simplified implementation. Full implementation would
 * require the P2P coordinator to be running in the service worker,
 * which is complex due to libp2p's architecture.
 *
 * Alternative approach: Signal the client to refresh presence.
 */
async function refreshPresence() {
  if (!presenceConfig) return

  const now = Date.now()

  // Check if any clients are available
  const clients = await self.clients.matchAll({ type: 'window' })

  if (clients.length > 0) {
    // Signal client to refresh presence
    broadcastToClients({
      type: 'PRESENCE_REFRESH_NEEDED',
      payload: {
        walletAddress: presenceConfig.walletAddress,
        lastRefresh: lastPresenceRefresh,
      },
    })
  } else {
    // No clients - presence will naturally expire
    // This is acceptable as user is not actively using the wallet
    console.log('[SW] No clients available for presence refresh')
  }

  lastPresenceRefresh = now

  broadcastToClients({
    type: 'PRESENCE_REFRESHED',
    payload: {
      success: clients.length > 0,
      nextRefreshAt: now + presenceConfig.refreshInterval,
    },
  })
}
```

---

## 3. Message Types

### Update: `types/service-worker.ts`

Add new message types for session and presence management.

```ts
// ============================================================================
// Additional Client → Service Worker Messages
// ============================================================================

export interface SWRegisterSigningRequestMessage {
  type: 'REGISTER_SIGNING_REQUEST'
  payload: {
    requestId: string
    sessionId: string
    fromPeerId: string
    fromNickname?: string
    expiresAt: number
    amount?: string
    purpose?: string
  }
}

export interface SWUnregisterSigningRequestMessage {
  type: 'UNREGISTER_SIGNING_REQUEST'
  payload: {
    requestId: string
    reason?: 'accepted' | 'rejected' | 'expired' | 'cancelled'
  }
}

export interface SWStopPresenceMessage {
  type: 'STOP_PRESENCE'
}

// ============================================================================
// Additional Service Worker → Client Messages
// ============================================================================

export interface SWSessionExpiredMessage {
  type: 'SESSION_EXPIRED'
  payload: {
    sessionId: string
    sessionType: string
  }
}

export interface SWSigningRequestExpiredMessage {
  type: 'SIGNING_REQUEST_EXPIRED'
  payload: {
    requestId: string
    sessionId: string
  }
}

export interface SWPresenceRefreshNeededMessage {
  type: 'PRESENCE_REFRESH_NEEDED'
  payload: {
    walletAddress: string
    lastRefresh: number
  }
}

// Update unions
export type ClientToSWMessage =
  | SWConfigureMessage
  | SWStartMonitoringMessage
  | SWStopMonitoringMessage
  | SWRegisterSessionMessage
  | SWUnregisterSessionMessage
  | SWUpdatePresenceMessage
  | SWStopPresenceMessage
  | SWTrackTransactionMessage
  | SWUntrackTransactionMessage
  | SWRegisterSigningRequestMessage
  | SWUnregisterSigningRequestMessage

export type SWToClientMessage =
  | SWTransactionDetectedMessage
  | SWSessionExpiringMessage
  | SWSessionExpiredMessage
  | SWBalanceUpdatedMessage
  | SWNotificationClickMessage
  | SWPresenceRefreshedMessage
  | SWPresenceRefreshNeededMessage
  | SWTransactionConfirmedMessage
  | SWSigningRequestExpiredMessage
  | SWErrorMessage
```

---

## 4. Integration with MuSig2 Store

### Update: `stores/musig2.ts`

Register sessions with service worker.

```ts
// In initialize() action, after service initialization:

// Listen for SW session events
if (typeof window !== 'undefined') {
  window.addEventListener('sw-session-expiring', ((event: CustomEvent) => {
    const { sessionId, minutesRemaining } = event.detail

    // Update session state
    const session = this.activeSessions.find(s => s.id === sessionId)
    if (session) {
      // Could add an 'expiring' flag to session state
      console.log(
        `[MuSig2 Store] Session ${sessionId} expiring in ${minutesRemaining} minutes`,
      )
    }

    // Add notification
    const notificationStore = useNotificationStore()
    notificationStore.addNotification({
      type: 'signing_request',
      title: 'Session Expiring',
      message: `Signing session expires in ${minutesRemaining} minute${
        minutesRemaining > 1 ? 's' : ''
      }`,
      actionUrl: '/people/p2p',
      actionLabel: 'View Session',
      data: { sessionId },
    })
  }) as EventListener)

  window.addEventListener('sw-session-expired', ((event: CustomEvent) => {
    const { sessionId } = event.detail
    // Remove expired session from state
    this._syncSessionsFromService()
  }) as EventListener)
}

// When creating a session, register with SW:
async function createSession(/* params */) {
  // ... existing session creation ...

  const session = getSession(sessionId)
  if (session && typeof window !== 'undefined') {
    const { registerSession } = useServiceWorker()
    registerSession(sessionId, session.expiresAt, 5) // Warn 5 min before
  }

  return sessionId
}

// When session completes or is aborted, unregister:
async function abortSession(sessionId: string, reason: string) {
  await serviceAbortSession(sessionId, reason)

  if (typeof window !== 'undefined') {
    const { unregisterSession } = useServiceWorker()
    unregisterSession(sessionId)
  }

  this._syncSessionsFromService()
}
```

---

## 5. Integration with P2P Store

### Update: `stores/p2p.ts`

Configure presence management with service worker.

```ts
// In advertisePresence() action:

async advertisePresence(config: PresenceConfig) {
  if (!isP2PInitialized() || !this.initialized) {
    throw new Error('P2P not initialized')
  }

  // Delegate to service
  await startPresenceAdvertising(config)

  this.myPresenceConfig = config
  this._savePresenceConfig(config)

  // Configure SW for background presence refresh
  if (typeof window !== 'undefined') {
    const { updatePresence } = useServiceWorker()
    updatePresence({
      walletAddress: config.walletAddress,
      nickname: config.nickname,
      ttl: PRESENCE_TTL,
    })
  }
}

// In withdrawPresence() action:

async withdrawPresence() {
  if (isP2PInitialized() && this.myPresenceConfig) {
    await stopPresenceAdvertising()
  }
  this.myPresenceConfig = null
  this._savePresenceConfig(null)

  // Stop SW presence management
  if (typeof window !== 'undefined') {
    const { postMessage } = useServiceWorker()
    postMessage({ type: 'STOP_PRESENCE' })
  }
}

// Listen for presence refresh requests from SW:
// In initialize():

if (typeof window !== 'undefined') {
  window.addEventListener('sw-presence-refresh-needed', (async (event: CustomEvent) => {
    // Re-advertise presence if we have config
    if (this.myPresenceConfig && isP2PInitialized()) {
      await startPresenceAdvertising(this.myPresenceConfig)
      console.log('[P2P Store] Presence refreshed via SW request')
    }
  }) as EventListener)
}
```

---

## 6. Update Composable

### Update: `composables/useServiceWorker.ts`

Add session and presence methods.

```ts
/**
 * Register a signing request for monitoring
 */
function registerSigningRequest(request: {
  requestId: string
  sessionId: string
  fromPeerId: string
  fromNickname?: string
  expiresAt: number
  amount?: string
  purpose?: string
}) {
  postMessage({
    type: 'REGISTER_SIGNING_REQUEST',
    payload: request,
  })
}

/**
 * Unregister a signing request
 */
function unregisterSigningRequest(
  requestId: string,
  reason?: 'accepted' | 'rejected' | 'expired' | 'cancelled',
) {
  postMessage({
    type: 'UNREGISTER_SIGNING_REQUEST',
    payload: { requestId, reason },
  })
}

/**
 * Stop presence management
 */
function stopPresence() {
  postMessage({ type: 'STOP_PRESENCE' })
}

// Add to return object
return {
  // ... existing
  registerSigningRequest,
  unregisterSigningRequest,
  stopPresence,
}
```

---

## 7. Implementation Checklist

### Service Worker Updates

- [ ] Implement enhanced session monitoring with multiple warning thresholds
- [ ] Implement signing request tracking
- [ ] Implement presence refresh signaling
- [ ] Add `SESSION_EXPIRED` message broadcasting
- [ ] Add `SIGNING_REQUEST_EXPIRED` message broadcasting
- [ ] Add `PRESENCE_REFRESH_NEEDED` message broadcasting

### Message Types

- [ ] Add `REGISTER_SIGNING_REQUEST` message type
- [ ] Add `UNREGISTER_SIGNING_REQUEST` message type
- [ ] Add `STOP_PRESENCE` message type
- [ ] Add `SESSION_EXPIRED` message type
- [ ] Add `SIGNING_REQUEST_EXPIRED` message type
- [ ] Add `PRESENCE_REFRESH_NEEDED` message type

### Store Integration

- [ ] Register MuSig2 sessions with SW on creation
- [ ] Unregister sessions on completion/abort
- [ ] Handle session expiring/expired events
- [ ] Configure presence with SW on advertise
- [ ] Handle presence refresh requests from SW

### Composable Updates

- [ ] Add `registerSigningRequest()` method
- [ ] Add `unregisterSigningRequest()` method
- [ ] Add `stopPresence()` method

### Testing

- [ ] Test session warning at 5 minutes before expiry
- [ ] Test session warning at 2 minutes before expiry
- [ ] Test session expired notification
- [ ] Test signing request notification
- [ ] Test presence refresh signaling
- [ ] Test with tab in background for extended period

---

## Notes

- Full P2P presence refresh from SW would require running libp2p in the service worker, which is complex
- Current approach signals the client to refresh, which works when at least one tab is open
- If all tabs are closed, presence will naturally expire (acceptable behavior)
- Session monitoring is fully functional in SW without client dependency

---

## Relationship to Other Plans

### unified-p2p-musig2-ui/04_SIGNING_FLOW.md

This phase directly enables reliable signing flow by:

- Warning users before sessions expire
- Notifying of incoming signing requests even when tab is backgrounded
- Ensuring users don't miss time-sensitive signing opportunities

---

## Next Phase

Once this phase is complete, proceed to [04_PUSH_NOTIFICATIONS.md](./04_PUSH_NOTIFICATIONS.md) for enhanced browser notification support.
