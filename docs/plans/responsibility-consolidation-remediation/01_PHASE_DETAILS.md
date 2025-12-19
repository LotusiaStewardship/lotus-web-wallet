# Phase Implementation Details

Detailed implementation steps for each phase of the responsibility consolidation.

---

## Phase 1: Wallet API (0.5 days)

### 1.1 Add Public API to wallet.ts

**File**: `stores/wallet.ts`

Add the following methods to the store actions:

```typescript
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
getTransactionBuildContext(): TransactionBuildContext | null {
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
signTransactionHex(tx: InstanceType<typeof BitcoreTypes.Transaction>): string {
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
```

**Add type export** at top of file:

```typescript
export interface TransactionBuildContext {
  script: InstanceType<typeof BitcoreTypes.Script>
  addressType: 'p2pkh' | 'p2tr'
  changeAddress: string
  internalPubKey?: InstanceType<typeof BitcoreTypes.PublicKey>
  merkleRoot?: Buffer
}
```

### 1.2 Update draft.ts to Use Public API

**File**: `stores/draft.ts`

**Change 1**: `_buildContext()` method (lines 270-296)

```typescript
_buildContext(): TransactionBuildContext | null {
  const walletStore = useWalletStore()
  const Bitcore = getBitcore()

  // Use public API instead of private properties
  const txContext = walletStore.getTransactionBuildContext()
  if (!Bitcore || !txContext) return null

  const availableUtxos = this._getAvailableUtxos()

  return {
    availableUtxos,
    recipients: this.recipients.map(r => ({
      address: r.address,
      amountSats: r.amountSats,
      sendMax: r.sendMax,
    })),
    feeRate: this.feeRate,
    changeAddress: txContext.changeAddress,
    script: txContext.script,
    addressType: txContext.addressType,
    internalPubKey: txContext.internalPubKey,
    merkleRoot: txContext.merkleRoot,
    opReturn: this.opReturn,
    locktime: this.locktime,
    selectedUtxoOutpoints:
      this.selectedUtxos.length > 0 ? this.selectedUtxos : undefined,
  }
},
```

**Change 2**: `send()` method initialization check (line 365)

```typescript
// Before
if (!isChronikInitialized() || !walletStore._signingKey || !Bitcore) {

// After
if (!isChronikInitialized() || !walletStore.isReadyForSigning() || !Bitcore) {
```

**Change 3**: `send()` method UTXO signing data (lines 425-429)

```typescript
// Before
const utxosForSigning = utxosToUse.map(utxo => ({
  outpoint: utxo.outpoint,
  satoshis: Number(utxo.value),
  scriptHex: walletStore._script!.toHex(),
}))

// After
const scriptHex = walletStore.getScriptHex()
if (!scriptHex) throw new Error('Script not available')

const utxosForSigning = utxosToUse.map(utxo => ({
  outpoint: utxo.outpoint,
  satoshis: Number(utxo.value),
  scriptHex,
}))
```

**Change 4**: `send()` method crypto worker params (lines 436-437)

```typescript
// Before
walletStore._internalPubKey?.toString(),
walletStore._merkleRoot?.toString('hex'),

// After
walletStore.getInternalPubKeyString(),
walletStore.getMerkleRootHex(),
```

**Change 5**: `send()` method direct signing (lines 441-446)

```typescript
// Before
if (walletStore.addressType === 'p2tr') {
  tx.signSchnorr(walletStore._signingKey)
} else {
  tx.sign(walletStore._signingKey)
}
signedTxHex = tx.toBuffer().toString('hex')

// After
signedTxHex = walletStore.signTransactionHex(tx)
```

---

## Phase 2: Identity Consolidation (1.5 days)

### 2.1 Enhance Identity Store

**File**: `stores/identity.ts`

Add the following types and methods:

```typescript
// =========================================================================
// Types
// =========================================================================

export type OnlineStatus = 'online' | 'recently_online' | 'offline' | 'unknown'

const RECENTLY_ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

// =========================================================================
// New Methods
// =========================================================================

/**
 * Get online status with multi-signal detection.
 * This is the canonical source for online status.
 */
function getOnlineStatus(publicKeyHex: string): OnlineStatus {
  const normalized = normalizePublicKey(publicKeyHex)
  const identity = identities.value.get(normalized)

  if (!identity) return 'unknown'
  if (identity.isOnline) return 'online'

  if (identity.lastSeenAt) {
    if (Date.now() - identity.lastSeenAt < RECENTLY_ONLINE_THRESHOLD) {
      return 'recently_online'
    }
  }

  return 'offline'
}

/**
 * Update identity from P2P peer connection event.
 * Called by p2p.ts when a peer connects.
 */
function updateFromPeerConnection(
  peerId: string,
  multiaddrs: string[],
): Identity | null {
  const identity = findByPeerId(peerId)
  if (!identity) return null

  identity.isOnline = true
  identity.lastSeenAt = Date.now()
  identity.multiaddrs = multiaddrs
  identity.updatedAt = Date.now()

  // Don't persist immediately (too frequent)
  return identity
}

/**
 * Mark identity offline by peer ID.
 * Called by p2p.ts when a peer disconnects.
 */
function markOfflineByPeerId(peerId: string): void {
  const identity = findByPeerId(peerId)
  if (identity) {
    identity.isOnline = false
    identity.updatedAt = Date.now()
    if (identity.signerCapabilities) {
      identity.signerCapabilities.available = false
    }
  }
}

/**
 * Update identity from MuSig2 signer discovery.
 * Called by musig2.ts when a signer is discovered.
 */
function updateFromSignerDiscovery(signer: {
  publicKeyHex: string
  peerId?: string
  multiaddrs?: string[]
  nickname?: string
  capabilities?: Record<string, boolean>
  responseTime?: number
  reputation?: number
}): Identity {
  const networkStore = useNetworkStore()
  const network = networkStore.currentNetwork as 'livenet' | 'testnet'
  const identity = findOrCreate(signer.publicKeyHex, network)

  if (signer.peerId) identity.peerId = signer.peerId
  if (signer.multiaddrs) identity.multiaddrs = signer.multiaddrs
  if (signer.nickname) identity.nickname = signer.nickname

  if (signer.capabilities) {
    identity.signerCapabilities = {
      transactionTypes: Object.entries(signer.capabilities)
        .filter(([_, v]) => v)
        .map(([k]) => k),
      available: true,
    }
  }

  identity.isOnline = true
  identity.lastSeenAt = Date.now()
  identity.updatedAt = Date.now()

  save()
  return identity
}

/**
 * Batch update presence for multiple identities.
 * Called when presence data is received from DHT.
 */
function batchUpdatePresence(
  updates: Array<{
    publicKeyHex: string
    isOnline: boolean
    lastSeenAt?: number
  }>,
): void {
  for (const update of updates) {
    updatePresence(update.publicKeyHex, update)
  }
}
```

Add to return statement:

```typescript
return {
  // ... existing exports ...

  // New methods
  getOnlineStatus,
  updateFromPeerConnection,
  markOfflineByPeerId,
  updateFromSignerDiscovery,
  batchUpdatePresence,
}
```

### 2.2 Update P2P Store

**File**: `stores/p2p.ts`

Modify peer event handlers to update identity store:

```typescript
// In _handlePeerConnected or equivalent
async function handlePeerConnected(peer: {
  peerId: string
  multiaddrs: string[]
}) {
  // Existing logic...

  // Update identity store
  const identityStore = useIdentityStore()
  identityStore.updateFromPeerConnection(peer.peerId, peer.multiaddrs)
}

// In _handlePeerDisconnected or equivalent
function handlePeerDisconnected(peerId: string) {
  // Existing logic...

  // Update identity store
  const identityStore = useIdentityStore()
  identityStore.markOfflineByPeerId(peerId)
}
```

### 2.3 Update MuSig2 Store

**File**: `stores/musig2.ts`

Modify signer discovery handler:

```typescript
// In signer discovery callback
function handleSignerDiscovered(signer: StoreSigner) {
  // Existing logic to add to discoveredSigners...

  // Update identity store
  const identityStore = useIdentityStore()
  identityStore.updateFromSignerDiscovery({
    publicKeyHex: signer.publicKey,
    peerId: signer.peerId,
    nickname: signer.nickname,
    capabilities: signer.capabilities,
    responseTime: signer.responseTime,
    reputation: signer.reputation,
  })
}
```

### 2.4 Simplify Contacts Store

**File**: `stores/contacts.ts`

Replace complex online status logic:

```typescript
// Before (lines ~128-161): Complex multi-signal detection
function getOnlineStatusForContact(contact, identity, p2pStore) {
  // ... complex logic checking 4 sources ...
}

// After: Delegate to identity store
function getOnlineStatusForContact(contact: Contact): OnlineStatus {
  const identityStore = useIdentityStore()

  // If contact has identity reference, use it
  if (contact.identityId) {
    return identityStore.getOnlineStatus(contact.identityId)
  }

  // Legacy: Try to find identity by public key
  if (contact.publicKey) {
    return identityStore.getOnlineStatus(contact.publicKey)
  }

  return 'unknown'
}
```

Add migration on initialization:

```typescript
function initialize() {
  loadContacts()

  // Migrate legacy contacts to use identityId
  migrateContactsToIdentity()
}

function migrateContactsToIdentity() {
  const identityStore = useIdentityStore()
  const networkStore = useNetworkStore()
  const network = networkStore.currentNetwork as 'livenet' | 'testnet'

  let migrated = 0

  for (const contact of contacts.value) {
    // Skip if already has identityId
    if (contact.identityId) continue

    // Migrate contacts with public key
    if (contact.publicKey) {
      const identity = identityStore.findOrCreate(contact.publicKey, network)

      // Copy legacy data to identity
      if (contact.peerId && !identity.peerId) {
        identity.peerId = contact.peerId
      }
      if (contact.lastSeenOnline && !identity.lastSeenAt) {
        identity.lastSeenAt = contact.lastSeenOnline
      }
      if (contact.signerCapabilities && !identity.signerCapabilities) {
        identity.signerCapabilities = contact.signerCapabilities
      }

      // Set identity reference
      contact.identityId = identity.publicKeyHex
      migrated++
    }
  }

  if (migrated > 0) {
    console.log(`[Contacts] Migrated ${migrated} contacts to identity system`)
    identityStore.save()
    saveContacts()
  }
}
```

---

## Phase 3: Facade Composables (1 day)

### 3.1 Create useContactContext

**File**: `composables/useContactContext.ts` (NEW)

```typescript
/**
 * Contact Context Composable
 *
 * Provides a unified interface for contact-related UI.
 * Combines data from contacts, identity, p2p, musig2, and wallet stores.
 */
import { computed, type ComputedRef } from 'vue'
import { useContactsStore, type Contact } from '~/stores/contacts'
import {
  useIdentityStore,
  type Identity,
  type OnlineStatus,
} from '~/stores/identity'
import { useMuSig2Store, type SharedWallet } from '~/stores/musig2'
import { useWalletStore } from '~/stores/wallet'

export interface ContactContext {
  // Data
  contact: ComputedRef<Contact | null>
  identity: ComputedRef<Identity | null>
  onlineStatus: ComputedRef<OnlineStatus>
  sharedWallets: ComputedRef<SharedWallet[]>
  transactionCount: ComputedRef<number>
  canMuSig2: ComputedRef<boolean>

  // Actions
  send: () => void
  edit: () => void
  remove: () => Promise<void>
  createSharedWallet: () => void
  copyAddress: () => void
  copyPublicKey: () => void
}

export function useContactContext(
  contactId: string | Ref<string>,
): ContactContext {
  const contactsStore = useContactsStore()
  const identityStore = useIdentityStore()
  const musig2Store = useMuSig2Store()
  const walletStore = useWalletStore()
  const router = useRouter()
  const { copy } = useClipboard()

  const id = computed(() => unref(contactId))

  const contact = computed(
    () => contactsStore.contacts.find(c => c.id === id.value) ?? null,
  )

  const identity = computed(() => {
    if (!contact.value) return null
    if (contact.value.identityId) {
      return identityStore.get(contact.value.identityId) ?? null
    }
    if (contact.value.publicKey) {
      return identityStore.get(contact.value.publicKey) ?? null
    }
    return null
  })

  const onlineStatus = computed((): OnlineStatus => {
    if (!identity.value) return 'unknown'
    return identityStore.getOnlineStatus(identity.value.publicKeyHex)
  })

  const sharedWallets = computed(() => {
    const pubKey = identity.value?.publicKeyHex || contact.value?.publicKey
    if (!pubKey) return []
    return musig2Store.sharedWallets.filter(w =>
      w.participants.some(p => p.publicKeyHex === pubKey),
    )
  })

  const transactionCount = computed(() => {
    if (!contact.value?.address) return 0
    return walletStore.getTransactionsWithContact(contact.value.address).length
  })

  const canMuSig2 = computed(() => {
    return !!(identity.value?.publicKeyHex || contact.value?.publicKey)
  })

  // Actions
  function send() {
    if (!contact.value?.address) return
    router.push({
      path: '/transact/send',
      query: { to: contact.value.address },
    })
  }

  function edit() {
    if (!contact.value) return
    // Emit event or navigate to edit
    router.push({
      path: '/people/contacts',
      query: { edit: contact.value.id },
    })
  }

  async function remove() {
    if (!contact.value) return
    await contactsStore.deleteContact(contact.value.id)
  }

  function createSharedWallet() {
    if (!contact.value) return
    router.push({
      path: '/people/shared-wallets',
      query: { createWith: contact.value.id },
    })
  }

  function copyAddress() {
    if (contact.value?.address) {
      copy(contact.value.address, 'Address')
    }
  }

  function copyPublicKey() {
    const pubKey = identity.value?.publicKeyHex || contact.value?.publicKey
    if (pubKey) {
      copy(pubKey, 'Public Key')
    }
  }

  return {
    contact,
    identity,
    onlineStatus,
    sharedWallets,
    transactionCount,
    canMuSig2,
    send,
    edit,
    remove,
    createSharedWallet,
    copyAddress,
    copyPublicKey,
  }
}
```

### 3.2 Create useSharedWalletContext

**File**: `composables/useSharedWalletContext.ts` (NEW)

```typescript
/**
 * Shared Wallet Context Composable
 *
 * Provides a unified interface for shared wallet UI.
 */
import { computed, type ComputedRef } from 'vue'
import {
  useMuSig2Store,
  type SharedWallet,
  type WalletSigningSession,
} from '~/stores/musig2'
import {
  useIdentityStore,
  type Identity,
  type OnlineStatus,
} from '~/stores/identity'
import { useContactsStore, type Contact } from '~/stores/contacts'

export interface ParticipantWithContext {
  publicKeyHex: string
  identity: Identity | null
  contact: Contact | null
  onlineStatus: OnlineStatus
  isMe: boolean
}

export interface SharedWalletContext {
  // Data
  wallet: ComputedRef<SharedWallet | null>
  participants: ComputedRef<ParticipantWithContext[]>
  activeSessions: ComputedRef<WalletSigningSession[]>
  pendingSessions: ComputedRef<WalletSigningSession[]>
  onlineParticipantCount: ComputedRef<number>
  canPropose: ComputedRef<boolean>

  // Actions
  proposeSpend: (params: ProposeSpendParams) => Promise<string>
  refreshBalance: () => Promise<void>
  deleteWallet: () => Promise<void>
}

export function useSharedWalletContext(
  walletId: string | Ref<string>,
): SharedWalletContext {
  const musig2Store = useMuSig2Store()
  const identityStore = useIdentityStore()
  const contactsStore = useContactsStore()
  const walletStore = useWalletStore()

  const id = computed(() => unref(walletId))

  const wallet = computed(
    () => musig2Store.sharedWallets.find(w => w.id === id.value) ?? null,
  )

  const myPublicKey = computed(() =>
    walletStore.getPublicKeyHex(AccountPurpose.MUSIG2),
  )

  const participants = computed((): ParticipantWithContext[] => {
    if (!wallet.value) return []

    return wallet.value.participants.map(p => {
      const identity = identityStore.get(p.publicKeyHex)
      const contact = contactsStore.contacts.find(
        c => c.identityId === p.publicKeyHex || c.publicKey === p.publicKeyHex,
      )

      return {
        publicKeyHex: p.publicKeyHex,
        identity: identity ?? null,
        contact: contact ?? null,
        onlineStatus: identityStore.getOnlineStatus(p.publicKeyHex),
        isMe: p.publicKeyHex === myPublicKey.value,
      }
    })
  })

  const activeSessions = computed(() =>
    musig2Store.activeSessions.filter(s => s.walletId === id.value),
  )

  const pendingSessions = computed(() =>
    musig2Store.pendingSessions.filter(s => s.walletId === id.value),
  )

  const onlineParticipantCount = computed(
    () => participants.value.filter(p => p.onlineStatus === 'online').length,
  )

  const canPropose = computed(() => {
    if (!wallet.value) return false
    // All participants must be online for n-of-n
    return onlineParticipantCount.value === wallet.value.participants.length
  })

  // Actions
  async function proposeSpend(params: ProposeSpendParams): Promise<string> {
    if (!wallet.value) throw new Error('Wallet not found')
    return await musig2Store.proposeSpend(wallet.value.id, params)
  }

  async function refreshBalance(): Promise<void> {
    if (!wallet.value) return
    await musig2Store.refreshWalletBalance(wallet.value.id)
  }

  async function deleteWallet(): Promise<void> {
    if (!wallet.value) return
    await musig2Store.deleteSharedWallet(wallet.value.id)
  }

  return {
    wallet,
    participants,
    activeSessions,
    pendingSessions,
    onlineParticipantCount,
    canPropose,
    proposeSpend,
    refreshBalance,
    deleteWallet,
  }
}
```

### 3.3 Create useSignerContext

**File**: `composables/useSignerContext.ts` (NEW)

```typescript
/**
 * Signer Context Composable
 *
 * Provides a unified interface for signer discovery and advertisement UI.
 */
import { computed, type ComputedRef } from 'vue'
import {
  useMuSig2Store,
  type StoreSigner,
  type SignerConfig,
} from '~/stores/musig2'
import {
  useIdentityStore,
  type Identity,
  type OnlineStatus,
} from '~/stores/identity'
import { useContactsStore, type Contact } from '~/stores/contacts'

export interface SignerWithContext {
  signer: StoreSigner
  identity: Identity | null
  contact: Contact | null
  onlineStatus: OnlineStatus
}

export interface SignerContext {
  // Data
  discoveredSigners: ComputedRef<SignerWithContext[]>
  isAdvertising: ComputedRef<boolean>
  myConfig: ComputedRef<SignerConfig | null>
  isInitialized: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>

  // Actions
  advertise: (config: SignerConfig) => Promise<void>
  withdraw: () => Promise<void>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
}

export function useSignerContext(): SignerContext {
  const musig2Store = useMuSig2Store()
  const identityStore = useIdentityStore()
  const contactsStore = useContactsStore()

  const discoveredSigners = computed((): SignerWithContext[] => {
    return musig2Store.discoveredSigners.map(signer => {
      const identity = identityStore.get(signer.publicKey)
      const contact = contactsStore.contacts.find(
        c =>
          c.identityId === signer.publicKey || c.publicKey === signer.publicKey,
      )

      return {
        signer,
        identity: identity ?? null,
        contact: contact ?? null,
        onlineStatus: identityStore.getOnlineStatus(signer.publicKey),
      }
    })
  })

  const isAdvertising = computed(() => musig2Store.signerEnabled)
  const myConfig = computed(() => musig2Store.signerConfig)
  const isInitialized = computed(() => musig2Store.initialized)
  const isLoading = computed(() => musig2Store.loading)

  // Actions
  async function advertise(config: SignerConfig): Promise<void> {
    await musig2Store.advertiseSigner(config)
  }

  async function withdraw(): Promise<void> {
    await musig2Store.withdrawSigner()
  }

  async function refresh(): Promise<void> {
    await musig2Store.refreshSigners()
  }

  async function initialize(): Promise<void> {
    await musig2Store.initialize()
  }

  return {
    discoveredSigners,
    isAdvertising,
    myConfig,
    isInitialized,
    isLoading,
    advertise,
    withdraw,
    refresh,
    initialize,
  }
}
```

---

## Phase 4: Component Migration

See `02_COMPONENT_MIGRATION.md` for detailed component-by-component changes.

---

## Phase 5: Cleanup

### 5.1 Deprecate Legacy Contact Fields

Update `types/contact.ts`:

```typescript
export interface Contact {
  id: string
  name: string
  address: string
  identityId?: string // Canonical reference to Identity

  // Relationship metadata (kept)
  notes?: string
  tags?: string[]
  isFavorite?: boolean
  createdAt: number
  updatedAt: number

  // @deprecated - Use identityId to reference Identity store
  peerId?: string
  // @deprecated - Use identityId to reference Identity store
  publicKey?: string
  // @deprecated - Use identityId to reference Identity store
  lastSeenOnline?: number
  // @deprecated - Use identityId to reference Identity store
  signerCapabilities?: SignerCapabilities
}
```

### 5.2 Remove Duplicate Address Utilities

Consolidate into `composables/useAddress.ts`:

- Remove `utils/identity.ts:deriveAddressFromPublicKey()` → use `useAddress().publicKeyToAddress()`
- Update all callers

### 5.3 Clean Up useMuSig2.ts

Remove legacy stubs that just throw errors:

- `createSession()`
- `joinSession()`
- `sendSigningRequest()`

These were placeholders that are no longer needed.
