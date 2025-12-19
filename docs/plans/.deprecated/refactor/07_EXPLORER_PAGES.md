# 07: Explorer Pages

## Overview

This document details the refactoring of the Explorer pages. The current implementation needs a search bar, better mobile support, and consistent patterns with the rest of the app.

---

## Current Problems

1. **No search** - Can't search for transactions, addresses, or blocks
2. **No mempool view** - Can't see pending transactions
3. **Tables on mobile** - Don't work well on small screens
4. **Inconsistent patterns** - Different from wallet pages

---

## Target Design

### Explorer Index

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Blockchain Explorer                                              │
│  ─────────────────────────────────────────────────────────────────  │
│  [Search by address, transaction, or block...]                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Network Stats                                                       │
│  ─────────────────────────────────────────────────────────────────  │
│  [Block Height]  [Difficulty]  [Mempool Txs]  [Total Supply]        │
│   1,234,567       12.34 TH      42             21M XPI               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📦 Recent Blocks                                [View All →]        │
│  ─────────────────────────────────────────────────────────────────  │
│  Block 1,234,567    3 txs    125 XPI burned    2 min ago            │
│  Block 1,234,566    5 txs    0 XPI burned      12 min ago           │
│  Block 1,234,565    1 tx     50 XPI burned     22 min ago           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ⏳ Mempool (42 transactions)                    [View All →]        │
│  ─────────────────────────────────────────────────────────────────  │
│  abc123...xyz    100 XPI    Standard    5 sec ago                   │
│  def456...uvw    50 XPI     RANK Vote   12 sec ago                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Page: explorer/index.vue

```vue
<!-- pages/explorer/index.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Search Hero -->
    <AppHeroCard
      icon="i-lucide-search"
      title="Blockchain Explorer"
      subtitle="Search transactions, addresses, and blocks"
    >
      <template #actions>
        <ExplorerSearchBar
          v-model="searchQuery"
          @search="handleSearch"
          class="max-w-md mx-auto"
        />
      </template>
    </AppHeroCard>

    <!-- Network Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <AppStatCard
          :value="formatNumber(stats.blockHeight)"
          label="Block Height"
          icon="i-lucide-box"
          mono
        />
      </UCard>
      <UCard>
        <AppStatCard
          :value="stats.difficulty"
          label="Difficulty"
          icon="i-lucide-gauge"
        />
      </UCard>
      <UCard>
        <AppStatCard
          :value="stats.mempoolSize"
          label="Mempool Txs"
          icon="i-lucide-clock"
          mono
        />
      </UCard>
      <UCard>
        <AppStatCard
          :value="formatXPI(stats.totalBurned)"
          label="Total Burned"
          icon="i-lucide-flame"
        />
      </UCard>
    </div>

    <!-- Recent Blocks -->
    <AppCard
      title="Recent Blocks"
      icon="i-lucide-box"
      :action="{ label: 'View All', to: '/explorer/blocks' }"
    >
      <div v-if="recentBlocks.length" class="divide-y divide-default">
        <ExplorerBlockItem
          v-for="block in recentBlocks"
          :key="block.hash"
          :block="block"
          compact
        />
      </div>
      <AppLoadingState v-else-if="loading" message="Loading blocks..." />
      <AppEmptyState v-else icon="i-lucide-box" title="No blocks found" />
    </AppCard>

    <!-- Mempool -->
    <AppCard
      title="Mempool"
      icon="i-lucide-clock"
      :action="{ label: 'View All', onClick: openMempool }"
    >
      <template #header-badge>
        <UBadge color="warning" variant="subtle" size="sm">
          {{ stats.mempoolSize }} pending
        </UBadge>
      </template>

      <div v-if="mempoolTxs.length" class="divide-y divide-default">
        <ExplorerTxItem
          v-for="tx in mempoolTxs.slice(0, 5)"
          :key="tx.txid"
          :transaction="tx"
          compact
        />
      </div>
      <AppEmptyState
        v-else
        icon="i-lucide-check-circle"
        title="Mempool is empty"
        description="All transactions have been confirmed"
      />
    </AppCard>
  </div>
</template>

<script setup lang="ts">
const { fetchBlockchainInfo, fetchRecentBlocks, fetchMempool } = useChronik()
const { formatXPI } = useAmount()
const router = useRouter()

// State
const searchQuery = ref('')
const loading = ref(true)
const stats = ref({
  blockHeight: 0,
  difficulty: '0',
  mempoolSize: 0,
  totalBurned: 0n,
})
const recentBlocks = ref<Block[]>([])
const mempoolTxs = ref<Transaction[]>([])

// Load data
onMounted(async () => {
  loading.value = true
  try {
    const [info, blocks, mempool] = await Promise.all([
      fetchBlockchainInfo(),
      fetchRecentBlocks(5),
      fetchMempool(5),
    ])
    stats.value = info
    recentBlocks.value = blocks
    mempoolTxs.value = mempool
  } finally {
    loading.value = false
  }
})

// Search handler
function handleSearch(query: string) {
  // Detect query type and navigate
  if (query.match(/^[0-9]+$/)) {
    // Block height
    router.push(`/explorer/block/${query}`)
  } else if (query.match(/^[a-f0-9]{64}$/i)) {
    // Could be block hash or txid - try txid first
    router.push(`/explorer/tx/${query}`)
  } else if (query.startsWith('lotus_')) {
    // Address
    router.push(`/explorer/address/${query}`)
  } else {
    // Unknown - show error
    useNotifications().error(
      'Invalid search',
      'Enter a valid address, transaction ID, or block height',
    )
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function openMempool() {
  // TODO: Implement mempool page
}
</script>
```

---

## Component: ExplorerSearchBar.vue

```vue
<script setup lang="ts">
const model = defineModel<string>()
const emit = defineEmits<{
  search: [query: string]
}>()

const recentSearches = ref<string[]>([])
const showSuggestions = ref(false)

function handleSubmit() {
  if (model.value?.trim()) {
    emit('search', model.value.trim())
    addToRecent(model.value.trim())
  }
}

function addToRecent(query: string) {
  recentSearches.value = [
    query,
    ...recentSearches.value.filter(q => q !== query),
  ].slice(0, 5)
  localStorage.setItem('explorer_recent', JSON.stringify(recentSearches.value))
}

onMounted(() => {
  const saved = localStorage.getItem('explorer_recent')
  if (saved) {
    recentSearches.value = JSON.parse(saved)
  }
})
</script>

<template>
  <form @submit.prevent="handleSubmit" class="relative">
    <UInput
      v-model="model"
      icon="i-lucide-search"
      placeholder="Search by address, transaction, or block..."
      size="lg"
      @focus="showSuggestions = true"
      @blur="showSuggestions = false"
    >
      <template #trailing>
        <UButton
          type="submit"
          color="primary"
          size="xs"
          :disabled="!model?.trim()"
        >
          Search
        </UButton>
      </template>
    </UInput>

    <!-- Recent Searches Dropdown -->
    <div
      v-if="showSuggestions && recentSearches.length"
      class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-default z-10"
    >
      <p class="px-3 py-2 text-xs text-muted">Recent Searches</p>
      <div class="divide-y divide-default">
        <button
          v-for="search in recentSearches"
          :key="search"
          type="button"
          class="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 truncate"
          @mousedown="
            model = search
            handleSubmit()
          "
        >
          {{ search }}
        </button>
      </div>
    </div>
  </form>
</template>
```

---

## Component: ExplorerBlockItem.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  block: Block
  compact?: boolean
}>()

const { timeAgo } = useTime()
const { formatXPI } = useAmount()

const burnedAmount = computed(() => {
  // Calculate burned from block data
  return props.block.burnedAmount || 0n
})
</script>

<template>
  <NuxtLink
    :to="`/explorer/block/${block.height}`"
    class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
  >
    <!-- Icon -->
    <div
      class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
    >
      <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="font-medium">Block {{ block.height.toLocaleString() }}</p>
      <p class="text-sm text-muted">
        {{ block.numTxs }} transaction{{ block.numTxs !== 1 ? 's' : '' }}
        <span v-if="burnedAmount > 0n">
          • {{ formatXPI(burnedAmount) }} burned
        </span>
      </p>
    </div>

    <!-- Time -->
    <div class="text-right flex-shrink-0">
      <p class="text-sm text-muted">{{ timeAgo(block.timestamp) }}</p>
    </div>
  </NuxtLink>
</template>
```

---

## Component: ExplorerTxItem.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  transaction: Transaction
  compact?: boolean
}>()

const { timeAgo } = useTime()
const { formatXPI } = useAmount()
const { toFingerprint } = useAddress()
const contactStore = useContactStore()
const walletStore = useWalletStore()

const txType = computed(() => {
  // Determine transaction type
  if (props.transaction.isCoinbase) return 'coinbase'
  if (props.transaction.isRank) return 'rank'
  if (props.transaction.burnAmount > 0) return 'burn'
  return 'transfer'
})

const typeConfig = computed(() => {
  const configs = {
    coinbase: { icon: 'i-lucide-pickaxe', color: 'warning', label: 'Coinbase' },
    rank: { icon: 'i-lucide-thumbs-up', color: 'primary', label: 'RANK Vote' },
    burn: { icon: 'i-lucide-flame', color: 'error', label: 'Burn' },
    transfer: {
      icon: 'i-lucide-arrow-right-left',
      color: 'neutral',
      label: 'Transfer',
    },
  }
  return configs[txType.value]
})

const isOwnTx = computed(() => {
  const myAddress = walletStore.address
  return (
    props.transaction.inputs.some(i => i.address === myAddress) ||
    props.transaction.outputs.some(o => o.address === myAddress)
  )
})
</script>

<template>
  <NuxtLink
    :to="`/explorer/tx/${transaction.txid}`"
    class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
  >
    <!-- Icon -->
    <div
      class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
      :class="`bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30`"
    >
      <UIcon
        :name="typeConfig.icon"
        :class="`w-5 h-5 text-${typeConfig.color}`"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="font-mono text-sm truncate">
          {{ toFingerprint(transaction.txid, 8) }}
        </p>
        <UBadge v-if="isOwnTx" color="primary" variant="subtle" size="xs">
          You
        </UBadge>
      </div>
      <p class="text-sm text-muted">
        {{ typeConfig.label }}
        <span v-if="!compact">
          • {{ transaction.inputs.length }} in →
          {{ transaction.outputs.length }} out
        </span>
      </p>
    </div>

    <!-- Amount & Time -->
    <div class="text-right flex-shrink-0">
      <p v-if="transaction.totalOutput" class="font-medium">
        {{ formatXPI(transaction.totalOutput) }}
      </p>
      <p class="text-xs text-muted">{{ timeAgo(transaction.timestamp) }}</p>
    </div>
  </NuxtLink>
</template>
```

---

## Page: explorer/block/[hashOrHeight].vue

```vue
<!-- pages/explorer/block/[hashOrHeight].vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back Link -->
    <NuxtLink
      to="/explorer/blocks"
      class="text-sm text-muted hover:text-foreground flex items-center gap-1"
    >
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Blocks
    </NuxtLink>

    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading block..." />

    <!-- Error -->
    <AppErrorState v-else-if="error" :message="error" @retry="fetchBlock" />

    <!-- Block Detail -->
    <template v-else-if="block">
      <!-- Hero Card -->
      <AppHeroCard
        icon="i-lucide-box"
        :title="`Block ${block.height.toLocaleString()}`"
        :subtitle="formatDateTime(block.timestamp)"
      >
        <template #actions>
          <div class="flex justify-center gap-2">
            <UButton
              v-if="block.height > 0"
              :to="`/explorer/block/${block.height - 1}`"
              variant="outline"
              icon="i-lucide-chevron-left"
              size="sm"
            >
              Previous
            </UButton>
            <UButton
              :to="`/explorer/block/${block.height + 1}`"
              variant="outline"
              trailing-icon="i-lucide-chevron-right"
              size="sm"
            >
              Next
            </UButton>
          </div>
        </template>
      </AppHeroCard>

      <!-- Block Info -->
      <AppCard title="Block Information" icon="i-lucide-info">
        <dl class="space-y-3">
          <div class="flex justify-between">
            <dt class="text-muted">Hash</dt>
            <dd class="font-mono text-sm flex items-center gap-1">
              {{ toFingerprint(block.hash, 12) }}
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-copy"
                @click="copy(block.hash, 'Block hash')"
              />
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">Height</dt>
            <dd class="font-mono">{{ block.height.toLocaleString() }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">Timestamp</dt>
            <dd>{{ formatDateTime(block.timestamp) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">Transactions</dt>
            <dd>{{ block.numTxs }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">Miner</dt>
            <dd>
              <ExplorerAddressDisplay :address="block.minerAddress" />
            </dd>
          </div>
          <div v-if="block.burnedAmount > 0n" class="flex justify-between">
            <dt class="text-muted">Burned</dt>
            <dd class="text-error font-medium">
              {{ formatXPI(block.burnedAmount) }}
            </dd>
          </div>
        </dl>
      </AppCard>

      <!-- Transactions -->
      <AppCard
        :title="`Transactions (${block.numTxs})`"
        icon="i-lucide-list"
        :no-padding="true"
      >
        <div class="divide-y divide-default">
          <ExplorerTxItem
            v-for="tx in blockTxs"
            :key="tx.txid"
            :transaction="tx"
          />
        </div>

        <div v-if="hasMoreTxs" class="p-4 text-center">
          <UButton
            color="neutral"
            variant="ghost"
            :loading="loadingMore"
            @click="loadMoreTxs"
          >
            Load More
          </UButton>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { fetchBlock: fetchBlockApi, fetchBlockTransactions } = useChronik()
const { formatXPI } = useAmount()
const { formatDateTime } = useTime()
const { toFingerprint } = useAddress()
const { copy } = useClipboard()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const block = ref<Block | null>(null)
const blockTxs = ref<Transaction[]>([])
const hasMoreTxs = ref(false)
const loadingMore = ref(false)

// Fetch block
async function fetchBlock() {
  loading.value = true
  error.value = null

  try {
    const hashOrHeight = route.params.hashOrHeight as string
    block.value = await fetchBlockApi(hashOrHeight)

    // Fetch first page of transactions
    const txResult = await fetchBlockTransactions(block.value.hash, 0, 20)
    blockTxs.value = txResult.txs
    hasMoreTxs.value = txResult.numPages > 1
  } catch (e) {
    error.value = e.message || 'Failed to load block'
  } finally {
    loading.value = false
  }
}

async function loadMoreTxs() {
  if (!block.value) return
  loadingMore.value = true

  try {
    const page = Math.floor(blockTxs.value.length / 20)
    const txResult = await fetchBlockTransactions(block.value.hash, page, 20)
    blockTxs.value.push(...txResult.txs)
    hasMoreTxs.value = page + 1 < txResult.numPages
  } finally {
    loadingMore.value = false
  }
}

// Initial fetch
onMounted(fetchBlock)

// Watch for route changes
watch(() => route.params.hashOrHeight, fetchBlock)
</script>
```

---

## Page: explorer/address/[address].vue

```vue
<!-- pages/explorer/address/[address].vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back Link -->
    <NuxtLink
      to="/explorer"
      class="text-sm text-muted hover:text-foreground flex items-center gap-1"
    >
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Explorer
    </NuxtLink>

    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading address..." />

    <!-- Error -->
    <AppErrorState v-else-if="error" :message="error" @retry="fetchAddress" />

    <!-- Address Detail -->
    <template v-else-if="addressInfo">
      <!-- Hero Card -->
      <AppHeroCard gradient>
        <template #icon>
          <ContactAvatar v-if="contact" :contact="contact" size="xl" />
          <div
            v-else
            class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
          >
            <UIcon name="i-lucide-wallet" class="w-8 h-8 text-primary" />
          </div>
        </template>

        <div class="flex items-center justify-center gap-2 mb-2">
          <h1 class="text-xl font-semibold">
            {{ contact?.name || toFingerprint(address, 8) }}
          </h1>
          <UBadge v-if="isOwnAddress" color="primary" variant="subtle">
            Your Wallet
          </UBadge>
          <UBadge v-else-if="contact" color="success" variant="subtle">
            Contact
          </UBadge>
        </div>

        <p class="text-3xl font-bold mb-2">
          {{ formatXPI(addressInfo.balance) }}
        </p>

        <p class="text-sm text-muted font-mono break-all px-4">
          {{ address }}
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            @click="copy(address, 'Address')"
          />
        </p>

        <template #actions>
          <div class="flex justify-center gap-2 mt-4">
            <UButton
              v-if="!isOwnAddress"
              :to="`/send?to=${address}`"
              icon="i-lucide-send"
            >
              Send
            </UButton>
            <AddToContactButton
              v-if="!isOwnAddress && !contact"
              :address="address"
            />
          </div>
        </template>
      </AppHeroCard>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4">
        <UCard>
          <AppStatCard :value="addressInfo.numTxs" label="Transactions" mono />
        </UCard>
        <UCard>
          <AppStatCard
            :value="formatXPI(addressInfo.totalReceived)"
            label="Total Received"
          />
        </UCard>
        <UCard>
          <AppStatCard
            :value="formatXPI(addressInfo.totalSent)"
            label="Total Sent"
          />
        </UCard>
      </div>

      <!-- Transaction History -->
      <AppCard
        :title="`Transactions (${addressInfo.numTxs})`"
        icon="i-lucide-list"
        :no-padding="true"
      >
        <div v-if="transactions.length" class="divide-y divide-default">
          <ExplorerTxItem
            v-for="tx in transactions"
            :key="tx.txid"
            :transaction="tx"
          />
        </div>

        <AppEmptyState
          v-else
          icon="i-lucide-inbox"
          title="No transactions"
          description="This address has no transaction history"
        />

        <div v-if="hasMore" class="p-4 text-center">
          <UButton
            color="neutral"
            variant="ghost"
            :loading="loadingMore"
            @click="loadMore"
          >
            Load More
          </UButton>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const walletStore = useWalletStore()
const contactStore = useContactStore()
const { fetchAddressInfo, fetchAddressTransactions } = useChronik()
const { formatXPI } = useAmount()
const { toFingerprint } = useAddress()
const { copy } = useClipboard()

const address = computed(() => route.params.address as string)

// State
const loading = ref(true)
const error = ref<string | null>(null)
const addressInfo = ref<AddressInfo | null>(null)
const transactions = ref<Transaction[]>([])
const hasMore = ref(false)
const loadingMore = ref(false)

// Computed
const isOwnAddress = computed(() => address.value === walletStore.address)
const contact = computed(() => contactStore.findByAddress(address.value))

// Fetch
async function fetchAddress() {
  loading.value = true
  error.value = null

  try {
    addressInfo.value = await fetchAddressInfo(address.value)

    const txResult = await fetchAddressTransactions(address.value, 0, 20)
    transactions.value = txResult.txs
    hasMore.value = txResult.numPages > 1
  } catch (e) {
    error.value = e.message || 'Failed to load address'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true

  try {
    const page = Math.floor(transactions.value.length / 20)
    const txResult = await fetchAddressTransactions(address.value, page, 20)
    transactions.value.push(...txResult.txs)
    hasMore.value = page + 1 < txResult.numPages
  } finally {
    loadingMore.value = false
  }
}

// Initial fetch
onMounted(fetchAddress)

// Watch for route changes
watch(address, fetchAddress)
</script>
```

---

## Component: ExplorerAddressDisplay.vue

Unified address display with contact integration:

```vue
<script setup lang="ts">
const props = defineProps<{
  address: string
  showAddContact?: boolean
  linkToExplorer?: boolean
}>()

const walletStore = useWalletStore()
const contactStore = useContactStore()
const { toFingerprint } = useAddress()

const isOwnAddress = computed(() => props.address === walletStore.address)
const contact = computed(() => contactStore.findByAddress(props.address))

const displayName = computed(() => {
  if (isOwnAddress.value) return 'You'
  if (contact.value) return contact.value.name
  return toFingerprint(props.address)
})
</script>

<template>
  <component
    :is="linkToExplorer ? 'NuxtLink' : 'span'"
    :to="linkToExplorer ? `/explorer/address/${address}` : undefined"
    class="inline-flex items-center gap-1"
    :class="linkToExplorer && 'hover:text-primary'"
  >
    <ContactAvatar v-if="contact" :contact="contact" size="xs" />
    <span :class="{ 'font-mono text-sm': !contact && !isOwnAddress }">
      {{ displayName }}
    </span>
    <UBadge v-if="isOwnAddress" color="primary" variant="subtle" size="xs">
      You
    </UBadge>
    <AddToContactButton
      v-if="showAddContact && !isOwnAddress && !contact"
      :address="address"
      size="xs"
      variant="icon"
    />
  </component>
</template>
```

---

_Next: [08_SOCIAL_PAGES.md](./08_SOCIAL_PAGES.md)_
