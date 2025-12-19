# API Reference

New public APIs introduced by the responsibility consolidation.

---

## Wallet Store API

### TransactionBuildContext

```typescript
interface TransactionBuildContext {
  /** Bitcore Script for inputs */
  script: InstanceType<typeof BitcoreTypes.Script>
  /** Address type for signing */
  addressType: 'p2pkh' | 'p2tr'
  /** Change address */
  changeAddress: string
  /** Internal public key for Taproot (optional) */
  internalPubKey?: InstanceType<typeof BitcoreTypes.PublicKey>
  /** Merkle root for Taproot (optional) */
  merkleRoot?: Buffer
}
```

### Methods

#### getTransactionBuildContext()

Returns the context needed to build a transaction.

```typescript
getTransactionBuildContext(): TransactionBuildContext | null
```

**Returns**: Transaction context or `null` if wallet not initialized.

**Usage**:

```typescript
const walletStore = useWalletStore()
const ctx = walletStore.getTransactionBuildContext()
if (!ctx) {
  throw new Error('Wallet not initialized')
}
// Use ctx.script, ctx.addressType, etc.
```

---

#### isReadyForSigning()

Checks if the wallet is ready to sign transactions.

```typescript
isReadyForSigning(): boolean
```

**Returns**: `true` if signing key, script, and initialization are complete.

**Usage**:

```typescript
if (!walletStore.isReadyForSigning()) {
  throw new Error('Wallet not ready for signing')
}
```

---

#### signTransactionHex(tx)

Signs a transaction and returns the signed hex.

```typescript
signTransactionHex(tx: Transaction): string
```

**Parameters**:

- `tx` - Unsigned Bitcore Transaction object

**Returns**: Signed transaction as hex string.

**Throws**: Error if wallet not initialized for signing.

**Usage**:

```typescript
const tx = builder.buildTransaction(ctx, utxos, maxSendable)
const signedHex = walletStore.signTransactionHex(tx)
await broadcastTransaction(signedHex)
```

---

#### getScriptHex()

Gets the script hex for the primary account.

```typescript
getScriptHex(): string | null
```

**Returns**: Script as hex string or `null` if not available.

---

#### getInternalPubKeyString()

Gets the internal public key as string (for Taproot).

```typescript
getInternalPubKeyString(): string | null
```

**Returns**: Public key string or `null` for non-Taproot addresses.

---

#### getMerkleRootHex()

Gets the merkle root as hex string (for Taproot).

```typescript
getMerkleRootHex(): string | null
```

**Returns**: Merkle root hex or `null` for non-Taproot addresses.

---

## Identity Store API

### OnlineStatus

```typescript
type OnlineStatus = 'online' | 'recently_online' | 'offline' | 'unknown'
```

| Status            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `online`          | Identity is currently online (isOnline = true) |
| `recently_online` | Was online within last 5 minutes               |
| `offline`         | Not online and not recently seen               |
| `unknown`         | Identity not found                             |

---

### Methods

#### getOnlineStatus(publicKeyHex)

Gets the online status for an identity.

```typescript
getOnlineStatus(publicKeyHex: string): OnlineStatus
```

**Parameters**:

- `publicKeyHex` - Public key as hex string

**Returns**: Online status enum value.

**Usage**:

```typescript
const identityStore = useIdentityStore()
const status = identityStore.getOnlineStatus(contact.publicKey)
if (status === 'online') {
  // Show online indicator
}
```

---

#### updateFromPeerConnection(peerId, multiaddrs)

Updates identity when a peer connects.

```typescript
updateFromPeerConnection(peerId: string, multiaddrs: string[]): Identity | null
```

**Parameters**:

- `peerId` - libp2p peer ID
- `multiaddrs` - Array of multiaddress strings

**Returns**: Updated identity or `null` if not found.

**Side Effects**:

- Sets `isOnline = true`
- Updates `lastSeenAt`
- Updates `multiaddrs`

---

#### markOfflineByPeerId(peerId)

Marks an identity offline when peer disconnects.

```typescript
markOfflineByPeerId(peerId: string): void
```

**Parameters**:

- `peerId` - libp2p peer ID

**Side Effects**:

- Sets `isOnline = false`
- Sets `signerCapabilities.available = false`

---

#### updateFromSignerDiscovery(signer)

Updates identity from MuSig2 signer discovery.

```typescript
updateFromSignerDiscovery(signer: {
  publicKeyHex: string
  peerId?: string
  multiaddrs?: string[]
  nickname?: string
  capabilities?: Record<string, boolean>
  responseTime?: number
  reputation?: number
}): Identity
```

**Parameters**:

- `signer` - Signer discovery data

**Returns**: Created or updated identity.

**Side Effects**:

- Creates identity if not exists
- Updates all provided fields
- Sets `isOnline = true`
- Persists to storage

---

#### batchUpdatePresence(updates)

Batch update presence for multiple identities.

```typescript
batchUpdatePresence(
  updates: Array<{ publicKeyHex: string; isOnline: boolean; lastSeenAt?: number }>
): void
```

**Parameters**:

- `updates` - Array of presence updates

**Usage**:

```typescript
// When receiving presence data from DHT
identityStore.batchUpdatePresence([
  { publicKeyHex: '02abc...', isOnline: true },
  { publicKeyHex: '03def...', isOnline: false, lastSeenAt: Date.now() - 60000 },
])
```

---

## Facade Composables

### useContactContext(contactId)

Provides unified contact data and actions.

```typescript
function useContactContext(contactId: string | Ref<string>): ContactContext

interface ContactContext {
  // Reactive Data
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
```

**Usage**:

```typescript
const props = defineProps<{ contactId: string }>()
const { contact, identity, onlineStatus, sharedWallets, send, copyAddress } =
  useContactContext(() => props.contactId)
```

---

### useSharedWalletContext(walletId)

Provides unified shared wallet data and actions.

```typescript
function useSharedWalletContext(
  walletId: string | Ref<string>,
): SharedWalletContext

interface ParticipantWithContext {
  publicKeyHex: string
  identity: Identity | null
  contact: Contact | null
  onlineStatus: OnlineStatus
  isMe: boolean
}

interface SharedWalletContext {
  // Reactive Data
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
```

**Usage**:

```typescript
const route = useRoute()
const walletId = computed(() => route.params.id as string)
const { wallet, participants, canPropose, proposeSpend } =
  useSharedWalletContext(walletId)
```

---

### useSignerContext()

Provides unified signer discovery data and actions.

```typescript
function useSignerContext(): SignerContext

interface SignerWithContext {
  signer: StoreSigner
  identity: Identity | null
  contact: Contact | null
  onlineStatus: OnlineStatus
}

interface SignerContext {
  // Reactive Data
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
```

**Usage**:

```typescript
const { discoveredSigners, isAdvertising, advertise, withdraw } =
  useSignerContext()

// Each signer has identity and contact pre-resolved
for (const {
  signer,
  identity,
  contact,
  onlineStatus,
} of discoveredSigners.value) {
  console.log(contact?.name || identity?.nickname || signer.nickname)
  console.log(onlineStatus) // 'online' | 'recently_online' | 'offline' | 'unknown'
}
```

---

## Contacts Store API (Updated)

### getOnlineStatusForContact(contact)

Gets online status for a contact (simplified).

```typescript
getOnlineStatusForContact(contact: Contact): OnlineStatus
```

**Parameters**:

- `contact` - Contact object

**Returns**: Online status from identity store.

**Implementation**:

```typescript
function getOnlineStatusForContact(contact: Contact): OnlineStatus {
  const identityStore = useIdentityStore()

  if (contact.identityId) {
    return identityStore.getOnlineStatus(contact.identityId)
  }
  if (contact.publicKey) {
    return identityStore.getOnlineStatus(contact.publicKey)
  }
  return 'unknown'
}
```

---

### migrateContactsToIdentity()

Migrates legacy contacts to use identity system.

```typescript
migrateContactsToIdentity(): void
```

**Side Effects**:

- Creates identities for contacts with publicKey
- Sets `identityId` on migrated contacts
- Copies legacy data (peerId, lastSeenOnline) to identity
- Persists changes

**Called**: Automatically on store initialization.

---

## Component: OnlineStatusBadge

Reusable component for displaying online status.

### Props

| Prop        | Type           | Default  | Description       |
| ----------- | -------------- | -------- | ----------------- |
| `status`    | `OnlineStatus` | required | Status to display |
| `showLabel` | `boolean`      | `false`  | Show text label   |

### Usage

```vue
<OnlineStatusBadge :status="onlineStatus" />
<OnlineStatusBadge :status="onlineStatus" show-label />
```

### Output

| Status            | Color   | Icon          | Label             |
| ----------------- | ------- | ------------- | ----------------- |
| `online`          | success | filled circle | "Online"          |
| `recently_online` | warning | filled circle | "Recently Online" |
| `offline`         | neutral | filled circle | "Offline"         |
| `unknown`         | neutral | help circle   | "Unknown"         |

---

## Migration Guide

### Before: Direct Store Access

```typescript
// Component accessing multiple stores
const contactsStore = useContactsStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const identityStore = useIdentityStore()

const isOnline = computed(() => {
  if (props.contact.peerId && p2pStore.connectedPeers.some(...)) return true
  const identity = identityStore.get(props.contact.publicKey)
  if (identity?.isOnline) return true
  return false
})

const sharedWallets = computed(() =>
  musig2Store.sharedWallets.filter(w =>
    w.participants.some(p => p.publicKeyHex === props.contact.publicKey)
  )
)
```

### After: Facade Composable

```typescript
// Component using facade composable
const { identity, onlineStatus, sharedWallets, canMuSig2 } = useContactContext(
  () => props.contact.id,
)

// onlineStatus is already computed: 'online' | 'recently_online' | 'offline' | 'unknown'
// sharedWallets is already filtered
// No need to access multiple stores
```

### Before: Private State Access

```typescript
// draft.ts accessing wallet private properties
if (!walletStore._script) return null
script: walletStore._script, tx.sign(walletStore._signingKey)
```

### After: Public API

```typescript
// draft.ts using public API
const ctx = walletStore.getTransactionBuildContext()
if (!ctx) return null
script: ctx.script, (signedHex = walletStore.signTransactionHex(tx))
```
