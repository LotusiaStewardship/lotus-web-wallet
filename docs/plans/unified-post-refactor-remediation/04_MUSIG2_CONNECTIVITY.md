# Phase 4: MuSig2 Session Connectivity

**Priority**: P0  
**Effort**: 1-2 days  
**Dependencies**: Phase 3 (Wallet Connectivity Layer)

---

## Overview

This phase ensures MuSig2 signing sessions can establish connections to all participants before attempting nonce and signature exchange. Without direct P2P connectivity, shared wallet transactions cannot be signed.

---

## Problem Statement

### MuSig2 Protocol Requirements

MuSig2 multi-signature transactions require:

1. **Real-time coordination** between N participants
2. **Nonce exchange** (Round 1) - each signer shares their public nonce
3. **Partial signature exchange** (Round 2) - each signer shares their partial signature
4. **Session state synchronization** - all participants must be in sync

### Current Issue

Sessions are initiated without verifying connectivity to participants. This causes:

- Nonce exchange timeouts
- Partial signature exchange failures
- Confusing error messages for users

---

## Implementation

### Task 4.1: Connect to All Participants Before Nonce Exchange

**File**: `services/musig2.ts`

```typescript
/**
 * Ensure all session participants are connected before proceeding
 *
 * @param participantPeerIds - Array of participant peer IDs
 * @returns Connection results for each participant
 */
export async function ensureParticipantsConnected(
  participantPeerIds: string[],
): Promise<{
  allConnected: boolean
  results: Map<
    string,
    {
      connected: boolean
      connectionType?: 'webrtc' | 'relay' | 'direct'
      error?: string
    }
  >
}> {
  const { connectWithRetry } = await import('~/services/p2p')
  const p2pStore = useP2PStore()

  const results = new Map<
    string,
    {
      connected: boolean
      connectionType?: 'webrtc' | 'relay' | 'direct'
      error?: string
    }
  >()

  let allConnected = true

  for (const peerId of participantPeerIds) {
    // Skip self
    if (peerId === p2pStore.peerId) {
      results.set(peerId, { connected: true, connectionType: 'direct' })
      continue
    }

    // Find peer in online peers
    const presence = p2pStore.onlinePeers.find(p => p.peerId === peerId)

    if (!presence) {
      results.set(peerId, { connected: false, error: 'Peer not discovered' })
      allConnected = false
      continue
    }

    // Check if already connected
    if (presence.connectionStatus === 'connected') {
      results.set(peerId, {
        connected: true,
        connectionType: presence.connectionType,
      })
      continue
    }

    // Attempt connection
    console.log(`[MuSig2] Connecting to participant ${peerId}...`)
    const result = await connectWithRetry(presence, {
      maxRetries: 3,
      initialDelayMs: 1000,
    })

    if (result.success) {
      results.set(peerId, {
        connected: true,
        connectionType: result.connectionType,
      })
    } else {
      results.set(peerId, {
        connected: false,
        error: result.error,
      })
      allConnected = false
    }
  }

  return { allConnected, results }
}

/**
 * Pre-flight check before starting a signing session
 */
export async function preflightSigningSession(
  sharedWallet: SharedWallet,
): Promise<{
  ready: boolean
  connectedCount: number
  totalParticipants: number
  disconnectedParticipants: string[]
  error?: string
}> {
  const participantPeerIds = sharedWallet.participants
    .map(p => p.peerId)
    .filter((id): id is string => !!id)

  if (participantPeerIds.length === 0) {
    return {
      ready: false,
      connectedCount: 0,
      totalParticipants: sharedWallet.participants.length,
      disconnectedParticipants: [],
      error: 'No participants have peer IDs',
    }
  }

  const { allConnected, results } = await ensureParticipantsConnected(
    participantPeerIds,
  )

  const disconnectedParticipants: string[] = []
  let connectedCount = 0

  for (const [peerId, result] of results) {
    if (result.connected) {
      connectedCount++
    } else {
      // Find participant name for better error message
      const participant = sharedWallet.participants.find(
        p => p.peerId === peerId,
      )
      disconnectedParticipants.push(participant?.nickname || peerId.slice(0, 8))
    }
  }

  return {
    ready: allConnected,
    connectedCount,
    totalParticipants: participantPeerIds.length,
    disconnectedParticipants,
    error: allConnected
      ? undefined
      : `Cannot reach: ${disconnectedParticipants.join(', ')}`,
  }
}
```

---

### Task 4.2: Verify Connectivity Before Announcing Session

**File**: `services/musig2.ts`

Update the session initiation flow:

```typescript
/**
 * Initiate a MuSig2 signing session with connectivity check
 */
export async function initiateSigningSession(
  sharedWallet: SharedWallet,
  transaction: Transaction,
  options: {
    skipConnectivityCheck?: boolean
  } = {},
): Promise<{
  success: boolean
  sessionId?: string
  error?: string
}> {
  // Step 1: Verify connectivity (unless skipped)
  if (!options.skipConnectivityCheck) {
    console.log('[MuSig2] Running pre-flight connectivity check...')

    const preflight = await preflightSigningSession(sharedWallet)

    if (!preflight.ready) {
      console.warn('[MuSig2] Pre-flight failed:', preflight.error)
      return {
        success: false,
        error: preflight.error,
      }
    }

    console.log(
      `[MuSig2] All ${preflight.connectedCount} participants connected`,
    )
  }

  // Step 2: Create and announce session
  try {
    const coordinator = getMuSig2Coordinator()
    if (!coordinator) {
      return { success: false, error: 'MuSig2 coordinator not initialized' }
    }

    const sessionId = await coordinator.createSession({
      sharedWalletId: sharedWallet.id,
      transaction,
      participants: sharedWallet.participants.map(p => p.publicKeyHex),
    })

    console.log(`[MuSig2] Session created: ${sessionId}`)

    return { success: true, sessionId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[MuSig2] Failed to create session:', error)
    return { success: false, error: errorMsg }
  }
}
```

---

### Task 4.3: Handle Participant Connection Failures

**File**: `services/musig2.ts`

```typescript
/**
 * Handle connection failure during active session
 */
export async function handleSessionConnectionFailure(
  sessionId: string,
  failedPeerId: string,
): Promise<void> {
  const musig2Store = useMuSig2Store()

  // Update session state
  musig2Store.updateSessionParticipantStatus(
    sessionId,
    failedPeerId,
    'disconnected',
  )

  // Attempt reconnection
  const p2pStore = useP2PStore()
  const presence = p2pStore.onlinePeers.find(p => p.peerId === failedPeerId)

  if (presence) {
    console.log(`[MuSig2] Attempting to reconnect to ${failedPeerId}...`)

    const { connectWithRetry } = await import('~/services/p2p')
    const result = await connectWithRetry(presence, { maxRetries: 2 })

    if (result.success) {
      musig2Store.updateSessionParticipantStatus(
        sessionId,
        failedPeerId,
        'connected',
      )
      console.log(`[MuSig2] Reconnected to ${failedPeerId}`)
    } else {
      console.warn(`[MuSig2] Failed to reconnect to ${failedPeerId}`)
      // Session may need to be aborted or paused
    }
  }
}

/**
 * Monitor session participant connections
 */
export function monitorSessionConnections(sessionId: string): () => void {
  const p2pStore = useP2PStore()
  const musig2Store = useMuSig2Store()

  const session = musig2Store.getSession(sessionId)
  if (!session) return () => {}

  // Watch for connection changes
  const unwatch = watch(
    () =>
      p2pStore.onlinePeers.map(p => ({
        peerId: p.peerId,
        status: p.connectionStatus,
      })),
    peers => {
      for (const participant of session.participants) {
        const peer = peers.find(p => p.peerId === participant.peerId)

        if (peer?.status === 'failed' || !peer) {
          handleSessionConnectionFailure(sessionId, participant.peerId)
        }
      }
    },
    { deep: true },
  )

  return unwatch
}
```

---

### Task 4.4: Add Participant Connection Status to Store

**File**: `stores/musig2.ts`

```typescript
/**
 * Update participant connection status in a session
 */
updateSessionParticipantStatus(
  sessionId: string,
  peerId: string,
  status: 'connected' | 'disconnected' | 'connecting'
): void {
  const session = this.activeSessions.get(sessionId)
  if (!session) return

  const participant = session.participants.find(p => p.peerId === peerId)
  if (participant) {
    participant.connectionStatus = status
  }
}

/**
 * Get session with participant connection info
 */
getSessionWithConnectivity(sessionId: string): SessionWithConnectivity | null {
  const session = this.activeSessions.get(sessionId)
  if (!session) return null

  const p2pStore = useP2PStore()

  const participantsWithConnectivity = session.participants.map(p => {
    const peer = p2pStore.onlinePeers.find(op => op.peerId === p.peerId)
    return {
      ...p,
      connectionStatus: peer?.connectionStatus || 'disconnected',
      connectionType: peer?.connectionType,
    }
  })

  return {
    ...session,
    participants: participantsWithConnectivity,
    allConnected: participantsWithConnectivity.every(
      p => p.connectionStatus === 'connected' || p.peerId === p2pStore.peerId
    ),
  }
}
```

---

### Task 4.5: Show Connection Status on Participant List

**File**: `components/shared-wallets/ParticipantList.vue`

Update to show connection status:

```vue
<script setup lang="ts">
// ... existing imports ...

const p2pStore = useP2PStore()

// Get connection status for a participant
function getConnectionStatus(participant: SharedWalletParticipant): {
  status: 'connected' | 'disconnected' | 'connecting' | 'unknown'
  type?: 'webrtc' | 'relay' | 'direct'
} {
  // Self is always "connected"
  if (
    participant.publicKeyHex ===
    walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)
  ) {
    return { status: 'connected', type: 'direct' }
  }

  const peer = p2pStore.onlinePeers.find(p => p.peerId === participant.peerId)

  if (!peer) {
    return { status: 'unknown' }
  }

  return {
    status: peer.connectionStatus || 'disconnected',
    type: peer.connectionType,
  }
}

// Connect to a specific participant
async function connectToParticipant(participant: SharedWalletParticipant) {
  if (!participant.peerId) return

  await p2pStore.connectToOnlinePeer(participant.peerId)
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="participant in participants"
      :key="participant.publicKeyHex"
      class="flex items-center gap-3 p-3 rounded-lg border"
    >
      <!-- Avatar -->
      <CommonAvatar :name="participant.nickname" :size="40" />

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <p class="font-medium">{{ participant.nickname || 'Anonymous' }}</p>
        <p class="text-sm text-muted truncate">
          {{ formatAddress(participant.address) }}
        </p>
      </div>

      <!-- Connection Status -->
      <div class="flex items-center gap-2">
        <UBadge
          :color="
            getConnectionStatusColor(getConnectionStatus(participant).status)
          "
          variant="subtle"
          size="xs"
        >
          {{ getConnectionStatusLabel(getConnectionStatus(participant)) }}
        </UBadge>

        <!-- Connect button if disconnected -->
        <UButton
          v-if="
            getConnectionStatus(participant).status === 'disconnected' &&
            participant.peerId
          "
          size="xs"
          color="primary"
          variant="ghost"
          icon="i-lucide-plug"
          :loading="getConnectionStatus(participant).status === 'connecting'"
          @click="connectToParticipant(participant)"
        >
          Connect
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function getConnectionStatusColor(status: string): string {
  switch (status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'disconnected':
      return 'error'
    default:
      return 'neutral'
  }
}

function getConnectionStatusLabel(conn: {
  status: string
  type?: string
}): string {
  if (conn.status === 'connected') {
    return conn.type === 'webrtc'
      ? 'WebRTC'
      : conn.type === 'relay'
      ? 'Relay'
      : 'Connected'
  }
  if (conn.status === 'connecting') return 'Connecting...'
  if (conn.status === 'disconnected') return 'Offline'
  return 'Unknown'
}
</script>
```

---

## Testing Checklist

### Pre-flight Connectivity Check

1. Create shared wallet with 2 participants
2. Ensure both wallets are online
3. Initiate signing session
4. Verify pre-flight check runs
5. Verify session only starts if all connected

### Connection Failure Handling

1. Start signing session with 2 participants
2. Disconnect one participant (close browser)
3. Verify session detects disconnection
4. Verify reconnection attempt
5. Verify UI shows disconnected status

### Participant Connection Status UI

1. View shared wallet participants tab
2. Verify connection status badges shown
3. Click "Connect" on disconnected participant
4. Verify connection established
5. Verify badge updates to "Connected"

---

## Files Summary

| File                                            | Change                         | Lines Changed |
| ----------------------------------------------- | ------------------------------ | ------------- |
| `services/musig2.ts`                            | Add connectivity functions     | ~150 lines    |
| `stores/musig2.ts`                              | Add session connectivity state | ~40 lines     |
| `components/shared-wallets/ParticipantList.vue` | Add connection status UI       | ~50 lines     |

---

## Success Criteria

- [ ] Pre-flight check verifies all participants connected
- [ ] Session fails gracefully if participants unreachable
- [ ] Connection failures during session are detected
- [ ] Reconnection attempts are made automatically
- [ ] UI shows participant connection status
- [ ] MuSig2 nonce exchange succeeds between connected wallets
- [ ] Complete signing session works end-to-end

---

_Phase 4 of Post-Refactor Remediation Plan_
