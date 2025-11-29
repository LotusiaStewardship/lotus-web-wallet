/**
 * Wallet Store
 * Manages wallet state, UTXO cache, and blockchain interactions
 */
import { defineStore } from 'pinia'
import { markRaw } from 'vue'

// Dynamic imports for browser compatibility
let ChronikClient: any
let Bitcore: any
let sdkLoaded = false

const loadSDK = async () => {
  if (!sdkLoaded) {
    const [chronikModule, sdkModule] = await Promise.all([
      import('chronik-client'),
      import('lotus-sdk'),
    ])
    ChronikClient = chronikModule.ChronikClient
    Bitcore = sdkModule.Bitcore
    sdkLoaded = true
  }
  return { ChronikClient, Bitcore }
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
const CHRONIK_URL = 'https://chronik.lotusia.org'
const BIP44_PURPOSE = 44
const BIP44_COINTYPE = 10605
const LOTUS_DECIMALS = 6
const MAX_TX_SIZE = 100_000

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
     */
    async buildWalletFromMnemonic(seedPhrase: string) {
      const mnemonic = new Mnemonic(seedPhrase)
      const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())
      const signingKey = hdPrivkey
        .deriveChild(BIP44_PURPOSE, true)
        .deriveChild(BIP44_COINTYPE, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(0).privateKey

      const address = signingKey.toAddress()
      const script = Script.fromAddress(address)

      // Store runtime objects (markRaw prevents Vue reactivity which breaks elliptic curve operations)
      this._hdPrivkey = markRaw(hdPrivkey)
      this._signingKey = markRaw(signingKey)
      this._script = markRaw(script)

      // Update state
      this.seedPhrase = seedPhrase
      this.address = address.toXAddress()
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
     */
    async initializeChronik() {
      this.loadingMessage = 'Connecting to network...'

      this._chronik = markRaw(new ChronikClient(CHRONIK_URL))
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
     */
    async handleAddedToMempool(txid: string) {
      if (!this._chronik || !this._script) return

      const tx = await this._chronik.tx(txid)
      const scriptHex = this._script.toHex()

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
            this.recalculateBalance()
            await this.saveWalletState()
          }
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

      if (!Address.isValid(toAddress)) {
        throw new Error('Invalid address')
      }

      // Ensure minimum fee rate
      const effectiveFeeRate = Math.max(1, Math.floor(feeRate))

      // Transaction size constants
      const TX_OVERHEAD = 10
      const INPUT_SIZE = 148
      const OUTPUT_SIZE = 34
      const DUST_THRESHOLD = 546

      // Build transaction
      const tx = new Transaction()
      let inputTotal = 0n
      const spentInputs: string[] = []

      // Add inputs (sorted by value ascending for optimal selection)
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

      for (const [outpoint, utxo] of sortedUtxos) {
        const [txid, outIdx] = outpoint.split('_')
        tx.from({
          txid,
          outputIndex: Number(outIdx),
          script: this._script.toHex(),
          satoshis: Number(utxo.value),
        })
        inputTotal += BigInt(utxo.value)
        spentInputs.push(outpoint)

        // Estimate fee with current inputs (assume 2 outputs for change)
        const estimatedSize =
          TX_OVERHEAD + spentInputs.length * INPUT_SIZE + 2 * OUTPUT_SIZE
        const estimatedFee = BigInt(estimatedSize * effectiveFeeRate)

        // Check if we have enough for amount + fee
        if (inputTotal >= BigInt(amountSats) + estimatedFee) {
          break
        }
      }

      // First, calculate fee assuming NO change (for max send case)
      const txSizeNoChange =
        TX_OVERHEAD + spentInputs.length * INPUT_SIZE + OUTPUT_SIZE
      const feeNoChange = txSizeNoChange * effectiveFeeRate
      const potentialChange = Number(inputTotal) - amountSats - feeNoChange

      // Determine if we'll have change output
      const hasChange = potentialChange > DUST_THRESHOLD

      // Recalculate fee with correct number of outputs
      const txSize =
        TX_OVERHEAD +
        spentInputs.length * INPUT_SIZE +
        (hasChange ? 2 : 1) * OUTPUT_SIZE
      const fee = txSize * effectiveFeeRate
      const totalNeeded = BigInt(amountSats) + BigInt(fee)

      if (inputTotal < totalNeeded) {
        throw new Error('Insufficient balance for amount + fee')
      }

      // Add output
      tx.to(toAddress, amountSats)

      // Add change output if above dust threshold
      const change = Number(inputTotal) - amountSats - fee
      if (change > DUST_THRESHOLD) {
        tx.change(this.address)
      }

      // Sign and broadcast
      tx.sign(this._signingKey)
      const result = await this._chronik.broadcastTx(tx.toBuffer())

      // Remove spent UTXOs
      for (const outpoint of spentInputs) {
        this.utxos.delete(outpoint)
      }
      this.recalculateBalance()
      await this.saveWalletState()

      return result.txid
    },

    /**
     * Advanced transaction builder with multi-output, OP_RETURN, locktime, and coin control support
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

      for (const recipient of recipients) {
        if (!Address.isValid(recipient.address)) {
          throw new Error(`Invalid address: ${recipient.address}`)
        }
        if (recipient.amountSats <= 0) {
          throw new Error('Amount must be greater than 0')
        }
      }

      // Ensure minimum fee rate
      const effectiveFeeRate = Math.max(1, Math.floor(feeRate))

      // Transaction size constants
      const TX_OVERHEAD = 10
      const INPUT_SIZE = 148
      const OUTPUT_SIZE = 34
      const OP_RETURN_OVERHEAD = 11 // OP_RETURN + pushdata opcodes
      const DUST_THRESHOLD = 546

      // Calculate total send amount
      const totalSendAmount = recipients.reduce(
        (sum, r) => sum + BigInt(r.amountSats),
        0n,
      )

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

      // Build transaction
      const tx = new Transaction()
      let inputTotal = 0n
      const spentInputs: string[] = []

      // Calculate OP_RETURN size if present
      let opReturnSize = 0
      if (opReturnData && opReturnData.data) {
        const dataLength =
          opReturnData.encoding === 'hex'
            ? opReturnData.data.length / 2
            : opReturnData.data.length
        opReturnSize = OP_RETURN_OVERHEAD + dataLength
      }

      // Calculate number of outputs (recipients + potential change + potential OP_RETURN)
      const numRecipientOutputs = recipients.length
      const hasOpReturn = opReturnSize > 0

      // Add inputs
      for (const [outpoint, utxo] of availableUtxos) {
        const [txid, outIdx] = outpoint.split('_')
        tx.from({
          txid,
          outputIndex: Number(outIdx),
          script: this._script.toHex(),
          satoshis: Number(utxo.value),
        })
        inputTotal += BigInt(utxo.value)
        spentInputs.push(outpoint)

        // Estimate fee with current inputs (assume change output)
        const estimatedNumOutputs =
          numRecipientOutputs + 1 + (hasOpReturn ? 1 : 0)
        const estimatedSize =
          TX_OVERHEAD +
          spentInputs.length * INPUT_SIZE +
          estimatedNumOutputs * OUTPUT_SIZE +
          opReturnSize
        const estimatedFee = BigInt(estimatedSize * effectiveFeeRate)

        // Check if we have enough for amount + fee
        if (inputTotal >= totalSendAmount + estimatedFee) {
          break
        }
      }

      // Calculate final fee
      // First, check if we need a change output
      const txSizeNoChange =
        TX_OVERHEAD +
        spentInputs.length * INPUT_SIZE +
        numRecipientOutputs * OUTPUT_SIZE +
        opReturnSize
      const feeNoChange = txSizeNoChange * effectiveFeeRate
      const potentialChange =
        Number(inputTotal) - Number(totalSendAmount) - feeNoChange

      const hasChange = potentialChange > DUST_THRESHOLD

      // Recalculate fee with correct number of outputs
      const txSize =
        TX_OVERHEAD +
        spentInputs.length * INPUT_SIZE +
        (numRecipientOutputs + (hasChange ? 1 : 0)) * OUTPUT_SIZE +
        opReturnSize
      const fee = txSize * effectiveFeeRate
      const totalNeeded = totalSendAmount + BigInt(fee)

      if (inputTotal < totalNeeded) {
        throw new Error('Insufficient balance for amount + fee')
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

      // Add change output if above dust threshold
      const change = Number(inputTotal) - Number(totalSendAmount) - fee
      if (change > DUST_THRESHOLD) {
        tx.change(this.address)
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
      for (const outpoint of spentInputs) {
        this.utxos.delete(outpoint)
      }
      this.recalculateBalance()
      await this.saveWalletState()

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
  },
})
