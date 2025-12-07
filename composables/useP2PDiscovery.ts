/**
 * useP2PDiscovery Composable
 *
 * Provides reactive access to P2P signer discovery functionality.
 * Wraps the P2P store's discovery features with convenient helpers.
 */
import { useP2PStore, type UISignerAdvertisement } from '~/stores/p2p'

// Transaction type constants (matching SDK's TransactionType enum values)
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

export interface DiscoveryFilters {
  transactionType?: TransactionTypeValue
  minAmount?: number
  maxAmount?: number
  minReputation?: number
  searchQuery?: string
}

export function useP2PDiscovery() {
  const p2pStore = useP2PStore()

  // ============================================================================
  // Reactive State
  // ============================================================================

  /** All discovered signers */
  const signers = computed(() => p2pStore.discoveredSigners)

  /** Number of discovered signers */
  const signerCount = computed(() => p2pStore.signerCount)

  /** Whether discovery is active (P2P connected and subscribed) */
  const isDiscoveryActive = computed(
    () => p2pStore.isOnline && p2pStore.activeSubscriptions.size > 0,
  )

  /** Whether DHT is ready for queries */
  const isDHTReady = computed(() => p2pStore.isDHTReady)

  // ============================================================================
  // Filtering
  // ============================================================================

  /**
   * Filter signers by transaction type
   */
  const filterByTransactionType = (
    txType: TransactionTypeValue,
  ): UISignerAdvertisement[] => {
    return signers.value.filter(s => s.transactionTypes.includes(txType))
  }

  /**
   * Filter signers by amount range
   */
  const filterByAmount = (amount: number): UISignerAdvertisement[] => {
    return signers.value.filter(s => {
      const min = s.amountRange?.min ?? 0
      const max = s.amountRange?.max ?? Infinity
      return amount >= min && amount <= max
    })
  }

  /**
   * Filter signers by minimum reputation
   */
  const filterByReputation = (
    minReputation: number,
  ): UISignerAdvertisement[] => {
    return signers.value.filter(s => s.reputation >= minReputation)
  }

  /**
   * Filter signers by search query (matches nickname, peerId, or transaction types)
   */
  const filterBySearch = (query: string): UISignerAdvertisement[] => {
    const lowerQuery = query.toLowerCase()
    return signers.value.filter(
      s =>
        s.nickname?.toLowerCase().includes(lowerQuery) ||
        s.peerId.toLowerCase().includes(lowerQuery) ||
        s.transactionTypes.some(t => t.toLowerCase().includes(lowerQuery)),
    )
  }

  /**
   * Apply multiple filters at once
   */
  const filterSigners = (
    filters: DiscoveryFilters,
  ): UISignerAdvertisement[] => {
    let result = [...signers.value]

    if (filters.transactionType) {
      result = result.filter(s =>
        s.transactionTypes.includes(filters.transactionType!),
      )
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      const minAmount = filters.minAmount ?? 0
      const maxAmount = filters.maxAmount ?? Infinity
      result = result.filter(s => {
        const signerMin = s.amountRange?.min ?? 0
        const signerMax = s.amountRange?.max ?? Infinity
        // Check if ranges overlap
        return signerMin <= maxAmount && signerMax >= minAmount
      })
    }

    if (filters.minReputation !== undefined) {
      result = result.filter(s => s.reputation >= filters.minReputation!)
    }

    if (filters.searchQuery) {
      const lowerQuery = filters.searchQuery.toLowerCase()
      result = result.filter(
        s =>
          s.nickname?.toLowerCase().includes(lowerQuery) ||
          s.peerId.toLowerCase().includes(lowerQuery) ||
          s.transactionTypes.some(t => t.toLowerCase().includes(lowerQuery)),
      )
    }

    return result
  }

  // ============================================================================
  // Sorting
  // ============================================================================

  /**
   * Sort signers by reputation (highest first)
   */
  const sortByReputation = (
    signersToSort: UISignerAdvertisement[],
  ): UISignerAdvertisement[] => {
    return [...signersToSort].sort((a, b) => b.reputation - a.reputation)
  }

  /**
   * Sort signers by fee (lowest first)
   */
  const sortByFee = (
    signersToSort: UISignerAdvertisement[],
  ): UISignerAdvertisement[] => {
    return [...signersToSort].sort((a, b) => (a.fee ?? 0) - (b.fee ?? 0))
  }

  /**
   * Sort signers by response time (fastest first)
   */
  const sortByResponseTime = (
    signersToSort: UISignerAdvertisement[],
  ): UISignerAdvertisement[] => {
    return [...signersToSort].sort(
      (a, b) =>
        (a.averageResponseTime ?? Infinity) -
        (b.averageResponseTime ?? Infinity),
    )
  }

  /**
   * Sort signers by creation time (newest first)
   */
  const sortByNewest = (
    signersToSort: UISignerAdvertisement[],
  ): UISignerAdvertisement[] => {
    return [...signersToSort].sort((a, b) => b.createdAt - a.createdAt)
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to signer discovery with optional criteria
   */
  const subscribe = async (criteria?: {
    transactionTypes?: TransactionTypeValue[]
    minAmount?: number
    maxAmount?: number
  }) => {
    // Cast to any to bridge the type gap between string literals and SDK enum
    // The string values match the SDK's TransactionType enum values at runtime
    return await p2pStore.subscribeToSigners(
      criteria as Parameters<typeof p2pStore.subscribeToSigners>[0],
    )
  }

  /**
   * Unsubscribe from a discovery subscription
   */
  const unsubscribe = async (subscriptionId: string) => {
    await p2pStore.unsubscribe(subscriptionId)
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get a signer by ID
   */
  const getSignerById = (id: string): UISignerAdvertisement | undefined => {
    return signers.value.find(s => s.id === id)
  }

  /**
   * Get a signer by peer ID
   */
  const getSignerByPeerId = (
    peerId: string,
  ): UISignerAdvertisement | undefined => {
    return signers.value.find(s => s.peerId === peerId)
  }

  /**
   * Check if a signer supports a specific transaction type
   */
  const signerSupportsType = (
    signer: UISignerAdvertisement,
    txType: TransactionTypeValue,
  ): boolean => {
    return signer.transactionTypes.includes(txType)
  }

  /**
   * Check if a signer accepts a specific amount
   */
  const signerAcceptsAmount = (
    signer: UISignerAdvertisement,
    amount: number,
  ): boolean => {
    const min = signer.amountRange?.min ?? 0
    const max = signer.amountRange?.max ?? Infinity
    return amount >= min && amount <= max
  }

  return {
    // State
    signers,
    signerCount,
    isDiscoveryActive,
    isDHTReady,

    // Filtering
    filterByTransactionType,
    filterByAmount,
    filterByReputation,
    filterBySearch,
    filterSigners,

    // Sorting
    sortByReputation,
    sortByFee,
    sortByResponseTime,
    sortByNewest,

    // Subscriptions
    subscribe,
    unsubscribe,

    // Utilities
    getSignerById,
    getSignerByPeerId,
    signerSupportsType,
    signerAcceptsAmount,

    // Constants
    TransactionType,
  }
}
