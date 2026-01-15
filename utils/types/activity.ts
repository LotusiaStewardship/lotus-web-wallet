/**
 * Activity Types
 *
 * Type definitions for the unified activity system.
 */

export type ActivityType =
  | 'transaction'
  | 'signing_request'
  | 'signing_complete'
  | 'peer_connected'
  | 'peer_disconnected'
  | 'signer_discovered'
  | 'wallet_created'
  | 'wallet_funded'
  | 'vote_received'
  | 'system'

export type ActivityStatus = 'new' | 'pending' | 'complete' | 'failed'

// ============================================================================
// Activity Data Types
// ============================================================================

export interface TransactionActivityData {
  type: 'transaction'
  txid: string
  direction: 'incoming' | 'outgoing'
  amountSats: bigint
  address: string
  confirmations: number
}

export interface SigningRequestActivityData {
  type: 'signing_request'
  sessionId: string
  walletId: string
  walletName: string
  amountSats: bigint
  initiatorId: string
  expiresAt: number
}

export interface SigningCompleteActivityData {
  type: 'signing_complete'
  sessionId: string
  walletId: string
  walletName: string
  txid: string
  amountSats: bigint
}

export interface PeerActivityData {
  type: 'peer_connected' | 'peer_disconnected'
  peerId: string
  peerName?: string
}

export interface SignerDiscoveredActivityData {
  type: 'signer_discovered'
  publicKeyHex: string
  nickname?: string
}

export interface WalletActivityData {
  type: 'wallet_created' | 'wallet_funded'
  walletId: string
  walletName: string
  amountSats?: bigint
  participantIds: string[]
}

export interface VoteActivityData {
  type: 'vote_received'
  platform: string
  profileId: string
  voteType: 'upvote' | 'downvote'
  voterAddress?: string
}

export interface SystemActivityData {
  type: 'system'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
}

export type ActivityData =
  | TransactionActivityData
  | SigningRequestActivityData
  | SigningCompleteActivityData
  | PeerActivityData
  | SignerDiscoveredActivityData
  | WalletActivityData
  | VoteActivityData
  | SystemActivityData

// ============================================================================
// Activity Action Types
// ============================================================================

export interface ActivityAction {
  id: string
  label: string
  icon: string
  primary?: boolean
}

// ============================================================================
// Activity Item
// ============================================================================

export interface ActivityItem {
  id: string
  type: ActivityType
  status: ActivityStatus

  // Timing
  timestamp: number
  readAt?: number

  // People context
  contactId?: string
  contactIds?: string[]

  // Type-specific data
  data: ActivityData

  // Actions available
  actions?: ActivityAction[]
}

// ============================================================================
// Activity Store State
// ============================================================================

export interface ActivityState {
  items: Map<string, ActivityItem>
  filter: ActivityType | 'all'
  searchQuery: string
  lastReadTimestamp: number
  initialized: boolean
}
