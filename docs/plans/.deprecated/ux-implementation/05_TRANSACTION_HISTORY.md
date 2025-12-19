# Phase 5: Transaction History

## Overview

The transaction history page needs search, filtering, sorting, and export capabilities. Users should be able to quickly find specific transactions and export their history for record-keeping.

**Priority**: P1 (High)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 4 (Send/Receive), existing history components

---

## Goals

1. Search by address, amount, txid, or contact name
2. Filter by type (sent, received, RANK votes)
3. Filter by date range
4. Sort options (newest, oldest, largest, smallest)
5. Export to CSV/JSON
6. Pagination/infinite scroll for large histories
7. Transaction categories/tags (future)

---

## 1. Page Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRANSACTION HISTORY                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search transactions...                    [Export ▼]   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [All] [Sent] [Received] [RANK]  |  Date: [All Time ▼]     │  │
│  │                                  |  Sort: [Newest ▼]       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  TODAY                                                     │  │
│  │  ─────────────────────────────────────────────────────────│  │
│  │  ↗ Sent to Alice                    -100.00 XPI  2:30 PM  │  │
│  │  ↙ Received from Bob               +500.00 XPI 10:15 AM  │  │
│  │                                                            │  │
│  │  YESTERDAY                                                 │  │
│  │  ─────────────────────────────────────────────────────────│  │
│  │  ↗ RANK vote @elonmusk              -10.00 XPI  8:45 PM  │  │
│  │  ↙ Received                        +250.00 XPI  3:20 PM  │  │
│  │                                                            │  │
│  │  [Load More]                                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Page Implementation

### File: `pages/transact/history.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useContactsStore } from '~/stores/contacts'
import type { ParsedTransaction } from '~/types/transaction'

definePageMeta({
  title: 'History',
})

const walletStore = useWalletStore()
const contactsStore = useContactsStore()

// Search & Filter State
const searchQuery = ref('')
const selectedType = ref<'all' | 'send' | 'receive' | 'rank'>('all')
const selectedDateRange = ref<'all' | 'today' | 'week' | 'month' | 'custom'>(
  'all',
)
const customDateStart = ref<Date | null>(null)
const customDateEnd = ref<Date | null>(null)
const sortBy = ref<'newest' | 'oldest' | 'largest' | 'smallest'>('newest')

// Pagination
const pageSize = 20
const currentPage = ref(1)
const loadingMore = ref(false)

// Export modal
const showExportModal = ref(false)

// Filter transactions
const filteredTransactions = computed(() => {
  let txs = [...walletStore.transactions]

  // Type filter
  if (selectedType.value !== 'all') {
    txs = txs.filter(tx => {
      if (selectedType.value === 'send') return tx.type === 'send'
      if (selectedType.value === 'receive') return tx.type === 'receive'
      if (selectedType.value === 'rank') return tx.type.startsWith('rank_')
      return true
    })
  }

  // Date filter
  if (selectedDateRange.value !== 'all') {
    const now = new Date()
    let startDate: Date

    switch (selectedDateRange.value) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        if (customDateStart.value) startDate = customDateStart.value
        break
    }

    if (startDate) {
      txs = txs.filter(tx => new Date(tx.timestamp * 1000) >= startDate)
    }

    if (selectedDateRange.value === 'custom' && customDateEnd.value) {
      txs = txs.filter(
        tx => new Date(tx.timestamp * 1000) <= customDateEnd.value!,
      )
    }
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    txs = txs.filter(tx => {
      // Search by txid
      if (tx.txid.toLowerCase().includes(query)) return true
      // Search by address
      if (tx.toAddress?.toLowerCase().includes(query)) return true
      if (tx.fromAddress?.toLowerCase().includes(query)) return true
      // Search by contact name
      const contact = contactsStore.getContactByAddress(
        tx.toAddress || tx.fromAddress || '',
      )
      if (contact?.name.toLowerCase().includes(query)) return true
      // Search by amount
      const amountStr = (tx.amount / 1e6).toString()
      if (amountStr.includes(query)) return true
      return false
    })
  }

  // Sort
  switch (sortBy.value) {
    case 'newest':
      txs.sort((a, b) => b.timestamp - a.timestamp)
      break
    case 'oldest':
      txs.sort((a, b) => a.timestamp - b.timestamp)
      break
    case 'largest':
      txs.sort((a, b) => b.amount - a.amount)
      break
    case 'smallest':
      txs.sort((a, b) => a.amount - b.amount)
      break
  }

  return txs
})

// Paginated transactions
const paginatedTransactions = computed(() => {
  return filteredTransactions.value.slice(0, currentPage.value * pageSize)
})

// Has more to load
const hasMore = computed(() => {
  return paginatedTransactions.value.length < filteredTransactions.value.length
})

// Group transactions by date
const groupedTransactions = computed(() => {
  const groups: { label: string; transactions: ParsedTransaction[] }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let currentGroup: {
    label: string
    transactions: ParsedTransaction[]
  } | null = null

  for (const tx of paginatedTransactions.value) {
    const txDate = new Date(tx.timestamp * 1000)
    txDate.setHours(0, 0, 0, 0)

    let label: string
    if (txDate.getTime() === today.getTime()) {
      label = 'Today'
    } else if (txDate.getTime() === yesterday.getTime()) {
      label = 'Yesterday'
    } else {
      label = txDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, transactions: [] }
      groups.push(currentGroup)
    }
    currentGroup.transactions.push(tx)
  }

  return groups
})

// Load more
function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  // Simulate async load
  setTimeout(() => {
    currentPage.value++
    loadingMore.value = false
  }, 300)
}

// Reset filters
function resetFilters() {
  searchQuery.value = ''
  selectedType.value = 'all'
  selectedDateRange.value = 'all'
  sortBy.value = 'newest'
  currentPage.value = 1
}

// Type filter options
const typeOptions = [
  { value: 'all', label: 'All', icon: 'i-lucide-list' },
  { value: 'send', label: 'Sent', icon: 'i-lucide-arrow-up-right' },
  { value: 'receive', label: 'Received', icon: 'i-lucide-arrow-down-left' },
  { value: 'rank', label: 'RANK', icon: 'i-lucide-thumbs-up' },
]

// Date range options
const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
]

// Sort options
const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'largest', label: 'Largest First' },
  { value: 'smallest', label: 'Smallest First' },
]
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-history"
      title="Transaction History"
      :subtitle="`${filteredTransactions.length} transactions`"
    />

    <!-- Search & Export -->
    <div class="flex gap-3">
      <div class="flex-1 relative">
        <UIcon
          name="i-lucide-search"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by address, amount, txid, or contact..."
          class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          v-if="searchQuery"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          @click="searchQuery = ''"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4" />
        </button>
      </div>
      <UDropdownMenu
        :items="[
          [
            {
              label: 'Export as CSV',
              icon: 'i-lucide-file-spreadsheet',
              click: () => (showExportModal = true),
            },
            {
              label: 'Export as JSON',
              icon: 'i-lucide-file-json',
              click: () => (showExportModal = true),
            },
          ],
        ]"
      >
        <UButton color="neutral" variant="soft">
          <UIcon name="i-lucide-download" class="w-4 h-4 mr-2" />
          Export
        </UButton>
      </UDropdownMenu>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-4">
      <!-- Type Filter -->
      <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          v-for="option in typeOptions"
          :key="option.value"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
          :class="
            selectedType === option.value
              ? 'bg-white dark:bg-gray-700 shadow text-primary'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="selectedType = option.value"
        >
          <UIcon :name="option.icon" class="w-4 h-4" />
          {{ option.label }}
        </button>
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <!-- Date Range -->
        <USelectMenu
          v-model="selectedDateRange"
          :items="dateRangeOptions"
          value-key="value"
          class="w-40"
        >
          <template #leading>
            <UIcon name="i-lucide-calendar" class="w-4 h-4" />
          </template>
        </USelectMenu>

        <!-- Sort -->
        <USelectMenu
          v-model="sortBy"
          :items="sortOptions"
          value-key="value"
          class="w-40"
        >
          <template #leading>
            <UIcon name="i-lucide-arrow-up-down" class="w-4 h-4" />
          </template>
        </USelectMenu>
      </div>
    </div>

    <!-- Active Filters Summary -->
    <div
      v-if="
        searchQuery || selectedType !== 'all' || selectedDateRange !== 'all'
      "
      class="flex items-center gap-2 text-sm"
    >
      <span class="text-gray-500"
        >Showing {{ filteredTransactions.length }} results</span
      >
      <button class="text-primary hover:underline" @click="resetFilters">
        Clear filters
      </button>
    </div>

    <!-- Transaction List -->
    <div v-if="groupedTransactions.length > 0" class="space-y-6">
      <div v-for="group in groupedTransactions" :key="group.label">
        <h3
          class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3"
        >
          {{ group.label }}
        </h3>
        <AppCard no-padding>
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <TransactionListItem
              v-for="tx in group.transactions"
              :key="tx.txid"
              :transaction="tx"
            />
          </div>
        </AppCard>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="text-center">
        <UButton
          color="neutral"
          variant="soft"
          :loading="loadingMore"
          @click="loadMore"
        >
          Load More
        </UButton>
      </div>
    </div>

    <!-- Empty State -->
    <AppEmptyState
      v-else
      icon="i-lucide-inbox"
      :title="
        searchQuery || selectedType !== 'all'
          ? 'No matching transactions'
          : 'No transactions yet'
      "
      :description="
        searchQuery || selectedType !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Your transaction history will appear here'
      "
    >
      <template #action>
        <UButton
          v-if="searchQuery || selectedType !== 'all'"
          color="primary"
          @click="resetFilters"
        >
          Clear Filters
        </UButton>
        <UButton v-else color="primary" to="/transact/receive">
          Receive Your First Lotus
        </UButton>
      </template>
    </AppEmptyState>

    <!-- Export Modal -->
    <ExportModal
      v-model:open="showExportModal"
      :transactions="filteredTransactions"
    />
  </div>
</template>
```

---

## 3. Transaction List Item Component

### File: `components/history/TransactionListItem.vue`

```vue
<script setup lang="ts">
import type { ParsedTransaction } from '~/types/transaction'
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  transaction: ParsedTransaction
}>()

const contactsStore = useContactsStore()

// Transaction type info
const txInfo = computed(() => {
  const tx = props.transaction
  switch (tx.type) {
    case 'send':
      return {
        icon: 'i-lucide-arrow-up-right',
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: 'Sent',
        sign: '-',
      }
    case 'receive':
      return {
        icon: 'i-lucide-arrow-down-left',
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: 'Received',
        sign: '+',
      }
    case 'rank_upvote':
      return {
        icon: 'i-lucide-thumbs-up',
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        label: 'Upvote',
        sign: '-',
      }
    case 'rank_downvote':
      return {
        icon: 'i-lucide-thumbs-down',
        color: 'text-orange-500',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        label: 'Downvote',
        sign: '-',
      }
    default:
      return {
        icon: 'i-lucide-circle',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        label: 'Transaction',
        sign: '',
      }
  }
})

// Contact info
const contact = computed(() => {
  const address =
    props.transaction.type === 'send'
      ? props.transaction.toAddress
      : props.transaction.fromAddress
  if (!address) return null
  return contactsStore.getContactByAddress(address)
})

// Counterparty address
const counterpartyAddress = computed(() => {
  return props.transaction.type === 'send'
    ? props.transaction.toAddress
    : props.transaction.fromAddress
})

// Format amount
const formattedAmount = computed(() => {
  const amount = props.transaction.amount / 1e6
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
})

// Format time
const formattedTime = computed(() => {
  const date = new Date(props.transaction.timestamp * 1000)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
})

// Confirmation status
const confirmations = computed(() => props.transaction.confirmations || 0)
const isConfirmed = computed(() => confirmations.value >= 1)
</script>

<template>
  <NuxtLink
    :to="`/explore/explorer/tx/${transaction.txid}`"
    class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
  >
    <!-- Icon -->
    <div
      class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
      :class="txInfo.bgColor"
    >
      <UIcon :name="txInfo.icon" class="w-6 h-6" :class="txInfo.color" />
    </div>

    <!-- Details -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-medium">{{ txInfo.label }}</span>
        <template v-if="contact">
          <span class="text-gray-500">{{
            transaction.type === 'send' ? 'to' : 'from'
          }}</span>
          <span class="font-medium">{{ contact.name }}</span>
        </template>
      </div>
      <div class="flex items-center gap-2 text-sm text-gray-500">
        <span class="font-mono truncate max-w-[150px]">
          {{ counterpartyAddress?.slice(0, 12) }}...{{
            counterpartyAddress?.slice(-6)
          }}
        </span>
        <span>•</span>
        <span>{{ formattedTime }}</span>
        <template v-if="!isConfirmed">
          <span>•</span>
          <span class="text-warning-500 flex items-center gap-1">
            <UIcon name="i-lucide-clock" class="w-3 h-3" />
            Pending
          </span>
        </template>
      </div>
    </div>

    <!-- Amount -->
    <div class="text-right shrink-0">
      <div
        class="font-mono font-semibold"
        :class="
          transaction.type === 'receive'
            ? 'text-green-600'
            : 'text-gray-900 dark:text-gray-100'
        "
      >
        {{ txInfo.sign }}{{ formattedAmount }} XPI
      </div>
      <div class="text-xs text-gray-500">
        {{ confirmations }}
        {{ confirmations === 1 ? 'confirmation' : 'confirmations' }}
      </div>
    </div>

    <!-- Chevron -->
    <UIcon
      name="i-lucide-chevron-right"
      class="w-5 h-5 text-gray-400 shrink-0"
    />
  </NuxtLink>
</template>
```

---

## 4. Export Modal

### File: `components/history/ExportModal.vue`

```vue
<script setup lang="ts">
import type { ParsedTransaction } from '~/types/transaction'

const props = defineProps<{
  transactions: ParsedTransaction[]
}>()

const open = defineModel<boolean>('open', { default: false })

const exportFormat = ref<'csv' | 'json'>('csv')
const includeFields = ref({
  txid: true,
  type: true,
  amount: true,
  address: true,
  timestamp: true,
  confirmations: true,
  memo: false,
})

const exporting = ref(false)

async function exportTransactions() {
  exporting.value = true

  try {
    const data = props.transactions.map(tx => {
      const row: Record<string, any> = {}
      if (includeFields.value.txid) row.txid = tx.txid
      if (includeFields.value.type) row.type = tx.type
      if (includeFields.value.amount) row.amount = tx.amount / 1e6
      if (includeFields.value.address) {
        row.address = tx.type === 'send' ? tx.toAddress : tx.fromAddress
      }
      if (includeFields.value.timestamp) {
        row.timestamp = new Date(tx.timestamp * 1000).toISOString()
      }
      if (includeFields.value.confirmations)
        row.confirmations = tx.confirmations
      if (includeFields.value.memo) row.memo = tx.memo || ''
      return row
    })

    let content: string
    let mimeType: string
    let filename: string

    if (exportFormat.value === 'csv') {
      const headers = Object.keys(data[0] || {})
      const rows = data.map(row =>
        headers.map(h => JSON.stringify(row[h] ?? '')).join(','),
      )
      content = [headers.join(','), ...rows].join('\n')
      mimeType = 'text/csv'
      filename = `lotus-transactions-${Date.now()}.csv`
    } else {
      content = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
      filename = `lotus-transactions-${Date.now()}.json`
    }

    // Download file
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    open.value = false
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <div class="p-6">
      <h2 class="text-xl font-bold mb-4">Export Transactions</h2>
      <p class="text-gray-500 mb-6">
        Export {{ transactions.length }} transactions to a file.
      </p>

      <!-- Format Selection -->
      <div class="mb-6">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Format
        </label>
        <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
            :class="
              exportFormat === 'csv'
                ? 'bg-white dark:bg-gray-700 shadow'
                : 'text-gray-500 hover:text-gray-700'
            "
            @click="exportFormat = 'csv'"
          >
            CSV
          </button>
          <button
            class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
            :class="
              exportFormat === 'json'
                ? 'bg-white dark:bg-gray-700 shadow'
                : 'text-gray-500 hover:text-gray-700'
            "
            @click="exportFormat = 'json'"
          >
            JSON
          </button>
        </div>
      </div>

      <!-- Field Selection -->
      <div class="mb-6">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Include Fields
        </label>
        <div class="space-y-2">
          <label
            v-for="(value, key) in includeFields"
            :key="key"
            class="flex items-center gap-2"
          >
            <input
              v-model="includeFields[key]"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span class="text-sm capitalize">{{ key }}</span>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <UButton
          color="neutral"
          variant="soft"
          class="flex-1"
          @click="open = false"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          class="flex-1"
          :loading="exporting"
          @click="exportTransactions"
        >
          <UIcon name="i-lucide-download" class="w-4 h-4 mr-2" />
          Export
        </UButton>
      </div>
    </div>
  </UModal>
</template>
```

---

## 5. Implementation Checklist

### Page

- [ ] Create `pages/transact/history.vue`

### Components

- [ ] Create/update `components/history/TransactionListItem.vue`
- [ ] Create `components/history/ExportModal.vue`
- [ ] Create `components/history/Filters.vue` (optional, can be inline)

### Features

- [ ] Search by address, amount, txid, contact name
- [ ] Filter by transaction type
- [ ] Filter by date range
- [ ] Custom date range picker
- [ ] Sort options
- [ ] Pagination/load more
- [ ] Export to CSV
- [ ] Export to JSON
- [ ] Group by date

### Store Updates

- [ ] Ensure transactions are properly typed
- [ ] Add pagination support if needed

### Testing

- [ ] Test search functionality
- [ ] Test all filter combinations
- [ ] Test sort options
- [ ] Test export (CSV and JSON)
- [ ] Test with large transaction history
- [ ] Test empty state
- [ ] Test mobile responsiveness

---

## Next Phase

Once this phase is complete, proceed to [06_CONTACTS_SYSTEM.md](./06_CONTACTS_SYSTEM.md) to implement the contacts system with groups and activity.
