# Phase 1: Explorer Detail Pages

## Overview

This phase enhances the explorer detail pages to provide comprehensive blockchain data viewing. The hub and search pages exist; this phase focuses on the detail pages for transactions, addresses, and blocks.

**Priority**: P1 (High)
**Estimated Effort**: 2-3 days
**Dependencies**: Design system components, Chronik service, useExplorerApi composable

---

## Goals

1. Enhanced transaction detail page with raw data view
2. Enhanced address detail page with transaction history
3. Enhanced block detail page with transaction list
4. Mempool view integration
5. Share functionality for all detail pages

---

## Current State

### Existing Pages

| Page                                           | Status      | Notes                    |
| ---------------------------------------------- | ----------- | ------------------------ |
| `pages/explore/explorer/index.vue`             | ✅ Complete | Search and network stats |
| `pages/explore/explorer/tx/[txid].vue`         | 🔲 Basic    | Needs enhancement        |
| `pages/explore/explorer/address/[address].vue` | 🔲 Basic    | Needs enhancement        |
| `pages/explore/explorer/block/[height].vue`    | 🔲 Basic    | Needs enhancement        |

### Existing Components

| Component                                | Status      | Notes                    |
| ---------------------------------------- | ----------- | ------------------------ |
| `components/explorer/SearchBar.vue`      | ✅ Complete | With recent searches     |
| `components/explorer/BlockItem.vue`      | ✅ Complete | Block list item          |
| `components/explorer/TxItem.vue`         | ✅ Complete | Transaction list item    |
| `components/explorer/AddressDisplay.vue` | ✅ Complete | With contact integration |
| `components/explorer/NetworkStats.vue`   | ✅ Complete | Stats grid               |

---

## 1. Transaction Detail Page

### File: `pages/explore/explorer/tx/[txid].vue`

#### Requirements

- [ ] Transaction summary card (amount, fee, confirmations)
- [ ] Input/output lists with address display
- [ ] OP_RETURN data display (if present)
- [ ] Raw transaction hex view (collapsible)
- [ ] Copy txid button
- [ ] Share button
- [ ] Link to block
- [ ] "Add to contacts" for addresses
- [ ] Loading and error states

#### Data to Display

```typescript
interface TransactionDetail {
  txid: string
  blockHash: string
  blockHeight: number
  timestamp: number
  confirmations: number
  size: number
  fee: bigint
  inputs: Array<{
    prevTxid: string
    prevOutIdx: number
    address: string
    value: bigint
    script: string
  }>
  outputs: Array<{
    idx: number
    address: string
    value: bigint
    script: string
    isOpReturn: boolean
    opReturnData?: string
  }>
  rawHex: string
}
```

#### Component Structure

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <AppHeroCard
      icon="i-lucide-file-text"
      title="Transaction"
      :subtitle="truncatedTxid"
    />

    <!-- Loading State -->
    <AppLoadingState v-if="loading" message="Loading transaction..." />

    <!-- Error State -->
    <AppErrorState
      v-else-if="error"
      :message="error"
      @retry="fetchTransaction"
    />

    <!-- Content -->
    <template v-else-if="tx">
      <!-- Summary Card -->
      <AppCard title="Summary" icon="i-lucide-info">
        <!-- Stats grid -->
      </AppCard>

      <!-- Inputs -->
      <AppCard title="Inputs" icon="i-lucide-arrow-right-to-line">
        <!-- Input list -->
      </AppCard>

      <!-- Outputs -->
      <AppCard title="Outputs" icon="i-lucide-arrow-right-from-line">
        <!-- Output list -->
      </AppCard>

      <!-- Raw Data (collapsible) -->
      <AppCard title="Raw Transaction" icon="i-lucide-code">
        <!-- Hex display with copy -->
      </AppCard>
    </template>
  </div>
</template>
```

---

## 2. Address Detail Page

### File: `pages/explore/explorer/address/[address].vue`

#### Requirements

- [ ] Address summary card (balance, tx count)
- [ ] Transaction history with pagination
- [ ] Filter by sent/received
- [ ] "Add to contacts" button
- [ ] Copy address button
- [ ] Share button
- [ ] QR code display
- [ ] Loading and error states

#### Data to Display

```typescript
interface AddressDetail {
  address: string
  balance: bigint
  totalReceived: bigint
  totalSent: bigint
  transactionCount: number
  firstSeen: number
  lastSeen: number
  transactions: TransactionHistoryItem[]
}
```

#### Component Structure

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <AppHeroCard
      icon="i-lucide-wallet"
      title="Address"
      :subtitle="truncatedAddress"
    />

    <!-- Loading State -->
    <AppLoadingState v-if="loading" message="Loading address..." />

    <!-- Error State -->
    <AppErrorState v-else-if="error" :message="error" @retry="fetchAddress" />

    <!-- Content -->
    <template v-else-if="addressData">
      <!-- Summary Card with QR -->
      <AppCard title="Summary" icon="i-lucide-info">
        <!-- Balance, tx count, QR code -->
      </AppCard>

      <!-- Actions -->
      <div class="flex gap-3">
        <UButton>Add to Contacts</UButton>
        <UButton>Copy Address</UButton>
        <UButton>Share</UButton>
      </div>

      <!-- Transaction History -->
      <AppCard title="Transactions" icon="i-lucide-history">
        <!-- Filter tabs -->
        <!-- Transaction list with pagination -->
      </AppCard>
    </template>
  </div>
</template>
```

---

## 3. Block Detail Page

### File: `pages/explore/explorer/block/[height].vue`

#### Requirements

- [ ] Block summary card (height, hash, timestamp)
- [ ] Block stats (tx count, size, burned)
- [ ] Transaction list with pagination
- [ ] Navigation to prev/next block
- [ ] Copy block hash button
- [ ] Share button
- [ ] Loading and error states

#### Data to Display

```typescript
interface BlockDetail {
  height: number
  hash: string
  prevHash: string
  timestamp: number
  size: number
  transactionCount: number
  burned: bigint
  difficulty: number
  nonce: number
  transactions: TransactionSummary[]
}
```

#### Component Structure

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header with prev/next navigation -->
    <div class="flex items-center justify-between">
      <UButton icon="i-lucide-chevron-left" @click="goToPrevBlock" />
      <AppHeroCard icon="i-lucide-box" title="Block" :subtitle="`#${height}`" />
      <UButton icon="i-lucide-chevron-right" @click="goToNextBlock" />
    </div>

    <!-- Loading State -->
    <AppLoadingState v-if="loading" message="Loading block..." />

    <!-- Error State -->
    <AppErrorState v-else-if="error" :message="error" @retry="fetchBlock" />

    <!-- Content -->
    <template v-else-if="block">
      <!-- Summary Card -->
      <AppCard title="Summary" icon="i-lucide-info">
        <!-- Hash, timestamp, size, etc. -->
      </AppCard>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AppStatCard label="Transactions" :value="block.transactionCount" />
        <AppStatCard label="Size" :value="formatBytes(block.size)" />
        <AppStatCard label="Burned" :value="formatXPI(block.burned)" />
        <AppStatCard label="Difficulty" :value="block.difficulty" />
      </div>

      <!-- Transactions -->
      <AppCard title="Transactions" icon="i-lucide-list">
        <!-- Transaction list with pagination -->
      </AppCard>
    </template>
  </div>
</template>
```

---

## 4. Mempool View

### Integration into Explorer Index

Add a mempool section to `pages/explore/explorer/index.vue`:

#### Requirements

- [ ] Pending transaction count
- [ ] List of pending transactions
- [ ] Auto-refresh (every 10 seconds)
- [ ] Click to view transaction details

---

## 5. Share Functionality

### Composable: `composables/useShare.ts`

```typescript
export function useShare() {
  async function shareUrl(title: string, url: string) {
    if (navigator.share) {
      await navigator.share({ title, url })
    } else {
      await navigator.clipboard.writeText(url)
      // Show toast
    }
  }

  function getExplorerUrl(type: 'tx' | 'address' | 'block', id: string) {
    const base = window.location.origin
    return `${base}/explore/explorer/${type}/${id}`
  }

  return {
    shareUrl,
    getExplorerUrl,
    shareTransaction: (txid: string) =>
      shareUrl('Transaction', getExplorerUrl('tx', txid)),
    shareAddress: (address: string) =>
      shareUrl('Address', getExplorerUrl('address', address)),
    shareBlock: (height: string) =>
      shareUrl('Block', getExplorerUrl('block', height)),
  }
}
```

---

## 6. Implementation Checklist

### Transaction Detail Page

- [ ] Create enhanced `pages/explore/explorer/tx/[txid].vue`
- [ ] Add transaction summary card
- [ ] Add input/output lists
- [ ] Add OP_RETURN display
- [ ] Add raw hex view (collapsible)
- [ ] Add copy/share buttons
- [ ] Add loading/error states
- [ ] Test with various transaction types

### Address Detail Page

- [ ] Create enhanced `pages/explore/explorer/address/[address].vue`
- [ ] Add address summary card
- [ ] Add QR code display
- [ ] Add transaction history with pagination
- [ ] Add filter by sent/received
- [ ] Add "Add to contacts" button
- [ ] Add copy/share buttons
- [ ] Add loading/error states
- [ ] Test with various addresses

### Block Detail Page

- [ ] Create enhanced `pages/explore/explorer/block/[height].vue`
- [ ] Add block summary card
- [ ] Add stats grid
- [ ] Add prev/next navigation
- [ ] Add transaction list with pagination
- [ ] Add copy/share buttons
- [ ] Add loading/error states
- [ ] Test with various blocks

### Mempool View

- [ ] Add mempool section to explorer index
- [ ] Add auto-refresh
- [ ] Add pending transaction list

### Share Functionality

- [ ] Create `useShare` composable
- [ ] Integrate into all detail pages
- [ ] Test Web Share API fallback

---

## Testing

### Manual Testing

- [ ] Navigate to transaction from search
- [ ] Navigate to address from transaction
- [ ] Navigate to block from transaction
- [ ] Navigate between blocks
- [ ] Copy txid/address/hash
- [ ] Share functionality
- [ ] Add address to contacts
- [ ] View raw transaction data
- [ ] Pagination works correctly

### Edge Cases

- [ ] Coinbase transactions (no inputs)
- [ ] OP_RETURN transactions
- [ ] Very large transactions (many inputs/outputs)
- [ ] Unconfirmed transactions
- [ ] Invalid txid/address/height

---

## 7. Cross-Feature Integration

### 7.1 Contact Integration in Explorer

When viewing an address, integrate with contacts:

- [ ] Show contact name if address is in contacts
- [ ] Show "Add to Contacts" button if not
- [ ] Quick send action from address page
- [ ] Show transaction history with this address from user's wallet

### 7.2 Transaction History Integration

Link explorer transactions to wallet history:

- [ ] Highlight user's own transactions in block view
- [ ] Show "This is your transaction" badge
- [ ] Link to wallet history for own transactions

### 7.3 Social Integration

If address is linked to a social profile:

- [ ] Show social profile badge on address page
- [ ] Link to social profile
- [ ] Show RANK voting option

---

_End of Phase 1_
