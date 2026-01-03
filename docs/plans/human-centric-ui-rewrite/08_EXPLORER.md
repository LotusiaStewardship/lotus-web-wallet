# Phase 8: Explorer

## Overview

The Explorer provides **blockchain transparency** for users who want to verify transactions, view addresses, and explore blocks. It's a secondary feature that supports the primary People and Activity experiences.

**Prerequisites**: Phase 1-7  
**Estimated Effort**: 3-4 days  
**Priority**: P1

---

## Goals

1. Build transaction detail page
2. Build address detail page
3. Build block detail page
4. Add search functionality
5. Integrate with People (contact resolution)

---

## Explorer Structure

```
pages/explore/
└── [...slug].vue    # Catch-all route for explorer

Routes:
/explore                    # Explorer home/search
/explore/tx/[txid]         # Transaction detail
/explore/address/[address] # Address detail
/explore/block/[height]    # Block detail
```

---

## Explorer Home/Search

```vue
<!-- pages/explore/[...slug].vue -->
<template>
  <div class="space-y-4">
    <!-- Search Header -->
    <div class="flex items-center gap-2">
      <UButton
        v-if="hasContent"
        variant="ghost"
        icon="i-lucide-arrow-left"
        @click="navigateTo('/explore')"
      />
      <h1 class="text-xl font-bold">Explorer</h1>
    </div>

    <!-- Search Bar -->
    <div class="relative">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="Search address, transaction, or block..."
        size="lg"
        @keyup.enter="handleSearch"
      />
      <UButton
        v-if="searchQuery"
        class="absolute right-2 top-1/2 -translate-y-1/2"
        variant="ghost"
        size="xs"
        icon="i-lucide-x"
        @click="searchQuery = ''"
      />
    </div>

    <!-- Content based on route -->
    <template v-if="routeType === 'home'">
      <ExplorerHome />
    </template>

    <template v-else-if="routeType === 'tx'">
      <TransactionDetail :txid="routeParam" />
    </template>

    <template v-else-if="routeType === 'address'">
      <AddressDetail :address="routeParam" />
    </template>

    <template v-else-if="routeType === 'block'">
      <BlockDetail :height="parseInt(routeParam)" />
    </template>

    <template v-else>
      <div class="text-center py-12">
        <UIcon
          name="i-lucide-search-x"
          class="w-12 h-12 mx-auto text-muted mb-4"
        />
        <h2 class="text-lg font-medium">Not Found</h2>
        <p class="text-muted text-sm">The requested resource was not found.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Explorer',
})

const route = useRoute()

const searchQuery = ref('')

const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s : s ? [s] : []
})

const routeType = computed(() => {
  if (slug.value.length === 0) return 'home'
  if (slug.value[0] === 'tx' && slug.value[1]) return 'tx'
  if (slug.value[0] === 'address' && slug.value[1]) return 'address'
  if (slug.value[0] === 'block' && slug.value[1]) return 'block'
  return 'notfound'
})

const routeParam = computed(() => slug.value[1] || '')

const hasContent = computed(() => routeType.value !== 'home')

function handleSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  // Detect type and navigate
  if (query.startsWith('lotus_')) {
    navigateTo(`/explore/address/${query}`)
  } else if (query.length === 64) {
    // Could be txid - try tx first
    navigateTo(`/explore/tx/${query}`)
  } else if (/^\d+$/.test(query)) {
    navigateTo(`/explore/block/${query}`)
  } else {
    // Unknown format
  }
}
</script>
```

---

## Explorer Home Component

```vue
<!-- components/explorer/ExplorerHome.vue -->
<template>
  <div class="space-y-6">
    <!-- Network Stats -->
    <div class="grid grid-cols-2 gap-3">
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-sm text-muted">Block Height</p>
        <p class="text-2xl font-bold font-mono">
          {{ blockHeight?.toLocaleString() || '—' }}
        </p>
      </div>
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-sm text-muted">Network</p>
        <p class="text-2xl font-bold">{{ network }}</p>
      </div>
    </div>

    <!-- Recent Blocks -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Recent Blocks</h2>

      <div v-if="loading" class="space-y-2">
        <div
          v-for="i in 5"
          :key="i"
          class="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
        />
      </div>

      <div v-else class="space-y-2">
        <NuxtLink
          v-for="block in recentBlocks"
          :key="block.height"
          :to="`/explore/block/${block.height}`"
          class="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary/30 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="font-mono font-medium">
                {{ block.height.toLocaleString() }}
              </p>
              <p class="text-xs text-muted">{{ block.txCount }} transactions</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm text-muted">{{ formatTime(block.timestamp) }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Mempool -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Mempool</h2>
        <UBadge variant="subtle">{{ mempoolCount }} pending</UBadge>
      </div>

      <div v-if="mempoolTxs.length > 0" class="space-y-2">
        <NuxtLink
          v-for="tx in mempoolTxs.slice(0, 5)"
          :key="tx.txid"
          :to="`/explore/tx/${tx.txid}`"
          class="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20 hover:border-warning/40 transition-colors"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-clock" class="w-4 h-4 text-warning" />
            <code class="text-sm font-mono">{{ truncate(tx.txid, 16) }}</code>
          </div>
          <span class="text-sm text-muted">Pending</span>
        </NuxtLink>
      </div>

      <p v-else class="text-sm text-muted text-center py-4">
        No pending transactions
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const networkStore = useNetworkStore()
const chronik = useChronikApi()

const loading = ref(true)
const recentBlocks = ref<any[]>([])
const mempoolTxs = ref<any[]>([])

const blockHeight = computed(() => networkStore.blockHeight)
const network = computed(() =>
  networkStore.network === 'mainnet' ? 'Mainnet' : 'Testnet',
)
const mempoolCount = computed(() => mempoolTxs.value.length)

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    // Fetch recent blocks
    const height = networkStore.blockHeight || 0
    const blocks = []
    for (let i = 0; i < 5; i++) {
      const block = await chronik.block(height - i)
      blocks.push({
        height: block.blockInfo.height,
        timestamp: block.blockInfo.timestamp,
        txCount: block.txs.length,
      })
    }
    recentBlocks.value = blocks

    // Fetch mempool (if available)
    // mempoolTxs.value = await chronik.mempool()
  } catch (error) {
    console.error('Failed to fetch explorer data:', error)
  } finally {
    loading.value = false
  }
}

function formatTime(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return new Date(timestamp * 1000).toLocaleTimeString()
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return `${str.slice(0, len / 2)}...${str.slice(-len / 2)}`
}
</script>
```

---

## Transaction Detail Component

```vue
<!-- components/explorer/TransactionDetail.vue -->
<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div
        class="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
      />
      <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon
        name="i-lucide-alert-circle"
        class="w-12 h-12 mx-auto text-error mb-4"
      />
      <h2 class="text-lg font-medium">Transaction Not Found</h2>
      <p class="text-muted text-sm">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else-if="tx">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center',
            tx.confirmations > 0 ? 'bg-success/10' : 'bg-warning/10',
          ]"
        >
          <UIcon
            :name="
              tx.confirmations > 0 ? 'i-lucide-check-circle' : 'i-lucide-clock'
            "
            :class="tx.confirmations > 0 ? 'text-success' : 'text-warning'"
            class="w-5 h-5"
          />
        </div>
        <div>
          <h2 class="font-semibold">Transaction</h2>
          <p class="text-sm text-muted">
            {{
              tx.confirmations > 0
                ? `${tx.confirmations} confirmations`
                : 'Pending'
            }}
          </p>
        </div>
      </div>

      <!-- TXID -->
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-xs text-muted mb-1">Transaction ID</p>
        <div class="flex items-center gap-2">
          <code class="text-sm font-mono break-all flex-1">{{ txid }}</code>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            @click="copyTxid"
          />
        </div>
      </div>

      <!-- Details -->
      <div class="space-y-3">
        <div
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Status</span>
          <UBadge :color="tx.confirmations > 0 ? 'success' : 'warning'">
            {{ tx.confirmations > 0 ? 'Confirmed' : 'Pending' }}
          </UBadge>
        </div>

        <div
          v-if="tx.blockHeight"
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Block</span>
          <NuxtLink
            :to="`/explore/block/${tx.blockHeight}`"
            class="text-primary hover:underline font-mono"
          >
            {{ tx.blockHeight.toLocaleString() }}
          </NuxtLink>
        </div>

        <div
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Time</span>
          <span>{{ formatDate(tx.timestamp) }}</span>
        </div>

        <div
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Size</span>
          <span>{{ tx.size }} bytes</span>
        </div>

        <div
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Fee</span>
          <span class="font-mono">{{ formatXPI(tx.fee) }} XPI</span>
        </div>
      </div>

      <!-- Inputs -->
      <div class="space-y-3">
        <h3 class="font-semibold">Inputs ({{ tx.inputs.length }})</h3>
        <div class="space-y-2">
          <div
            v-for="(input, index) in tx.inputs"
            :key="index"
            class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
          >
            <AddressDisplay :address="input.address" :amount="input.value" />
          </div>
        </div>
      </div>

      <!-- Outputs -->
      <div class="space-y-3">
        <h3 class="font-semibold">Outputs ({{ tx.outputs.length }})</h3>
        <div class="space-y-2">
          <div
            v-for="(output, index) in tx.outputs"
            :key="index"
            class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
          >
            <AddressDisplay :address="output.address" :amount="output.value" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  txid: string
}>()

const chronik = useChronikApi()
const toast = useToast()

const loading = ref(true)
const error = ref<string | null>(null)
const tx = ref<any>(null)

onMounted(async () => {
  await fetchTransaction()
})

watch(() => props.txid, fetchTransaction)

async function fetchTransaction() {
  loading.value = true
  error.value = null

  try {
    const result = await chronik.tx(props.txid)
    tx.value = {
      txid: result.txid,
      confirmations: result.block ? 1 : 0, // Simplified
      blockHeight: result.block?.height,
      timestamp: result.block?.timestamp || Date.now() / 1000,
      size: result.size,
      fee: result.fee || 0,
      inputs: result.inputs.map((i: any) => ({
        address: i.outputScript ? 'Unknown' : 'Coinbase',
        value: i.value || 0,
      })),
      outputs: result.outputs.map((o: any) => ({
        address: o.outputScript || 'Unknown',
        value: o.value || 0,
      })),
    }
  } catch (e) {
    error.value = 'Transaction not found'
  } finally {
    loading.value = false
  }
}

function copyTxid() {
  navigator.clipboard.writeText(props.txid)
  toast.add({ title: 'Copied!' })
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

function formatXPI(sats: number): string {
  return (sats / 1_000_000).toFixed(6)
}
</script>
```

---

## Address Display Component (with Contact Resolution)

```vue
<!-- components/explorer/AddressDisplay.vue -->
<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2 min-w-0">
      <!-- Contact Avatar (if known) -->
      <template v-if="contact">
        <PersonAvatar :person="contact" size="xs" />
        <div class="min-w-0">
          <p class="font-medium truncate">{{ contact.name }}</p>
          <code class="text-xs text-muted">{{ truncatedAddress }}</code>
        </div>
      </template>

      <!-- Unknown Address -->
      <template v-else>
        <div
          class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
        >
          <UIcon name="i-lucide-wallet" class="w-3 h-3 text-muted" />
        </div>
        <code class="text-sm font-mono truncate">{{ truncatedAddress }}</code>
      </template>
    </div>

    <!-- Amount -->
    <div v-if="amount !== undefined" class="text-right flex-shrink-0 ml-2">
      <p class="font-mono text-sm">{{ formatXPI(amount) }} XPI</p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0 ml-2">
      <UButton
        v-if="!contact"
        variant="ghost"
        size="xs"
        icon="i-lucide-user-plus"
        title="Add to contacts"
        @click.stop="addToContacts"
      />
      <NuxtLink :to="`/explore/address/${address}`">
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-external-link"
          title="View address"
        />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  address: string
  amount?: number
}>()

const peopleStore = usePeopleStore()

const contact = computed(() => peopleStore.getByAddress(props.address))

const truncatedAddress = computed(() => {
  if (props.address.length <= 20) return props.address
  return `${props.address.slice(0, 10)}...${props.address.slice(-6)}`
})

function formatXPI(sats: number): string {
  return (sats / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

function addToContacts() {
  navigateTo(`/people?add=true&address=${props.address}`)
}
</script>
```

---

## Address Detail Component

```vue
<!-- components/explorer/AddressDetail.vue -->
<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div
        class="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
      />
      <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header with Contact Info -->
      <div class="flex items-center gap-3">
        <template v-if="contact">
          <PersonAvatar :person="contact" size="lg" />
          <div>
            <h2 class="text-xl font-bold">{{ contact.name }}</h2>
            <p class="text-sm text-muted">Contact</p>
          </div>
        </template>
        <template v-else>
          <div
            class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
          >
            <UIcon name="i-lucide-wallet" class="w-6 h-6 text-muted" />
          </div>
          <div>
            <h2 class="font-semibold">Address</h2>
            <p class="text-sm text-muted">Unknown</p>
          </div>
        </template>
      </div>

      <!-- Address -->
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <div class="flex items-center gap-2">
          <code class="text-sm font-mono break-all flex-1">{{ address }}</code>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            @click="copyAddress"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <UButton
          color="primary"
          class="flex-1"
          icon="i-lucide-send"
          @click="sendTo"
        >
          Send
        </UButton>
        <UButton
          v-if="!contact"
          variant="outline"
          class="flex-1"
          icon="i-lucide-user-plus"
          @click="addToContacts"
        >
          Add Contact
        </UButton>
        <UButton
          v-else
          variant="outline"
          class="flex-1"
          icon="i-lucide-user"
          @click="viewContact"
        >
          View Contact
        </UButton>
      </div>

      <!-- Balance -->
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p class="text-sm text-muted mb-1">Balance</p>
        <p class="text-2xl font-bold font-mono">{{ formatXPI(balance) }} XPI</p>
      </div>

      <!-- Transaction History -->
      <div class="space-y-3">
        <h3 class="font-semibold">Transactions</h3>

        <div v-if="transactions.length > 0" class="space-y-2">
          <NuxtLink
            v-for="tx in transactions"
            :key="tx.txid"
            :to="`/explore/tx/${tx.txid}`"
            class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary/30 transition-colors"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="
                  tx.direction === 'incoming'
                    ? 'i-lucide-arrow-down-left'
                    : 'i-lucide-arrow-up-right'
                "
                :class="
                  tx.direction === 'incoming' ? 'text-success' : 'text-error'
                "
                class="w-4 h-4"
              />
              <code class="text-sm font-mono">{{ truncate(tx.txid, 16) }}</code>
            </div>
            <div class="text-right">
              <p
                :class="[
                  'font-mono text-sm',
                  tx.direction === 'incoming' ? 'text-success' : 'text-error',
                ]"
              >
                {{ tx.direction === 'incoming' ? '+' : '-'
                }}{{ formatXPI(tx.amount) }}
              </p>
              <p class="text-xs text-muted">{{ formatTime(tx.timestamp) }}</p>
            </div>
          </NuxtLink>
        </div>

        <p v-else class="text-sm text-muted text-center py-4">
          No transactions found
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  address: string
}>()

const chronik = useChronikApi()
const peopleStore = usePeopleStore()
const toast = useToast()

const loading = ref(true)
const balance = ref(0)
const transactions = ref<any[]>([])

const contact = computed(() => peopleStore.getByAddress(props.address))

onMounted(async () => {
  await fetchAddressData()
})

watch(() => props.address, fetchAddressData)

async function fetchAddressData() {
  loading.value = true

  try {
    // Fetch balance and history
    const history = await chronik.address(props.address).history()

    balance.value =
      history.utxos?.reduce((sum: number, u: any) => sum + u.value, 0) || 0

    transactions.value =
      history.txs?.slice(0, 20).map((tx: any) => ({
        txid: tx.txid,
        direction: 'incoming', // Simplified
        amount: 0,
        timestamp: tx.block?.timestamp || Date.now() / 1000,
      })) || []
  } catch (error) {
    console.error('Failed to fetch address data:', error)
  } finally {
    loading.value = false
  }
}

function copyAddress() {
  navigator.clipboard.writeText(props.address)
  toast.add({ title: 'Copied!' })
}

function sendTo() {
  // Open send modal with address
}

function addToContacts() {
  navigateTo(`/people?add=true&address=${props.address}`)
}

function viewContact() {
  if (contact.value) {
    navigateTo(`/people/${contact.value.id}`)
  }
}

function formatXPI(sats: number): string {
  return (sats / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

function formatTime(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

function truncate(str: string, len: number): string {
  return `${str.slice(0, len / 2)}...${str.slice(-len / 2)}`
}
</script>
```

---

## Block Detail Component

```vue
<!-- components/explorer/BlockDetail.vue -->
<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div
        class="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
      />
      <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon
        name="i-lucide-alert-circle"
        class="w-12 h-12 mx-auto text-error mb-4"
      />
      <h2 class="text-lg font-medium">Block Not Found</h2>
    </div>

    <!-- Content -->
    <template v-else-if="block">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 class="text-xl font-bold font-mono">
            Block {{ height.toLocaleString() }}
          </h2>
          <p class="text-sm text-muted">{{ formatDate(block.timestamp) }}</p>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex gap-2">
        <UButton
          v-if="height > 0"
          variant="outline"
          icon="i-lucide-chevron-left"
          @click="navigateTo(`/explore/block/${height - 1}`)"
        >
          Previous
        </UButton>
        <UButton
          variant="outline"
          icon="i-lucide-chevron-right"
          icon-position="right"
          @click="navigateTo(`/explore/block/${height + 1}`)"
        >
          Next
        </UButton>
      </div>

      <!-- Block Hash -->
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-xs text-muted mb-1">Block Hash</p>
        <div class="flex items-center gap-2">
          <code class="text-sm font-mono break-all flex-1">{{
            block.hash
          }}</code>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            @click="copyHash"
          />
        </div>
      </div>

      <!-- Details -->
      <div class="space-y-3">
        <div
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Transactions</span>
          <span class="font-medium">{{ block.txCount }}</span>
        </div>

        <div
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Size</span>
          <span>{{ formatBytes(block.size) }}</span>
        </div>

        <div
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800"
        >
          <span class="text-muted">Difficulty</span>
          <span class="font-mono">{{ block.difficulty?.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Transactions -->
      <div class="space-y-3">
        <h3 class="font-semibold">Transactions ({{ block.txCount }})</h3>

        <div class="space-y-2">
          <NuxtLink
            v-for="tx in block.txs.slice(0, 20)"
            :key="tx.txid"
            :to="`/explore/tx/${tx.txid}`"
            class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary/30 transition-colors"
          >
            <code class="text-sm font-mono">{{ truncate(tx.txid, 20) }}</code>
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
          </NuxtLink>
        </div>

        <p v-if="block.txCount > 20" class="text-sm text-muted text-center">
          Showing 20 of {{ block.txCount }} transactions
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  height: number
}>()

const chronik = useChronikApi()
const toast = useToast()

const loading = ref(true)
const error = ref(false)
const block = ref<any>(null)

onMounted(async () => {
  await fetchBlock()
})

watch(() => props.height, fetchBlock)

async function fetchBlock() {
  loading.value = true
  error.value = false

  try {
    const result = await chronik.block(props.height)
    block.value = {
      hash: result.blockInfo.hash,
      timestamp: result.blockInfo.timestamp,
      txCount: result.txs.length,
      size: result.blockInfo.size || 0,
      difficulty: result.blockInfo.difficulty,
      txs: result.txs.slice(0, 20).map((tx: any) => ({
        txid: tx.txid,
      })),
    }
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function copyHash() {
  if (block.value) {
    navigator.clipboard.writeText(block.value.hash)
    toast.add({ title: 'Copied!' })
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function truncate(str: string, len: number): string {
  return `${str.slice(0, len / 2)}...${str.slice(-len / 2)}`
}
</script>
```

---

## Tasks Checklist

### Pages

- [ ] Create `pages/explore/[...slug].vue` (catch-all route)

### Components

- [ ] Create `components/explorer/ExplorerHome.vue`
- [ ] Create `components/explorer/TransactionDetail.vue`
- [ ] Create `components/explorer/AddressDetail.vue`
- [ ] Create `components/explorer/BlockDetail.vue`
- [ ] Create `components/explorer/AddressDisplay.vue`

### Integration

- [ ] Wire to Chronik API for data fetching
- [ ] Integrate contact resolution for addresses
- [ ] Add "Add to Contacts" from explorer
- [ ] Add "Send to" from address view

### Search

- [ ] Implement search detection (address/tx/block)
- [ ] Add search suggestions

---

## Verification

- [ ] Explorer home shows recent blocks
- [ ] Transaction detail displays correctly
- [ ] Address detail shows balance and history
- [ ] Block detail shows transactions
- [ ] Contact resolution works for known addresses
- [ ] Search navigates to correct detail page
- [ ] Copy buttons work
- [ ] Navigation between blocks works

---

_Next: [09_POLISH.md](./09_POLISH.md)_
