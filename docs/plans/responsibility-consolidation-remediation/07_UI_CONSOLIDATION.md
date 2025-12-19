# Phase 5-6: UI Component Consolidation

Detailed implementation plan for UI component consolidation and UX pattern standardization.

---

## Overview

This document covers Phases 5 and 6 of the remediation plan:

- **Phase 5**: UI Component Consolidation (2 days)
- **Phase 6**: UX Pattern Standardization (1 day)

These phases address issues identified in `docs/analysis/ui-ux-consolidation/`.

---

## Phase 5: UI Component Consolidation (2 days)

### Goal

Eliminate duplicate components and create unified versions.

### Day 1: High-Priority Consolidations

#### 5.1 Unified AddressDisplay (Morning)

**Current State**: 2 implementations

- `components/common/AddressDisplay.vue`
- `components/explorer/AddressDisplay.vue`

**Action**: Enhance `common/AddressDisplay.vue` with explorer features

**New Props**:

```typescript
interface AddressDisplayProps {
  address: string
  truncate?: boolean // Default: true
  size?: 'xs' | 'sm' | 'md' // Default: 'sm'
  copyable?: boolean // Default: true
  showAddToContacts?: boolean // Default: true
  linkToExplorer?: boolean // NEW: Default: false
  showYouBadge?: boolean // NEW: Default: true
  showContactBadge?: boolean // NEW: Default: false
  showAvatar?: boolean // Default: true
  showAddress?: boolean // Default: true
}
```

**Migration Steps**:

1. Add new props to `common/AddressDisplay.vue`
2. Add wallet store integration for "You" detection
3. Add NuxtLink wrapper when `linkToExplorer` is true
4. Update all usages of `explorer/AddressDisplay.vue`
5. Delete `explorer/AddressDisplay.vue`

**Files to Update**:

- `components/common/AddressDisplay.vue` - Enhance
- `components/explorer/TxItem.vue` - Use common/AddressDisplay
- `pages/explore/explorer/address/[address].vue` - Use common/AddressDisplay
- `components/explorer/AddressDisplay.vue` - DELETE

---

#### 5.2 Unified SignerDetailModal (Morning)

**Current State**: 3 implementations

- `components/common/SignerDetailModal.vue`
- `components/p2p/SignerDetailModal.vue`
- `components/shared-wallets/SignerDetailModal.vue`

**Action**: Enhance `common/SignerDetailModal.vue` with slot for primary action

**Changes to common/SignerDetailModal.vue**:

```vue
<template #footer>
  <div class="flex justify-between gap-2">
    <UButton color="neutral" variant="ghost" @click="close"> Close </UButton>
    <div class="flex gap-2">
      <UButton
        v-if="!isContact"
        color="neutral"
        variant="outline"
        icon="i-lucide-user-plus"
        @click="emit('saveContact')"
      >
        Save Contact
      </UButton>
      <!-- Slot for context-specific primary action -->
      <slot name="primary-action">
        <UButton
          color="primary"
          icon="i-lucide-wallet"
          @click="emit('createWallet')"
        >
          Create Shared Wallet
        </UButton>
      </slot>
    </div>
  </div>
</template>
```

**Migration Steps**:

1. Add `#primary-action` slot to `common/SignerDetailModal.vue`
2. Add copy buttons for public key and peer ID
3. Update P2P page to use common modal with custom action
4. Update shared-wallets page to use common modal with custom action
5. Delete duplicate modals

**Files to Update**:

- `components/common/SignerDetailModal.vue` - Enhance
- `components/p2p/SignerList.vue` - Use common modal
- `components/shared-wallets/AvailableSigners.vue` - Use common modal
- `components/p2p/SignerDetailModal.vue` - DELETE
- `components/shared-wallets/SignerDetailModal.vue` - DELETE

---

#### 5.3 Unified TxItem (Afternoon)

**Current State**: 3 implementations

- `components/wallet/TxItem.vue`
- `components/history/TxItem.vue`
- `components/explorer/TxItem.vue`

**Action**: Create new unified `common/TxItem.vue`

**New Component**:

```typescript
interface TxItemProps {
  transaction: NormalizedTransaction
  variant?: 'compact' | 'standard' | 'detailed'
  showFee?: boolean
  showContact?: boolean
  showConfirmations?: boolean
  showType?: boolean
  showInputOutput?: boolean
  linkToExplorer?: boolean
  clickable?: boolean
}

interface NormalizedTransaction {
  txid: string
  timestamp: number
  blockHeight?: number
  confirmations: number
  direction: 'incoming' | 'outgoing' | 'self'
  isCoinbase?: boolean
  amount: string | bigint
  fee?: string | bigint
  counterpartyAddress?: string
  type?: 'transfer' | 'coinbase' | 'rank' | 'burn'
  burnAmount?: string | bigint
  inputCount?: number
  outputCount?: number
}
```

**Create Normalizer Composable**:

```typescript
// composables/useTransactionNormalizer.ts
export function useTransactionNormalizer() {
  function normalizeWalletTx(tx: TransactionHistoryItem): NormalizedTransaction
  function normalizeHistoryTx(tx: HistoryTransaction): NormalizedTransaction
  function normalizeExplorerTx(tx: ExplorerTransaction): NormalizedTransaction

  return { normalizeWalletTx, normalizeHistoryTx, normalizeExplorerTx }
}
```

**Migration Steps**:

1. Create `composables/useTransactionNormalizer.ts`
2. Create `components/common/TxItem.vue` with variants
3. Update wallet dashboard to use common TxItem
4. Update history page to use common TxItem
5. Update explorer to use common TxItem
6. Delete old TxItem components

**Files to Create**:

- `composables/useTransactionNormalizer.ts`
- `components/common/TxItem.vue`

**Files to Update**:

- `pages/index.vue` - Use common TxItem
- `pages/transact/history.vue` - Use common TxItem
- `components/explorer/ExplorerTxTable.vue` - Use common TxItem

**Files to Delete**:

- `components/wallet/TxItem.vue`
- `components/history/TxItem.vue`
- `components/explorer/TxItem.vue`

---

### Day 2: Medium-Priority Consolidations

#### 5.4 Unified NetworkStatus (Morning)

**Current State**: 3 implementations

- `components/wallet/NetworkStatus.vue`
- `components/p2p/NetworkStatus.vue`
- `components/shared-wallets/NetworkStatusBar.vue`

**Action**: Create unified `common/NetworkStatus.vue`

**New Props**:

```typescript
interface NetworkStatusProps {
  mode?: 'wallet' | 'p2p' | 'compact'
  showBlockchain?: boolean
  showP2P?: boolean
  showMuSig2?: boolean
  showDebug?: boolean
  showErrors?: boolean
}
```

**Migration Steps**:

1. Create `components/common/NetworkStatus.vue`
2. Implement all three modes
3. Update wallet dashboard
4. Update P2P page
5. Update shared-wallets page
6. Delete old components

**Files to Create**:

- `components/common/NetworkStatus.vue`

**Files to Delete**:

- `components/wallet/NetworkStatus.vue`
- `components/p2p/NetworkStatus.vue`
- `components/shared-wallets/NetworkStatusBar.vue`

---

#### 5.5 Unified ActivityFeed (Morning)

**Current State**: 2 implementations

- `components/common/ActivityFeed.vue`
- `components/p2p/ActivityFeed.vue`

**Action**: Enhance `common/ActivityFeed.vue` to accept events prop

**Changes**:

```typescript
interface ActivityFeedProps {
  events?: ActivityEvent[] // Direct events (for P2P)
  useStore?: boolean // Use activity store. Default: true if no events
  limit?: number
  filter?: 'all' | 'transaction' | 'p2p' | 'musig2'
  showFilters?: boolean
  compact?: boolean
}
```

**Migration Steps**:

1. Add `events` prop to `common/ActivityFeed.vue`
2. Update P2P page to pass events directly
3. Delete `p2p/ActivityFeed.vue`

**Files to Update**:

- `components/common/ActivityFeed.vue` - Add events prop
- `components/p2p/HeroCard.vue` - Use common ActivityFeed

**Files to Delete**:

- `components/p2p/ActivityFeed.vue`

---

#### 5.6 Create EntityCard (Afternoon)

**New Component**: Unified card for contacts, signers, participants

**File**: `components/common/EntityCard.vue`

```typescript
interface EntityCardProps {
  name: string
  address?: string
  publicKey?: string
  avatar?: string
  onlineStatus?: OnlineStatus
  badges?: Array<{ label: string; color: string }>
  primaryAction?: { label: string; icon: string }
  compact?: boolean
  variant?: 'list' | 'card'
}
```

**Usage Examples**:

```vue
<!-- Contact in list -->
<EntityCard
  :name="contact.name"
  :address="contact.address"
  :online-status="onlineStatus"
  variant="list"
/>

<!-- Signer in grid -->
<EntityCard
  :name="signer.nickname"
  :public-key="signer.publicKey"
  :online-status="onlineStatus"
  :badges="[{ label: 'MuSig2', color: 'primary' }]"
  :primary-action="{ label: 'Request', icon: 'i-lucide-pen-tool' }"
  variant="card"
/>
```

---

#### 5.7 Create CopyableField (Afternoon)

**New Component**: Standardize copy-to-clipboard pattern

**File**: `components/common/CopyableField.vue`

```typescript
interface CopyableFieldProps {
  value: string
  label?: string
  truncate?: boolean
  truncateLength?: number
  mono?: boolean
}
```

---

## Phase 6: UX Pattern Standardization (1 day)

### Goal

Ensure consistent visual treatment across the application.

### 6.1 OnlineStatusBadge Usage (Already created in Phase 3)

Update all components to use `OnlineStatusBadge`:

| Component               | Current           | After                        |
| ----------------------- | ----------------- | ---------------------------- |
| ContactCard             | Inline dot        | OnlineStatusBadge            |
| ContactDetailSlideover  | Inline dot + text | OnlineStatusBadge show-label |
| SignerCard              | Badge + ring      | OnlineStatusBadge            |
| ParticipantList         | Inline dot        | OnlineStatusBadge            |
| CreateSharedWalletModal | Timestamp check   | OnlineStatusBadge            |

---

### 6.2 Empty State Standardization

Ensure all empty states use `UiAppEmptyState`:

**Components to Update**:

- `components/p2p/SignerList.vue`
- `components/p2p/SessionList.vue`
- `components/musig2/SharedWalletList.vue`
- `components/contacts/ContactSearch.vue`
- `components/common/ActivityFeed.vue`

**Standard Pattern**:

```vue
<UiAppEmptyState :icon="icon" :title="title" :description="description">
  <template #action>
    <UButton>Primary Action</UButton>
  </template>
</UiAppEmptyState>
```

---

### 6.3 Loading State Standardization

Ensure consistent loading patterns:

**For Lists**: Use `UiAppSkeleton`
**For Pages**: Use `UiAppLoadingState`
**For Buttons**: Use `loading` prop

**Components to Update**:

- `components/p2p/SignerList.vue` - Use SignerListSkeleton consistently
- `components/musig2/SharedWalletList.vue` - Use SharedWalletListSkeleton
- All async action buttons - Add loading state

---

### 6.4 Modal Header Standardization

Ensure all modals have consistent headers:

**Standard Pattern**:

```vue
<template #header>
  <div class="flex items-center gap-2">
    <UIcon :name="icon" class="w-5 h-5 text-primary" />
    <span class="font-semibold">{{ title }}</span>
  </div>
</template>
```

**Modals to Update**:

- `ContactFormSlideover.vue` - Add icon
- `ContactGroupModal.vue` - Add icon
- `SessionDetailModal.vue` - Standardize format

---

### 6.5 Action Button Placement

Standardize action button placement:

**List Items**: Primary action right, secondary in overflow
**Detail Views**: Footer with cancel left, actions right
**Cards**: Actions at bottom or in header

---

### 6.6 Color Usage Audit

Ensure semantic color names are used consistently:

| Semantic       | Correct      | Incorrect              |
| -------------- | ------------ | ---------------------- |
| Success/Online | `success`    | `green`, `success-500` |
| Error/Offline  | `error`      | `red`                  |
| Warning        | `warning`    | `yellow`               |
| Inactive       | `neutral`    | `gray`                 |
| Secondary text | `text-muted` | `text-gray-500`        |

---

## Files Summary

### Files to Create

| File                                      | Purpose                   |
| ----------------------------------------- | ------------------------- |
| `components/common/TxItem.vue`            | Unified transaction item  |
| `components/common/NetworkStatus.vue`     | Unified network status    |
| `components/common/EntityCard.vue`        | Unified entity card       |
| `components/common/CopyableField.vue`     | Copyable field pattern    |
| `composables/useTransactionNormalizer.ts` | Transaction normalization |
| `composables/useEntityName.ts`            | Entity name resolution    |

### Files to Delete

| File                                              | Replaced By                  |
| ------------------------------------------------- | ---------------------------- |
| `components/explorer/AddressDisplay.vue`          | common/AddressDisplay.vue    |
| `components/p2p/SignerDetailModal.vue`            | common/SignerDetailModal.vue |
| `components/shared-wallets/SignerDetailModal.vue` | common/SignerDetailModal.vue |
| `components/wallet/TxItem.vue`                    | common/TxItem.vue            |
| `components/history/TxItem.vue`                   | common/TxItem.vue            |
| `components/explorer/TxItem.vue`                  | common/TxItem.vue            |
| `components/wallet/NetworkStatus.vue`             | common/NetworkStatus.vue     |
| `components/p2p/NetworkStatus.vue`                | common/NetworkStatus.vue     |
| `components/shared-wallets/NetworkStatusBar.vue`  | common/NetworkStatus.vue     |
| `components/p2p/ActivityFeed.vue`                 | common/ActivityFeed.vue      |

**Total files to delete**: 10  
**Total files to create**: 6  
**Net reduction**: 4 files + significant code deduplication

---

## Verification Checklist

### Phase 5 Verification

- [ ] AddressDisplay works in all contexts
- [ ] SignerDetailModal works in P2P and Shared Wallets
- [ ] TxItem displays correctly in wallet, history, and explorer
- [ ] NetworkStatus shows appropriate info per context
- [ ] ActivityFeed works with store and direct events
- [ ] EntityCard displays contacts, signers, and participants
- [ ] CopyableField works for all copyable content

### Phase 6 Verification

- [ ] OnlineStatusBadge used everywhere
- [ ] All empty states use UiAppEmptyState
- [ ] All loading states are consistent
- [ ] All modal headers are consistent
- [ ] Action buttons are consistently placed
- [ ] Color usage is semantic throughout

---

## Success Criteria

1. **No duplicate components** - Each pattern has one implementation
2. **Consistent visual treatment** - Same data looks the same everywhere
3. **Reduced maintenance burden** - Changes propagate automatically
4. **Improved developer experience** - Clear component choices
5. **Better user experience** - Predictable, learnable interface
