<script setup lang="ts">
/**
 * Transaction History Page - Full Featured
 *
 * View, search, filter, and export transaction history.
 * Uses real wallet store data with virtual scrolling for performance.
 */
import { useVirtualList } from '@vueuse/core'
import { useWalletStore, toLotusUnits } from '~/stores/wallet'
import { useContactsStore } from '~/stores/contacts'

definePageMeta({
  title: 'History',
})

const walletStore = useWalletStore()
const contactsStore = useContactsStore()

// Transaction detail modal
const showTxDetail = ref(false)
const selectedTx = ref<{
  txid: string
  timestamp: number
  blockHeight?: number
  direction: 'incoming' | 'outgoing' | 'self'
  amount: string
  fee?: string
  counterparty?: string
  counterpartyName?: string
  confirmations: number
  isCoinbase?: boolean
  opReturn?: string
} | null>(null)

function openTxDetail(tx: typeof transactions.value[0]) {
  const contact = tx.address ? contactsStore.getContactByAddress(tx.address) : null
  selectedTx.value = {
    txid: tx.txid,
    timestamp: tx.timestamp,
    blockHeight: tx.blockHeight,
    direction: tx.type === 'receive' ? 'incoming' : 'outgoing',
    amount: tx.amount.toString(),
    confirmations: tx.confirmations,
    counterparty: tx.address,
    counterpartyName: contact?.name,
  }
  showTxDetail.value = true
}

// Fetch history on mount
onMounted(async () => {
  if (walletStore.initialized) {
    await walletStore.fetchTransactionHistory()
  }
})

// Watch for initialization
watch(() => walletStore.initialized, async (initialized) => {
  if (initialized && walletStore.transactionHistory.length === 0) {
    await walletStore.fetchTransactionHistory()
  }
})

// Refresh history
const refreshing = ref(false)
async function refreshHistory() {
  refreshing.value = true
  try {
    await walletStore.fetchTransactionHistory()
  } finally {
    refreshing.value = false
  }
}

// Search and filter state
const searchQuery = ref('')
const filterType = ref<'all' | 'sent' | 'received'>('all')
const dateRange = ref<'all' | '7d' | '30d' | '90d'>('all')
const sortOrder = ref<'newest' | 'oldest' | 'largest'>('newest')

// Pagination
const page = ref(1)
const pageSize = 20

// Use real transactions from wallet store
const transactions = computed(() => {
  return walletStore.transactionHistory.map(tx => ({
    txid: tx.txid,
    type: tx.isSend ? 'send' : 'receive',
    amount: BigInt(tx.amount),
    timestamp: Number(tx.timestamp),
    address: tx.address,
    confirmations: tx.confirmations,
    blockHeight: tx.blockHeight,
  }))
})

// Filter options
const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Sent', value: 'sent' },
  { label: 'Received', value: 'received' },
]

const dateOptions = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
]

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Largest First', value: 'largest' },
]

// Filtered and sorted transactions
const filteredTransactions = computed(() => {
  let txs = [...transactions.value]

  // Filter by type
  if (filterType.value !== 'all') {
    txs = txs.filter(tx =>
      filterType.value === 'sent' ? tx.type === 'send' : tx.type === 'receive'
    )
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    txs = txs.filter(tx =>
      tx.txid.toLowerCase().includes(query) ||
      tx.address?.toLowerCase().includes(query)
    )
  }

  // Filter by date
  if (dateRange.value !== 'all') {
    const now = Date.now() / 1000
    const days = parseInt(dateRange.value)
    const cutoff = now - (days * 24 * 60 * 60)
    txs = txs.filter(tx => tx.timestamp >= cutoff)
  }

  // Sort
  switch (sortOrder.value) {
    case 'oldest':
      txs.sort((a, b) => a.timestamp - b.timestamp)
      break
    case 'largest':
      txs.sort((a, b) => Number(b.amount - a.amount))
      break
    default:
      txs.sort((a, b) => b.timestamp - a.timestamp)
  }

  return txs
})

// Paginated transactions
const paginatedTransactions = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredTransactions.value.slice(start, start + pageSize)
})

const totalPages = computed(() =>
  Math.ceil(filteredTransactions.value.length / pageSize)
)

// Virtual list for performance with large transaction lists
const VIRTUAL_ITEM_HEIGHT = 72 // Height of each transaction row in pixels
const useVirtual = computed(() => filteredTransactions.value.length > 50)

const { list: virtualList, containerProps, wrapperProps } = useVirtualList(
  filteredTransactions,
  {
    itemHeight: VIRTUAL_ITEM_HEIGHT,
  },
)

// Export transactions
function exportTransactions(format: 'csv' | 'json') {
  const data = filteredTransactions.value

  if (format === 'csv') {
    const headers = ['Date', 'Type', 'Amount', 'Address', 'TxID']
    const rows = data.map(tx => [
      new Date(tx.timestamp * 1000).toISOString(),
      tx.type,
      toLotusUnits(tx.amount.toString()).toString(),
      tx.address || '',
      tx.txid,
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    downloadFile(csv, 'transactions.csv', 'text/csv')
  } else {
    const json = JSON.stringify(data, null, 2)
    downloadFile(json, 'transactions.json', 'application/json')
  }
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Format helpers
function formatAmount(amount: bigint, type: string) {
  const xpi = toLotusUnits(amount.toString())
  const prefix = type === 'receive' ? '+' : '-'
  return `${prefix}${xpi.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
}

// Clear filters
function clearFilters() {
  searchQuery.value = ''
  filterType.value = 'all'
  dateRange.value = 'all'
  sortOrder.value = 'newest'
  page.value = 1
}
</script>

<template>
  <div class="space-y-6">
    <UiAppHeroCard icon="i-lucide-history" title="Transaction History" subtitle="View and manage your transactions" />

    <!-- Filters -->
    <UiAppCard>
      <div class="space-y-4">
        <!-- Search -->
        <UInput v-model="searchQuery" placeholder="Search by address or transaction ID..." icon="i-lucide-search"
          size="lg" />

        <!-- Filter Row -->
        <div class="flex flex-wrap gap-3">
          <USelectMenu v-model="filterType" :items="filterOptions" value-key="value" class="w-32" />

          <USelectMenu v-model="dateRange" :items="dateOptions" value-key="value" class="w-36" />

          <USelectMenu v-model="sortOrder" :items="sortOptions" value-key="value" class="w-40" />

          <div class="flex-1" />

          <!-- Export -->
          <UDropdownMenu :items="[
            [
              { label: 'Export as CSV', icon: 'i-lucide-file-text', click: () => exportTransactions('csv') },
              { label: 'Export as JSON', icon: 'i-lucide-file-json', click: () => exportTransactions('json') },
            ],
          ]">
            <UButton color="neutral" variant="outline" icon="i-lucide-download">
              Export
            </UButton>
          </UDropdownMenu>
        </div>

        <!-- Active Filters -->
        <div v-if="filterType !== 'all' || dateRange !== 'all' || searchQuery" class="flex items-center gap-2">
          <span class="text-sm text-gray-500">Active filters:</span>
          <UBadge v-if="filterType !== 'all'" color="primary" variant="soft">
            {{ filterType }}
            <button class="ml-1" @click="filterType = 'all'">×</button>
          </UBadge>
          <UBadge v-if="dateRange !== 'all'" color="primary" variant="soft">
            {{ dateRange }}
            <button class="ml-1" @click="dateRange = 'all'">×</button>
          </UBadge>
          <UBadge v-if="searchQuery" color="primary" variant="soft">
            "{{ searchQuery }}"
            <button class="ml-1" @click="searchQuery = ''">×</button>
          </UBadge>
          <UButton size="xs" variant="ghost" @click="clearFilters">
            Clear all
          </UButton>
        </div>
      </div>
    </UiAppCard>

    <!-- Transaction List -->
    <UiAppCard>
      <!-- Empty State -->
      <UiAppEmptyState v-if="filteredTransactions.length === 0" icon="i-lucide-inbox" title="No transactions found"
        :description="searchQuery || filterType !== 'all' ? 'Try adjusting your filters' : 'Your transactions will appear here'">
        <template v-if="searchQuery || filterType !== 'all'" #action>
          <UButton color="primary" variant="soft" @click="clearFilters">
            Clear Filters
          </UButton>
        </template>
      </UiAppEmptyState>

      <!-- Virtual Scrolling for large lists (>50 items) -->
      <div v-else-if="useVirtual" v-bind="containerProps" class="max-h-[600px] overflow-auto -mx-4">
        <div v-bind="wrapperProps">
          <button v-for="{ data: tx, index } in virtualList" :key="tx.txid" type="button"
            class="w-full flex items-center gap-3 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-4 text-left"
            :style="{ height: `${VIRTUAL_ITEM_HEIGHT}px` }" @click="openTxDetail(tx)">
            <!-- Icon -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              :class="tx.type === 'receive' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
              <UIcon :name="tx.type === 'receive' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'"
                class="w-5 h-5" :class="tx.type === 'receive' ? 'text-green-600' : 'text-red-600'" />
            </div>

            <!-- Details -->
            <div class="flex-1 min-w-0">
              <div class="font-medium">
                {{ tx.type === 'receive' ? 'Received' : 'Sent' }}
              </div>
              <div class="text-sm text-gray-500 truncate">
                {{ tx.txid.slice(0, 16) }}...
              </div>
            </div>

            <!-- Amount & Time -->
            <div class="text-right shrink-0">
              <div class="font-mono font-medium" :class="tx.type === 'receive' ? 'text-green-600' : 'text-red-600'">
                {{ formatAmount(tx.amount, tx.type) }} XPI
              </div>
              <div class="text-sm text-gray-500">
                {{ formatTime(tx.timestamp) }}
              </div>
            </div>

            <!-- Chevron -->
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted shrink-0" />
          </button>
        </div>
      </div>

      <!-- Standard pagination for smaller lists -->
      <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
        <button v-for="tx in paginatedTransactions" :key="tx.txid" type="button"
          class="w-full flex items-center gap-3 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors -mx-4 px-4 text-left"
          @click="openTxDetail(tx)">
          <!-- Icon -->
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="tx.type === 'receive' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
            <UIcon :name="tx.type === 'receive' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'"
              class="w-5 h-5" :class="tx.type === 'receive' ? 'text-green-600' : 'text-red-600'" />
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <div class="font-medium">
              {{ tx.type === 'receive' ? 'Received' : 'Sent' }}
            </div>
            <div class="text-sm text-gray-500 truncate">
              {{ tx.txid.slice(0, 16) }}...
            </div>
          </div>

          <!-- Amount & Time -->
          <div class="text-right shrink-0">
            <div class="font-mono font-medium" :class="tx.type === 'receive' ? 'text-green-600' : 'text-red-600'">
              {{ formatAmount(tx.amount, tx.type) }} XPI
            </div>
            <div class="text-sm text-gray-500">
              {{ formatTime(tx.timestamp) }}
            </div>
          </div>

          <!-- Chevron -->
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted shrink-0" />
        </button>
      </div>

      <!-- Pagination (only for non-virtual mode) -->
      <div v-if="!useVirtual && totalPages > 1"
        class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
        <div class="text-sm text-gray-500">
          Showing {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, filteredTransactions.length) }} of {{
            filteredTransactions.length }}
        </div>
        <div class="flex gap-2">
          <UButton size="sm" variant="outline" :disabled="page === 1" @click="page--">
            Previous
          </UButton>
          <UButton size="sm" variant="outline" :disabled="page >= totalPages" @click="page++">
            Next
          </UButton>
        </div>
      </div>

      <!-- Virtual list info -->
      <div v-if="useVirtual" class="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
        <div class="text-sm text-gray-500 text-center">
          Showing {{ filteredTransactions.length }} transactions (scroll to view all)
        </div>
      </div>
    </UiAppCard>
    <!-- Transaction Detail Modal -->
    <HistoryTxDetailModal v-model:open="showTxDetail" :transaction="selectedTx ?? undefined" />
  </div>
</template>
