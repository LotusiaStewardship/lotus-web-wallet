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
import {
  getBitcore,
  ensureBitcore,
  isBitcoreLoaded,
} from '~/plugins/bitcore.client'
import type * as BitcoreTypes from 'lotus-sdk/lib/bitcore'
import type {
  ChronikClient as ChronikClientType,
  ScriptEndpoint,
} from 'chronik-client'

// Chronik client (loaded dynamically)
let ChronikClient: typeof ChronikClientType
let chronikLoaded = false

const loadChronik = async () => {
  if (!chronikLoaded) {
    const chronikModule = await import('chronik-client')
    ChronikClient = chronikModule.ChronikClient
    chronikLoaded = true
  }
  return ChronikClient
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
const MAX_TX_SIZE = 100_000
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
 * Recipient for draft transaction
 */
export interface DraftRecipient {
  /** Unique ID for UI tracking */
  id: string
  /** Recipient address (Lotus format) */
  address: string
  /** Amount in satoshis */
  amountSats: bigint
  /** Whether this is a "send max" recipient (gets remaining balance after fees) */
  sendMax: boolean
}

/**
 * OP_RETURN data configuration
 */
export interface DraftOpReturn {
  /** Raw data to include */
  data: string
  /** Encoding of the data */
  encoding: 'utf8' | 'hex'
}

/**
 * Locktime configuration
 */
export interface DraftLocktime {
  /** Type of locktime */
  type: 'block' | 'time'
  /** Value (block height or unix timestamp) */
  value: number
}

/**
 * Draft transaction state - managed by wallet store
 * This represents the transaction being built in the UI
 */
export interface DraftTransactionState {
  /** Whether the draft transaction has been initialized */
  initialized: boolean
  /** Recipients list */
  recipients: DraftRecipient[]
  /** Fee rate in sat/byte */
  feeRate: number
  /** Selected UTXOs for coin control (empty = auto-select all) */
  selectedUtxos: string[]
  /** OP_RETURN data (optional) */
  opReturn: DraftOpReturn | null
  /** Locktime (optional) */
  locktime: DraftLocktime | null
  /** Computed: estimated fee in satoshis */
  estimatedFee: number
  /** Computed: total input amount in satoshis (available balance) */
  inputAmount: bigint
  /** Computed: total output amount (excluding change) in satoshis */
  outputAmount: bigint
  /** Computed: change amount in satoshis */
  changeAmount: bigint
  /** Computed: max sendable for a single recipient (no change output) */
  maxSendable: bigint
  /** Computed: whether the transaction is valid and ready to send */
  isValid: boolean
  /** Computed: validation error message if not valid */
  validationError: string | null
}

/**
 * Address type for wallet generation
 * - 'p2pkh': Pay-to-Public-Key-Hash (legacy, smaller addresses)
 * - 'p2tr': Pay-to-Taproot (modern, enhanced privacy and script capabilities)
 */
export type AddressType = 'p2pkh' | 'p2tr'

export interface WalletState {
  initialized: boolean
  /** SDK is loaded and wallet can be used locally (address, signing, etc.) */
  sdkReady: boolean
  loading: boolean
  loadingMessage: string
  seedPhrase: string
  address: string
  /** The type of address currently in use */
  addressType: AddressType
  scriptPayload: string
  balance: WalletBalance
  utxos: Map<string, UtxoData>
  tipHeight: number
  tipHash: string
  connected: boolean
  transactionHistory: TransactionHistoryItem[]
  /** Parsed transactions from Explorer API (richer data) */
  parsedTransactions: any[] // ParsedTransaction[] - using any to avoid circular import
  historyLoading: boolean
  /** Draft transaction state for the send UI */
  draftTx: DraftTransactionState
}

/**
 * Create initial draft transaction state
 */
const createInitialDraftTx = (): DraftTransactionState => ({
  initialized: false,
  recipients: [],
  feeRate: 1,
  selectedUtxos: [],
  opReturn: null,
  locktime: null,
  estimatedFee: 0,
  inputAmount: 0n,
  outputAmount: 0n,
  changeAmount: 0n,
  maxSendable: 0n,
  isValid: false,
  validationError: null,
})

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
    address: '',
    addressType: 'p2tr', // Default to Taproot addresses
    scriptPayload: '',
    balance: { total: '0', spendable: '0' },
    utxos: new Map(),
    tipHeight: 0,
    tipHash: '',
    connected: false,
    transactionHistory: [],
    parsedTransactions: [],
    historyLoading: false,
    draftTx: createInitialDraftTx(),
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
  },

  actions: {
    // Private state for runtime objects (not serializable)
    _chronik: null as any,
    _ws: null as any,
    _scriptEndpoint: null as ScriptEndpoint | null,
    _hdPrivkey: null as any,
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

        // Load Chronik client
        await loadChronik()

        this.loadingMessage = 'Initializing wallet...'

        // Check for existing wallet in localStorage
        const savedState = localStorage.getItem('lotus-wallet-state')

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

      const Mnemonic = getMnemonic()
      const mnemonic = new Mnemonic()
      await this.buildWalletFromMnemonic(mnemonic.toString())
      await this.saveWalletState()
    },

    /**
     * Restore wallet from seed phrase
     */
    async restoreWallet(seedPhrase: string) {
      const Mnemonic = getMnemonic()
      if (!Mnemonic.isValid(seedPhrase)) {
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

        // Reconnect Chronik with new address
        if (this._ws) {
          // Unsubscribe from old address if websocket exists
          try {
            this._ws.close()
          } catch {
            // Ignore close errors
          }
        }

        // Re-initialize Chronik with new address
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

        // Reconnect Chronik with new address
        if (this._ws) {
          try {
            this._ws.close()
          } catch {
            // Ignore close errors
          }
        }

        // Re-initialize Chronik with new address
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
     */
    async buildWalletFromMnemonic(seedPhrase: string) {
      const networkStore = useNetworkStore()
      const Networks = getNetworks()
      const Mnemonic = getMnemonic()
      const HDPrivateKey = getHDPrivateKey()
      const Address = getAddress()
      const Script = getScript()
      const network = Networks.get(networkStore.currentNetwork)

      const mnemonic = new Mnemonic(seedPhrase)
      const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())
      const signingKey = hdPrivkey
        .deriveChild(BIP44_PURPOSE, true)
        .deriveChild(BIP44_COINTYPE, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(0).privateKey

      let address: any
      let script: any

      if (this.addressType === 'p2tr') {
        // Taproot (P2TR) address generation
        // For key-path-only Taproot, use empty merkle root (all zeros)
        const internalPubKey = signingKey.publicKey
        const merkleRoot = Buffer.alloc(32)
        const commitment = getTweakPublicKey()(internalPubKey, merkleRoot)
        address = Address.fromTaprootCommitment(commitment, network)
        script = getBuildPayToTaproot()(commitment)
        // For Taproot, store the internal public key (before tweaking)
        // This is needed for proper key-path spending
        this._internalPubKey = markRaw(signingKey.publicKey)
        this._merkleRoot = merkleRoot
      } else {
        // Legacy P2PKH address
        address = signingKey.toAddress(network)
        script = Script.fromAddress(address)
      }

      // Store runtime objects (markRaw prevents Vue reactivity which breaks elliptic curve operations)
      this._hdPrivkey = markRaw(hdPrivkey)
      this._signingKey = markRaw(signingKey)
      this._script = markRaw(script)

      // Update state - encode address for current network
      this.seedPhrase = seedPhrase
      this.address = address.toXAddress(network)
      this.scriptPayload = script.getData().toString('hex')
      this.utxos = new Map()
      this.balance = { total: '0', spendable: '0' }
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
     * Save wallet state to localStorage
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
      localStorage.setItem('lotus-wallet-state', JSON.stringify(state))
    },

    /**
     * Get the Chronik script type for the current address type
     * Chronik uses 'p2tr-commitment' for key-path-only Taproot (no state)
     */
    getChronikScriptType(): 'p2pkh' | 'p2tr-commitment' {
      return this.addressType === 'p2tr' ? 'p2tr-commitment' : 'p2pkh'
    },

    /**
     * Initialize Chronik client and WebSocket
     * Uses the Chronik URL from the network store
     */
    async initializeChronik() {
      this.loadingMessage = 'Connecting to network...'

      const networkStore = useNetworkStore()
      const chronikUrl = networkStore.chronikUrl
      const scriptType = this.getChronikScriptType()

      this._chronik = markRaw(new ChronikClient(chronikUrl))
      this._scriptEndpoint = markRaw(
        this._chronik.script(scriptType, this.scriptPayload),
      )

      // Fetch blockchain info
      const blockchainInfo = await this._chronik.blockchainInfo()
      this.tipHeight = blockchainInfo.tipHeight
      this.tipHash = blockchainInfo.tipHash

      // Reset and fetch UTXOs
      await this.refreshUtxos()

      // Fetch transaction history
      await this.fetchTransactionHistory()

      // Setup WebSocket
      this._ws = this._chronik.ws({
        autoReconnect: true,
        onConnect: () => {
          console.log('Chronik WebSocket connected')
          this.connected = true
        },
        onMessage: (msg: any) => this.handleWsMessage(msg),
        onError: (e: any) => {
          console.error('Chronik WebSocket error:', e)
          this.connected = false
        },
        onEnd: () => {
          console.log('Chronik WebSocket disconnected')
          this.connected = false
        },
        onReconnect: async () => {
          console.log('Chronik WebSocket reconnected')
          this.connected = true
          await this.refreshUtxos()
        },
      })

      await this._ws.waitForOpen()
      this._ws.subscribe(scriptType, this.scriptPayload)
    },

    /**
     * Handle WebSocket messages
     */
    async handleWsMessage(msg: any) {
      switch (msg.type) {
        case 'AddedToMempool':
          await this.handleAddedToMempool(msg.txid)
          break
        case 'RemovedFromMempool':
          await this.handleRemovedFromMempool(msg.txid)
          break
        case 'Confirmed':
          await this.handleConfirmed(msg.txid)
          break
        case 'BlockConnected':
          await this.handleBlockConnected(msg.blockHash)
          break
      }
    },

    /**
     * Handle transaction added to mempool
     * Detects both new outputs (receives) and spent inputs (sends)
     */
    async handleAddedToMempool(txid: string) {
      if (!this._chronik || !this._script) return

      const tx = await this._chronik.tx(txid)
      const scriptHex = this._script.toHex()
      let changed = false

      // Check for spent inputs (UTXOs being consumed by this transaction)
      for (const input of tx.inputs) {
        if (input.outputScript === scriptHex) {
          const outpoint = `${input.prevOut.txid}_${input.prevOut.outIdx}`
          if (this.utxos.has(outpoint)) {
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
      if (!this._chronik) return

      const tx = await this._chronik.tx(txid)
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
      if (!this._chronik) return

      const block = await this._chronik.block(blockHash)
      this.tipHeight = block.blockInfo.height
      this.tipHash = blockHash

      this.recalculateBalance()
      await this.saveWalletState()
    },

    /**
     * Refresh UTXOs from Chronik
     */
    async refreshUtxos() {
      if (!this._scriptEndpoint) return

      this.utxos.clear()

      const result = await this._scriptEndpoint.utxos()
      if (result.length > 0) {
        const [{ utxos }] = result
        for (const utxo of utxos) {
          const outpoint = `${utxo.outpoint.txid}_${utxo.outpoint.outIdx}`
          this.utxos.set(outpoint, {
            value: utxo.value,
            height: utxo.blockHeight,
            isCoinbase: utxo.isCoinbase,
          })
        }
      }

      this.recalculateBalance()
      await this.saveWalletState()
    },

    /**
     * Fetch transaction history from Chronik
     */
    async fetchTransactionHistory(pageSize: number = 25, page: number = 0) {
      if (!this._scriptEndpoint || !this._script) return

      this.historyLoading = true
      try {
        const result = await this._scriptEndpoint.history(page, pageSize)
        const scriptHex = this._script.toHex()
        const history: TransactionHistoryItem[] = []

        for (const tx of result.txs) {
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
        await this.fetchParsedTransactions(result.txs.map((tx: any) => tx.txid))
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

    // =========================================================================
    // Draft Transaction Management
    // These methods manage draft transaction metadata. The actual Transaction
    // object is built fresh at send time from _buildTransaction().
    // =========================================================================

    /**
     * Initialize the draft transaction with available balance
     * This should be called when entering the send page to ensure
     * balance is displayed before any recipients are added
     */
    initializeDraftTransaction() {
      this.draftTx = createInitialDraftTx()

      // Calculate available input amount from UTXOs
      const availableUtxos = this._getAvailableUtxos()
      const inputAmount = availableUtxos.reduce(
        (sum, [_, utxo]) => sum + BigInt(utxo.value),
        0n,
      )
      this.draftTx.inputAmount = inputAmount

      // Add a default empty recipient
      this.draftTx.recipients = [
        {
          id: crypto.randomUUID(),
          address: '',
          amountSats: 0n,
          sendMax: false,
        },
      ]

      this.draftTx.initialized = true

      // Note: maxSendable will be calculated by _recalculateDraftMetadata
      // when the user enables sendMax for a recipient
    },

    // =========================================================================
    // Recipient Management
    // These methods manage recipients directly in the store
    // =========================================================================

    /**
     * Add a new empty recipient to the draft transaction
     * @returns The ID of the new recipient
     */
    addDraftRecipient(): string {
      const id = crypto.randomUUID()
      this.draftTx.recipients.push({
        id,
        address: '',
        amountSats: 0n,
        sendMax: false,
      })
      this._recalculateDraftMetadata()
      return id
    },

    /**
     * Remove a recipient from the draft transaction
     * @param id - The recipient ID to remove
     */
    removeDraftRecipient(id: string) {
      const index = this.draftTx.recipients.findIndex(r => r.id === id)
      if (index !== -1 && this.draftTx.recipients.length > 1) {
        this.draftTx.recipients.splice(index, 1)
        this._recalculateDraftMetadata()
      }
    },

    /**
     * Update a recipient's address
     * @param id - The recipient ID
     * @param address - The new address
     */
    updateDraftRecipientAddress(id: string, address: string) {
      const recipient = this.draftTx.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.address = address
        this._recalculateDraftMetadata()
      }
    },

    /**
     * Update a recipient's amount
     * @param id - The recipient ID
     * @param amountSats - The new amount in satoshis
     */
    updateDraftRecipientAmount(id: string, amountSats: bigint) {
      const recipient = this.draftTx.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.amountSats = amountSats
        recipient.sendMax = false // Clear sendMax when setting explicit amount
        this._recalculateDraftMetadata()
      }
    },

    /**
     * Set a recipient to send max (remaining balance after fees)
     * Only one recipient can have sendMax at a time
     * @param id - The recipient ID
     * @param sendMax - Whether to enable sendMax
     */
    setDraftRecipientSendMax(id: string, sendMax: boolean) {
      // Clear sendMax from all other recipients
      for (const recipient of this.draftTx.recipients) {
        if (recipient.id !== id) {
          recipient.sendMax = false
        }
      }
      // Set sendMax for the target recipient
      const recipient = this.draftTx.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.sendMax = sendMax
        if (sendMax) {
          recipient.amountSats = 0n // Clear explicit amount when sendMax is enabled
        }
        this._recalculateDraftMetadata()
      }
    },

    /**
     * Clear a recipient (reset address and amount)
     * @param id - The recipient ID
     */
    clearDraftRecipient(id: string) {
      const recipient = this.draftTx.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.address = ''
        recipient.amountSats = 0n
        recipient.sendMax = false
        this._recalculateDraftMetadata()
      }
    },

    /**
     * Get a recipient by ID
     * @param id - The recipient ID
     */
    getDraftRecipient(id: string): DraftRecipient | undefined {
      return this.draftTx.recipients.find(r => r.id === id)
    },

    /**
     * Get available UTXOs for the draft transaction
     * Respects coin control selection if enabled
     */
    _getAvailableUtxos(): Array<[string, UtxoData]> {
      const selectedUtxos = this.draftTx.selectedUtxos

      if (selectedUtxos.length > 0) {
        // Coin control: use only selected UTXOs
        return selectedUtxos
          .map(outpoint => {
            const utxo = this.utxos.get(outpoint)
            return utxo ? ([outpoint, utxo] as [string, UtxoData]) : null
          })
          .filter((entry): entry is [string, UtxoData] => entry !== null)
      }

      // Auto-select: all spendable UTXOs (excluding immature coinbase)
      return Array.from(this.utxos.entries()).filter(([_, utxo]) => {
        if (utxo.isCoinbase) {
          const confirmations =
            utxo.height > 0 ? this.tipHeight - utxo.height + 1 : 0
          return confirmations >= 100
        }
        return true
      })
    },

    /**
     * Parse OP_RETURN data from draft state.
     * Returns null if no OP_RETURN or if data is invalid.
     * Sets validation error on draftTx if invalid.
     */
    _parseOpReturnData(): Buffer | null {
      if (!this.draftTx.opReturn?.data) return null

      if (this.draftTx.opReturn.encoding === 'hex') {
        if (!/^[0-9a-fA-F]*$/.test(this.draftTx.opReturn.data)) {
          this.draftTx.isValid = false
          this.draftTx.validationError = 'Invalid hex data for OP_RETURN'
          return null
        }
        if (this.draftTx.opReturn.data.length % 2 !== 0) {
          this.draftTx.isValid = false
          this.draftTx.validationError = 'Hex data must have even length'
          return null
        }
        const buffer = Buffer.from(this.draftTx.opReturn.data, 'hex')
        if (buffer.length > 220) {
          this.draftTx.isValid = false
          this.draftTx.validationError = 'OP_RETURN data exceeds 220 bytes'
          return null
        }
        return buffer
      }

      const buffer = Buffer.from(this.draftTx.opReturn.data, 'utf8')
      if (buffer.length > 220) {
        this.draftTx.isValid = false
        this.draftTx.validationError = 'OP_RETURN data exceeds 220 bytes'
        return null
      }
      return buffer
    },

    /**
     * Add inputs to a transaction with proper Taproot metadata if applicable.
     */
    _addInputsToTransaction(
      tx: InstanceType<typeof BitcoreTypes.Transaction>,
      utxos: Array<[string, UtxoData]>,
    ) {
      for (const [outpoint, utxo] of utxos) {
        const [txid, outIdx] = outpoint.split('_')
        const utxoData: BitcoreTypes.UnspentOutputData = {
          txid,
          outputIndex: Number(outIdx),
          script: this._script,
          satoshis: Number(utxo.value),
        }
        if (this.addressType === 'p2tr') {
          utxoData.internalPubKey = this._internalPubKey
          utxoData.merkleRoot = this._merkleRoot
          // ADD THIS LOGGING:
          console.log('Adding Taproot input:', {
            outpoint,
            internalPubKey: this._internalPubKey?.toString?.() || 'undefined',
            merkleRoot: this._merkleRoot?.toString?.('hex') || 'undefined',
          })
        }
        tx.from(utxoData)
      }
    },

    /**
     * Calculate the fee for a sendMax transaction (no change output).
     * This builds a complete transaction with the full input amount as output
     * to get an accurate fee estimate, then returns the fee.
     */
    _calculateSendMaxFee(
      availableUtxos: Array<[string, UtxoData]>,
      sendMaxAddress: string,
      regularOutputTotal: bigint,
      regularRecipients: DraftRecipient[],
    ): number {
      const Address = getAddress()
      const Transaction = getTransaction()

      const inputAmount = availableUtxos.reduce(
        (sum, [_, utxo]) => sum + BigInt(utxo.value),
        0n,
      )
      const feeRate = Math.max(1, Math.floor(this.draftTx.feeRate))

      // Build transaction to get accurate fee
      const tx = new Transaction()
      // IMPORTANT: the change and fee must ALWAYS be set first, otherwise
      // the fee calculation will be incorrect
      tx.feePerByte(feeRate)
      tx.change(this.address)

      this._addInputsToTransaction(tx, availableUtxos)

      // Add regular recipient outputs
      for (const recipient of regularRecipients) {
        if (
          recipient.address &&
          Address.isValid(recipient.address) &&
          recipient.amountSats > 0n
        ) {
          tx.to(recipient.address, Number(recipient.amountSats))
        }
      }

      // Add the sendMax output with remaining amount (input - regular outputs)
      // We use a placeholder that will be close to the final amount
      const preliminaryMax = inputAmount - regularOutputTotal
      if (preliminaryMax > DUST_THRESHOLD) {
        tx.to(sendMaxAddress, Number(preliminaryMax))
      }

      // Add OP_RETURN if present
      const opReturnBuffer = this._parseOpReturnData()
      if (opReturnBuffer) {
        tx.addData(opReturnBuffer)
      }

      return tx.getFee()
    },

    /**
     * Build a Transaction object from current draft state.
     * This is the single source of truth for transaction construction.
     *
     * @returns Transaction object or null if prerequisites not met
     */
    _buildTransaction(): InstanceType<typeof BitcoreTypes.Transaction> | null {
      if (!this._script || !isBitcoreLoaded()) return null

      const Address = getAddress()
      const Transaction = getTransaction()

      const availableUtxos = this._getAvailableUtxos()
      if (availableUtxos.length === 0) return null

      const feeRate = Math.max(1, Math.floor(this.draftTx.feeRate))
      const sendMaxRecipient = this.draftTx.recipients.find(r => r.sendMax)
      const regularRecipients = this.draftTx.recipients.filter(r => !r.sendMax)

      const tx = new Transaction()
      tx.feePerByte(feeRate)
      tx.change(this.address)

      this._addInputsToTransaction(tx, availableUtxos)

      // Add regular recipient outputs
      for (const recipient of regularRecipients) {
        if (
          recipient.address &&
          Address.isValid(recipient.address) &&
          recipient.amountSats > 0n
        ) {
          tx.to(recipient.address, Number(recipient.amountSats))
        }
      }

      // Add sendMax output with calculated amount
      if (
        sendMaxRecipient?.address &&
        Address.isValid(sendMaxRecipient.address)
      ) {
        if (this.draftTx.maxSendable > 0n) {
          tx.to(sendMaxRecipient.address, Number(this.draftTx.maxSendable))
        }
      }

      // Add OP_RETURN if present and valid
      const opReturnBuffer = this._parseOpReturnData()
      if (this.draftTx.opReturn?.data && !opReturnBuffer) {
        // OP_RETURN was requested but invalid - _parseOpReturnData set the error
        return null
      }
      if (opReturnBuffer) {
        tx.addData(opReturnBuffer)
      }

      return tx
    },

    /**
     * Recalculate draft transaction metadata from current state.
     * This updates computed values (fees, maxSendable, validation) without
     * storing a cached Transaction object.
     *
     * Called whenever recipients, amounts, fee rate, or UTXOs change.
     */
    _recalculateDraftMetadata() {
      // Reset validation state
      this.draftTx.isValid = false
      this.draftTx.validationError = null

      // Validate prerequisites
      if (!this._script || !isBitcoreLoaded()) {
        this.draftTx.validationError = 'Wallet not initialized'
        return
      }

      const Address = getAddress()
      const availableUtxos = this._getAvailableUtxos()

      // Calculate input amount
      if (availableUtxos.length === 0) {
        this.draftTx.validationError = 'No spendable UTXOs available'
        this.draftTx.inputAmount = 0n
        this.draftTx.maxSendable = 0n
        this.draftTx.outputAmount = 0n
        this.draftTx.estimatedFee = 0
        this.draftTx.changeAmount = 0n
        return
      }

      const inputAmount = availableUtxos.reduce(
        (sum, [_, utxo]) => sum + BigInt(utxo.value),
        0n,
      )
      this.draftTx.inputAmount = inputAmount

      // Categorize recipients
      const sendMaxRecipient = this.draftTx.recipients.find(r => r.sendMax)
      const regularRecipients = this.draftTx.recipients.filter(r => !r.sendMax)

      // Validate addresses and calculate regular output total
      const networkStore = useNetworkStore()
      const currentNetwork = networkStore.currentNetwork

      let regularOutputTotal = 0n
      let hasInvalidAddress = false
      let hasNetworkMismatch = false
      let invalidAddressError = ''

      for (const recipient of regularRecipients) {
        if (!recipient.address) continue
        if (!Address.isValid(recipient.address)) {
          hasInvalidAddress = true
          invalidAddressError = `Invalid address: ${recipient.address}`
          continue
        }
        if (!Address.isValid(recipient.address, currentNetwork)) {
          hasNetworkMismatch = true
          invalidAddressError = `Address is for wrong network: ${recipient.address}`
          continue
        }
        if (recipient.amountSats > 0n) {
          regularOutputTotal += recipient.amountSats
        }
      }

      // Validate sendMax recipient address
      if (sendMaxRecipient?.address) {
        if (!Address.isValid(sendMaxRecipient.address)) {
          hasInvalidAddress = true
          invalidAddressError = `Invalid address: ${sendMaxRecipient.address}`
        } else if (!Address.isValid(sendMaxRecipient.address, currentNetwork)) {
          hasNetworkMismatch = true
          invalidAddressError = `Address is for wrong network: ${sendMaxRecipient.address}`
        }
      }

      // Calculate fees and amounts based on whether sendMax is enabled
      if (sendMaxRecipient) {
        // For sendMax: calculate fee for transaction WITHOUT change output
        const sendMaxAddress =
          sendMaxRecipient.address && Address.isValid(sendMaxRecipient.address)
            ? sendMaxRecipient.address
            : this.address

        const sendMaxFee = this._calculateSendMaxFee(
          availableUtxos,
          sendMaxAddress,
          regularOutputTotal,
          regularRecipients,
        )

        // maxSendable = input - regularOutputs - fee (no change)
        const maxSendableRaw =
          inputAmount - regularOutputTotal - BigInt(sendMaxFee)
        this.draftTx.maxSendable =
          maxSendableRaw > DUST_THRESHOLD ? maxSendableRaw : 0n
        this.draftTx.outputAmount =
          regularOutputTotal + this.draftTx.maxSendable
        this.draftTx.changeAmount = 0n
        this.draftTx.estimatedFee = sendMaxFee
      } else {
        // For regular transactions: build with change output
        const tx = this._buildTransaction()
        if (!tx) {
          if (!this.draftTx.validationError) {
            this.draftTx.validationError = 'Failed to build transaction'
          }
          return
        }

        const estimatedFee = tx.getFee()
        this.draftTx.maxSendable = 0n // Not applicable for non-sendMax
        this.draftTx.outputAmount = regularOutputTotal
        const totalSpent = regularOutputTotal + BigInt(estimatedFee)
        this.draftTx.changeAmount =
          inputAmount > totalSpent ? inputAmount - totalSpent : 0n
        this.draftTx.estimatedFee = estimatedFee
      }

      // Validation
      if (hasInvalidAddress || hasNetworkMismatch) {
        this.draftTx.validationError = invalidAddressError
      } else if (this.draftTx.recipients.length === 0) {
        this.draftTx.validationError = 'No recipients specified'
      } else if (regularOutputTotal === 0n && !sendMaxRecipient) {
        this.draftTx.validationError = 'No amount specified'
      } else if (sendMaxRecipient && this.draftTx.maxSendable === 0n) {
        this.draftTx.validationError =
          'Insufficient balance for this transaction'
      } else if (
        !sendMaxRecipient &&
        inputAmount < regularOutputTotal + BigInt(this.draftTx.estimatedFee)
      ) {
        this.draftTx.validationError =
          'Insufficient balance for this transaction'
      } else if (sendMaxRecipient && !sendMaxRecipient.address) {
        this.draftTx.validationError = 'Enter recipient address'
      } else if (
        regularRecipients.some(
          r => r.address && Address.isValid(r.address) && r.amountSats === 0n,
        )
      ) {
        this.draftTx.validationError = 'Enter amount for all recipients'
      } else {
        const allHaveAddresses = this.draftTx.recipients.every(
          r => r.address && Address.isValid(r.address),
        )
        if (!allHaveAddresses) {
          this.draftTx.validationError = 'Enter address for all recipients'
        } else {
          this.draftTx.isValid = true
        }
      }
    },

    /**
     * Set fee rate for the draft transaction
     */
    setDraftFeeRate(feeRate: number) {
      this.draftTx.feeRate = Math.max(1, Math.floor(feeRate))
      this._recalculateDraftMetadata()
    },

    /**
     * Set selected UTXOs for coin control
     */
    setDraftSelectedUtxos(utxos: string[]) {
      this.draftTx.selectedUtxos = utxos
      this._recalculateDraftMetadata()
    },

    /**
     * Set OP_RETURN data for the draft transaction
     */
    setDraftOpReturn(opReturn: DraftOpReturn | null) {
      this.draftTx.opReturn = opReturn
      this._recalculateDraftMetadata()
    },

    /**
     * Set locktime for the draft transaction
     */
    setDraftLocktime(locktime: DraftLocktime | null) {
      this.draftTx.locktime = locktime
      this._recalculateDraftMetadata()
    },

    /**
     * Sign and broadcast the draft transaction.
     * Builds a fresh transaction from current state to ensure consistency.
     * @returns Transaction ID
     */
    async sendDraftTransaction(): Promise<string> {
      if (!this._chronik || !this._signingKey) {
        throw new Error('Wallet not initialized')
      }

      if (!this.draftTx.isValid) {
        throw new Error(
          this.draftTx.validationError || 'Transaction is not valid',
        )
      }

      // Build fresh transaction from current state
      const tx = this._buildTransaction()
      if (!tx) {
        throw new Error('Failed to build transaction')
      }

      // Apply locktime if set
      if (this.draftTx.locktime) {
        if (this.draftTx.locktime.type === 'block') {
          if (this.draftTx.locktime.value >= 500000000) {
            throw new Error('Block height locktime must be less than 500000000')
          }
          tx.lockUntilBlockHeight(this.draftTx.locktime.value)
        } else {
          if (this.draftTx.locktime.value < 500000000) {
            throw new Error('Unix timestamp locktime must be >= 500000000')
          }
          tx.lockUntilDate(new Date(this.draftTx.locktime.value * 1000))
        }
      }

      // Capture transaction details before signing for history update
      const totalOutputAmount = this.draftTx.outputAmount
      const primaryRecipient = this.draftTx.recipients.find(
        r => r.address && r.address !== this.address,
      )

      // Sign the transaction
      // For Taproot (P2TR), use Schnorr signatures with SIGHASH_LOTUS
      // For P2PKH, use standard ECDSA signatures
      if (this.addressType === 'p2tr') {
        tx.signSchnorr(this._signingKey)
      } else {
        tx.sign(this._signingKey)
      }

      console.log(
        'Transaction built:',
        tx.toJSON(),
        tx.toBuffer().toString('hex'),
      )
      console.log('Verifying transaction details...')
      const verified = tx.verify()
      console.log('Transaction verified:', verified)
      // Broadcast
      const result = await this._chronik.broadcastTx(tx.toBuffer())

      // Remove spent UTXOs
      for (const input of tx.inputs) {
        const outpoint = `${input.prevTxId.toString('hex')}_${
          input.outputIndex
        }`
        this.utxos.delete(outpoint)
      }

      // Add transaction to history immediately for better UX
      // This will be updated when the WebSocket confirms the transaction
      const newHistoryItem: TransactionHistoryItem = {
        txid: result.txid,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        blockHeight: -1, // Unconfirmed
        isSend: true,
        amount: totalOutputAmount.toString(),
        address: primaryRecipient?.address || '',
        confirmations: 0,
      }
      this.transactionHistory.unshift(newHistoryItem)

      this.recalculateBalance()
      await this.saveWalletState()

      // Reset draft transaction
      this.initializeDraftTransaction()

      return result.txid
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
     * Disconnect and cleanup
     */
    async disconnect() {
      if (this._ws) {
        const scriptType = this.getChronikScriptType()
        this._ws.unsubscribe(scriptType, this.scriptPayload)
        this._ws.close()
      }
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
        if (this._ws) {
          try {
            const scriptType = this.getChronikScriptType()
            this._ws.unsubscribe(scriptType, this.scriptPayload)
            this._ws.close()
          } catch {
            // Ignore close errors
          }
        }

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
  },
})
