/**
 * Wallet Store
 * Manages wallet state, UTXO cache, and blockchain interactions
 *
 * NOTE: This store uses the centralized Bitcore SDK provider from
 * ~/plugins/bitcore.client.ts which is initialized at app startup.
 * The SDK is guaranteed to be available before any component renders.
 */
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { useNetworkStore, type NetworkType } from './network'
import { useNotificationStore } from './notifications'
import {
  getBitcore,
  ensureBitcore,
  isBitcoreLoaded,
} from '~/plugins/bitcore.client'
import { getRawItem, setRawItem, STORAGE_KEYS } from '~/utils/storage'
import {
  initializeChronik,
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
import type * as BitcoreTypes from 'lotus-sdk/lib/bitcore'
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
  addressType: 'p2pkh' | 'p2tr'
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

// Constants
const BIP44_PURPOSE = 44
const BIP44_COINTYPE = 10605
const LOTUS_DECIMALS = 6
const MAX_TX_SIZE = 100_000 // bytes
const MAX_TX_OUTPUTS = 100
const DUST_THRESHOLD = 546n

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
 * - 'p2tr': Pay-to-Taproot (modern, enhanced privacy and script capabilities)
 */
export type AddressType = 'p2pkh' | 'p2tr'

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

export const useWalletStore = defineStore('wallet', {
  state: (): WalletState => ({
    initialized: false,
    sdkReady: false,
    loading: false,
    loadingMessage: '',
    seedPhrase: '',
    addressType: 'p2tr', // Default to Taproot addresses
    tipHeight: 0,
    tipHash: '',
    connected: false,
    transactionHistory: [],
    parsedTransactions: [],
    historyLoading: false,

    // Multi-account state
    accounts: new Map(),
    accountUtxos: new Map(),

    // Legacy compatibility fields (derived from PRIMARY account)
    address: '',
    scriptPayload: '',
    balance: { total: '0', spendable: '0' },
    utxos: new Map(),
  }),

  getters: {
    balanceXPI: state => toLotusUnits(state.balance.total),
    spendableXPI: state => toLotusUnits(state.balance.spendable),
    formattedBalance: state => toXPI(state.balance.total),
    formattedSpendable: state => toXPI(state.balance.spendable),
    hasBalance: state => BigInt(state.balance.total) > 0n,
    utxoCount: state => state.utxos.size,

    /**
     * Get spendable UTXOs (excluding immature coinbase)
     */
    getSpendableUtxos: state => {
      return () => {
        const result: Array<{
          outpoint: string
          value: string
          height: number
          isCoinbase: boolean
        }> = []
        for (const [outpoint, utxo] of state.utxos) {
          if (utxo.isCoinbase) {
            const confirmations =
              utxo.height > 0 ? state.tipHeight - utxo.height + 1 : 0
            if (confirmations >= 100) {
              result.push({ outpoint, ...utxo })
            }
          } else {
            result.push({ outpoint, ...utxo })
          }
        }
        return result
      }
    },

    /**
     * Get transactions involving a specific contact address
     * Returns transactions where the contact's address appears in inputs or outputs
     */
    getTransactionsWithContact: state => {
      return (contactAddress: string): TransactionHistoryItem[] => {
        if (!contactAddress) return []
        const lowerAddress = contactAddress.toLowerCase()
        return state.transactionHistory.filter(
          tx => tx.address.toLowerCase() === lowerAddress,
        )
      }
    },

    /**
     * Get recent transactions (last N)
     */
    recentTransactions: state => {
      return state.transactionHistory.slice(0, 10)
    },
  },

  actions: {
    // Private state for runtime objects (not serializable)
    _hdPrivkey: null as any,
    /** Runtime key data per account (not persisted) */
    _accountKeys: new Map() as Map<AccountPurpose, RuntimeKeyData>,

    // Legacy compatibility (derived from PRIMARY account)
    _signingKey: null as any,
    _script: null as any,
    /** Internal public key for Taproot key-path spending (before tweaking)
     * Stored as Buffer to avoid Vue reactivity issues with PublicKey class */
    _internalPubKey: undefined as any,
    /** Merkle root is required in UTXO data for Taproot key-path spending */
    _merkleRoot: undefined as Buffer | undefined,

    /**
     * Initialize the wallet - load from storage or create new
     * SDK loading and wallet creation are blocking, but network connection happens in background
     *
     * NOTE: The Bitcore SDK is already loaded by the bitcore.client.ts plugin
     * before this store is used. We just need to load Chronik separately.
     */
    async initialize() {
      // Prevent double initialization
      if (this.initialized || this.loading) return

      this.loading = true
      this.loadingMessage = 'Loading...'

      try {
        // Ensure Bitcore SDK is loaded (should already be loaded by plugin)
        await ensureBitcore()

        this.loadingMessage = 'Initializing wallet...'

        // Check for existing wallet in storage
        const savedState = getRawItem(STORAGE_KEYS.WALLET_STATE)

        if (savedState) {
          await this.loadWallet(JSON.parse(savedState))
        } else {
          // Generate new wallet
          await this.createNewWallet()
        }

        // SDK is ready - wallet can be used locally now
        this.sdkReady = true
        this.loading = false
        this.loadingMessage = ''

        // Initialize Chronik connection in background (non-blocking)
        // This allows pages to render while network connects
        this.initializeChronik()
          .then(() => {
            this.initialized = true
          })
          .catch(error => {
            console.error('Failed to connect to network:', error)
            // Still mark as initialized so UI is usable, just disconnected
            this.initialized = true
          })
      } catch (error) {
        console.error('Failed to initialize wallet:', error)
        this.loadingMessage = 'Failed to initialize wallet'
        this.loading = false
      }
    },

    /**
     * Create a new wallet with fresh mnemonic
     */
    async createNewWallet() {
      this.loadingMessage = 'Generating new wallet...'

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

      await this.buildWalletFromMnemonic(mnemonic)
      await this.saveWalletState()
    },

    /**
     * Restore wallet from seed phrase
     */
    async restoreWallet(seedPhrase: string) {
      // Validate mnemonic
      let isValid: boolean
      if (USE_CRYPTO_WORKER && typeof Worker !== 'undefined') {
        const { validateMnemonic } = useCryptoWorker()
        isValid = await validateMnemonic(seedPhrase)
      } else {
        const Mnemonic = getMnemonic()
        isValid = Mnemonic.isValid(seedPhrase)
      }

      if (!isValid) {
        throw new Error('Invalid seed phrase')
      }

      this.loading = true
      this.loadingMessage = 'Restoring wallet...'

      try {
        // Clear existing state
        this.transactionHistory = []
        this.utxos = new Map()
        this.balance = { total: '0', spendable: '0' }

        await this.buildWalletFromMnemonic(seedPhrase)
        await this.saveWalletState()

        // Disconnect and reconnect Chronik with new address
        disconnectWebSocket()
        await this.initializeChronik()
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    /**
     * Switch the wallet address type between P2PKH and P2TR
     * This regenerates the address from the same seed phrase
     */
    async switchAddressType(newType: AddressType) {
      if (this.addressType === newType) return
      if (!this.seedPhrase) {
        throw new Error('Wallet not initialized')
      }

      this.loading = true
      this.loadingMessage = `Switching to ${
        newType === 'p2tr' ? 'Modern' : 'Classic'
      } address...`

      try {
        // Clear existing state
        this.transactionHistory = []
        this.parsedTransactions = []
        this.utxos = new Map()
        this.balance = { total: '0', spendable: '0' }

        // Update address type and rebuild wallet
        this.addressType = newType
        await this.buildWalletFromMnemonic(this.seedPhrase)
        await this.saveWalletState()

        // Disconnect and reconnect Chronik with new address
        disconnectWebSocket()
        await this.initializeChronik()
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    /**
     * Build wallet state from mnemonic
     * Uses the current network from the network store for address encoding
     * Supports both P2PKH and P2TR (Taproot) address types
     * Derives keys for all enabled accounts (PRIMARY, MUSIG2, etc.)
     *
     * When USE_CRYPTO_WORKER is enabled, key derivation is offloaded to a
     * Web Worker to prevent UI blocking during the CPU-intensive operation.
     */
    async buildWalletFromMnemonic(seedPhrase: string) {
      const networkStore = useNetworkStore()

      // Initialize multi-account state
      this.accounts = new Map()
      this.accountUtxos = new Map()
      this._accountKeys = new Map()

      // Derive keys for each enabled account
      for (const config of DEFAULT_ACCOUNTS) {
        if (!config.enabled) continue

        const accountState = await this._deriveAccountKeys(
          seedPhrase,
          config.purpose,
          networkStore.currentNetwork,
        )

        this.accounts.set(config.purpose, accountState)
        this.accountUtxos.set(config.purpose, {
          utxos: new Map(),
          balance: { total: '0', spendable: '0' },
        })
      }

      // Update legacy compatibility fields from PRIMARY account
      const primaryAccount = this.accounts.get(AccountPurpose.PRIMARY)
      const primaryKeys = this._accountKeys.get(AccountPurpose.PRIMARY)

      if (primaryAccount?.primaryAddress && primaryKeys) {
        this.address = primaryAccount.primaryAddress.address
        this.scriptPayload = primaryAccount.primaryAddress.scriptPayload

        // Legacy runtime objects
        this._signingKey = primaryKeys.privateKey
        this._script = primaryKeys.script
        this._internalPubKey = primaryKeys.internalPubKey
        this._merkleRoot = primaryKeys.merkleRoot
      }

      this.seedPhrase = seedPhrase
      this.utxos = new Map()
      this.balance = { total: '0', spendable: '0' }
    },

    /**
     * Derive keys for a specific account
     * @internal
     */
    async _deriveAccountKeys(
      seedPhrase: string,
      accountPurpose: AccountPurpose,
      networkName: string,
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
        // Use crypto worker for key derivation (non-blocking)
        const { deriveKeys } = useCryptoWorker()
        const result = await deriveKeys(
          seedPhrase,
          this.addressType,
          networkName,
          accountIndex,
          addressIndex,
          isChange,
        )

        // Reconstruct runtime objects from worker results
        const PrivateKey = getPrivateKey()
        const Script = getScript()
        const Address = getAddress()
        const Networks = getNetworks()
        const network = Networks.get(networkName)

        const signingKey = new PrivateKey(result.privateKeyHex)
        let script: any
        let internalPubKey: any
        let merkleRoot: Buffer | undefined

        if (this.addressType === 'p2tr' && result.internalPubKeyHex) {
          const PublicKey = getBitcoreSDK().PublicKey
          internalPubKey = new PublicKey(result.internalPubKeyHex)
          merkleRoot = result.merkleRootHex
            ? Buffer.from(result.merkleRootHex, 'hex')
            : Buffer.alloc(32)
          const commitment = getTweakPublicKey()(internalPubKey, merkleRoot)
          script = getBuildPayToTaproot()(commitment)
        } else {
          const address = Address.fromString(result.address)
          script = Script.fromAddress(address)
        }

        // Store runtime key data for this account
        this._accountKeys.set(accountPurpose, {
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
        // Fallback to main thread derivation
        const Networks = getNetworks()
        const Mnemonic = getMnemonic()
        const HDPrivateKey = getHDPrivateKey()
        const Address = getAddress()
        const Script = getScript()
        const network = Networks.get(networkName)

        const mnemonic = new Mnemonic(seedPhrase)
        const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())
        const change = isChange ? 1 : 0
        const signingKey = hdPrivkey
          .deriveChild(BIP44_PURPOSE, true)
          .deriveChild(BIP44_COINTYPE, true)
          .deriveChild(accountIndex, true)
          .deriveChild(change)
          .deriveChild(addressIndex).privateKey

        let address: any
        let script: any
        let internalPubKey: any
        let merkleRoot: Buffer | undefined

        if (this.addressType === 'p2tr') {
          internalPubKey = signingKey.publicKey
          merkleRoot = Buffer.alloc(32)
          const commitment = getTweakPublicKey()(internalPubKey, merkleRoot)
          address = Address.fromTaprootCommitment(commitment, network)
          script = getBuildPayToTaproot()(commitment)
        } else {
          address = signingKey.toAddress(network)
          script = Script.fromAddress(address)
        }

        // Store HD private key for potential future derivations
        this._hdPrivkey = markRaw(hdPrivkey)

        // Store runtime key data for this account
        this._accountKeys.set(accountPurpose, {
          privateKey: markRaw(signingKey),
          publicKey: markRaw(signingKey.publicKey),
          script: markRaw(script),
          internalPubKey: internalPubKey ? markRaw(internalPubKey) : undefined,
          merkleRoot,
        })

        const addressStr = address.toXAddress(network)
        const scriptPayload = script.getData().toString('hex')

        const derivedAddress: DerivedAddress = {
          index: addressIndex,
          isChange,
          path: derivationPath,
          address: addressStr,
          scriptPayload,
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
    },

    /**
     * Load wallet from saved state
     */
    async loadWallet(
      savedState: Partial<WalletState> & { seedPhrase: string },
    ) {
      this.loadingMessage = 'Loading wallet...'

      // Restore address type before building wallet (affects address generation)
      if (savedState.addressType) {
        this.addressType = savedState.addressType
      }

      await this.buildWalletFromMnemonic(savedState.seedPhrase)

      // Restore cached data
      if (savedState.utxos) {
        this.utxos = new Map(Object.entries(savedState.utxos))
      }
      if (savedState.balance) {
        this.balance = savedState.balance
      }
      if (savedState.tipHeight) {
        this.tipHeight = savedState.tipHeight
      }
      if (savedState.tipHash) {
        this.tipHash = savedState.tipHash
      }
    },

    /**
     * Save wallet state to storage service
     */
    async saveWalletState() {
      const state = {
        seedPhrase: this.seedPhrase,
        address: this.address,
        addressType: this.addressType,
        scriptPayload: this.scriptPayload,
        balance: this.balance,
        utxos: Object.fromEntries(this.utxos),
        tipHeight: this.tipHeight,
        tipHash: this.tipHash,
      }
      setRawItem(STORAGE_KEYS.WALLET_STATE, JSON.stringify(state))
    },

    /**
     * Get the Chronik script type for the current address type
     * Chronik uses 'p2tr-commitment' for key-path-only Taproot (no state)
     */
    getChronikScriptType(): ChronikScriptType {
      return this.addressType === 'p2tr' ? 'p2tr-commitment' : 'p2pkh'
    },

    /**
     * Initialize Chronik client and WebSocket
     * Uses the Chronik service for all blockchain interactions
     */
    async initializeChronik() {
      this.loadingMessage = 'Connecting to network...'

      const networkStore = useNetworkStore()
      const scriptType = this.getChronikScriptType()

      // Initialize Chronik service with callbacks for real-time events
      await initializeChronik({
        network: networkStore.config,
        scriptPayload: this.scriptPayload,
        scriptType,
        onTransaction: txid => this.handleAddedToMempool(txid),
        onConnectionChange: connected => {
          this.connected = connected
          if (connected) {
            // Refresh UTXOs on reconnect
            this.refreshUtxos().catch(console.error)
          }
        },
        onBlock: (_height, hash) => this.handleBlockConnected(hash),
        onConfirmed: txid => this.handleConfirmed(txid),
        onRemovedFromMempool: txid => this.handleRemovedFromMempool(txid),
      })

      // Fetch blockchain info
      const blockchainInfo = await fetchBlockchainInfo()
      if (blockchainInfo) {
        this.tipHeight = blockchainInfo.tipHeight
        this.tipHash = blockchainInfo.tipHash
      }

      // Reset and fetch UTXOs
      await this.refreshUtxos()

      // Fetch transaction history
      await this.fetchTransactionHistory()

      // Connect WebSocket for real-time updates
      await connectWebSocket()

      // Subscribe to all account addresses for multi-account support
      await this.subscribeToAllAccounts()

      // Initialize background monitoring via service worker
      this.initializeBackgroundMonitoring()

      // Handle mobile browser tab visibility changes
      // Mobile browsers aggressively suspend background tabs, causing stale state
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            if (isChronikInitialized()) {
              // Refresh UTXOs when tab becomes visible to ensure fresh state
              this.refreshUtxos().catch(console.error)
            }
            // Sync with service worker state
            this.syncWithServiceWorker()
          } else {
            // Tab going to background - notify SW for adaptive polling
            this.notifyTabBackgrounded()
          }
        })
      }
    },

    /**
     * Subscribe to all account addresses for real-time updates
     * Used for multi-account support (PRIMARY, MUSIG2, etc.)
     */
    async subscribeToAllAccounts(): Promise<void> {
      const scriptType = this.getChronikScriptType()
      const subscriptions: ChronikSubscription[] = []

      for (const [purpose, account] of this.accounts) {
        if (account.primaryAddress) {
          subscriptions.push({
            scriptType,
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
    },

    /**
     * Initialize background monitoring via service worker
     * Starts SW polling as fallback when WebSocket is suspended
     */
    initializeBackgroundMonitoring() {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return
      }

      const networkStore = useNetworkStore()

      navigator.serviceWorker.ready.then(registration => {
        if (!registration.active) return

        // Initialize UTXO cache in SW
        const utxoIds = [...this.utxos.keys()]
        registration.active.postMessage({
          type: 'INIT_UTXO_CACHE',
          payload: {
            scriptPayload: this.scriptPayload,
            utxoIds,
          },
        })

        // Start monitoring
        registration.active.postMessage({
          type: 'START_MONITORING',
          payload: {
            chronikUrl: networkStore.config.chronikUrl,
            pollingInterval: 60_000, // 1 minute default
            addresses: [this.address],
            scriptType: this.getChronikScriptType(),
            scriptPayload: this.scriptPayload,
          },
        })
      })
    },

    /**
     * Sync state with service worker when tab becomes visible
     */
    syncWithServiceWorker() {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return
      }

      // Refresh balance from SW-detected changes will happen via message handler
      // Just ensure SW has latest UTXO state
      navigator.serviceWorker.ready.then(registration => {
        if (!registration.active) return

        const utxoIds = [...this.utxos.keys()]
        registration.active.postMessage({
          type: 'INIT_UTXO_CACHE',
          payload: {
            scriptPayload: this.scriptPayload,
            utxoIds,
          },
        })
      })
    },

    /**
     * Notify service worker that tab is going to background
     * Triggers adaptive polling increase
     */
    notifyTabBackgrounded() {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return
      }

      navigator.serviceWorker.ready.then(registration => {
        if (!registration.active) return

        registration.active.postMessage({
          type: 'TAB_BACKGROUNDED',
        })
      })
    },

    /**
     * Handle transaction detected by service worker background polling
     * Called when SW detects a new transaction while tab was backgrounded
     */
    async handleBackgroundTransaction(payload: {
      txid: string
      amount: string
      isIncoming: boolean
    }) {
      // Refresh UTXOs to get the latest state
      await this.refreshUtxos()

      // Notification is triggered by the SW, but we can also trigger here
      // if the SW didn't (e.g., tab became visible before SW notification)
      if (shouldNotify(payload.txid)) {
        const notificationStore = useNotificationStore()
        notificationStore.addTransactionNotification(
          payload.txid,
          toXPI(payload.amount),
          !payload.isIncoming,
        )
      }
    },

    /**
     * Notify SW of pending transaction (increases polling frequency)
     */
    notifyPendingTransaction(hasPending: boolean) {
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
    },

    /**
     * Handle transaction added to mempool
     * Detects both new outputs (receives) and spent inputs (sends)
     */
    async handleAddedToMempool(txid: string) {
      if (!isChronikInitialized() || !this._script) return

      const tx = await fetchTransaction(txid)
      if (!tx) return

      const scriptHex = this._script.toHex()
      let changed = false
      let inputAmount = 0n
      let outputAmount = 0n

      // Check for spent inputs (UTXOs being consumed by this transaction)
      for (const input of tx.inputs) {
        if (input.outputScript === scriptHex) {
          const outpoint = `${input.prevOut.txid}_${input.prevOut.outIdx}`
          if (this.utxos.has(outpoint)) {
            inputAmount += BigInt(input.value || '0')
            this.utxos.delete(outpoint)
            changed = true
          }
        }
      }

      // Check for new outputs (UTXOs being created for this wallet)
      for (let i = 0; i < tx.outputs.length; i++) {
        const output = tx.outputs[i]
        if (output.outputScript === scriptHex) {
          const outpoint = `${txid}_${i}`
          if (!this.utxos.has(outpoint)) {
            outputAmount += BigInt(output.value || '0')
            this.utxos.set(outpoint, {
              value: output.value,
              height: -1,
              isCoinbase: tx.isCoinbase,
            })
            changed = true
          }
        }
      }

      if (changed) {
        this.recalculateBalance()
        await this.saveWalletState()

        // Trigger notification for this transaction
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
    },

    /**
     * Handle transaction removed from mempool
     */
    async handleRemovedFromMempool(txid: string) {
      let changed = false
      for (const [outpoint] of this.utxos) {
        if (outpoint.startsWith(txid)) {
          this.utxos.delete(outpoint)
          changed = true
        }
      }
      if (changed) {
        this.recalculateBalance()
        await this.saveWalletState()
      }
    },

    /**
     * Handle transaction confirmed
     */
    async handleConfirmed(txid: string) {
      if (!isChronikInitialized()) return

      const tx = await fetchTransaction(txid)
      if (!tx) return

      let changed = false

      for (const [outpoint, utxo] of this.utxos) {
        if (outpoint.startsWith(txid)) {
          utxo.height = tx.block?.height ?? -1
          changed = true
        }
      }

      if (changed) {
        this.recalculateBalance()
        await this.saveWalletState()
      }
    },

    /**
     * Handle new block connected
     */
    async handleBlockConnected(blockHash: string) {
      if (!isChronikInitialized()) return

      const block = (await fetchBlock(blockHash)) as any
      this.tipHeight = block.blockInfo.height
      this.tipHash = blockHash

      this.recalculateBalance()
      await this.saveWalletState()
    },

    /**
     * Refresh UTXOs from Chronik service
     */
    async refreshUtxos() {
      if (!isChronikInitialized()) return

      this.utxos.clear()

      const utxos = await fetchUtxos()
      for (const utxo of utxos) {
        const outpoint = `${utxo.outpoint.txid}_${utxo.outpoint.outIdx}`
        this.utxos.set(outpoint, {
          value: utxo.value,
          height: utxo.blockHeight,
          isCoinbase: utxo.isCoinbase,
        })
      }

      this.recalculateBalance()
      await this.saveWalletState()
    },

    /**
     * Fetch transaction history from Chronik service
     */
    async fetchTransactionHistory(pageSize: number = 25, page: number = 0) {
      if (!isChronikInitialized() || !this._script) return

      this.historyLoading = true
      try {
        const { txs } = await serviceFetchHistory(page, pageSize)
        const scriptHex = this._script.toHex()
        const history: TransactionHistoryItem[] = []

        for (const tx of txs) {
          // Calculate net amount for this address
          let inputAmount = 0n
          let outputAmount = 0n
          let counterpartyScript = ''

          // Sum inputs from our address
          for (const input of tx.inputs) {
            if (input.outputScript === scriptHex) {
              inputAmount += BigInt(input.value)
            }
          }

          // Sum outputs to our address and find counterparty
          for (const output of tx.outputs) {
            if (output.outputScript === scriptHex) {
              outputAmount += BigInt(output.value)
            } else if (!counterpartyScript && output.outputScript) {
              // First non-self output is likely the counterparty
              counterpartyScript = output.outputScript
            }
          }

          const isSend = inputAmount > outputAmount
          const netAmount = isSend
            ? (inputAmount - outputAmount).toString()
            : (outputAmount - inputAmount).toString()

          // For receives, counterparty is the first input
          if (!isSend && tx.inputs.length > 0 && tx.inputs[0].outputScript) {
            counterpartyScript = tx.inputs[0].outputScript
          }

          // Convert script hex to Lotus address
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
              // If we can't parse the script, leave address empty
              // This can happen for OP_RETURN or non-standard scripts
            }
          }

          const blockHeight = tx.block?.height ?? -1
          const confirmations =
            blockHeight > 0 ? this.tipHeight - blockHeight + 1 : 0

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

        this.transactionHistory = history

        // Also fetch parsed transactions from Explorer API
        await this.fetchParsedTransactions(txs.map((tx: any) => tx.txid))
      } finally {
        this.historyLoading = false
      }
    },

    /**
     * Fetch parsed transactions from the Explorer API
     * This provides richer transaction data including RANK votes, burns, etc.
     */
    async fetchParsedTransactions(txids: string[]) {
      if (!this.address || txids.length === 0) return

      try {
        const { fetchTransaction, parseTransaction } = await import(
          '~/composables/useExplorerApi'
        ).then(m => m.useExplorerApi())

        const parsed: any[] = []

        // Fetch transactions in parallel batches
        const BATCH_SIZE = 5
        for (let i = 0; i < txids.length; i += BATCH_SIZE) {
          const batch = txids.slice(i, i + BATCH_SIZE)
          const promises = batch.map(txid => fetchTransaction(txid))
          const results = await Promise.all(promises)

          for (const tx of results) {
            if (tx) {
              parsed.push(parseTransaction(tx, this.address))
            }
          }
        }

        this.parsedTransactions = parsed
      } catch (error) {
        console.error('Failed to fetch parsed transactions:', error)
        // Keep existing transactionHistory as fallback
      }
    },

    /**
     * Recalculate balance from UTXOs
     */
    recalculateBalance() {
      let total = 0n
      let spendable = 0n

      for (const [outpoint, utxo] of this.utxos) {
        const value = BigInt(utxo.value)
        total += value

        // Coinbase UTXOs need 100 confirmations
        if (utxo.isCoinbase) {
          const confirmations =
            utxo.height > 0 ? this.tipHeight - utxo.height + 1 : 0
          if (confirmations >= 100) {
            spendable += value
          }
        } else {
          spendable += value
        }
      }

      this.balance = {
        total: total.toString(),
        spendable: spendable.toString(),
      }
    },

    /**
     * Sign a message with the wallet's private key
     */
    signMessage(text: string): string {
      if (!this._signingKey) {
        throw new Error('Wallet not initialized')
      }
      const Message = getMessage()
      const message = new Message(text)
      return message.sign(this._signingKey)
    },

    /**
     * Verify a signed message
     */
    verifyMessage(text: string, address: string, signature: string): boolean {
      const Message = getMessage()
      const message = new Message(text)
      return message.verify(address, signature)
    },

    /**
     * Validate a seed phrase
     */
    isValidSeedPhrase(seedPhrase: string): boolean {
      if (!isBitcoreLoaded()) return false
      const Mnemonic = getMnemonic()
      return Mnemonic.isValid(seedPhrase)
    },

    /**
     * Validate a Lotus address
     */
    isValidAddress(address: string): boolean {
      if (!isBitcoreLoaded()) return false
      const Address = getAddress()
      return Address.isValid(address)
    },

    /**
     * Get the private key (hex encoded) for a specific account
     * @param accountPurpose - Account to get key for (defaults to PRIMARY)
     * @returns Private key hex or null if not available
     */
    getPrivateKeyHex(
      accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
    ): string | null {
      const keyData = this._accountKeys.get(accountPurpose)
      if (!keyData?.privateKey) return null
      return keyData.privateKey.toString()
    },

    /**
     * Get the public key (hex encoded) for a specific account
     * @param accountPurpose - Account to get key for (defaults to PRIMARY)
     * @returns Public key hex or null if not available
     */
    getPublicKeyHex(
      accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
    ): string | null {
      const keyData = this._accountKeys.get(accountPurpose)
      if (!keyData?.publicKey) return null
      return keyData.publicKey.toString()
    },

    /**
     * Get the address for a specific account
     * @param accountPurpose - Account to get address for (defaults to PRIMARY)
     * @returns Address string or null if not available
     */
    getAccountAddress(
      accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
    ): string | null {
      const account = this.accounts.get(accountPurpose)
      return account?.primaryAddress?.address ?? null
    },

    /**
     * Get the script payload for a specific account
     * @param accountPurpose - Account to get script for (defaults to PRIMARY)
     * @returns Script payload hex or null if not available
     */
    getAccountScriptPayload(
      accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
    ): string | null {
      const account = this.accounts.get(accountPurpose)
      return account?.primaryAddress?.scriptPayload ?? null
    },

    /**
     * Get the account state for a specific purpose
     * @param accountPurpose - Account purpose to retrieve
     * @returns AccountState or undefined if not found
     */
    getAccount(accountPurpose: AccountPurpose): AccountState | undefined {
      return this.accounts.get(accountPurpose)
    },

    /**
     * Get the runtime key data for a specific account
     * @param accountPurpose - Account purpose to retrieve
     * @returns RuntimeKeyData or undefined if not found
     */
    getAccountKeyData(
      accountPurpose: AccountPurpose,
    ): RuntimeKeyData | undefined {
      return this._accountKeys.get(accountPurpose)
    },

    /**
     * Get the balance for a specific account
     * @param accountPurpose - Account to get balance for (defaults to PRIMARY)
     * @returns WalletBalance for the account
     */
    getAccountBalance(
      accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
    ): WalletBalance {
      const utxoState = this.accountUtxos.get(accountPurpose)
      return utxoState?.balance ?? { total: '0', spendable: '0' }
    },

    /**
     * Get the total balance across all accounts
     * @returns Combined WalletBalance
     */
    getTotalBalance(): WalletBalance {
      let total = 0n
      let spendable = 0n

      for (const utxoState of this.accountUtxos.values()) {
        total += BigInt(utxoState.balance.total)
        spendable += BigInt(utxoState.balance.spendable)
      }

      return {
        total: total.toString(),
        spendable: spendable.toString(),
      }
    },

    /**
     * Disconnect and cleanup
     */
    async disconnect() {
      disconnectWebSocket()
      this.connected = false
    },

    /**
     * Switch network and reinitialize wallet
     * The same seed phrase works on all networks, only the address encoding changes
     */
    async switchNetwork(network: NetworkType) {
      const networkStore = useNetworkStore()
      const changed = await networkStore.switchNetwork(network)

      if (!changed) return

      this.loading = true
      this.loadingMessage = `Switching to ${networkStore.displayName}...`

      try {
        // Disconnect existing WebSocket
        disconnectWebSocket()

        // Clear cached data for new network
        this.transactionHistory = []
        this.parsedTransactions = []
        this.utxos = new Map()
        this.balance = { total: '0', spendable: '0' }

        // Rebuild wallet with new network encoding
        await this.buildWalletFromMnemonic(this.seedPhrase)
        await this.saveWalletState()

        // Reconnect to new network's Chronik
        await this.initializeChronik()
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    /**
     * Get the current network type
     */
    getCurrentNetwork(): NetworkType {
      const networkStore = useNetworkStore()
      return networkStore.currentNetwork
    },

    // =========================================================================
    // Phase 13 Integration: Onboarding Support
    // =========================================================================

    /**
     * Get the mnemonic seed phrase (for backup display)
     * Only returns if wallet is initialized
     * @returns The seed phrase or null if not available
     */
    getMnemonic(): string | null {
      if (!this.initialized || !this.seedPhrase) return null
      return this.seedPhrase
    },

    // =========================================================================
    // Transaction Building API (Phase 1: Encapsulation Fix)
    // =========================================================================

    /**
     * Get transaction building context for the primary account.
     * This provides all data needed to build a transaction without
     * exposing internal private properties.
     *
     * @returns Transaction context or null if wallet not initialized
     */
    getTransactionBuildContext(): WalletTransactionBuildContext | null {
      if (!this._script || !this.address) return null

      return {
        script: this._script,
        addressType: this.addressType,
        changeAddress: this.address,
        internalPubKey: this._internalPubKey,
        merkleRoot: this._merkleRoot,
      }
    },

    /**
     * Check if wallet is ready for transaction signing.
     * Use this instead of checking private properties directly.
     */
    isReadyForSigning(): boolean {
      return !!(this._signingKey && this._script && this.initialized)
    },

    /**
     * Sign a transaction and return the signed hex.
     * Handles both P2PKH and P2TR signing internally.
     *
     * @param tx - Unsigned Bitcore Transaction
     * @returns Signed transaction as hex string
     * @throws Error if wallet not initialized for signing
     */
    signTransactionHex(
      tx: InstanceType<typeof BitcoreTypes.Transaction>,
    ): string {
      if (!this._signingKey) {
        throw new Error('Wallet not initialized for signing')
      }

      if (this.addressType === 'p2tr') {
        tx.signSchnorr(this._signingKey)
      } else {
        tx.sign(this._signingKey)
      }

      return tx.toBuffer().toString('hex')
    },

    /**
     * Get the script hex for the primary account.
     * Used for UTXO signing data.
     */
    getScriptHex(): string | null {
      return this._script?.toHex() ?? null
    },

    /**
     * Get internal public key as string (for Taproot).
     * Returns null for non-Taproot addresses.
     */
    getInternalPubKeyString(): string | null {
      return this._internalPubKey?.toString() ?? null
    },

    /**
     * Get merkle root as hex string (for Taproot).
     * Returns null for non-Taproot addresses.
     */
    getMerkleRootHex(): string | null {
      return this._merkleRoot?.toString('hex') ?? null
    },
  },
})
