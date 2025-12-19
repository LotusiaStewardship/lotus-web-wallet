# MuSig2 Session Participant Connectivity

## Overview

This document details the changes required to ensure MuSig2 signing sessions can establish connections to all participants before proceeding with the signing protocol.

---

## Current State

### MuSig2 Service (services/musig2.ts)

```typescript
// Current: Creates session without verifying connectivity
async function createSigningSession(
  signerPublicKeys: PublicKey[],
  myPrivateKey: PrivateKey,
  message: Buffer,
  metadata?: SessionMetadata,
): Promise<string> {
  // ... creates session but doesn't check if participants are reachable
}
```

### MuSig2 Store (stores/musig2.ts)

```typescript
// Current: Proposes spend without ensuring participants are connected
async proposeSpend(params: SpendProposalParams) {
  // ... builds transaction and creates session
  // No connectivity verification
}
```

---

## Problem Analysis

### Why Sessions Fail

1. **Session announced via GossipSub** - Other participants receive the announcement
2. **Participants try to join** - But cannot establish direct connection
3. **Nonce exchange fails** - Messages don't reach all participants
4. **Session times out** - No signatures collected

### Required Flow

```
1. Initiator identifies all participants (from shared wallet)
2. Initiator connects to each participant via WebRTC/relay
3. Initiator verifies all connections are established
4. Initiator creates and announces session
5. Participants (already connected) join session
6. Nonce exchange proceeds over established connections
7. Partial signature exchange proceeds
8. Session completes successfully
```

---

## Implementation

### Task 4.1: Connect to All Participants Before Nonce Exchange

**File**: `services/musig2.ts`

```typescript
import {
  connectToDiscoveredPeer,
  getCachedRelayAddress,
  getConnectionType,
} from './p2p'

/**
 * Ensure all session participants are connected before proceeding
 *
 * @param participantPeerIds - Array of participant peer IDs
 * @param excludeSelf - Whether to exclude our own peer ID
 * @returns Connection status for each participant
 */
export async function ensureSessionParticipantsConnected(
  participantPeerIds: string[],
  excludeSelf: boolean = true,
): Promise<{
  allConnected: boolean
  connected: string[]
  failed: Array<{ peerId: string; error: string }>
}> {
  if (!coordinator) {
    return {
      allConnected: false,
      connected: [],
      failed: participantPeerIds.map(id => ({
        peerId: id,
        error: 'P2P not initialized',
      })),
    }
  }

  const ourPeerId = coordinator.peerId
  const connected: string[] = []
  const failed: Array<{ peerId: string; error: string }> = []

  // Filter participants
  const targetPeers = excludeSelf
    ? participantPeerIds.filter(id => id !== ourPeerId)
    : participantPeerIds

  console.log(
    `[MuSig2 Service] Ensuring ${targetPeers.length} participants are connected...`,
  )

  for (const peerId of targetPeers) {
    // Check if already connected
    const existingConnType = getConnectionType(peerId)
    if (existingConnType !== 'none') {
      console.log(
        `[MuSig2 Service] ✅ ${peerId.slice(
          0,
          12,
        )}... already connected via ${existingConnType}`,
      )
      connected.push(peerId)
      continue
    }

    // Try to connect
    console.log(`[MuSig2 Service] Connecting to ${peerId.slice(0, 12)}...`)

    // Build presence-like object for connection
    const cachedRelay = getCachedRelayAddress(peerId)
    const presence = {
      peerId,
      multiaddrs: [],
      relayAddrs: cachedRelay ? [cachedRelay] : [],
      webrtcAddr: null,
    }

    try {
      const result = await connectToDiscoveredPeer(presence as any)

      if (result.success) {
        console.log(
          `[MuSig2 Service] ✅ Connected to ${peerId.slice(0, 12)}... via ${
            result.connectionType
          }`,
        )
        connected.push(peerId)
      } else {
        console.error(
          `[MuSig2 Service] ❌ Failed to connect to ${peerId.slice(
            0,
            12,
          )}...: ${result.error}`,
        )
        failed.push({ peerId, error: result.error || 'Connection failed' })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `[MuSig2 Service] ❌ Error connecting to ${peerId.slice(0, 12)}...:`,
        error,
      )
      failed.push({ peerId, error: errorMsg })
    }
  }

  const allConnected = failed.length === 0

  console.log(
    `[MuSig2 Service] Connection result: ${connected.length} connected, ${failed.length} failed`,
  )

  return { allConnected, connected, failed }
}
```

### Task 4.2: Verify Connectivity Before Announcing Session

**File**: `services/musig2.ts`

Update `createSigningSession()`:

```typescript
/**
 * Create a signing session with connectivity verification
 *
 * @param signerPublicKeys - Public keys of all signers
 * @param myPrivateKey - Our private key
 * @param message - Message to sign (transaction hash)
 * @param metadata - Optional session metadata
 * @param participantPeerIds - Optional peer IDs for connectivity check
 * @returns Session ID or error
 */
export async function createSigningSession(
  signerPublicKeys: PublicKey[],
  myPrivateKey: PrivateKey,
  message: Buffer,
  metadata?: SessionMetadata,
  participantPeerIds?: string[],
): Promise<{
  sessionId: string | null
  error?: string
  connectivityIssues?: Array<{ peerId: string; error: string }>
}> {
  if (!musig2Coordinator) {
    return { sessionId: null, error: 'MuSig2 not initialized' }
  }

  // If participant peer IDs provided, verify connectivity first
  if (participantPeerIds && participantPeerIds.length > 0) {
    console.log(
      '[MuSig2 Service] Verifying participant connectivity before session creation...',
    )

    const { allConnected, failed } = await ensureSessionParticipantsConnected(
      participantPeerIds,
      true, // exclude self
    )

    if (!allConnected) {
      console.error(
        '[MuSig2 Service] Cannot create session - not all participants connected',
      )
      return {
        sessionId: null,
        error: `Cannot reach ${failed.length} participant(s)`,
        connectivityIssues: failed,
      }
    }

    console.log(
      '[MuSig2 Service] All participants connected, proceeding with session creation',
    )
  }

  try {
    const sessionId = await musig2Coordinator.createSession(
      signerPublicKeys,
      myPrivateKey,
      message,
      metadata,
    )

    console.log(`[MuSig2 Service] Created session: ${sessionId}`)

    return { sessionId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[MuSig2 Service] Failed to create session:', error)
    return { sessionId: null, error: errorMsg }
  }
}
```

### Task 4.3: Handle Participant Connection Failures Gracefully

**File**: `services/musig2.ts`

```typescript
/**
 * Session creation options with connectivity handling
 */
export interface CreateSessionOptions {
  /** Public keys of all signers */
  signerPublicKeys: PublicKey[]
  /** Our private key */
  myPrivateKey: PrivateKey
  /** Message to sign */
  message: Buffer
  /** Session metadata */
  metadata?: SessionMetadata
  /** Participant peer IDs for connectivity check */
  participantPeerIds?: string[]
  /** Whether to proceed even if some participants are unreachable */
  allowPartialConnectivity?: boolean
  /** Minimum number of connected participants required */
  minConnectedParticipants?: number
  /** Timeout for connectivity check (ms) */
  connectivityTimeoutMs?: number
}

/**
 * Create a signing session with advanced connectivity options
 */
export async function createSigningSessionWithOptions(
  options: CreateSessionOptions,
): Promise<{
  sessionId: string | null
  error?: string
  connectivityIssues?: Array<{ peerId: string; error: string }>
  connectedParticipants?: string[]
}> {
  const {
    signerPublicKeys,
    myPrivateKey,
    message,
    metadata,
    participantPeerIds,
    allowPartialConnectivity = false,
    minConnectedParticipants,
    connectivityTimeoutMs = 30000,
  } = options

  if (!musig2Coordinator) {
    return { sessionId: null, error: 'MuSig2 not initialized' }
  }

  // Connectivity check with timeout
  if (participantPeerIds && participantPeerIds.length > 0) {
    const connectivityPromise = ensureSessionParticipantsConnected(
      participantPeerIds,
      true,
    )

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Connectivity check timeout')),
        connectivityTimeoutMs,
      )
    })

    let connectivityResult: Awaited<
      ReturnType<typeof ensureSessionParticipantsConnected>
    >

    try {
      connectivityResult = await Promise.race([
        connectivityPromise,
        timeoutPromise,
      ])
    } catch (error) {
      return {
        sessionId: null,
        error: 'Connectivity check timed out',
        connectivityIssues: participantPeerIds.map(id => ({
          peerId: id,
          error: 'Timeout',
        })),
      }
    }

    const { allConnected, connected, failed } = connectivityResult

    // Check if we have enough participants
    const requiredParticipants =
      minConnectedParticipants ?? participantPeerIds.length
    const haveEnough = connected.length >= requiredParticipants

    if (!allConnected && !allowPartialConnectivity) {
      return {
        sessionId: null,
        error: `Cannot reach ${failed.length} participant(s)`,
        connectivityIssues: failed,
        connectedParticipants: connected,
      }
    }

    if (!haveEnough) {
      return {
        sessionId: null,
        error: `Only ${connected.length}/${requiredParticipants} required participants connected`,
        connectivityIssues: failed,
        connectedParticipants: connected,
      }
    }

    // Proceed with connected participants
    if (failed.length > 0) {
      console.warn(
        `[MuSig2 Service] Proceeding with ${connected.length} participants (${failed.length} unreachable)`,
      )
    }
  }

  // Create session
  try {
    const sessionId = await musig2Coordinator.createSession(
      signerPublicKeys,
      myPrivateKey,
      message,
      metadata,
    )

    return { sessionId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return { sessionId: null, error: errorMsg }
  }
}
```

### Task 4.4: Add Session Participant Connection Status to UI

**File**: `stores/musig2.ts`

```typescript
// Add to state
state: (): MuSig2State => ({
  // ... existing state ...

  /** Connection status for session participants */
  sessionParticipantStatus: new Map<string, Map<string, {
    peerId: string
    connected: boolean
    connectionType?: 'webrtc' | 'relay' | 'direct'
    error?: string
  }>>(),
}),

// Add to actions
actions: {
  // ... existing actions ...

  /**
   * Get participant connection status for a session
   */
  getSessionParticipantStatus(sessionId: string): Array<{
    peerId: string
    connected: boolean
    connectionType?: 'webrtc' | 'relay' | 'direct'
    error?: string
  }> {
    const status = this.sessionParticipantStatus.get(sessionId)
    if (!status) return []
    return Array.from(status.values())
  },

  /**
   * Update participant connection status for a session
   */
  _updateSessionParticipantStatus(
    sessionId: string,
    peerId: string,
    connected: boolean,
    connectionType?: 'webrtc' | 'relay' | 'direct',
    error?: string
  ) {
    if (!this.sessionParticipantStatus.has(sessionId)) {
      this.sessionParticipantStatus.set(sessionId, new Map())
    }

    this.sessionParticipantStatus.get(sessionId)!.set(peerId, {
      peerId,
      connected,
      connectionType,
      error,
    })
  },

  /**
   * Propose spend with connectivity verification
   */
  async proposeSpend(params: SpendProposalParams): Promise<{
    success: boolean
    sessionId?: string
    error?: string
    connectivityIssues?: Array<{ peerId: string; error: string }>
  }> {
    const wallet = this.sharedWallets.find(w => w.id === params.walletId)
    if (!wallet) {
      return { success: false, error: 'Shared wallet not found' }
    }

    // Get participant peer IDs
    const participantPeerIds = wallet.participants
      .map(p => p.peerId)
      .filter((id): id is string => !!id)

    // Verify connectivity
    const p2pStore = useP2PStore()
    const { allConnected, results } = await this.ensureParticipantsConnected(
      participantPeerIds
    )

    // Update session participant status (pre-session)
    const tempSessionId = `pending-${Date.now()}`
    for (const [peerId, result] of results.entries()) {
      this._updateSessionParticipantStatus(
        tempSessionId,
        peerId,
        result.success,
        undefined,
        result.error
      )
    }

    if (!allConnected) {
      const failed = Array.from(results.entries())
        .filter(([_, r]) => !r.success)
        .map(([id, r]) => ({ peerId: id, error: r.error || 'Failed' }))

      return {
        success: false,
        error: `Cannot reach ${failed.length} participant(s)`,
        connectivityIssues: failed,
      }
    }

    // Proceed with session creation
    try {
      const result = await createSigningSession(
        wallet.participants.map(p => p.publicKey),
        this._getSigningPrivateKey(),
        params.transactionHash,
        {
          walletId: wallet.id,
          transactionType: 'spend',
          recipient: params.recipient,
          amountSats: params.amountSats.toString(),
        },
        participantPeerIds
      )

      if (result.sessionId) {
        // Move participant status to actual session ID
        const pendingStatus = this.sessionParticipantStatus.get(tempSessionId)
        if (pendingStatus) {
          this.sessionParticipantStatus.set(result.sessionId, pendingStatus)
          this.sessionParticipantStatus.delete(tempSessionId)
        }

        return { success: true, sessionId: result.sessionId }
      } else {
        return {
          success: false,
          error: result.error,
          connectivityIssues: result.connectivityIssues,
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMsg }
    }
  },
}
```

---

## UI Integration

### Session Participant Status Component

```vue
<!-- components/musig2/SessionParticipantStatus.vue -->
<template>
  <div class="space-y-2">
    <div
      v-for="participant in participants"
      :key="participant.peerId"
      class="flex items-center gap-2"
    >
      <UIcon
        :name="
          participant.connected ? 'i-lucide-check-circle' : 'i-lucide-x-circle'
        "
        :class="participant.connected ? 'text-green-500' : 'text-red-500'"
      />
      <span class="font-mono text-sm">
        {{ participant.peerId.slice(0, 12) }}...
      </span>
      <UBadge v-if="participant.connectionType" size="xs" variant="subtle">
        {{ participant.connectionType }}
      </UBadge>
      <span v-if="participant.error" class="text-red-500 text-xs">
        {{ participant.error }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  sessionId: string
}>()

const musig2Store = useMuSig2Store()

const participants = computed(() =>
  musig2Store.getSessionParticipantStatus(props.sessionId),
)
</script>
```

---

## Error Handling

### Connectivity Error Types

```typescript
export enum ConnectivityErrorType {
  /** No relay address available for peer */
  NO_RELAY_ADDRESS = 'no_relay_address',
  /** Connection attempt timed out */
  TIMEOUT = 'timeout',
  /** Peer rejected connection */
  REJECTED = 'rejected',
  /** Network error during connection */
  NETWORK_ERROR = 'network_error',
  /** Peer not found in discovery */
  PEER_NOT_FOUND = 'peer_not_found',
  /** WebRTC negotiation failed */
  WEBRTC_FAILED = 'webrtc_failed',
}

export interface ConnectivityError {
  type: ConnectivityErrorType
  peerId: string
  message: string
  retryable: boolean
}

/**
 * Classify a connection error
 */
export function classifyConnectivityError(
  peerId: string,
  error: Error | string,
): ConnectivityError {
  const message = typeof error === 'string' ? error : error.message

  if (message.includes('timeout') || message.includes('Timeout')) {
    return {
      type: ConnectivityErrorType.TIMEOUT,
      peerId,
      message,
      retryable: true,
    }
  }

  if (message.includes('No relay') || message.includes('no relay')) {
    return {
      type: ConnectivityErrorType.NO_RELAY_ADDRESS,
      peerId,
      message,
      retryable: false,
    }
  }

  if (message.includes('WebRTC') || message.includes('ICE')) {
    return {
      type: ConnectivityErrorType.WEBRTC_FAILED,
      peerId,
      message,
      retryable: true,
    }
  }

  return {
    type: ConnectivityErrorType.NETWORK_ERROR,
    peerId,
    message,
    retryable: true,
  }
}
```

---

## Testing

### Integration Tests

```typescript
describe('MuSig2 Session Connectivity', () => {
  it('should verify all participants connected before session', async () => {
    const result = await createSigningSession(
      signerPublicKeys,
      myPrivateKey,
      message,
      metadata,
      ['peer1', 'peer2', 'peer3'],
    )

    expect(result.sessionId).toBeTruthy()
    expect(result.connectivityIssues).toBeUndefined()
  })

  it('should fail session if participant unreachable', async () => {
    const result = await createSigningSession(
      signerPublicKeys,
      myPrivateKey,
      message,
      metadata,
      ['peer1', 'unreachable-peer'],
    )

    expect(result.sessionId).toBeNull()
    expect(result.error).toContain('Cannot reach')
    expect(result.connectivityIssues).toHaveLength(1)
  })

  it('should allow partial connectivity when configured', async () => {
    const result = await createSigningSessionWithOptions({
      signerPublicKeys,
      myPrivateKey,
      message,
      participantPeerIds: ['peer1', 'peer2', 'unreachable'],
      allowPartialConnectivity: true,
      minConnectedParticipants: 2,
    })

    expect(result.sessionId).toBeTruthy()
    expect(result.connectedParticipants).toHaveLength(2)
  })
})
```

---

_Part of WebRTC Connectivity Remediation Plan_
