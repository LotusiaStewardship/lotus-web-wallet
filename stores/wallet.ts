/**
 * Wallet Store
 * Manages wallet state, UTXO cache, and blockchain interactions
 */
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { useNetworkStore, type NetworkType } from './network'

// Dynamic imports for browser compatibility
let ChronikClient: any
let Bitcore: any
let Networks: any
let sdkLoaded = false

const loadSDK = async () => {
  if (!sdkLoaded) {
    const [chronikModule, sdkModule] = await Promise.all([
      import('chronik-client'),
      import('lotus-sdk'),
    ])
    ChronikClient = chronikModule.ChronikClient
    Bitcore = sdkModule.Bitcore
    Networks = Bitcore.Networks
    sdkLoaded = true
  }
  return { ChronikClient, Bitcore, Networks }
}

// Bitcore classes (loaded dynamically)
let Mnemonic: any
let HDPrivateKey: any
let PrivateKey: any
let Address: any
let Script: any
let Transaction: any
let Message: any

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
  timestamp: number
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

export interface WalletState {
  initialized: boolean
  loading: boolean
  loadingMessage: string
  seedPhrase: string
  address: string
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
    loading: false,
    loadingMessage: '',
    seedPhrase: '',
    address: '',
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
    _scriptEndpoint: null as any,
    _hdPrivkey: null as InstanceType<typeof HDPrivateKey> | null,
    _signingKey: null as InstanceType<typeof PrivateKey> | null,
    _script: null as InstanceType<typeof Script> | null,
    /** Internal Transaction object for draft transaction building */
    _draftTransaction: null as InstanceType<typeof Transaction> | null,

    /**
     * Initialize the wallet - load from storage or create new
     */
    async initialize() {
      this.loading = true
      this.loadingMessage = 'Loading SDK...'

      try {
        // Load SDK modules first
        const { Bitcore: BitcoreModule } = await loadSDK()
        Mnemonic = BitcoreModule.Mnemonic
        HDPrivateKey = BitcoreModule.HDPrivateKey
        PrivateKey = BitcoreModule.PrivateKey
        Address = BitcoreModule.Address
        Script = BitcoreModule.Script
        Transaction = BitcoreModule.Transaction
        Message = BitcoreModule.Message

        this.loadingMessage = 'Initializing wallet...'

        // Check for existing wallet in localStorage
        const savedState = localStorage.getItem('lotus-wallet-state')

        if (savedState) {
          await this.loadWallet(JSON.parse(savedState))
        } else {
          // Generate new wallet
          await this.createNewWallet()
        }

        // Initialize Chronik connection
        await this.initializeChronik()

        this.initialized = true
      } catch (error) {
        console.error('Failed to initialize wallet:', error)
        this.loadingMessage = 'Failed to initialize wallet'
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    /**
     * Create a new wallet with fresh mnemonic
     */
    async createNewWallet() {
      this.loadingMessage = 'Generating new wallet...'

      const mnemonic = new Mnemonic()
      await this.buildWalletFromMnemonic(mnemonic.toString())
      await this.saveWalletState()
    },

    /**
     * Restore wallet from seed phrase
     */
    async restoreWallet(seedPhrase: string) {
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
     * Build wallet state from mnemonic
     * Uses the current network from the network store for address encoding
     */
    async buildWalletFromMnemonic(seedPhrase: string) {
      const networkStore = useNetworkStore()
      const network = Networks.get(networkStore.currentNetwork)

      const mnemonic = new Mnemonic(seedPhrase)
      const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())
      const signingKey = hdPrivkey
        .deriveChild(BIP44_PURPOSE, true)
        .deriveChild(BIP44_COINTYPE, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(0).privateKey

      // Create address with the current network
      const address = signingKey.toAddress(network)
      const script = Script.fromAddress(address)

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
        scriptPayload: this.scriptPayload,
        balance: this.balance,
        utxos: Object.fromEntries(this.utxos),
        tipHeight: this.tipHeight,
        tipHash: this.tipHash,
      }
      localStorage.setItem('lotus-wallet-state', JSON.stringify(state))
    },

    /**
     * Initialize Chronik client and WebSocket
     * Uses the Chronik URL from the network store
     */
    async initializeChronik() {
      this.loadingMessage = 'Connecting to network...'

      const networkStore = useNetworkStore()
      const chronikUrl = networkStore.chronikUrl

      this._chronik = markRaw(new ChronikClient(chronikUrl))
      this._scriptEndpoint = markRaw(
        this._chronik.script('p2pkh', this.scriptPayload),
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
      this._ws.subscribe('p2pkh', this.scriptPayload)
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
          const outpoint = `${input.outpoint.txid}_${input.outpoint.outIdx}`
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
              tx.block?.timestamp ?? tx.timeFirstSeen ?? Date.now() / 1000,
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

    /**
     * Send Lotus to an address
     * Uses Transaction's built-in fee estimation for accurate calculations
     * @param toAddress - Recipient address
     * @param amountSats - Amount in satoshis
     * @param feeRate - Fee rate in sat/byte (default: 1)
     */
    async sendLotus(
      toAddress: string,
      amountSats: number,
      feeRate: number = 1,
    ): Promise<string> {
      if (!this._chronik || !this._signingKey || !this._script) {
        throw new Error('Wallet not initialized')
      }

      // Validate address using Bitcore's Address class
      if (!Address.isValid(toAddress)) {
        throw new Error('Invalid address format')
      }

      // Validate address is for current network
      const networkStore = useNetworkStore()
      if (!Address.isValid(toAddress, networkStore.currentNetwork)) {
        throw new Error(
          `Address is for wrong network. Expected ${networkStore.displayName}.`,
        )
      }

      // Ensure minimum fee rate
      const effectiveFeeRate = Math.max(1, Math.floor(feeRate))

      // Build transaction using Transaction's built-in fee estimation
      const tx = new Transaction()
      const spentInputs: string[] = []

      // Get spendable UTXOs sorted by value ascending for optimal selection
      const sortedUtxos = Array.from(this.utxos.entries())
        .filter(([_, utxo]) => {
          if (utxo.isCoinbase) {
            const confirmations =
              utxo.height > 0 ? this.tipHeight - utxo.height + 1 : 0
            return confirmations >= 100
          }
          return true
        })
        .sort((a, b) => Number(BigInt(a[1].value) - BigInt(b[1].value)))

      // Add all available UTXOs as inputs
      for (const [outpoint, utxo] of sortedUtxos) {
        const [txid, outIdx] = outpoint.split('_')
        tx.from({
          txid,
          outputIndex: Number(outIdx),
          script: this._script.toHex(),
          satoshis: Number(utxo.value),
        })
        spentInputs.push(outpoint)
      }

      // Set recipient, change address, and fee rate
      // Transaction class handles fee calculation and change output automatically
      tx.to(toAddress, amountSats)
      tx.change(this.address)
      tx.feePerByte(effectiveFeeRate)

      // Verify we have sufficient funds
      const inputAmount = tx.inputAmount
      const outputAmount = tx.outputAmount
      const fee = tx.getFee()

      if (inputAmount < outputAmount + fee) {
        throw new Error('Insufficient balance for amount + fee')
      }

      // Sign and broadcast
      tx.sign(this._signingKey)
      const result = await this._chronik.broadcastTx(tx.toBuffer())

      // Remove spent UTXOs (only the ones actually used)
      // The transaction may not use all inputs if we added more than needed
      for (const input of tx.inputs) {
        const outpoint = `${input.prevTxId.toString('hex')}_${
          input.outputIndex
        }`
        this.utxos.delete(outpoint)
      }
      this.recalculateBalance()
      await this.saveWalletState()

      return result.txid
    },

    /**
     * Advanced transaction builder with multi-output, OP_RETURN, locktime, and coin control support
     * Uses Transaction's built-in fee estimation for accurate calculations
     */
    async sendAdvanced(options: {
      /** Array of recipients with address and amount in satoshis */
      recipients: Array<{ address: string; amountSats: number }>
      /** Fee rate in sat/byte (default: 1) */
      feeRate?: number
      /** Specific UTXOs to use (outpoint strings like "txid_outIdx"). If empty, auto-select. */
      selectedUtxos?: string[]
      /** OP_RETURN data to attach */
      opReturnData?: {
        data: string
        encoding: 'utf8' | 'hex'
      }
      /** Transaction locktime */
      locktime?: {
        type: 'block' | 'time'
        value: number
      }
    }): Promise<string> {
      if (!this._chronik || !this._signingKey || !this._script) {
        throw new Error('Wallet not initialized')
      }

      const {
        recipients,
        feeRate = 1,
        selectedUtxos,
        opReturnData,
        locktime,
      } = options

      // Validate recipients
      if (!recipients || recipients.length === 0) {
        throw new Error('At least one recipient is required')
      }

      const networkStore = useNetworkStore()
      for (const recipient of recipients) {
        // Validate address using Bitcore's Address class
        if (!Address.isValid(recipient.address)) {
          throw new Error(`Invalid address format: ${recipient.address}`)
        }
        // Validate address is for current network
        if (!Address.isValid(recipient.address, networkStore.currentNetwork)) {
          throw new Error(
            `Address is for wrong network: ${recipient.address}. Expected ${networkStore.displayName}.`,
          )
        }
        if (recipient.amountSats <= 0) {
          throw new Error('Amount must be greater than 0')
        }
      }

      // Ensure minimum fee rate
      const effectiveFeeRate = Math.max(1, Math.floor(feeRate))

      // Get available UTXOs (either selected or all spendable)
      let availableUtxos: Array<[string, UtxoData]>
      if (selectedUtxos && selectedUtxos.length > 0) {
        // Use only selected UTXOs
        availableUtxos = selectedUtxos
          .map(outpoint => {
            const utxo = this.utxos.get(outpoint)
            return utxo ? ([outpoint, utxo] as [string, UtxoData]) : null
          })
          .filter((entry): entry is [string, UtxoData] => entry !== null)

        if (availableUtxos.length === 0) {
          throw new Error('No valid UTXOs selected')
        }
      } else {
        // Auto-select: filter for spendable UTXOs (excluding immature coinbase)
        availableUtxos = Array.from(this.utxos.entries()).filter(
          ([_, utxo]) => {
            if (utxo.isCoinbase) {
              const confirmations =
                utxo.height > 0 ? this.tipHeight - utxo.height + 1 : 0
              return confirmations >= 100
            }
            return true
          },
        )
      }

      // Sort by value ascending for optimal coin selection (when auto-selecting)
      if (!selectedUtxos || selectedUtxos.length === 0) {
        availableUtxos.sort((a, b) =>
          Number(BigInt(a[1].value) - BigInt(b[1].value)),
        )
      }

      // Build transaction using Transaction's built-in fee estimation
      const tx = new Transaction()

      // Add inputs
      for (const [outpoint, utxo] of availableUtxos) {
        const [txid, outIdx] = outpoint.split('_')
        tx.from({
          txid,
          outputIndex: Number(outIdx),
          script: this._script.toHex(),
          satoshis: Number(utxo.value),
        })
      }

      // Add recipient outputs
      for (const recipient of recipients) {
        tx.to(recipient.address, recipient.amountSats)
      }

      // Add OP_RETURN output if present
      if (opReturnData && opReturnData.data) {
        let dataBuffer: Buffer
        if (opReturnData.encoding === 'hex') {
          // Validate hex string
          if (!/^[0-9a-fA-F]*$/.test(opReturnData.data)) {
            throw new Error('Invalid hex data for OP_RETURN')
          }
          if (opReturnData.data.length % 2 !== 0) {
            throw new Error('Hex data must have even length')
          }
          dataBuffer = Buffer.from(opReturnData.data, 'hex')
        } else {
          dataBuffer = Buffer.from(opReturnData.data, 'utf8')
        }

        // Max OP_RETURN data is 220 bytes
        if (dataBuffer.length > 220) {
          throw new Error('OP_RETURN data exceeds maximum size of 220 bytes')
        }

        tx.addData(dataBuffer)
      }

      // Set change address and fee rate
      // Transaction class handles fee calculation and change output automatically
      tx.change(this.address)
      tx.feePerByte(effectiveFeeRate)

      // Verify we have sufficient funds
      const inputAmount = tx.inputAmount
      const outputAmount = tx.outputAmount
      const fee = tx.getFee()

      if (inputAmount < outputAmount + fee) {
        throw new Error('Insufficient balance for amount + fee')
      }

      // Set locktime if specified
      if (locktime) {
        if (locktime.type === 'block') {
          // Block height locktime (must be < 500000000)
          if (locktime.value >= 500000000) {
            throw new Error('Block height locktime must be less than 500000000')
          }
          tx.lockUntilBlockHeight(locktime.value)
        } else {
          // Unix timestamp locktime (must be >= 500000000)
          if (locktime.value < 500000000) {
            throw new Error('Unix timestamp locktime must be >= 500000000')
          }
          tx.lockUntilDate(new Date(locktime.value * 1000))
        }
      }

      // Sign and broadcast
      tx.sign(this._signingKey)
      const result = await this._chronik.broadcastTx(tx.toBuffer())

      // Remove spent UTXOs
      for (const input of tx.inputs) {
        const outpoint = `${input.prevTxId.toString('hex')}_${
          input.outputIndex
        }`
        this.utxos.delete(outpoint)
      }
      this.recalculateBalance()
      await this.saveWalletState()

      return result.txid
    },

    // =========================================================================
    // Draft Transaction Builder
    // These methods manage a Transaction object that updates dynamically
    // as the user inputs transaction details in the UI
    // =========================================================================

    /**
     * Initialize the draft transaction with available balance
     * This should be called when entering the send page to ensure
     * balance is displayed before any recipients are added
     */
    initializeDraftTransaction() {
      this._draftTransaction = null
      this.draftTx = createInitialDraftTx()

      // Calculate available input amount from UTXOs
      const availableUtxos = this._getAvailableUtxos()
      const inputAmount = availableUtxos.reduce(
        (sum, [_, utxo]) => sum + BigInt(utxo.value),
        0n,
      )
      this.draftTx.inputAmount = inputAmount

      // Calculate max sendable (estimate with a single output)
      if (availableUtxos.length > 0 && this._script && Transaction) {
        const txForMax = new Transaction()
        // IMPORTANT: the change and fee must ALWAYS be set first, otherwise
        // the fee calculation will be incorrect
        txForMax.change(this.address)
        txForMax.feePerByte(this.draftTx.feeRate)
        // Add inputs
        for (const [outpoint, utxo] of availableUtxos) {
          const [txid, outIdx] = outpoint.split('_')
          txForMax.from({
            txid,
            outputIndex: Number(outIdx),
            script: this._script.toHex(),
            satoshis: Number(utxo.value),
          })
        }
        // Add recipient output
        txForMax.to(this.address, Number(inputAmount))
        const feeForMaxSend = txForMax.getFee()
        console.log('feeForMaxSend', feeForMaxSend)
        console.log('inputAmount (reduced from UTXO set)', inputAmount)
        console.log('maxSendable', inputAmount - BigInt(feeForMaxSend))
        this.draftTx.maxSendable = inputAmount - BigInt(feeForMaxSend)
      }

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
      this._rebuildDraftTransaction()
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
        this._rebuildDraftTransaction()
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
        this._rebuildDraftTransaction()
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
        this._rebuildDraftTransaction()
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
        this._rebuildDraftTransaction()
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
        this._rebuildDraftTransaction()
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
     * Rebuild the internal Transaction object from current draft state.
     * This is the single source of truth for all transaction calculations.
     *
     * Flow:
     * 1. Gather available UTXOs and calculate total input
     * 2. Process recipients (regular amounts + sendMax)
     * 3. Calculate fees and maxSendable
     * 4. Build the actual transaction
     * 5. Validate and update state
     */
    _rebuildDraftTransaction() {
      // -----------------------------------------------------------------------
      // Step 1: Validate prerequisites
      // -----------------------------------------------------------------------
      if (!this._script || !Transaction || !Address) {
        this.draftTx.isValid = false
        this.draftTx.validationError = 'Wallet not initialized'
        return
      }

      const availableUtxos = this._getAvailableUtxos()
      if (availableUtxos.length === 0) {
        this.draftTx.isValid = false
        this.draftTx.validationError = 'No spendable UTXOs available'
        this.draftTx.inputAmount = 0n
        this.draftTx.maxSendable = 0n
        this.draftTx.outputAmount = 0n
        this.draftTx.estimatedFee = 0
        this.draftTx.changeAmount = 0n
        return
      }

      // -----------------------------------------------------------------------
      // Step 2: Calculate total available input
      // -----------------------------------------------------------------------
      const inputAmount = availableUtxos.reduce(
        (sum, [_, utxo]) => sum + BigInt(utxo.value),
        0n,
      )
      this.draftTx.inputAmount = inputAmount

      // -----------------------------------------------------------------------
      // Step 3: Categorize recipients
      // -----------------------------------------------------------------------
      const sendMaxRecipient = this.draftTx.recipients.find(r => r.sendMax)
      const regularRecipients = this.draftTx.recipients.filter(r => !r.sendMax)

      // -----------------------------------------------------------------------
      // Step 4: Calculate regular output total and validate addresses
      // -----------------------------------------------------------------------
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
        // Check if address matches current network
        if (!Address.isValid(recipient.address, currentNetwork)) {
          hasNetworkMismatch = true
          invalidAddressError = `Address is for wrong network: ${recipient.address}`
          continue
        }
        if (recipient.amountSats > 0n) {
          regularOutputTotal += recipient.amountSats
        }
      }

      // Validate sendMax recipient address if present
      if (sendMaxRecipient?.address) {
        if (!Address.isValid(sendMaxRecipient.address)) {
          hasInvalidAddress = true
          invalidAddressError = `Invalid address: ${sendMaxRecipient.address}`
        } else if (!Address.isValid(sendMaxRecipient.address, currentNetwork)) {
          hasNetworkMismatch = true
          invalidAddressError = `Address is for wrong network: ${sendMaxRecipient.address}`
        }
      }

      // -----------------------------------------------------------------------
      // Step 5: Parse OP_RETURN data if present
      // -----------------------------------------------------------------------
      let opReturnBuffer: Buffer | null = null
      if (this.draftTx.opReturn?.data) {
        if (this.draftTx.opReturn.encoding === 'hex') {
          if (!/^[0-9a-fA-F]*$/.test(this.draftTx.opReturn.data)) {
            this.draftTx.isValid = false
            this.draftTx.validationError = 'Invalid hex data for OP_RETURN'
            return
          }
          if (this.draftTx.opReturn.data.length % 2 !== 0) {
            this.draftTx.isValid = false
            this.draftTx.validationError = 'Hex data must have even length'
            return
          }
          opReturnBuffer = Buffer.from(this.draftTx.opReturn.data, 'hex')
        } else {
          opReturnBuffer = Buffer.from(this.draftTx.opReturn.data, 'utf8')
        }
        if (opReturnBuffer.length > 220) {
          this.draftTx.isValid = false
          this.draftTx.validationError = 'OP_RETURN data exceeds 220 bytes'
          return
        }
      }

      // -----------------------------------------------------------------------
      // Step 6: Calculate maxSendable (what remains after regular outputs + fee)
      // We need to estimate the fee for a transaction that includes:
      // - All inputs
      // - All regular outputs
      // - One output for sendMax (even if no address yet, for fee estimation)
      // - OP_RETURN if present
      // -----------------------------------------------------------------------
      const feeRate = Math.max(1, Math.floor(this.draftTx.feeRate))

      // Build a fee estimation transaction
      const feeEstTx = new Transaction()

      // IMPORTANT: the change and fee rate must ALWAYS be set first, otherwise
      // the fee calculation will be incorrect
      feeEstTx.change(this.address)
      feeEstTx.feePerByte(feeRate)

      // Add all inputs
      for (const [outpoint, utxo] of availableUtxos) {
        const [txid, outIdx] = outpoint.split('_')
        feeEstTx.from({
          txid,
          outputIndex: Number(outIdx),
          script: this._script.toHex(),
          satoshis: Number(utxo.value),
        })
      }

      // Add regular recipient outputs
      for (const recipient of regularRecipients) {
        if (
          recipient.address &&
          Address.isValid(recipient.address) &&
          recipient.amountSats > 0n
        ) {
          feeEstTx.to(recipient.address, Number(recipient.amountSats))
        }
      }

      // Add placeholder for sendMax output (to get accurate fee estimate)
      // Use the sendMax recipient's address if valid, otherwise use our own address
      const sendMaxAddress =
        sendMaxRecipient?.address && Address.isValid(sendMaxRecipient.address)
          ? sendMaxRecipient.address
          : this.address
      feeEstTx.to(sendMaxAddress, Number(DUST_THRESHOLD))

      // Add OP_RETURN if present
      if (opReturnBuffer) {
        feeEstTx.addData(opReturnBuffer)
      }

      const estimatedFeeForMaxSend = feeEstTx.getFee()

      // maxSendable = input - regularOutputs - fee
      const maxSendableRaw =
        inputAmount - regularOutputTotal - BigInt(estimatedFeeForMaxSend)
      console.log('maxSendableRaw', maxSendableRaw)

      this.draftTx.maxSendable =
        maxSendableRaw > DUST_THRESHOLD ? maxSendableRaw : 0n

      // -----------------------------------------------------------------------
      // Step 7: Build the actual transaction
      // -----------------------------------------------------------------------
      const tx = new Transaction()

      // IMPORTANT: the change and fee rate must ALWAYS be set first, otherwise
      // the fee calculation will be incorrect
      tx.feePerByte(feeRate)
      tx.change(this.address)

      // Add all inputs
      for (const [outpoint, utxo] of availableUtxos) {
        const [txid, outIdx] = outpoint.split('_')
        tx.from({
          txid,
          outputIndex: Number(outIdx),
          script: this._script.toHex(),
          satoshis: Number(utxo.value),
        })
      }

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

      // Add sendMax output if recipient has valid address and there's something to send
      let sendMaxAmount = 0n
      if (
        sendMaxRecipient?.address &&
        Address.isValid(sendMaxRecipient.address) &&
        this.draftTx.maxSendable > 0n
      ) {
        sendMaxAmount = this.draftTx.maxSendable
        tx.to(sendMaxRecipient.address, Number(sendMaxAmount))
      }

      // Add OP_RETURN if present
      if (opReturnBuffer) {
        tx.addData(opReturnBuffer)
      }

      // -----------------------------------------------------------------------
      // Step 8: Calculate final values
      // -----------------------------------------------------------------------
      const actualFee = tx.getFee()
      this.draftTx.estimatedFee = actualFee

      // Output amount: regular outputs + sendMax (for display purposes)
      // If sendMax recipient exists but has no address, still show the intended amount
      const totalOutputAmount =
        regularOutputTotal + (sendMaxRecipient ? this.draftTx.maxSendable : 0n)
      this.draftTx.outputAmount = totalOutputAmount

      // Change amount: only exists if no sendMax recipient
      if (sendMaxRecipient) {
        this.draftTx.changeAmount = 0n
      } else {
        const totalSpent = regularOutputTotal + BigInt(actualFee)
        this.draftTx.changeAmount =
          inputAmount > totalSpent ? inputAmount - totalSpent : 0n
      }

      // Store the transaction
      this._draftTransaction = tx

      // -----------------------------------------------------------------------
      // Step 9: Validate
      // -----------------------------------------------------------------------
      if (hasInvalidAddress || hasNetworkMismatch) {
        this.draftTx.isValid = false
        this.draftTx.validationError = invalidAddressError
      } else if (this.draftTx.recipients.length === 0) {
        this.draftTx.isValid = false
        this.draftTx.validationError = 'No recipients specified'
      } else if (regularOutputTotal === 0n && !sendMaxRecipient) {
        this.draftTx.isValid = false
        this.draftTx.validationError = 'No amount specified'
      } else if (sendMaxRecipient && this.draftTx.maxSendable === 0n) {
        this.draftTx.isValid = false
        this.draftTx.validationError =
          'Insufficient balance for this transaction'
      } else if (
        !sendMaxRecipient &&
        inputAmount < regularOutputTotal + BigInt(actualFee)
      ) {
        this.draftTx.isValid = false
        this.draftTx.validationError =
          'Insufficient balance for this transaction'
      } else if (sendMaxRecipient && !sendMaxRecipient.address) {
        // sendMax recipient exists but no address yet - not ready to send
        this.draftTx.isValid = false
        this.draftTx.validationError = 'Enter recipient address'
      } else if (
        regularRecipients.some(
          r => r.address && Address.isValid(r.address) && r.amountSats === 0n,
        )
      ) {
        // Regular recipient has address but no amount
        this.draftTx.isValid = false
        this.draftTx.validationError = 'Enter amount for all recipients'
      } else {
        // Check all recipients have addresses
        const allHaveAddresses = this.draftTx.recipients.every(
          r => r.address && Address.isValid(r.address),
        )
        if (!allHaveAddresses) {
          this.draftTx.isValid = false
          this.draftTx.validationError = 'Enter address for all recipients'
        } else {
          this.draftTx.isValid = true
          this.draftTx.validationError = null
        }
      }
    },

    /**
     * Set fee rate for the draft transaction
     */
    setDraftFeeRate(feeRate: number) {
      this.draftTx.feeRate = Math.max(1, Math.floor(feeRate))
      this._rebuildDraftTransaction()
    },

    /**
     * Set selected UTXOs for coin control
     */
    setDraftSelectedUtxos(utxos: string[]) {
      this.draftTx.selectedUtxos = utxos
      this._rebuildDraftTransaction()
    },

    /**
     * Set OP_RETURN data for the draft transaction
     */
    setDraftOpReturn(opReturn: DraftOpReturn | null) {
      this.draftTx.opReturn = opReturn
      this._rebuildDraftTransaction()
    },

    /**
     * Set locktime for the draft transaction
     */
    setDraftLocktime(locktime: DraftLocktime | null) {
      this.draftTx.locktime = locktime
      this._rebuildDraftTransaction()
    },

    /**
     * Sign and broadcast the draft transaction
     * @returns Transaction ID
     */
    async sendDraftTransaction(): Promise<string> {
      if (!this._chronik || !this._signingKey || !this._draftTransaction) {
        throw new Error('Wallet or draft transaction not initialized')
      }

      if (!this.draftTx.isValid) {
        throw new Error(
          this.draftTx.validationError || 'Transaction is not valid',
        )
      }

      // Apply locktime if set
      if (this.draftTx.locktime) {
        if (this.draftTx.locktime.type === 'block') {
          if (this.draftTx.locktime.value >= 500000000) {
            throw new Error('Block height locktime must be less than 500000000')
          }
          this._draftTransaction.lockUntilBlockHeight(
            this.draftTx.locktime.value,
          )
        } else {
          if (this.draftTx.locktime.value < 500000000) {
            throw new Error('Unix timestamp locktime must be >= 500000000')
          }
          this._draftTransaction.lockUntilDate(
            new Date(this.draftTx.locktime.value * 1000),
          )
        }
      }

      // Capture transaction details before signing for history update
      const totalOutputAmount = this.draftTx.outputAmount
      const primaryRecipient = this.draftTx.recipients.find(
        r => r.address && r.address !== this.address,
      )

      // Sign the transaction
      this._draftTransaction.sign(this._signingKey)

      // Broadcast
      const result = await this._chronik.broadcastTx(
        this._draftTransaction.toBuffer(),
      )

      // Remove spent UTXOs
      for (const input of this._draftTransaction.inputs) {
        const outpoint = `${input.prevTxId.toString('hex')}_${
          input.outputIndex
        }`
        this.utxos.delete(outpoint)
      }

      // Add transaction to history immediately for better UX
      // This will be updated when the WebSocket confirms the transaction
      const newHistoryItem: TransactionHistoryItem = {
        txid: result.txid,
        timestamp: Math.floor(Date.now() / 1000),
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
      const message = new Message(text)
      return message.sign(this._signingKey)
    },

    /**
     * Verify a signed message
     */
    verifyMessage(text: string, address: string, signature: string): boolean {
      const message = new Message(text)
      return message.verify(address, signature)
    },

    /**
     * Validate a seed phrase
     */
    isValidSeedPhrase(seedPhrase: string): boolean {
      if (!sdkLoaded || !Mnemonic) return false
      return Mnemonic.isValid(seedPhrase)
    },

    /**
     * Validate a Lotus address
     */
    isValidAddress(address: string): boolean {
      if (!sdkLoaded || !Address) return false
      return Address.isValid(address)
    },

    /**
     * Disconnect and cleanup
     */
    async disconnect() {
      if (this._ws) {
        this._ws.unsubscribe('p2pkh', this.scriptPayload)
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
            this._ws.unsubscribe('p2pkh', this.scriptPayload)
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
