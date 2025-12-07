/**
 * useP2PSigning Composable
 *
 * Provides reactive access to MuSig2 signing session functionality.
 * Manages signing requests, sessions, and participant coordination.
 *
 * Note: This composable provides the UI layer for signing sessions.
 * The actual MuSig2 cryptographic operations are handled by the SDK.
 */
import { useP2PStore, type UISignerAdvertisement } from '~/stores/p2p'
import type { SigningRequest } from '~/components/p2p/SigningRequestModal.vue'
import type { IncomingRequest } from '~/components/p2p/IncomingSigningRequest.vue'
import type {
  SigningSession,
  SigningSessionState,
} from '~/components/p2p/SigningSessionProgress.vue'

// Re-export types for convenience
export type {
  SigningRequest,
  IncomingRequest,
  SigningSession,
  SigningSessionState,
}

// Transaction type constants
export const TransactionType = {
  SPEND: 'spend',
  SWAP: 'swap',
  COINJOIN: 'coinjoin',
  CUSTODY: 'custody',
  ESCROW: 'escrow',
  CHANNEL: 'channel',
} as const

export type TransactionTypeValue =
  (typeof TransactionType)[keyof typeof TransactionType]

export function useP2PSigning() {
  const p2pStore = useP2PStore()
  const toast = useToast()

  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Active signing sessions */
  const activeSessions = ref<SigningSession[]>([])

  /** Incoming signing requests (pending acceptance) */
  const incomingRequests = ref<IncomingRequest[]>([])

  /** Outgoing signing requests (pending response) */
  const outgoingRequests = ref<SigningRequest[]>([])

  /** Whether we are currently advertising as a signer */
  const isAdvertisingSigner = computed(() => p2pStore.isAdvertisingSigner)

  /** Our signer configuration */
  const mySignerConfig = computed(() => p2pStore.mySignerConfig)

  /** Number of active sessions */
  const activeSessionCount = computed(() => activeSessions.value.length)

  /** Number of pending incoming requests */
  const pendingRequestCount = computed(() => incomingRequests.value.length)

  // ============================================================================
  // Signing Request Management
  // ============================================================================

  /**
   * Send a signing request to a signer
   */
  const sendSigningRequest = async (
    signer: UISignerAdvertisement,
    request: Omit<SigningRequest, 'signerId' | 'signerPeerId'>,
  ): Promise<string> => {
    const fullRequest: SigningRequest = {
      ...request,
      signerId: signer.id,
      signerPeerId: signer.peerId,
    }

    // TODO: Implement actual P2P request sending via SDK
    // For now, track locally and simulate
    outgoingRequests.value.push(fullRequest)

    toast.add({
      title: 'Request Sent',
      description: `Signing request sent to ${signer.nickname || 'Anonymous'}`,
      color: 'success',
      icon: 'i-lucide-send',
    })

    // Return a request ID (would come from SDK in real implementation)
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Cancel an outgoing signing request
   */
  const cancelOutgoingRequest = async (signerId: string) => {
    const index = outgoingRequests.value.findIndex(r => r.signerId === signerId)
    if (index >= 0) {
      outgoingRequests.value.splice(index, 1)
      // TODO: Notify the signer via P2P
    }
  }

  /**
   * Accept an incoming signing request
   */
  const acceptRequest = async (
    request: IncomingRequest,
  ): Promise<SigningSession> => {
    // Remove from incoming requests
    const index = incomingRequests.value.findIndex(r => r.id === request.id)
    if (index >= 0) {
      incomingRequests.value.splice(index, 1)
    }

    // Create a new signing session
    const session: SigningSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      state: 'waiting_for_participants' as SigningSessionState,
      transactionType: request.transactionType,
      amount: request.amount,
      participants: [
        {
          peerId: p2pStore.peerId,
          publicKeyHex: mySignerConfig.value?.publicKeyHex || '',
          ready: true,
          isLocal: true,
        },
        {
          peerId: request.requesterPeerId,
          nickname: request.requesterNickname,
          publicKeyHex: '', // Would be provided by requester
          ready: false,
          isLocal: false,
        },
      ],
      currentStep: 1,
      totalSteps: 3, // Nonce exchange, signature exchange, aggregation
      startedAt: Date.now(),
    }

    activeSessions.value.push(session)

    // TODO: Notify requester and start actual MuSig2 session via SDK

    return session
  }

  /**
   * Reject an incoming signing request
   */
  const rejectRequest = async (request: IncomingRequest) => {
    const index = incomingRequests.value.findIndex(r => r.id === request.id)
    if (index >= 0) {
      incomingRequests.value.splice(index, 1)
    }

    // TODO: Notify requester via P2P
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Get a session by ID
   */
  const getSession = (sessionId: string): SigningSession | undefined => {
    return activeSessions.value.find(s => s.id === sessionId)
  }

  /**
   * Cancel an active signing session
   */
  const cancelSession = async (sessionId: string) => {
    const session = getSession(sessionId)
    if (!session) return

    // Update session state
    session.state = 'cancelled' as SigningSessionState
    session.completedAt = Date.now()

    // TODO: Notify other participants via P2P

    toast.add({
      title: 'Session Cancelled',
      description: 'The signing session has been cancelled',
      color: 'neutral',
      icon: 'i-lucide-x',
    })
  }

  /**
   * Retry a failed signing session
   */
  const retrySession = async (
    sessionId: string,
  ): Promise<SigningSession | undefined> => {
    const oldSession = getSession(sessionId)
    if (!oldSession) return undefined

    // Create a new session with the same parameters
    const newSession: SigningSession = {
      ...oldSession,
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      state: 'waiting_for_participants' as SigningSessionState,
      currentStep: 1,
      error: undefined,
      startedAt: Date.now(),
      completedAt: undefined,
      txid: undefined,
      participants: oldSession.participants.map(p => ({
        ...p,
        ready: p.isLocal,
      })),
    }

    // Remove old session and add new one
    const index = activeSessions.value.findIndex(s => s.id === sessionId)
    if (index >= 0) {
      activeSessions.value.splice(index, 1)
    }
    activeSessions.value.push(newSession)

    // TODO: Re-initiate session via P2P

    return newSession
  }

  /**
   * Remove a completed/failed/cancelled session from the list
   */
  const dismissSession = (sessionId: string) => {
    const index = activeSessions.value.findIndex(s => s.id === sessionId)
    if (index >= 0) {
      activeSessions.value.splice(index, 1)
    }
  }

  // ============================================================================
  // Signer Advertisement
  // ============================================================================

  /**
   * Start advertising as a signer
   */
  const startSigning = async (config: {
    transactionTypes: TransactionTypeValue[]
    amountRange?: { min?: number; max?: number }
    nickname?: string
    description?: string
    fee?: number
  }) => {
    if (!mySignerConfig.value?.publicKeyHex) {
      throw new Error('Wallet public key not available')
    }

    await p2pStore.advertiseSigner({
      publicKeyHex: mySignerConfig.value.publicKeyHex,
      transactionTypes: config.transactionTypes,
      amountRange: config.amountRange,
      nickname: config.nickname,
      description: config.description,
      fee: config.fee,
    })
  }

  /**
   * Stop advertising as a signer
   */
  const stopSigning = async () => {
    await p2pStore.withdrawSignerAdvertisement()
  }

  // ============================================================================
  // Event Handlers (would be called by P2P event system)
  // ============================================================================

  /**
   * Handle an incoming signing request (called by P2P event system)
   */
  const handleIncomingRequest = (request: IncomingRequest) => {
    incomingRequests.value.push(request)

    toast.add({
      title: 'Signing Request',
      description: `${
        request.requesterNickname || 'Someone'
      } wants you to sign`,
      color: 'warning',
      icon: 'i-lucide-pen-tool',
    })
  }

  /**
   * Handle session state update (called by P2P event system)
   */
  const handleSessionUpdate = (
    sessionId: string,
    update: Partial<SigningSession>,
  ) => {
    const session = getSession(sessionId)
    if (!session) return

    Object.assign(session, update)

    // Show toast for important state changes
    if (update.state === 'completed') {
      toast.add({
        title: 'Signing Complete',
        description: 'Transaction signed successfully!',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else if (update.state === 'failed') {
      toast.add({
        title: 'Signing Failed',
        description: update.error || 'An error occurred during signing',
        color: 'error',
        icon: 'i-lucide-x-circle',
      })
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clear all sessions and requests (for logout/disconnect)
   */
  const clearAll = () => {
    activeSessions.value = []
    incomingRequests.value = []
    outgoingRequests.value = []
  }

  return {
    // State
    activeSessions,
    incomingRequests,
    outgoingRequests,
    isAdvertisingSigner,
    mySignerConfig,
    activeSessionCount,
    pendingRequestCount,

    // Request Management
    sendSigningRequest,
    cancelOutgoingRequest,
    acceptRequest,
    rejectRequest,

    // Session Management
    getSession,
    cancelSession,
    retrySession,
    dismissSession,

    // Signer Advertisement
    startSigning,
    stopSigning,

    // Event Handlers
    handleIncomingRequest,
    handleSessionUpdate,

    // Cleanup
    clearAll,

    // Constants
    TransactionType,
  }
}
