# Duplicate Components Analysis

Detailed analysis of components that exist in multiple forms across the codebase.

---

## 1. AddressDisplay (2 implementations)

### Locations

| File                                     | Size   | Purpose                             |
| ---------------------------------------- | ------ | ----------------------------------- |
| `components/common/AddressDisplay.vue`   | 3.2 KB | Contact-aware address display       |
| `components/explorer/AddressDisplay.vue` | 2.4 KB | Explorer address display with links |

### Feature Comparison

| Feature             | common/        | explorer/                  |
| ------------------- | -------------- | -------------------------- |
| Contact lookup      | ✓              | ✓                          |
| Contact avatar      | ✓              | ✓                          |
| Truncation          | ✓              | ✓                          |
| Copy button         | ✓              | ✗                          |
| Add to contacts     | ✓              | ✓ (via separate component) |
| Link to explorer    | ✗              | ✓                          |
| "You" badge         | ✗              | ✓                          |
| Size variants       | ✓ (xs, sm, md) | ✗                          |
| Fingerprint display | ✓              | ✓                          |

### Differences

**common/AddressDisplay.vue**:

```typescript
// Uses contactStore.findByAddress()
// Has size variants
// Inline copy button
// Inline add-to-contacts button
```

**explorer/AddressDisplay.vue**:

```typescript
// Uses walletStore.address for "You" detection
// Links to explorer page
// Uses separate AddToContactButton component
// No size variants
```

### Consolidation Recommendation

Create unified `AddressDisplay.vue` with props:

- `linkToExplorer?: boolean`
- `showYouBadge?: boolean`
- `size?: 'xs' | 'sm' | 'md'`
- `copyable?: boolean`
- `showAddToContacts?: boolean`

---

## 2. SignerDetailModal (3 implementations)

### Locations

| File                                              | Size   | Purpose                                 |
| ------------------------------------------------- | ------ | --------------------------------------- |
| `components/common/SignerDetailModal.vue`         | 5.6 KB | Generic signer details                  |
| `components/p2p/SignerDetailModal.vue`            | 7.0 KB | P2P signer with signature request       |
| `components/shared-wallets/SignerDetailModal.vue` | 7.0 KB | Shared wallet signer with add-to-wallet |

### Feature Comparison

| Feature              | common/ | p2p/ | shared-wallets/ |
| -------------------- | ------- | ---- | --------------- |
| Signer identity      | ✓       | ✓    | ✓               |
| Online status        | ✓       | ✓    | ✓               |
| Capabilities         | ✓       | ✓    | ✓               |
| Public key display   | ✓       | ✓    | ✓               |
| Peer ID display      | ✓       | ✓    | ✓               |
| Copy buttons         | ✗       | ✓    | ✓               |
| Save as contact      | ✓       | ✓    | ✓               |
| Request signature    | ✗       | ✓    | ✗               |
| Add to wallet        | ✗       | ✗    | ✓               |
| Create shared wallet | ✗       | ✓    | ✓               |
| Slot for actions     | ✓       | ✗    | ✗               |

### Code Duplication

The `p2p/` and `shared-wallets/` versions are **nearly identical** (194 vs 194 lines) with only footer actions differing:

```vue
<!-- p2p/SignerDetailModal.vue footer -->
<UButton icon="i-lucide-pen-tool" @click="handleRequestSignature">
  Request Signature
</UButton>

<!-- shared-wallets/SignerDetailModal.vue footer -->
<UButton icon="i-lucide-plus" @click="handleAddToWallet">
  Add to Wallet
</UButton>
```

### Consolidation Recommendation

Use `common/SignerDetailModal.vue` with slot for primary action:

```vue
<CommonSignerDetailModal :signer="signer" :open="open">
  <template #primary-action>
    <UButton @click="handleAction">{{ actionLabel }}</UButton>
  </template>
</CommonSignerDetailModal>
```

Delete `p2p/SignerDetailModal.vue` and `shared-wallets/SignerDetailModal.vue`.

---

## 3. TxItem (3 implementations)

### Locations

| File                             | Size   | Purpose                       |
| -------------------------------- | ------ | ----------------------------- |
| `components/wallet/TxItem.vue`   | 3.2 KB | Dashboard transaction item    |
| `components/history/TxItem.vue`  | 4.5 KB | History page transaction item |
| `components/explorer/TxItem.vue` | 4.2 KB | Explorer transaction item     |

### Feature Comparison

| Feature             | wallet/ | history/        | explorer/ |
| ------------------- | ------- | --------------- | --------- |
| Direction icon      | ✓       | ✓               | ✓         |
| Amount display      | ✓       | ✓               | ✓         |
| Time display        | ✓       | ✓               | ✓         |
| Contact lookup      | ✓       | ✓               | ✗         |
| Confirmation badge  | ✓       | ✓               | ✗         |
| Fee display         | ✗       | ✓               | ✗         |
| Coinbase detection  | ✗       | ✓               | ✓         |
| RANK vote detection | ✗       | ✗               | ✓         |
| Burn detection      | ✗       | ✗               | ✓         |
| Input/output counts | ✗       | ✗               | ✓         |
| Link to explorer    | ✓       | ✗ (click event) | ✓         |
| Compact mode        | ✗       | ✗               | ✓         |

### Data Structure Differences

Each component expects different transaction data shapes:

```typescript
// wallet/TxItem.vue
interface TransactionHistoryItem {
  txid: string
  timestamp: string  // string!
  blockHeight: number
  isSend: boolean
  amount: string
  address: string
  confirmations: number
}

// history/TxItem.vue
interface Transaction {
  txid: string
  timestamp: number  // number!
  blockHeight?: number
  direction: 'incoming' | 'outgoing' | 'self'
  amount: string
  fee?: string
  counterparty?: string
  confirmations: number
  isCoinbase?: boolean
  opReturn?: string
}

// explorer/TxItem.vue
interface Transaction {
  txid: string
  timestamp?: number
  blockHeight?: number
  isCoinbase?: boolean
  isRank?: boolean
  burnAmount?: string | bigint
  totalOutput?: string | bigint
  inputs?: Array<...>
  outputs?: Array<...>
}
```

### Consolidation Recommendation

Create unified `TxItem.vue` with:

1. Normalized transaction interface
2. `variant` prop: `'compact' | 'standard' | 'detailed'`
3. `context` prop: `'wallet' | 'history' | 'explorer'`
4. Feature flags: `showFee`, `showContact`, `showType`

---

## 4. ActivityFeed (2 implementations)

### Locations

| File                                 | Size   | Purpose                     |
| ------------------------------------ | ------ | --------------------------- |
| `components/common/ActivityFeed.vue` | 4.2 KB | Cross-feature activity feed |
| `components/p2p/ActivityFeed.vue`    | 3.7 KB | P2P-specific activity feed  |

### Feature Comparison

| Feature                    | common/ | p2p/ |
| -------------------------- | ------- | ---- |
| Filter chips               | ✓       | ✗    |
| Activity store integration | ✓       | ✗    |
| Event type icons           | ✓       | ✓    |
| Time display               | ✓       | ✓    |
| Click navigation           | ✓       | ✗    |
| Compact mode               | ✓       | ✗    |
| Empty state                | ✓       | ✓    |
| Max events limit           | ✓       | ✓    |

### Consolidation Recommendation

The `common/ActivityFeed.vue` is more feature-complete. Update it to:

1. Accept events as prop (for P2P use case)
2. Or use activity store (for cross-feature use case)

Delete `p2p/ActivityFeed.vue` and use `common/ActivityFeed.vue` everywhere.

---

## 5. NetworkStatus (3 implementations)

### Locations

| File                                             | Size   | Purpose                   |
| ------------------------------------------------ | ------ | ------------------------- |
| `components/wallet/NetworkStatus.vue`            | 1.5 KB | Wallet dashboard stats    |
| `components/p2p/NetworkStatus.vue`               | 6.8 KB | P2P network diagnostics   |
| `components/shared-wallets/NetworkStatusBar.vue` | 5.3 KB | Shared wallet network bar |

### Feature Comparison

| Feature          | wallet/ | p2p/ | shared-wallets/ |
| ---------------- | ------- | ---- | --------------- |
| Block height     | ✓       | ✗    | ✗               |
| UTXO count       | ✓       | ✗    | ✗               |
| Peer count       | ✓       | ✓    | ✓               |
| Signer count     | ✓       | ✓    | ✓               |
| Connection state | ✗       | ✓    | ✓               |
| DHT status       | ✗       | ✓    | ✓               |
| Routing table    | ✗       | ✓    | ✗               |
| Active sessions  | ✗       | ✓    | ✓               |
| Error display    | ✗       | ✓    | ✓               |
| Debug info       | ✗       | ✓    | ✗               |
| Compact mode     | ✗       | ✓    | ✓               |

### Consolidation Recommendation

Create unified `NetworkStatus.vue` with:

- `mode` prop: `'wallet' | 'p2p' | 'compact'`
- `showBlockchain` prop for wallet stats
- `showP2P` prop for P2P stats
- `showDebug` prop for debug info

---

## 6. SignerCard Patterns

### Locations

| File                               | Size   | Purpose             |
| ---------------------------------- | ------ | ------------------- |
| `components/common/SignerCard.vue` | 5.7 KB | Unified signer card |

### Usage Analysis

The `common/SignerCard.vue` exists but is not consistently used:

```typescript
// components/p2p/SignerList.vue - Uses inline rendering
<div v-for="signer in signers" :key="signer.id">
  <!-- Inline signer display, not using SignerCard -->
</div>

// components/shared-wallets/AvailableSigners.vue - Uses inline rendering
<div v-for="signer in signers" :key="signer.id">
  <!-- Inline signer display, not using SignerCard -->
</div>
```

### Consolidation Recommendation

Update all signer lists to use `CommonSignerCard`:

```vue
<CommonSignerCard
  v-for="signer in signers"
  :key="signer.id"
  :signer="signer"
  @request="handleRequest"
  @saveContact="handleSaveContact"
/>
```

---

## Summary: Components to Consolidate

| Current                                | Target        | Action                       |
| -------------------------------------- | ------------- | ---------------------------- |
| `common/AddressDisplay.vue`            | Keep, enhance | Add explorer features        |
| `explorer/AddressDisplay.vue`          | Delete        | Migrate to common            |
| `common/SignerDetailModal.vue`         | Keep, enhance | Add slot for actions         |
| `p2p/SignerDetailModal.vue`            | Delete        | Migrate to common            |
| `shared-wallets/SignerDetailModal.vue` | Delete        | Migrate to common            |
| `wallet/TxItem.vue`                    | Merge         | Create unified TxItem        |
| `history/TxItem.vue`                   | Merge         | Create unified TxItem        |
| `explorer/TxItem.vue`                  | Merge         | Create unified TxItem        |
| `common/ActivityFeed.vue`              | Keep, enhance | Add prop for events          |
| `p2p/ActivityFeed.vue`                 | Delete        | Migrate to common            |
| `wallet/NetworkStatus.vue`             | Merge         | Create unified NetworkStatus |
| `p2p/NetworkStatus.vue`                | Merge         | Create unified NetworkStatus |
| `shared-wallets/NetworkStatusBar.vue`  | Merge         | Create unified NetworkStatus |

**Total components to delete**: 8  
**Total components to merge**: 6  
**Net reduction**: ~8 components
