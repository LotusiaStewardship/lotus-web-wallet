/**
 * Wallet Store
 * Manages wallet state, UTXO cache, and blockchain interactions
 */
import { defineStore } from 'pinia'
import { useNetworkStore } from './network'
import { useNotificationStore } from './notifications'
import type { ChronikSubscription } from '~/plugins/chronik.client'
import type * as Bitcore from 'xpi-ts/lib/bitcore'
import type { Buffer } from 'buffer/'

// Note: ParsedTransaction type is available from ~/composables/useExplorerApi

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

// Duplicate notification prevention
const recentNotifications = new Set<string>()
const NOTIFICATION_DEDUP_WINDOW = 60_000 // 1 minute

function shouldNotify(txid: string): boolean {
  if (recentNotifications.has(txid)) return false

  recentNotifications.add(txid)
  setTimeout(() => recentNotifications.delete(txid), NOTIFICATION_DEDUP_WINDOW)

  return true
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

export const useWalletStore = defineStore('wallet', () => {
  // Nuxt plugin instances
  const { $bitcore, $chronik, $cryptoWorker } = useNuxtApp()
  // =========================================================================
  // Private runtime state (not serializable, not exposed)
  // =========================================================================
  let _hdPrivkey: any = null
  const _accountKeys = new Map<AccountPurpose, RuntimeKeyData>()
  let _signingKey: any = null
  let _script: any = null
  let _internalPubKey: Bitcore.PublicKey | undefined = undefined
  let _merkleRoot: Buffer | undefined = undefined

  // =========================================================================
  // Reactive State
  // =========================================================================
  const initialized = ref(false)
  const loading = ref(false)
  const loadingMessage = ref('')
  const seedPhrase = ref('')
  const addressType = ref<AddressType>('p2tr-commitment')
  const tipHeight = ref(0)
  const tipHash = ref('')
  const connected = ref(false)
  const transactionHistory = ref<TransactionHistoryItem[]>([])
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
  const balance = ref<WalletBalance>({
    total: '0',
    spendable: '0',
    utxoCount: 0,
  })
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
    blockHeight: number
    isCoinbase: boolean
  }> {
    const result: Array<{
      outpoint: string
      value: string
      blockHeight: number
      isCoinbase: boolean
    }> = []
    for (const [outpoint, utxo] of utxos.value) {
      if (utxo.isCoinbase) {
        const confirmations =
          utxo.blockHeight > 0 ? tipHeight.value - utxo.blockHeight + 1 : 0
        if (confirmations >= 100) {
          result.push({ ...utxo, outpoint })
        }
      } else {
        result.push({ ...utxo, outpoint })
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
      loadingMessage.value = 'Initializing wallet...'

      // Check for existing wallet in storage
      const savedState = getRawItem(STORAGE_KEYS.WALLET_STATE)

      console.log('[Wallet] Saved state:', savedState)

      if (savedState) {
        await loadWallet(JSON.parse(savedState))
      } else {
        // Generate new wallet
        await createNewWallet()
      }

      // Wallet is loaded
      loading.value = false
      loadingMessage.value = ''

      // Initialize Chronik connection in background (non-blocking)
      initializeChronik()
        .then(() => {
          initialized.value = true
          console.log('[Wallet] initialized successfully')
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

    if (USE_CRYPTO_WORKER) {
      // Use crypto worker for mnemonic generation (non-blocking)
      mnemonic = await $cryptoWorker.generateMnemonic()
    } else {
      // Fallback to main thread
      mnemonic = new $bitcore.Mnemonic().toString()
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
    if (USE_CRYPTO_WORKER) {
      isValid = await $cryptoWorker.validateMnemonic(phrase)
    } else {
      isValid = $bitcore.Mnemonic.isValid(phrase)
    }

    if (!isValid) {
      throw new Error('Invalid seed phrase')
    }

    loading.value = true
    loadingMessage.value = 'Restoring wallet...'

    try {
      // First disconnect Chronik WebSocket
      $chronik.disconnectWebSocket()
      // Clear existing state
      transactionHistory.value = []
      utxos.value = new Map()
      balance.value = { total: '0', spendable: '0', utxoCount: 0 }

      await buildWalletFromMnemonic(phrase)
      await saveWalletState()

      // Reconnect Chronik with new address (uses local wrapper function)
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
      // Disconnect Chronik WebSocket first
      $chronik.disconnectWebSocket()

      // Clear existing state
      transactionHistory.value = []
      utxos.value = new Map()
      balance.value = { total: '0', spendable: '0', utxoCount: 0 }

      // Update address type and rebuild wallet
      addressType.value = newType
      await buildWalletFromMnemonic(seedPhrase.value)
      await saveWalletState()

      // Reconnect Chronik WebSocket with new address (use local wrapper function)
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
        balance: { total: '0', spendable: '0', utxoCount: 0 },
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
    balance.value = { total: '0', spendable: '0', utxoCount: 0 }
  }

  /**
   * Derive keys for a specific account
   */
  async function _deriveAccountKeys(
    phrase: string,
    accountPurpose: AccountPurpose,
    networkName: NetworkType,
  ): Promise<AccountState> {
    const accountIndex = accountPurpose
    const addressIndex = 0
    const isChange = false
    const derivationPath = buildDerivationPath(
      accountIndex,
      isChange,
      addressIndex,
    )
    const {
      HDPrivateKey,
      PrivateKey,
      PublicKey,
      Mnemonic,
      Script,
      Address,
      Networks,
    } = $bitcore

    if (USE_CRYPTO_WORKER) {
      const result = await $cryptoWorker.deriveKeys(
        phrase,
        addressType.value,
        networkName,
        accountIndex,
        addressIndex,
        isChange,
      )

      Networks.get(networkName)

      const signingKey = new PrivateKey(result.privateKeyHex)
      let script: Bitcore.Script
      let internalPubKey: Bitcore.PublicKey | undefined
      let merkleRoot: Buffer | undefined

      if (addressType.value === 'p2tr-commitment' && result.internalPubKeyHex) {
        const { commitmentHex } = await $cryptoWorker.deriveP2TRCommitment(
          result.internalPubKeyHex,
        )
        const commitment = new PublicKey(commitmentHex)
        internalPubKey = $bitcore.PublicKey.fromString(commitmentHex)
        script = $bitcore.Script.buildTaprootOut(commitment)
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
        // key-path only Taproot needs 32-byte merkle root of all-zeroes
        merkleRoot = $bitcore.BufferUtil.alloc(32)
        const commitment = $bitcore.tweakPublicKey(internalPubKey, merkleRoot)
        addr = Address.fromTaprootCommitment(commitment, network)
        script = $bitcore.Script.buildTaprootOut(commitment)
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
  function getChronikAddressType(): AddressType {
    return addressType.value === 'p2tr-commitment' ? 'p2tr-commitment' : 'p2pkh'
  }

  /**
   * Initialize Chronik client and WebSocket
   */
  async function initializeChronik() {
    loadingMessage.value = 'Connecting to network...'

    const networkStore = useNetworkStore()
    const scriptTypeVal = getChronikAddressType()

    await $chronik.initialize({
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

    const blockchainInfo = await $chronik.fetchBlockchainInfo()
    if (blockchainInfo) {
      tipHeight.value = blockchainInfo.tipHeight
      tipHash.value = blockchainInfo.tipHash
    }

    await refreshUtxos()
    await fetchTransactionHistory()
    await $chronik.connectWebSocket()
    await subscribeToAllAccounts()
    initializeBackgroundMonitoring()

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if ($chronik.isInitialized()) {
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
    const scriptTypeVal = getChronikAddressType()
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
      await $chronik.subscribeToMultipleScripts(subscriptions)
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
          scriptType: getChronikAddressType(),
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
    if (!$chronik.isInitialized() || !_script) return

    const tx = await $chronik.fetchTransaction(txid)
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
            blockHeight: -1,
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
    if (!$chronik.isInitialized()) return

    const tx = await $chronik.fetchTransaction(txid)
    if (!tx) return

    let changed = false

    for (const [outpoint, utxo] of utxos.value) {
      if (outpoint.startsWith(txid)) {
        utxo.blockHeight = tx.block?.height ?? -1
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
    if (!$chronik.isInitialized()) return

    const block = await $chronik.fetchBlock(blockHash)
    if (!block) return

    tipHeight.value = block.blockInfo.height
    tipHash.value = blockHash

    recalculateBalance()
    await saveWalletState()
  }

  /**
   * Refresh UTXOs from Chronik service
   */
  async function refreshUtxos() {
    if (!$chronik.isInitialized()) return

    utxos.value.clear()

    const fetchedUtxos = await $chronik.fetchUtxos()
    for (const utxo of fetchedUtxos) {
      const outpoint = `${utxo.outpoint.txid}_${utxo.outpoint.outIdx}`
      utxos.value.set(outpoint, {
        value: utxo.value,
        blockHeight: utxo.blockHeight,
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
    if (!$chronik.isInitialized() || !_script) return

    historyLoading.value = true
    try {
      const { txs } = await $chronik.fetchTransactionHistory(page, pageSize)
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
            const scriptBuf = $bitcore.BufferUtil.from(
              counterpartyScript,
              'hex',
            )
            const script = $bitcore.Script.fromBuffer(scriptBuf)
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
    } finally {
      historyLoading.value = false
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
          utxo.blockHeight > 0 ? tipHeight.value - utxo.blockHeight + 1 : 0
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
      utxoCount: utxos.value.size,
    }
  }

  /**
   * Sign a message with the wallet's private key
   */
  function signMessage(text: string): string {
    if (!_signingKey) {
      throw new Error('Wallet not initialized')
    }
    const message = new $bitcore.Message(text)
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
    const message = new $bitcore.Message(text)
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
    return utxoState?.balance ?? { total: '0', spendable: '0', utxoCount: 0 }
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
      utxoCount: accountUtxos.value
        .values()
        .reduce((count, utxoState) => count + utxoState.utxos.size, 0),
    }
  }

  /**
   * Disconnect and cleanup
   */
  async function disconnect() {
    $chronik.disconnectWebSocket()
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
      $chronik.disconnectWebSocket()

      transactionHistory.value = []
      utxos.value = new Map()
      balance.value = { total: '0', spendable: '0', utxoCount: 0 }

      await buildWalletFromMnemonic(seedPhrase.value)
      await saveWalletState()

      // Initialize Chronik with new network
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
  function signTransactionHex(tx: Bitcore.Transaction): string {
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
    return $bitcore.Mnemonic.isValid(phrase)
  }

  // =========================================================================
  // Return public API
  // =========================================================================
  return {
    // State
    initialized,
    loading,
    loadingMessage,
    seedPhrase,
    addressType,
    tipHeight,
    tipHash,
    connected,
    transactionHistory,
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
    getChronikAddressType,
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
