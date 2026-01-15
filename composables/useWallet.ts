/**
 * Wallet Composable
 *
 * High-level wallet utilities combining other composables.
 * Provides convenient access to wallet state and operations.
 */
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'
import { useDraftStore } from '~/stores/draft'

// ============================================================================
// Composable
// ============================================================================

export function useWallet() {
  const walletStore = useWalletStore()
  const networkStore = useNetworkStore()
  const draftStore = useDraftStore()
  const { formatXPI, satsToXPI } = useAmount()
  const { truncateAddress, toFingerprint } = useAddress()

  // ========================================================================
  // Computed State
  // ========================================================================

  /**
   * Whether wallet is ready for use
   */
  const isReady = computed(() => walletStore.initialized)

  /**
   * Whether wallet is loading
   */
  const isLoading = computed(() => walletStore.loading)

  /**
   * Loading message
   */
  const loadingMessage = computed(() => walletStore.loadingMessage)

  /**
   * Whether connected to network
   */
  const isConnected = computed(() => walletStore.connected)

  /**
   * Current address
   */
  const address = computed(() => walletStore.address)

  /**
   * Truncated address for display
   */
  const addressDisplay = computed(() => truncateAddress(walletStore.address))

  /**
   * Address fingerprint
   */
  const addressFingerprint = computed(() => toFingerprint(walletStore.address))

  /**
   * Current address type
   */
  const addressType = computed(() => walletStore.addressType)

  /**
   * Balance in satoshis
   */
  const balanceSats = computed(() => BigInt(walletStore.balance.total))

  /**
   * Spendable balance in satoshis
   */
  const spendableSats = computed(() => BigInt(walletStore.balance.spendable))

  /**
   * Formatted balance
   */
  const balanceDisplay = computed(() => formatXPI(walletStore.balance.total))

  /**
   * Formatted spendable balance
   */
  const spendableDisplay = computed(() =>
    formatXPI(walletStore.balance.spendable),
  )

  /**
   * Balance in XPI (number)
   */
  const balanceXPI = computed(() =>
    parseFloat(satsToXPI(walletStore.balance.total)),
  )

  /**
   * Whether wallet has balance
   */
  const hasBalance = computed(() => balanceSats.value > 0n)

  /**
   * UTXO count
   */
  const utxoCount = computed(() => walletStore.utxos.size)

  /**
   * Current network
   */
  const network = computed(() => networkStore.currentNetwork)

  /**
   * Network display name
   */
  const networkDisplay = computed(() => networkStore.displayName)

  /**
   * Whether on mainnet
   */
  const isMainnet = computed(() => networkStore.currentNetwork === 'livenet')

  /**
   * Current tip height
   */
  const tipHeight = computed(() => walletStore.tipHeight)

  // ========================================================================
  // Transaction History
  // ========================================================================

  /**
   * Transaction history
   */
  const transactions = computed(() => walletStore.transactionHistory)

  /**
   * Whether history is loading
   */
  const historyLoading = computed(() => walletStore.historyLoading)

  /**
   * Recent transactions (last 5)
   */
  const recentTransactions = computed(() =>
    walletStore.transactionHistory.slice(0, 5),
  )

  // ========================================================================
  // Draft Transaction
  // ========================================================================

  /**
   * Whether draft is active (has address or amount set)
   */
  const hasDraft = computed(() => draftStore.hasAddress || draftStore.hasAmount)

  /**
   * Whether draft is valid and can be sent
   */
  const canSend = computed(() => draftStore.canSend)

  /**
   * Draft validation error
   */
  const draftError = computed(() => draftStore.validationError)

  // ========================================================================
  // Methods
  // ========================================================================

  /**
   * Initialize wallet
   */
  async function initialize() {
    await walletStore.initialize()
  }

  /**
   * Refresh wallet data (UTXOs and balance)
   */
  async function refresh() {
    if (walletStore.refreshUtxos) {
      await walletStore.refreshUtxos()
    }
  }

  /**
   * Start a new transaction draft
   */
  function startSend() {
    draftStore.reset()
  }

  /**
   * Cancel current draft
   */
  function cancelSend() {
    draftStore.reset()
  }

  /**
   * Copy address to clipboard
   */
  async function copyAddress() {
    const clipboard = useClipboard()
    return clipboard.copyAddress(walletStore.address)
  }

  /**
   * Get spendable UTXOs
   */
  function getSpendableUtxos() {
    return walletStore.getSpendableUtxos()
  }

  /**
   * Check if address belongs to this wallet
   */
  function isMyAddress(addr: string): boolean {
    return addr === walletStore.address
  }

  return {
    // State
    isReady,
    isLoading,
    loadingMessage,
    isConnected,

    // Address
    address,
    addressDisplay,
    addressFingerprint,
    addressType,

    // Balance
    balanceSats,
    spendableSats,
    balanceDisplay,
    spendableDisplay,
    balanceXPI,
    hasBalance,
    utxoCount,

    // Network
    network,
    networkDisplay,
    isMainnet,
    tipHeight,

    // History
    transactions,
    historyLoading,
    recentTransactions,

    // Draft
    hasDraft,
    canSend,
    draftError,

    // Methods
    initialize,
    refresh,
    startSend,
    cancelSend,
    copyAddress,
    getSpendableUtxos,
    isMyAddress,
  }
}
