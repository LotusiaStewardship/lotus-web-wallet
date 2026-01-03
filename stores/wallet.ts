/**
 * Wallet Store
 * Manages wallet state, UTXO cache, and blockchain interactions
 *
 * NOTE: This store uses the centralized Bitcore SDK provider from
 * ~/plugins/bitcore.client.ts which is initialized at app startup.
 * The SDK is guaranteed to be available before any component renders.
 */
import { defineStore } from 'pinia'
import { computed, ref, markRaw } from 'vue'
import { useNetworkStore, type NetworkType } from './network'
import { useNotificationStore } from './notifications'
import {
  getBitcore,
  ensureBitcore,
  isBitcoreLoaded,
} from '~/plugins/bitcore.client'
import { getRawItem, setRawItem, STORAGE_KEYS } from '~/utils/storage'
import {
  initializeChronik as initializeChronikService,
  connectWebSocket,
  disconnectWebSocket,
  fetchBlockchainInfo,
  fetchUtxos,
  fetchTransactionHistory as serviceFetchHistory,
  fetchTransaction,
  fetchBlock,
  broadcastTransaction,
  isChronikInitialized,
  subscribeToMultipleScripts,
  type ChronikScriptType,
  type ChronikSubscription,
} from '~/plugins/02.chronik.client'
import type * as BitcoreTypes from 'xpi-ts/lib/bitcore'
import { USE_CRYPTO_WORKER } from '~/utils/constants'

// =========================================================================
// Transaction Building API Types (Phase 1: Encapsulation Fix)
// =========================================================================

/**
 * Context needed to build a transaction without exposing internal private properties.
 * This is the public API for transaction building.
 */
export interface WalletTransactionBuildContext {
  script: InstanceType<typeof BitcoreTypes.Script>
  addressType: AddressType
  changeAddress: string
  internalPubKey?: InstanceType<typeof BitcoreTypes.PublicKey>
  merkleRoot?: Buffer
}
import {
  AccountPurpose,
  DEFAULT_ACCOUNTS,
  buildDerivationPath,
  type AccountState,
  type DerivedAddress,
} from '~/types/accounts'

// Types
export interface WalletBalance {
  total: string
  spendable: string
}

export interface UtxoData {
  value: string
  height: number
  isCoinbase: boolean
}

export interface TransactionHistoryItem {
  txid: string
  timestamp: string
  blockHeight: number
  isSend: boolean
  amount: string // in sats
  address: string // counterparty address
  confirmations: number
}

// Note: ParsedTransaction type is available from ~/composables/useExplorerApi

/**
 * Address type for wallet generation
 * - 'p2pkh': Pay-to-Public-Key-Hash (legacy, smaller addresses)
 * - 'p2tr-commitment': Pay-to-Taproot (modern, enhanced privacy and script capabilities)
 */
export type AddressType = 'p2pkh' | 'p2tr-commitment'

/**
 * Runtime key data for an account (not persisted)
 */
export interface RuntimeKeyData {
  privateKey: any
  publicKey: any
  script: any
  internalPubKey?: any
  merkleRoot?: Buffer
}

/**
 * Per-account UTXO and balance state
 */
export interface AccountUtxoState {
  utxos: Map<string, UtxoData>
  balance: WalletBalance
}

export interface WalletState {
  initialized: boolean
  /** SDK is loaded and wallet can be used locally (address, signing, etc.) */
  sdkReady: boolean
  loading: boolean
  loadingMessage: string
  seedPhrase: string
  /** The type of address currently in use */
  addressType: AddressType
  tipHeight: number
  tipHash: string
  connected: boolean
  transactionHistory: TransactionHistoryItem[]
  /** Parsed transactions from Explorer API (richer data) */
  parsedTransactions: any[] // ParsedTransaction[] - using any to avoid circular import
  historyLoading: boolean

  // Multi-account state
  /** Account states keyed by AccountPurpose */
  accounts: Map<AccountPurpose, AccountState>
  /** Per-account UTXO and balance state */
  accountUtxos: Map<AccountPurpose, AccountUtxoState>

  // Legacy compatibility (derived from PRIMARY account)
  /** @deprecated Use getAddress(AccountPurpose.PRIMARY) instead */
  address: string
  /** @deprecated Use accounts.get(PRIMARY).primaryAddress.scriptPayload instead */
  scriptPayload: string
  /** @deprecated Use getAccountBalance(AccountPurpose.PRIMARY) instead */
  balance: WalletBalance
  /** @deprecated Use accountUtxos.get(PRIMARY).utxos instead */
  utxos: Map<string, UtxoData>
}

// Duplicate notification prevention
const recentNotifications = new Set<string>()
const NOTIFICATION_DEDUP_WINDOW = 60_000 // 1 minute

function shouldNotify(txid: string): boolean {
  if (recentNotifications.has(txid)) return false

  recentNotifications.add(txid)
  setTimeout(() => recentNotifications.delete(txid), NOTIFICATION_DEDUP_WINDOW)

  return true
}

/**
 * Get the Bitcore SDK instance
 * Throws if not loaded (should never happen after plugin initialization)
 */
const getBitcoreSDK = (): typeof BitcoreTypes => {
  const sdk = getBitcore()
  if (!sdk) {
    throw new Error('Bitcore SDK not loaded. This should not happen.')
  }
  return sdk
}

// Convenience getters for commonly used Bitcore classes
// These are functions to ensure we always get the current SDK instance
const getMnemonic = () => getBitcoreSDK().Mnemonic
const getHDPrivateKey = () => getBitcoreSDK().HDPrivateKey
const getPrivateKey = () => getBitcoreSDK().PrivateKey
const getAddress = () => getBitcoreSDK().Address
const getScript = () => getBitcoreSDK().Script
const getTransaction = () => getBitcoreSDK().Transaction
const getMessage = () => getBitcoreSDK().Message
const getNetworks = () => getBitcoreSDK().Networks
const getTweakPublicKey = () => getBitcoreSDK().tweakPublicKey
const getTweakPrivateKey = () => getBitcoreSDK().tweakPrivateKey
const getBuildPayToTaproot = () => getBitcoreSDK().buildPayToTaproot

// Utility functions
export const toLotusUnits = (sats: string | number) => Number(sats) / 1_000_000
export const toSatoshiUnits = (xpi: string | number) =>
  Math.floor(Number(xpi) * 1_000_000)
export const toXPI = (sats: string | number) => {
  const num = Number(sats)
  if (isNaN(num) || !isFinite(num)) return '0.00'
  return (num / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

export const useWalletStore = defineStore('wallet', () => {
  // =========================================================================
  // Private runtime state (not serializable, not exposed)
  // =========================================================================
  let _hdPrivkey: any = null
  const _accountKeys = new Map<AccountPurpose, RuntimeKeyData>()
  let _signingKey: any = null
  let _script: any = null
  let _internalPubKey: any = undefined
  let _merkleRoot: Buffer | undefined = undefined

  // =========================================================================
  // Reactive State
  // =========================================================================
  const initialized = ref(false)
  const sdkReady = ref(false)
  const loading = ref(false)
  const loadingMessage = ref('')
  const seedPhrase = ref('')
  const addressType = ref<AddressType>('p2tr-commitment')
  const tipHeight = ref(0)
  const tipHash = ref('')
  const connected = ref(false)
  const transactionHistory = ref<TransactionHistoryItem[]>([])
  const parsedTransactions = ref<any[]>([])
  const historyLoading = ref(false)

  // Multi-account state
  const accounts = ref(new Map<AccountPurpose, AccountState>())
  const accountUtxos = ref(new Map<AccountPurpose, AccountUtxoState>())

  // Legacy compatibility fields (derived from PRIMARY account)
  /** @deprecated Use getAddress(AccountPurpose.PRIMARY) instead */
  const address = ref('')
  /** @deprecated Use getScriptHex(AccountPurpose.PRIMARY) instead */
  const scriptPayload = ref('')
  /** @deprecated Use getAccountBalance(AccountPurpose.PRIMARY) instead */
  const balance = ref<WalletBalance>({ total: '0', spendable: '0' })
  /** @deprecated Use getAccountUtxos(AccountPurpose.PRIMARY) instead */
  const utxos = ref(new Map<string, UtxoData>())

  // =========================================================================
  // Getters
  // =========================================================================
  const balanceXPI = computed(() => toLotusUnits(balance.value.total))
  const spendableXPI = computed(() => toLotusUnits(balance.value.spendable))
  const formattedBalance = computed(() => toXPI(balance.value.total))
  const formattedSpendable = computed(() => toXPI(balance.value.spendable))
  const hasBalance = computed(() => BigInt(balance.value.total) > 0n)
  const utxoCount = computed(() => utxos.value.size)
  const recentTransactions = computed(() =>
    transactionHistory.value.slice(0, 10),
  )

  /**
   * Get spendable UTXOs (excluding immature coinbase)
   */
  function getSpendableUtxos(): Array<{
    outpoint: string
    value: string
    height: number
    isCoinbase: boolean
  }> {
    const result: Array<{
      outpoint: string
      value: string
      height: number
      isCoinbase: boolean
    }> = []
    for (const [outpoint, utxo] of utxos.value) {
      if (utxo.isCoinbase) {
        const confirmations =
          utxo.height > 0 ? tipHeight.value - utxo.height + 1 : 0
        if (confirmations >= 100) {
          result.push({ outpoint, ...utxo })
        }
      } else {
        result.push({ outpoint, ...utxo })
      }
    }
    return result
  }

  /**
   * Get transactions involving a specific contact address
   */
  function getTransactionsWithContact(
    contactAddress: string,
  ): TransactionHistoryItem[] {
    if (!contactAddress) return []
    const lowerAddress = contactAddress.toLowerCase()
    return transactionHistory.value.filter(
      tx => tx.address.toLowerCase() === lowerAddress,
    )
  }

  // =========================================================================
  // Actions
  // =========================================================================

  /**
   * Initialize the wallet - load from storage or create new
   */
  async function initialize() {
    // Prevent double initialization
    if (initialized.value || loading.value) return

    loading.value = true
    loadingMessage.value = 'Loading...'

    try {
      // Ensure Bitcore SDK is loaded (should already be loaded by plugin)
      await ensureBitcore()

      loadingMessage.value = 'Initializing wallet...'

      // Check for existing wallet in storage
      const savedState = getRawItem(STORAGE_KEYS.WALLET_STATE)

      if (savedState) {
        await loadWallet(JSON.parse(savedState))
      } else {
        // Generate new wallet
        await createNewWallet()
      }

      // SDK is ready - wallet can be used locally now
      sdkReady.value = true
      loading.value = false
      loadingMessage.value = ''

      // Initialize Chronik connection in background (non-blocking)
      initializeChronik()
        .then(() => {
          initialized.value = true
        })
        .catch((err: unknown) => {
          console.error('Failed to connect to network:', err)
          // Still mark as initialized so UI is usable, just disconnected
          initialized.value = true
        })
    } catch (err) {
      console.error('Failed to initialize wallet:', err)
      loadingMessage.value = 'Failed to initialize wallet'
      loading.value = false
    }
  }

  /**
   * Create a new wallet with fresh mnemonic
   */
  async function createNewWallet() {
    loadingMessage.value = 'Generating new wallet...'

    let mnemonic: string

    if (USE_CRYPTO_WORKER && typeof Worker !== 'undefined') {
      // Use crypto worker for mnemonic generation (non-blocking)
      const { generateMnemonic } = useCryptoWorker()
      mnemonic = await generateMnemonic()
    } else {
      // Fallback to main thread
      const Mnemonic = getMnemonic()
      mnemonic = new Mnemonic().toString()
    }

    await buildWalletFromMnemonic(mnemonic)
    await saveWalletState()
  }

  /**
   * Restore wallet from seed phrase
   */
  async function restoreWallet(phrase: string) {
    // Validate mnemonic
    let isValid: boolean
    if (USE_CRYPTO_WORKER && typeof Worker !== 'undefined') {
      const { validateMnemonic } = useCryptoWorker()
      isValid = await validateMnemonic(phrase)
    } else {
      const Mnemonic = getMnemonic()
      isValid = Mnemonic.isValid(phrase)
    }

    if (!isValid) {
      throw new Error('Invalid seed phrase')
    }

    loading.value = true
    loadingMessage.value = 'Restoring wallet...'

    try {
      // Clear existing state
      transactionHistory.value = []
      utxos.value = new Map()
      balance.value = { total: '0', spendable: '0' }

      await buildWalletFromMnemonic(phrase)
      await saveWalletState()

      // Disconnect and reconnect Chronik with new address
      disconnectWebSocket()
      await initializeChronik()
    } finally {
      loading.value = false
      loadingMessage.value = ''
    }
  }

  /**
   * Switch the wallet address type between P2PKH and P2TR
   */
  async function switchAddressType(newType: AddressType) {
    if (addressType.value === newType) return
    if (!seedPhrase.value) {
      throw new Error('Wallet not initialized')
    }

    loading.value = true
    loadingMessage.value = `Switching to ${
      newType === 'p2tr-commitment' ? 'Taproot' : 'Legacy'
    } address...`

    try {
      // Clear existing state
      transactionHistory.value = []
      parsedTransactions.value = []
      utxos.value = new Map()
      balance.value = { total: '0', spendable: '0' }

      // Update address type and rebuild wallet
      addressType.value = newType
      await buildWalletFromMnemonic(seedPhrase.value)
      await saveWalletState()

      // Disconnect and reconnect Chronik with new address
      disconnectWebSocket()
      await initializeChronik()
    } finally {
      loading.value = false
      loadingMessage.value = ''
    }
  }

  /**
   * Build wallet state from mnemonic
   */
  async function buildWalletFromMnemonic(phrase: string) {
    const networkStore = useNetworkStore()

    // Initialize multi-account state
    accounts.value = new Map()
    accountUtxos.value = new Map()
    _accountKeys.clear()

    // Derive keys for each enabled account
    for (const config of DEFAULT_ACCOUNTS) {
      if (!config.enabled) continue

      const accountState = await _deriveAccountKeys(
        phrase,
        config.purpose,
        networkStore.currentNetwork,
      )

      accounts.value.set(config.purpose, accountState)
      accountUtxos.value.set(config.purpose, {
        utxos: new Map(),
        balance: { total: '0', spendable: '0' },
      })
    }

    // Update legacy compatibility fields from PRIMARY account
    const primaryAccount = accounts.value.get(AccountPurpose.PRIMARY)
    const primaryKeys = _accountKeys.get(AccountPurpose.PRIMARY)

    if (primaryAccount?.primaryAddress && primaryKeys) {
      address.value = primaryAccount.primaryAddress.address
      scriptPayload.value = primaryAccount.primaryAddress.scriptPayload

      // Legacy runtime objects
      _signingKey = primaryKeys.privateKey
      _script = primaryKeys.script
      _internalPubKey = primaryKeys.internalPubKey
      _merkleRoot = primaryKeys.merkleRoot
    }

    seedPhrase.value = phrase
    utxos.value = new Map()
    balance.value = { total: '0', spendable: '0' }
  }

  /**
   * Derive keys for a specific account
   */
  async function _deriveAccountKeys(
    phrase: string,
    accountPurpose: AccountPurpose,
    networkName: BitcoreTypes.NetworkName,
  ): Promise<AccountState> {
    const accountIndex = accountPurpose
    const addressIndex = 0
    const isChange = false
    const derivationPath = buildDerivationPath(
      accountIndex,
      isChange,
      addressIndex,
    )

    if (USE_CRYPTO_WORKER && typeof Worker !== 'undefined') {
      const { deriveKeys } = useCryptoWorker()
      const result = await deriveKeys(
        phrase,
        addressType.value,
        networkName,
        accountIndex,
        addressIndex,
        isChange,
      )

      const PrivateKey = getPrivateKey()
      const Script = getScript()
      const Address = getAddress()
      const Networks = getNetworks()
      Networks.get(networkName)

      const signingKey = new PrivateKey(result.privateKeyHex)
      let script: BitcoreTypes.Script
      let internalPubKey: BitcoreTypes.PublicKey | undefined
      let merkleRoot: Buffer | undefined

      if (addressType.value === 'p2tr-commitment' && result.internalPubKeyHex) {
        const PublicKey = getBitcoreSDK().PublicKey
        internalPubKey = new PublicKey(result.internalPubKeyHex)
        merkleRoot = result.merkleRootHex
          ? Buffer.from(result.merkleRootHex, 'hex')
          : Buffer.alloc(32)
        const commitment = getTweakPublicKey()(internalPubKey, merkleRoot)
        script = getBuildPayToTaproot()(commitment)
      } else {
        const addr = Address.fromString(result.address)
        script = Script.fromAddress(addr)
      }

      _accountKeys.set(accountPurpose, {
        privateKey: markRaw(signingKey),
        publicKey: markRaw(signingKey.publicKey),
        script: markRaw(script),
        internalPubKey: internalPubKey ? markRaw(internalPubKey) : undefined,
        merkleRoot,
      })

      const derivedAddress: DerivedAddress = {
        index: addressIndex,
        isChange,
        path: derivationPath,
        address: result.address,
        scriptPayload: result.scriptPayload,
        publicKeyHex: result.publicKeyHex,
      }

      return {
        purpose: accountPurpose,
        enabled: true,
        primaryAddress: derivedAddress,
        addresses: [derivedAddress],
        lastUsedIndex: 0,
      }
    } else {
      const Networks = getNetworks()
      const Mnemonic = getMnemonic()
      const HDPrivateKey = getHDPrivateKey()
      const Address = getAddress()
      const Script = getScript()
      const network = Networks.get(networkName)
      if (!network) {
        throw new Error(`Unknown network: ${networkName}`)
      }

      const mnemonic = new Mnemonic(phrase)
      const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())
      const change = isChange ? 1 : 0
      const signingKey = hdPrivkey
        .deriveChild(BIP44_PURPOSE, true)
        .deriveChild(BIP44_COINTYPE, true)
        .deriveChild(accountIndex, true)
        .deriveChild(change)
        .deriveChild(addressIndex).privateKey

      let addr: any
      let script: any
      let internalPubKey: any
      let merkleRoot: Buffer | undefined

      if (addressType.value === 'p2tr-commitment') {
        internalPubKey = signingKey.publicKey
        merkleRoot = Buffer.alloc(32)
        const commitment = getTweakPublicKey()(internalPubKey, merkleRoot)
        addr = Address.fromTaprootCommitment(commitment, network)
        script = getBuildPayToTaproot()(commitment)
      } else {
        addr = signingKey.toAddress(network)
        script = Script.fromAddress(addr)
      }

      _hdPrivkey = markRaw(hdPrivkey)

      _accountKeys.set(accountPurpose, {
        privateKey: markRaw(signingKey),
        publicKey: markRaw(signingKey.publicKey),
        script: markRaw(script),
        internalPubKey: internalPubKey ? markRaw(internalPubKey) : undefined,
        merkleRoot,
      })

      const addressStr = addr.toXAddress(network)
      const scriptPayloadHex = script.getData().toString('hex')

      const derivedAddress: DerivedAddress = {
        index: addressIndex,
        isChange,
        path: derivationPath,
        address: addressStr,
        scriptPayload: scriptPayloadHex,
        publicKeyHex: signingKey.publicKey.toString(),
      }

      return {
        purpose: accountPurpose,
        enabled: true,
        primaryAddress: derivedAddress,
        addresses: [derivedAddress],
        lastUsedIndex: 0,
      }
    }
  }

  /**
   * Load wallet from saved state
   */
  async function loadWallet(
    savedState: Partial<WalletState> & { seedPhrase: string },
  ) {
    loadingMessage.value = 'Loading wallet...'

    if (savedState.addressType) {
      addressType.value = savedState.addressType
    }

    await buildWalletFromMnemonic(savedState.seedPhrase)

    if (savedState.utxos) {
      utxos.value = new Map(Object.entries(savedState.utxos))
    }
    if (savedState.balance) {
      balance.value = savedState.balance
    }
    if (savedState.tipHeight) {
      tipHeight.value = savedState.tipHeight
    }
    if (savedState.tipHash) {
      tipHash.value = savedState.tipHash
    }
  }

  /**
   * Save wallet state to storage service
   */
  async function saveWalletState() {
    const state = {
      seedPhrase: seedPhrase.value,
      address: address.value,
      addressType: addressType.value,
      scriptPayload: scriptPayload.value,
      balance: balance.value,
      utxos: Object.fromEntries(utxos.value),
      tipHeight: tipHeight.value,
      tipHash: tipHash.value,
    }
    setRawItem(STORAGE_KEYS.WALLET_STATE, JSON.stringify(state))
  }

  /**
   * Get the Chronik script type for the current address type
   */
  function getChronikScriptType(): ChronikScriptType {
    return addressType.value === 'p2tr-commitment' ? 'p2tr-commitment' : 'p2pkh'
  }

  /**
   * Initialize Chronik client and WebSocket
   */
  async function initializeChronik() {
    loadingMessage.value = 'Connecting to network...'

    const networkStore = useNetworkStore()
    const scriptTypeVal = getChronikScriptType()

    await initializeChronikService({
      network: networkStore.config,
      scriptPayload: scriptPayload.value,
      scriptType: scriptTypeVal,
      onTransaction: (txid: string) => handleAddedToMempool(txid),
      onConnectionChange: (conn: boolean) => {
        connected.value = conn
        if (conn) {
          refreshUtxos().catch(console.error)
        }
      },
      onBlock: (_height: number, hash: string) => handleBlockConnected(hash),
      onConfirmed: (txid: string) => handleConfirmed(txid),
      onRemovedFromMempool: (txid: string) => handleRemovedFromMempool(txid),
    })

    const blockchainInfo = await fetchBlockchainInfo()
    if (blockchainInfo) {
      tipHeight.value = blockchainInfo.tipHeight
      tipHash.value = blockchainInfo.tipHash
    }

    await refreshUtxos()
    await fetchTransactionHistory()
    await connectWebSocket()
    await subscribeToAllAccounts()
    initializeBackgroundMonitoring()

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (isChronikInitialized()) {
            refreshUtxos().catch(console.error)
          }
          syncWithServiceWorker()
        } else {
          notifyTabBackgrounded()
        }
      })
    }
  }

  /**
   * Subscribe to all account addresses for real-time updates
   */
  async function subscribeToAllAccounts(): Promise<void> {
    const scriptTypeVal = getChronikScriptType()
    const subscriptions: ChronikSubscription[] = []

    for (const [purpose, account] of accounts.value) {
      if (account.primaryAddress) {
        subscriptions.push({
          scriptType: scriptTypeVal,
          scriptPayload: account.primaryAddress.scriptPayload,
          accountId: AccountPurpose[purpose],
        })
      }
    }

    if (subscriptions.length > 0) {
      await subscribeToMultipleScripts(subscriptions)
      console.log(
        `[Wallet] Subscribed to ${subscriptions.length} account addresses`,
      )
    }
  }

  /**
   * Initialize background monitoring via service worker
   */
  function initializeBackgroundMonitoring() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const networkStore = useNetworkStore()

    navigator.serviceWorker.ready.then(registration => {
      if (!registration.active) return

      const utxoIds = [...utxos.value.keys()]
      registration.active.postMessage({
        type: 'INIT_UTXO_CACHE',
        payload: {
          scriptPayload: scriptPayload.value,
          utxoIds,
        },
      })

      registration.active.postMessage({
        type: 'START_MONITORING',
        payload: {
          chronikUrl: networkStore.config.chronikUrl,
          pollingInterval: 60_000,
          addresses: [address.value],
          scriptType: getChronikScriptType(),
          scriptPayload: scriptPayload.value,
        },
      })
    })
  }

  /**
   * Sync state with service worker when tab becomes visible
   */
  function syncWithServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker.ready.then(registration => {
      if (!registration.active) return

      const utxoIds = [...utxos.value.keys()]
      registration.active.postMessage({
        type: 'INIT_UTXO_CACHE',
        payload: {
          scriptPayload: scriptPayload.value,
          utxoIds,
        },
      })
    })
  }

  /**
   * Notify service worker that tab is going to background
   */
  function notifyTabBackgrounded() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker.ready.then(registration => {
      if (!registration.active) return
      registration.active.postMessage({ type: 'TAB_BACKGROUNDED' })
    })
  }

  /**
   * Handle transaction detected by service worker background polling
   */
  async function handleBackgroundTransaction(payload: {
    txid: string
    amount: string
    isIncoming: boolean
  }) {
    await refreshUtxos()

    if (shouldNotify(payload.txid)) {
      const notificationStore = useNotificationStore()
      notificationStore.addTransactionNotification(
        payload.txid,
        toXPI(payload.amount),
        !payload.isIncoming,
      )
    }
  }

  /**
   * Notify SW of pending transaction (increases polling frequency)
   */
  function notifyPendingTransaction(hasPending: boolean) {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker.ready.then(registration => {
      if (!registration.active) return
      registration.active.postMessage({
        type: 'SET_PENDING_TRANSACTIONS',
        payload: { hasPending },
      })
    })
  }

  /**
   * Handle transaction added to mempool
   */
  async function handleAddedToMempool(txid: string) {
    if (!isChronikInitialized() || !_script) return

    const tx = await fetchTransaction(txid)
    if (!tx) return

    const scriptHex = _script.toHex()
    let changed = false
    let inputAmount = 0n
    let outputAmount = 0n

    for (const input of tx.inputs) {
      if (input.outputScript === scriptHex) {
        const outpoint = `${input.prevOut.txid}_${input.prevOut.outIdx}`
        if (utxos.value.has(outpoint)) {
          inputAmount += BigInt(input.value || '0')
          utxos.value.delete(outpoint)
          changed = true
        }
      }
    }

    for (let i = 0; i < tx.outputs.length; i++) {
      const output = tx.outputs[i]
      if (output.outputScript === scriptHex) {
        const outpoint = `${txid}_${i}`
        if (!utxos.value.has(outpoint)) {
          outputAmount += BigInt(output.value || '0')
          utxos.value.set(outpoint, {
            value: output.value,
            height: -1,
            isCoinbase: tx.isCoinbase,
          })
          changed = true
        }
      }
    }

    if (changed) {
      recalculateBalance()
      await saveWalletState()

      if (shouldNotify(txid)) {
        const notificationStore = useNotificationStore()
        const isSend = inputAmount > outputAmount
        const netAmount = isSend
          ? (inputAmount - outputAmount).toString()
          : (outputAmount - inputAmount).toString()

        notificationStore.addTransactionNotification(
          txid,
          toXPI(netAmount),
          isSend,
        )
      }
    }
  }

  /**
   * Handle transaction removed from mempool
   */
  async function handleRemovedFromMempool(txid: string) {
    let changed = false
    for (const [outpoint] of utxos.value) {
      if (outpoint.startsWith(txid)) {
        utxos.value.delete(outpoint)
        changed = true
      }
    }
    if (changed) {
      recalculateBalance()
      await saveWalletState()
    }
  }

  /**
   * Handle transaction confirmed
   */
  async function handleConfirmed(txid: string) {
    if (!isChronikInitialized()) return

    const tx = await fetchTransaction(txid)
    if (!tx) return

    let changed = false

    for (const [outpoint, utxo] of utxos.value) {
      if (outpoint.startsWith(txid)) {
        utxo.height = tx.block?.height ?? -1
        changed = true
      }
    }

    if (changed) {
      recalculateBalance()
      await saveWalletState()
    }
  }

  /**
   * Handle new block connected
   */
  async function handleBlockConnected(blockHash: string) {
    if (!isChronikInitialized()) return

    const block = (await fetchBlock(blockHash)) as any
    tipHeight.value = block.blockInfo.height
    tipHash.value = blockHash

    recalculateBalance()
    await saveWalletState()
  }

  /**
   * Refresh UTXOs from Chronik service
   */
  async function refreshUtxos() {
    if (!isChronikInitialized()) return

    utxos.value.clear()

    const fetchedUtxos = await fetchUtxos()
    for (const utxo of fetchedUtxos) {
      const outpoint = `${utxo.outpoint.txid}_${utxo.outpoint.outIdx}`
      utxos.value.set(outpoint, {
        value: utxo.value,
        height: utxo.blockHeight,
        isCoinbase: utxo.isCoinbase,
      })
    }

    recalculateBalance()
    await saveWalletState()
  }

  /**
   * Fetch transaction history from Chronik service
   */
  async function fetchTransactionHistory(
    pageSize: number = 25,
    page: number = 0,
  ) {
    if (!isChronikInitialized() || !_script) return

    historyLoading.value = true
    try {
      const { txs } = await serviceFetchHistory(page, pageSize)
      const scriptHex = _script.toHex()
      const history: TransactionHistoryItem[] = []

      for (const tx of txs) {
        let inputAmount = 0n
        let outputAmount = 0n
        let counterpartyScript = ''

        for (const input of tx.inputs) {
          if (input.outputScript === scriptHex) {
            inputAmount += BigInt(input.value)
          }
        }

        for (const output of tx.outputs) {
          if (output.outputScript === scriptHex) {
            outputAmount += BigInt(output.value)
          } else if (!counterpartyScript && output.outputScript) {
            counterpartyScript = output.outputScript
          }
        }

        const isSend = inputAmount > outputAmount
        const netAmount = isSend
          ? (inputAmount - outputAmount).toString()
          : (outputAmount - inputAmount).toString()

        if (!isSend && tx.inputs.length > 0 && tx.inputs[0].outputScript) {
          counterpartyScript = tx.inputs[0].outputScript
        }

        let counterpartyAddress = ''
        if (counterpartyScript) {
          try {
            const Script = getScript()
            const scriptBuf = Buffer.from(counterpartyScript, 'hex')
            const script = new Script(scriptBuf)
            const addr = script.toAddress()
            if (addr) {
              counterpartyAddress = addr.toXAddress()
            }
          } catch {
            // Non-standard script
          }
        }

        const blockHeight = tx.block?.height ?? -1
        const confirmations =
          blockHeight > 0 ? tipHeight.value - blockHeight + 1 : 0

        history.push({
          txid: tx.txid,
          timestamp:
            tx.block?.timestamp ??
            tx.timeFirstSeen ??
            (Date.now() / 1000).toString(),
          blockHeight,
          isSend,
          amount: netAmount,
          address: counterpartyAddress,
          confirmations,
        })
      }

      transactionHistory.value = history
      await fetchParsedTransactions(txs.map((tx: any) => tx.txid))
    } finally {
      historyLoading.value = false
    }
  }

  /**
   * Fetch parsed transactions from the Explorer API
   */
  async function fetchParsedTransactions(txids: string[]) {
    if (!address.value || txids.length === 0) return

    try {
      const { fetchTransaction: fetchTx, parseTransaction } = await import(
        '~/composables/useExplorerApi'
      ).then(m => m.useExplorerApi())

      const parsed: any[] = []
      const BATCH_SIZE = 5

      for (let i = 0; i < txids.length; i += BATCH_SIZE) {
        const batch = txids.slice(i, i + BATCH_SIZE)
        const promises = batch.map(txid => fetchTx(txid))
        const results = await Promise.all(promises)

        for (const tx of results) {
          if (tx) {
            parsed.push(parseTransaction(tx, address.value))
          }
        }
      }

      parsedTransactions.value = parsed
    } catch (err) {
      console.error('Failed to fetch parsed transactions:', err)
    }
  }

  /**
   * Recalculate balance from UTXOs
   */
  function recalculateBalance() {
    let total = 0n
    let spendable = 0n

    for (const [, utxo] of utxos.value) {
      const value = BigInt(utxo.value)
      total += value

      if (utxo.isCoinbase) {
        const confirmations =
          utxo.height > 0 ? tipHeight.value - utxo.height + 1 : 0
        if (confirmations >= 100) {
          spendable += value
        }
      } else {
        spendable += value
      }
    }

    balance.value = {
      total: total.toString(),
      spendable: spendable.toString(),
    }
  }

  /**
   * Sign a message with the wallet's private key
   */
  function signMessage(text: string): string {
    if (!_signingKey) {
      throw new Error('Wallet not initialized')
    }
    const Message = getMessage()
    const message = new Message(text)
    return message.sign(_signingKey)
  }

  /**
   * Verify a signed message
   */
  function verifyMessage(
    text: string,
    addr: string,
    signature: string,
  ): boolean {
    const Message = getMessage()
    const message = new Message(text)
    return message.verify(addr, signature)
  }

  /**
   * Get the private key (hex encoded) for a specific account
   */
  function getPrivateKeyHex(
    accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
  ): string | null {
    const keyData = _accountKeys.get(accountPurpose)
    if (!keyData?.privateKey) return null
    return keyData.privateKey.toString()
  }

  /**
   * Get the public key (hex encoded) for a specific account
   */
  function getPublicKeyHex(
    accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
  ): string | null {
    const keyData = _accountKeys.get(accountPurpose)
    if (!keyData?.publicKey) return null
    return keyData.publicKey.toString()
  }

  /**
   * Get the address for a specific account
   */
  function getAccountAddress(
    purpose: AccountPurpose = AccountPurpose.PRIMARY,
  ): string | null {
    const account = accounts.value.get(purpose)
    return account?.primaryAddress?.address ?? null
  }

  /**
   * Get the script payload for a specific account
   */
  function getAccountScriptPayload(
    purpose: AccountPurpose = AccountPurpose.PRIMARY,
  ): string | null {
    const account = accounts.value.get(purpose)
    return account?.primaryAddress?.scriptPayload ?? null
  }

  /**
   * Get the account state for a specific purpose
   */
  function getAccount(purpose: AccountPurpose): AccountState | undefined {
    return accounts.value.get(purpose)
  }

  /**
   * Get the runtime key data for a specific account
   */
  function getAccountKeyData(
    purpose: AccountPurpose,
  ): RuntimeKeyData | undefined {
    return _accountKeys.get(purpose)
  }

  /**
   * Get the balance for a specific account
   */
  function getAccountBalance(
    purpose: AccountPurpose = AccountPurpose.PRIMARY,
  ): WalletBalance {
    const utxoState = accountUtxos.value.get(purpose)
    return utxoState?.balance ?? { total: '0', spendable: '0' }
  }

  /**
   * Get the total balance across all accounts
   */
  function getTotalBalance(): WalletBalance {
    let total = 0n
    let spendable = 0n

    for (const utxoState of accountUtxos.value.values()) {
      total += BigInt(utxoState.balance.total)
      spendable += BigInt(utxoState.balance.spendable)
    }

    return {
      total: total.toString(),
      spendable: spendable.toString(),
    }
  }

  /**
   * Disconnect and cleanup
   */
  async function disconnect() {
    disconnectWebSocket()
    connected.value = false
  }

  /**
   * Switch network and reinitialize wallet
   */
  async function switchNetwork(network: NetworkType) {
    const networkStore = useNetworkStore()
    const changed = await networkStore.switchNetwork(network)

    if (!changed) return

    loading.value = true
    loadingMessage.value = `Switching to ${networkStore.displayName}...`

    try {
      disconnectWebSocket()

      transactionHistory.value = []
      parsedTransactions.value = []
      utxos.value = new Map()
      balance.value = { total: '0', spendable: '0' }

      await buildWalletFromMnemonic(seedPhrase.value)
      await saveWalletState()
      await initializeChronik()
    } finally {
      loading.value = false
      loadingMessage.value = ''
    }
  }

  /**
   * Get the current network type
   */
  function getCurrentNetwork(): NetworkType {
    const networkStore = useNetworkStore()
    return networkStore.currentNetwork
  }

  /**
   * Get the mnemonic seed phrase (for backup display)
   */
  function getWalletMnemonic(): string | null {
    if (!initialized.value || !seedPhrase.value) return null
    return seedPhrase.value
  }

  /**
   * Get transaction building context for the primary account
   */
  function getTransactionBuildContext(): WalletTransactionBuildContext | null {
    if (!_script || !address.value) return null

    return {
      script: _script,
      addressType: addressType.value,
      changeAddress: address.value,
      internalPubKey: _internalPubKey,
      merkleRoot: _merkleRoot,
    }
  }

  /**
   * Check if wallet is ready for transaction signing
   */
  function isReadyForSigning(): boolean {
    return !!(_signingKey && _script && initialized.value)
  }

  /**
   * Sign a transaction and return the signed hex
   */
  function signTransactionHex(
    tx: InstanceType<typeof BitcoreTypes.Transaction>,
  ): string {
    if (!_signingKey) {
      throw new Error('Wallet not initialized for signing')
    }

    if (addressType.value === 'p2tr-commitment') {
      tx.signSchnorr(_signingKey)
    } else {
      tx.sign(_signingKey)
    }

    return tx.toBuffer().toString('hex')
  }

  /**
   * Get the script hex for the primary account
   */
  function getScriptHex(): string | null {
    return _script?.toHex() ?? null
  }

  /**
   * Get internal public key as string (for Taproot)
   */
  function getInternalPubKeyString(): string | null {
    return _internalPubKey?.toString() ?? null
  }

  /**
   * Get merkle root as hex string (for Taproot)
   */
  function getMerkleRootHex(): string | null {
    return _merkleRoot?.toString('hex') ?? null
  }

  /**
   * Validate a seed phrase
   */
  function isValidSeedPhrase(phrase: string): boolean {
    const Mnemonic = getMnemonic()
    return Mnemonic.isValid(phrase)
  }

  // =========================================================================
  // Return public API
  // =========================================================================
  return {
    // State
    initialized,
    sdkReady,
    loading,
    loadingMessage,
    seedPhrase,
    addressType,
    tipHeight,
    tipHash,
    connected,
    transactionHistory,
    parsedTransactions,
    historyLoading,
    accounts,
    accountUtxos,
    address,
    scriptPayload,
    balance,
    utxos,

    // Getters
    balanceXPI,
    spendableXPI,
    formattedBalance,
    formattedSpendable,
    hasBalance,
    utxoCount,
    recentTransactions,
    getSpendableUtxos,
    getTransactionsWithContact,

    // Actions
    initialize,
    createNewWallet,
    restoreWallet,
    switchAddressType,
    buildWalletFromMnemonic,
    loadWallet,
    saveWalletState,
    getChronikScriptType,
    initializeChronik,
    subscribeToAllAccounts,
    initializeBackgroundMonitoring,
    syncWithServiceWorker,
    notifyTabBackgrounded,
    handleBackgroundTransaction,
    notifyPendingTransaction,
    handleAddedToMempool,
    handleRemovedFromMempool,
    handleConfirmed,
    handleBlockConnected,
    refreshUtxos,
    fetchTransactionHistory,
    fetchParsedTransactions,
    recalculateBalance,
    signMessage,
    verifyMessage,
    getPrivateKeyHex,
    getPublicKeyHex,
    getAccountAddress,
    getAccountScriptPayload,
    getAccount,
    getAccountKeyData,
    getAccountBalance,
    getTotalBalance,
    disconnect,
    switchNetwork,
    getCurrentNetwork,
    getMnemonic: getWalletMnemonic,
    getTransactionBuildContext,
    isReadyForSigning,
    signTransactionHex,
    getScriptHex,
    getInternalPubKeyString,
    getMerkleRootHex,
    isValidSeedPhrase,
  }
})
