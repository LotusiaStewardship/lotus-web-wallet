# Consolidation Targets

Specific recommendations for UI component consolidation.

---

## Tier 1: High Impact - Eliminate Duplicates

### 1.1 Unified AddressDisplay

**Target**: Single `components/common/AddressDisplay.vue`

**Props**:

```typescript
interface AddressDisplayProps {
  address: string
  // Display options
  truncate?: boolean // Default: true
  showFingerprint?: boolean // Show short fingerprint
  size?: 'xs' | 'sm' | 'md' // Default: 'sm'
  // Feature flags
  copyable?: boolean // Show copy button. Default: true
  showAddToContacts?: boolean // Show add button for unknown. Default: true
  linkToExplorer?: boolean // Wrap in link. Default: false
  showYouBadge?: boolean // Show "You" for own address. Default: true
  showContactBadge?: boolean // Show "Contact" badge. Default: false
  // Contact display
  showAvatar?: boolean // Show contact avatar. Default: true
  showAddress?: boolean // Show address alongside name. Default: true
}
```

**Migration**:
| From | To |
|------|-----|
| `explorer/AddressDisplay.vue` | `common/AddressDisplay.vue` with `linkToExplorer` |
| Inline address displays | `common/AddressDisplay.vue` |

**Files to update**:

- `components/explorer/TxItem.vue`
- `components/explorer/AddressDisplay.vue` → DELETE
- All components using inline address display

---

### 1.2 Unified SignerDetailModal

**Target**: Single `components/common/SignerDetailModal.vue`

**Props**:

```typescript
interface SignerDetailModalProps {
  signer: SignerData | null
  open: boolean
}

interface SignerData {
  id: string
  peerId: string
  publicKey?: string
  publicKeyHex?: string
  nickname?: string
  reputation?: number
  isOnline?: boolean
  responseTime?: number
  capabilities?: Record<string, boolean>
  fee?: number | string
  walletAddress?: string
  lastSeen?: number
}
```

**Slots**:

```vue
<template #primary-action>
  <!-- Context-specific primary action -->
</template>
```

**Migration**:
| From | To |
|------|-----|
| `p2p/SignerDetailModal.vue` | `common/SignerDetailModal.vue` with slot |
| `shared-wallets/SignerDetailModal.vue` | `common/SignerDetailModal.vue` with slot |

**Usage after consolidation**:

```vue
<!-- In P2P context -->
<CommonSignerDetailModal
  :signer="signer"
  :open="open"
  @update:open="open = $event"
>
  <template #primary-action>
    <UButton color="primary" icon="i-lucide-pen-tool" @click="requestSignature">
      Request Signature
    </UButton>
  </template>
</CommonSignerDetailModal>

<!-- In Shared Wallets context -->
<CommonSignerDetailModal
  :signer="signer"
  :open="open"
  @update:open="open = $event"
>
  <template #primary-action>
    <UButton color="primary" icon="i-lucide-plus" @click="addToWallet">
      Add to Wallet
    </UButton>
  </template>
</CommonSignerDetailModal>
```

**Files to delete**:

- `components/p2p/SignerDetailModal.vue`
- `components/shared-wallets/SignerDetailModal.vue`

---

### 1.3 Unified TxItem

**Target**: Single `components/common/TxItem.vue`

**Props**:

```typescript
interface TxItemProps {
  transaction: NormalizedTransaction
  // Display variants
  variant?: 'compact' | 'standard' | 'detailed' // Default: 'standard'
  // Feature flags
  showFee?: boolean // Default: false
  showContact?: boolean // Default: true
  showConfirmations?: boolean // Default: true
  showType?: boolean // Default: false (for explorer)
  showInputOutput?: boolean // Default: false (for explorer)
  // Navigation
  linkToExplorer?: boolean // Default: true
  clickable?: boolean // Emit click event. Default: false
}

interface NormalizedTransaction {
  txid: string
  timestamp: number
  blockHeight?: number
  confirmations: number
  // Direction
  direction: 'incoming' | 'outgoing' | 'self'
  isCoinbase?: boolean
  // Amounts
  amount: string | bigint
  fee?: string | bigint
  // Counterparty
  counterpartyAddress?: string
  // Type info (for explorer)
  type?: 'transfer' | 'coinbase' | 'rank' | 'burn'
  burnAmount?: string | bigint
  inputCount?: number
  outputCount?: number
}
```

**Migration**:
| From | To |
|------|-----|
| `wallet/TxItem.vue` | `common/TxItem.vue` variant="compact" |
| `history/TxItem.vue` | `common/TxItem.vue` variant="standard" showFee |
| `explorer/TxItem.vue` | `common/TxItem.vue` variant="detailed" showType showInputOutput |

**Normalization helper**:

```typescript
// composables/useTransactionNormalizer.ts
function normalizeWalletTx(tx: TransactionHistoryItem): NormalizedTransaction
function normalizeHistoryTx(tx: HistoryTransaction): NormalizedTransaction
function normalizeExplorerTx(tx: ExplorerTransaction): NormalizedTransaction
```

**Files to delete**:

- `components/wallet/TxItem.vue`
- `components/history/TxItem.vue`
- `components/explorer/TxItem.vue`

---

### 1.4 Unified NetworkStatus

**Target**: Single `components/common/NetworkStatus.vue`

**Props**:

```typescript
interface NetworkStatusProps {
  // Display mode
  mode?: 'wallet' | 'p2p' | 'compact' // Default: 'wallet'
  // Feature flags
  showBlockchain?: boolean // Block height, UTXOs. Default: mode === 'wallet'
  showP2P?: boolean // Peers, DHT. Default: mode !== 'wallet'
  showMuSig2?: boolean // Signers, sessions. Default: true
  showDebug?: boolean // Peer ID, multiaddrs. Default: false
  showErrors?: boolean // Error display. Default: true
}
```

**Migration**:
| From | To |
|------|-----|
| `wallet/NetworkStatus.vue` | `common/NetworkStatus.vue` mode="wallet" |
| `p2p/NetworkStatus.vue` | `common/NetworkStatus.vue` mode="p2p" |
| `shared-wallets/NetworkStatusBar.vue` | `common/NetworkStatus.vue` mode="compact" |

**Files to delete**:

- `components/wallet/NetworkStatus.vue`
- `components/p2p/NetworkStatus.vue`
- `components/shared-wallets/NetworkStatusBar.vue`

---

### 1.5 Unified ActivityFeed

**Target**: Single `components/common/ActivityFeed.vue`

**Props**:

```typescript
interface ActivityFeedProps {
  // Data source
  events?: ActivityEvent[] // Direct events (for P2P)
  useStore?: boolean // Use activity store. Default: true if no events
  // Display options
  limit?: number // Max items. Default: 10
  filter?: 'all' | 'transaction' | 'p2p' | 'musig2'
  showFilters?: boolean // Show filter chips. Default: false
  compact?: boolean // Compact mode. Default: false
}
```

**Migration**:
| From | To |
|------|-----|
| `p2p/ActivityFeed.vue` | `common/ActivityFeed.vue` :events="p2pEvents" |

**Files to delete**:

- `components/p2p/ActivityFeed.vue`

---

## Tier 2: Medium Impact - Standardize Patterns

### 2.1 OnlineStatusBadge

**Already planned in responsibility consolidation.**

**Target**: `components/common/OnlineStatusBadge.vue`

```vue
<OnlineStatusBadge :status="onlineStatus" show-label />
```

---

### 2.2 EntityCard

**Target**: `components/common/EntityCard.vue`

Unified card for contacts, signers, and participants.

**Props**:

```typescript
interface EntityCardProps {
  // Entity data
  name: string
  address?: string
  publicKey?: string
  avatar?: string
  // Status
  onlineStatus?: OnlineStatus
  // Badges
  badges?: Array<{ label: string; color: string }>
  // Actions
  primaryAction?: { label: string; icon: string }
  // Display
  compact?: boolean
  variant?: 'list' | 'card'
}
```

**Usage**:

```vue
<!-- Contact -->
<EntityCard
  :name="contact.name"
  :address="contact.address"
  :online-status="onlineStatus"
  :badges="[{ label: 'MuSig2', color: 'primary' }]"
/>

<!-- Signer -->
<EntityCard
  :name="signer.nickname"
  :public-key="signer.publicKey"
  :online-status="onlineStatus"
  :badges="capabilities"
  :primary-action="{ label: 'Request', icon: 'i-lucide-pen-tool' }"
/>

<!-- Participant -->
<EntityCard
  :name="participant.name"
  :online-status="onlineStatus"
  :badges="[{ label: 'You', color: 'primary' }]"
  compact
/>
```

---

### 2.3 CopyableField

**Target**: `components/common/CopyableField.vue`

Standardize copy-to-clipboard pattern.

**Props**:

```typescript
interface CopyableFieldProps {
  value: string
  label?: string
  truncate?: boolean
  truncateLength?: number
  mono?: boolean // Use monospace font
}
```

**Usage**:

```vue
<CopyableField label="Public Key" :value="publicKey" truncate mono />
```

---

### 2.4 Standardized Empty/Loading States

**Already have `UiAppEmptyState` and `UiAppLoadingState`.**

Ensure all components use these consistently.

---

## Tier 3: UX Improvements

### 3.1 Contact/Signer Unification

**Concept**: Treat signers as contacts with capabilities.

When a signer is discovered:

1. Check if contact exists with same public key
2. If yes, update contact with signer capabilities
3. If no, offer to save as contact

**UI Changes**:

- Signer cards show "Contact" badge if already saved
- Contact cards show signer capabilities if available
- "Save as Contact" becomes primary action for unknown signers

---

### 3.2 Shared Wallet Flow Simplification

**Current**: Complex wizard with multiple steps

**Proposed**: Streamlined flow

1. Select participants (contacts with public keys)
2. Name wallet
3. Create

Remove threshold selection (MuSig2 is always n-of-n).

---

### 3.3 Transaction History Unification

**Current**: Different views in wallet, history page, explorer

**Proposed**: Single transaction list component with context-aware display

```vue
<TransactionList
  :transactions="transactions"
  context="wallet"    <!-- compact, own transactions -->
  context="history"   <!-- full detail, own transactions -->
  context="explorer"  <!-- full detail, any transactions -->
/>
```

---

## Implementation Priority

| Target                     | Impact | Effort | Priority                 |
| -------------------------- | ------ | ------ | ------------------------ |
| OnlineStatusBadge          | High   | Low    | **P1** (already planned) |
| Unified AddressDisplay     | High   | Low    | **P1**                   |
| Unified SignerDetailModal  | High   | Low    | **P1**                   |
| Unified TxItem             | High   | Medium | **P2**                   |
| Unified NetworkStatus      | Medium | Medium | **P2**                   |
| Unified ActivityFeed       | Medium | Low    | **P2**                   |
| EntityCard                 | Medium | Medium | **P3**                   |
| CopyableField              | Low    | Low    | **P3**                   |
| Contact/Signer unification | High   | High   | **P3**                   |

---

## Files to Create

| File                                      | Purpose                   |
| ----------------------------------------- | ------------------------- |
| `components/common/OnlineStatusBadge.vue` | Unified online status     |
| `components/common/TxItem.vue`            | Unified transaction item  |
| `components/common/NetworkStatus.vue`     | Unified network status    |
| `components/common/EntityCard.vue`        | Unified entity card       |
| `components/common/CopyableField.vue`     | Copyable field pattern    |
| `composables/useEntityName.ts`            | Entity name resolution    |
| `composables/useTransactionNormalizer.ts` | Transaction normalization |

## Files to Delete

| File                                              | Replaced By                    |
| ------------------------------------------------- | ------------------------------ |
| `components/explorer/AddressDisplay.vue`          | `common/AddressDisplay.vue`    |
| `components/p2p/SignerDetailModal.vue`            | `common/SignerDetailModal.vue` |
| `components/shared-wallets/SignerDetailModal.vue` | `common/SignerDetailModal.vue` |
| `components/wallet/TxItem.vue`                    | `common/TxItem.vue`            |
| `components/history/TxItem.vue`                   | `common/TxItem.vue`            |
| `components/explorer/TxItem.vue`                  | `common/TxItem.vue`            |
| `components/wallet/NetworkStatus.vue`             | `common/NetworkStatus.vue`     |
| `components/p2p/NetworkStatus.vue`                | `common/NetworkStatus.vue`     |
| `components/shared-wallets/NetworkStatusBar.vue`  | `common/NetworkStatus.vue`     |
| `components/p2p/ActivityFeed.vue`                 | `common/ActivityFeed.vue`      |

**Total files to delete**: 10
