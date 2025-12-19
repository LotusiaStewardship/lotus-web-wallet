# 03: Stores Refactor

## Overview

This document details the refactoring of Pinia stores. The current `wallet.ts` (53KB) and `p2p.ts` (21KB) are too large and mix concerns. We'll split them into focused, single-responsibility stores.

---

## Current Problems

### wallet.ts (53KB, ~1500 lines)

1. **Mixes concerns**: Balance, UTXOs, transactions, draft transaction, SDK initialization
2. **Race conditions**: Draft transaction initialized before UTXOs loaded
3. **BigInt serialization**: `draftTx` contains BigInt which can't be JSON serialized
4. **Too many responsibilities**: Acts as both state store and service layer

### p2p.ts (21KB, ~600 lines)

1. **Mixes P2P and MuSig2**: Core connectivity mixed with signing protocol
2. **Incomplete state**: MuSig2 sessions not properly tracked
3. **No separation**: UI state mixed with SDK state

---

## New Store Structure

```
stores/
├── wallet.ts      # Core wallet state (balance, UTXOs, history)
├── draft.ts       # Draft transaction state (NEW)
├── network.ts     # Network configuration (existing, minor updates)
├── contacts.ts    # Contacts state (existing, minor updates)
├── p2p.ts         # Core P2P state (refactored)
├── musig2.ts      # MuSig2 state (NEW - split from p2p)
├── ui.ts          # UI state (NEW)
└── onboarding.ts  # Onboarding state (NEW)
```

---

## Store: wallet.ts

### Responsibilities

- Wallet initialization (mnemonic, keys, address)
- Balance tracking (confirmed, unconfirmed, total)
- UTXO management
- Transaction history
- Chronik connection management

### State Interface

```typescript
interface WalletState {
  // Initialization
  initialized: boolean
  loading: boolean
  sdkReady: boolean
  error: string | null

  // Wallet Identity
  address: string
  publicKey: string

  // Balance
  balance: {
    confirmed: bigint
    unconfirmed: bigint
    total: bigint
  }

  // UTXOs
  utxos: Map<string, UTXO> // outpoint -> UTXO

  // Transaction History
  transactionHistory: WalletTransaction[]
  historyLoading: boolean
  historyHasMore: boolean

  // Connection
  connected: boolean
  tipHeight: number
}
```

### Actions

```typescript
interface WalletActions {
  // Initialization
  initialize(): Promise<void>
  loadWallet(): Promise<void>
  createNewWallet(): Promise<void>
  restoreWallet(mnemonic: string): Promise<void>

  // Balance & UTXOs
  refreshUtxos(): Promise<void>
  recalculateBalance(): void

  // Transaction History
  fetchTransactionHistory(limit?: number): Promise<void>
  fetchMoreHistory(): Promise<void>

  // Transactions
  broadcastTransaction(tx: Transaction): Promise<BroadcastResult>

  // Persistence
  saveWalletState(): void
  loadWalletState(): void
  clearWallet(): void
}
```

### Getters

```typescript
interface WalletGetters {
  balanceXPI: number // Balance in XPI (decimal)
  balanceSats: bigint // Balance in satoshis
  spendableUtxos: UTXO[] // Confirmed UTXOs only
  pendingUtxos: UTXO[] // Unconfirmed UTXOs
  utxoCount: number
  isReady: boolean // initialized && sdkReady && connected
}
```

### Key Changes from Current

1. **Remove draft transaction logic** → Moved to `draft.ts`
2. **Remove `sendLotus`, `sendAdvanced`** → Moved to `draft.ts`
3. **Simplify initialization** → Clear loading states
4. **Add proper error handling** → Typed errors

---

## Store: draft.ts (NEW)

### Responsibilities

- Draft transaction state
- Recipient management
- Amount calculation
- Fee estimation
- Coin control
- Transaction building
- Sending

### State Interface

```typescript
interface DraftState {
  // Draft Transaction
  active: boolean
  recipients: DraftRecipient[]

  // Amounts (all in satoshis)
  inputAmount: bigint
  outputAmount: bigint
  feeAmount: bigint
  changeAmount: bigint

  // Options
  feeRate: number // sats/byte
  coinControlEnabled: boolean
  selectedUtxos: Set<string> // outpoints
  opReturnData: string | null

  // Validation
  isValid: boolean
  validationError: string | null

  // Sending
  sending: boolean
  sendError: string | null
}

interface DraftRecipient {
  id: string
  address: string
  amountSats: bigint
  isValid: boolean
  error: string | null
}
```

### Actions

```typescript
interface DraftActions {
  // Initialization
  initializeDraft(): void
  resetDraft(): void

  // Recipients
  addRecipient(): void
  removeRecipient(id: string): void
  updateRecipientAddress(id: string, address: string): void
  updateRecipientAmount(id: string, amount: bigint): void
  setMaxAmount(id: string): void

  // Options
  setFeeRate(rate: number): void
  toggleCoinControl(enabled: boolean): void
  selectUtxo(outpoint: string): void
  deselectUtxo(outpoint: string): void
  selectAllUtxos(): void
  clearUtxoSelection(): void
  setOpReturnData(data: string | null): void

  // Validation
  validate(): void

  // Sending
  buildTransaction(): Transaction
  send(): Promise<SendResult>
}
```

### Getters

```typescript
interface DraftGetters {
  totalOutputAmount: bigint
  totalWithFee: bigint
  maxSendable: bigint
  availableUtxos: UTXO[]
  selectedUtxosList: UTXO[]
  canSend: boolean
  summaryText: string
}
```

### Key Design Decisions

1. **Reactive recalculation**: When any input changes, automatically recalculate fees and validation
2. **No BigInt in persisted state**: Convert to strings for any persistence
3. **Clear validation errors**: Each recipient has its own error state
4. **Separation from wallet**: Draft doesn't directly access wallet internals

---

## Store: p2p.ts (Refactored)

### Responsibilities

- P2P coordinator lifecycle
- Connection state
- Peer management
- DHT status
- Presence advertisement
- Activity events

### State Interface

```typescript
interface P2PState {
  // Connection
  initialized: boolean
  connectionState: P2PConnectionState
  error: string | null

  // Identity
  peerId: string
  multiaddrs: string[]

  // Peers
  connectedPeers: PeerInfo[]

  // DHT
  dhtReady: boolean
  routingTableSize: number

  // Presence
  presenceEnabled: boolean
  presenceConfig: PresenceConfig | null
  onlinePeers: PresenceAdvertisement[]

  // Activity
  activityEvents: P2PActivityEvent[]
}

type P2PConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'dht_ready'
  | 'fully_operational'
  | 'error'
```

### Actions

```typescript
interface P2PActions {
  // Lifecycle
  initialize(config?: P2PConfig): Promise<void>
  connect(): Promise<void>
  disconnect(): Promise<void>

  // Presence
  enablePresence(config: PresenceConfig): Promise<void>
  disablePresence(): Promise<void>

  // Internal
  getCoordinator(): P2PCoordinator | null
}
```

### Key Changes from Current

1. **Remove MuSig2 logic** → Moved to `musig2.ts`
2. **Remove signer discovery** → Moved to `musig2.ts`
3. **Simplify to core P2P only**
4. **Expose coordinator for protocol layers**

---

## Store: musig2.ts (NEW)

### Responsibilities

- MuSig2 coordinator management
- Signer discovery
- Signer advertisement
- Signing sessions
- Incoming requests
- Shared wallets

### State Interface

```typescript
interface MuSig2State {
  // Initialization
  initialized: boolean
  error: string | null

  // Discovery
  discoveredSigners: SignerAdvertisement[]
  signerSubscriptions: Map<string, SignerSubscription>

  // My Signer
  signerEnabled: boolean
  signerConfig: SignerConfig | null

  // Sessions
  activeSessions: Map<string, SigningSession>

  // Incoming Requests
  incomingRequests: IncomingSigningRequest[]

  // Shared Wallets
  sharedWallets: SharedWallet[]
}

interface SignerAdvertisement {
  id: string
  peerId: string
  publicKeyHex: string
  nickname?: string
  transactionTypes: TransactionType[]
  amountRange?: { min?: number; max?: number }
  fee?: number
  reputation?: number
  responseTime?: number
  lastSeen: number
}

interface SigningSession {
  id: string
  state: SessionState
  participants: SessionParticipant[]
  transactionType: TransactionType
  amount: bigint
  purpose?: string
  createdAt: number
  updatedAt: number
}

interface SharedWallet {
  id: string
  name: string
  description?: string
  participants: SharedWalletParticipant[]
  aggregatedPublicKey: string
  sharedAddress: string
  balance: bigint
  createdAt: number
}
```

### Actions

```typescript
interface MuSig2Actions {
  // Initialization
  initialize(): Promise<void>
  cleanup(): Promise<void>

  // Signer Advertisement
  advertiseSigner(config: SignerConfig): Promise<void>
  withdrawSigner(): Promise<void>

  // Discovery
  subscribeToSigners(criteria?: SignerCriteria): Promise<string>
  unsubscribe(subscriptionId: string): void
  refreshSigners(): Promise<void>

  // Sessions
  createSession(request: CreateSessionRequest): Promise<string>
  joinSession(sessionId: string): Promise<void>
  abortSession(sessionId: string, reason: string): Promise<void>

  // Incoming Requests
  acceptRequest(requestId: string): Promise<void>
  rejectRequest(requestId: string, reason?: string): Promise<void>

  // Shared Wallets
  createSharedWallet(config: CreateSharedWalletConfig): Promise<SharedWallet>
  fundSharedWallet(walletId: string, amount: bigint): Promise<void>
  proposeSpend(walletId: string, proposal: SpendProposal): Promise<string>
}
```

---

## Store: ui.ts (NEW)

### Responsibilities

- Modal state
- Sidebar state
- Global loading states
- Command palette state

### State Interface

```typescript
interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean

  // Modals
  activeModal: string | null
  modalData: Record<string, unknown>

  // Command Palette
  commandPaletteOpen: boolean

  // Global Loading
  globalLoading: boolean
  globalLoadingMessage: string | null

  // Notifications
  notificationCount: number
}
```

### Actions

```typescript
interface UIActions {
  // Sidebar
  toggleSidebar(): void
  setSidebarCollapsed(collapsed: boolean): void
  openMobileSidebar(): void
  closeMobileSidebar(): void

  // Modals
  openModal(name: string, data?: Record<string, unknown>): void
  closeModal(): void

  // Command Palette
  openCommandPalette(): void
  closeCommandPalette(): void

  // Loading
  setGlobalLoading(loading: boolean, message?: string): void
}
```

---

## Store: onboarding.ts (NEW)

### Responsibilities

- First-time user detection
- Onboarding step tracking
- Feature hints
- Backup reminders

### State Interface

```typescript
interface OnboardingState {
  // First Time
  isFirstTime: boolean
  onboardingComplete: boolean

  // Steps
  completedSteps: Set<OnboardingStep>
  currentStep: OnboardingStep | null

  // Hints
  dismissedHints: Set<string>

  // Backup
  backupComplete: boolean
  backupRemindedAt: number | null
}

type OnboardingStep =
  | 'welcome'
  | 'create_or_restore'
  | 'backup_seed'
  | 'first_receive'
  | 'first_send'
  | 'explore_features'
```

### Actions

```typescript
interface OnboardingActions {
  // Steps
  startOnboarding(): void
  completeStep(step: OnboardingStep): void
  skipOnboarding(): void

  // Hints
  dismissHint(hintId: string): void
  shouldShowHint(hintId: string): boolean

  // Backup
  markBackupComplete(): void
  shouldShowBackupReminder(): boolean
  snoozeBackupReminder(): void
}
```

---

## Store Interaction Patterns

### Pattern 1: Draft Store Uses Wallet Store

```typescript
// stores/draft.ts
export const useDraftStore = defineStore('draft', () => {
  const walletStore = useWalletStore()

  const availableUtxos = computed(() => {
    if (coinControlEnabled.value) {
      return walletStore.spendableUtxos.filter(utxo =>
        selectedUtxos.value.has(utxo.outpoint),
      )
    }
    return walletStore.spendableUtxos
  })

  const maxSendable = computed(() => {
    const total = availableUtxos.value.reduce(
      (sum, utxo) => sum + BigInt(utxo.value),
      0n,
    )
    // Subtract estimated fee
    return total - estimateFee(availableUtxos.value.length, 1)
  })
})
```

### Pattern 2: MuSig2 Store Uses P2P Store

```typescript
// stores/musig2.ts
export const useMuSig2Store = defineStore('musig2', () => {
  const p2pStore = useP2PStore()

  async function initialize() {
    const coordinator = p2pStore.getCoordinator()
    if (!coordinator) {
      throw new Error('P2P not initialized')
    }

    musig2Coordinator = new MuSig2P2PCoordinator(coordinator, config)
    await musig2Coordinator.initialize()
  }
})
```

### Pattern 3: UI Store for Cross-Cutting Concerns

```typescript
// In any component
const uiStore = useUIStore()

// Open a modal with data
uiStore.openModal('confirm-send', {
  recipient: '...',
  amount: 1000n,
})

// In modal component
const uiStore = useUIStore()
const modalData = computed(() => uiStore.modalData)
```

---

## Migration Steps

### Step 1: Create Type Definitions

Create `types/stores.ts` with all interfaces.

### Step 2: Create draft.ts

Extract draft transaction logic from wallet.ts.

### Step 3: Create musig2.ts

Extract MuSig2 logic from p2p.ts.

### Step 4: Create ui.ts and onboarding.ts

New stores for UI state.

### Step 5: Refactor wallet.ts

Remove extracted code, simplify.

### Step 6: Refactor p2p.ts

Remove MuSig2 code, simplify.

### Step 7: Update Components

Update all components to use new stores.

---

## Testing Considerations

### Unit Tests for Stores

```typescript
// tests/stores/draft.test.ts
describe('DraftStore', () => {
  it('calculates max sendable correctly', () => {
    const walletStore = useWalletStore()
    walletStore.utxos = new Map([
      ['tx1_0', { value: '100000000' }], // 1 XPI
      ['tx2_0', { value: '50000000' }], // 0.5 XPI
    ])

    const draftStore = useDraftStore()
    draftStore.initializeDraft()

    // Max should be total minus fee
    expect(draftStore.maxSendable).toBeLessThan(150000000n)
  })

  it('validates recipient addresses', () => {
    const draftStore = useDraftStore()
    draftStore.initializeDraft()
    draftStore.updateRecipientAddress('r1', 'invalid')

    expect(draftStore.recipients[0].isValid).toBe(false)
    expect(draftStore.recipients[0].error).toBe('Invalid address')
  })
})
```

---

_Next: [04_COMPOSABLES_REFACTOR.md](./04_COMPOSABLES_REFACTOR.md)_
