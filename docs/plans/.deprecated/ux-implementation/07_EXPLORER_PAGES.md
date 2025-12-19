# Phase 7: Explorer Pages

## Overview

The explorer pages need a universal search bar, mempool view, and raw transaction data access. This phase builds a complete blockchain explorer experience integrated into the wallet.

**Priority**: P1 (High)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 6 (Contacts), existing explorer components

---

## Goals

1. Universal search (txid, address, block hash/height)
2. Explorer home with network stats and recent blocks
3. Block detail page
4. Transaction detail page with raw data view
5. Address detail page
6. Mempool view
7. Share functionality

---

## 1. Explore Hub Page

### File: `pages/explore/index.vue`

```vue
<script setup lang="ts">
definePageMeta({
  title: 'Explore',
})

const subPages = [
  {
    label: 'Explorer',
    icon: 'i-lucide-blocks',
    to: '/explore/explorer',
    description: 'Browse blocks, transactions, and addresses',
    color: 'primary',
  },
  {
    label: 'Social',
    icon: 'i-lucide-thumbs-up',
    to: '/explore/social',
    description: 'Vote on content creators with RANK',
    color: 'info',
  },
]
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-compass"
      title="Explore"
      subtitle="Discover the Lotus blockchain and social ecosystem"
    />

    <div class="grid gap-4 md:grid-cols-2">
      <AppActionCard
        v-for="page in subPages"
        :key="page.to"
        :icon="page.icon"
        :label="page.label"
        :description="page.description"
        :to="page.to"
        :icon-color="page.color"
      />
    </div>
  </div>
</template>
```

---

## 2. Explorer Index Page

### File: `pages/explore/explorer/index.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useExplorerApi } from '~/composables/useExplorerApi'

definePageMeta({
  title: 'Explorer',
})

const router = useRouter()
const walletStore = useWalletStore()
const { getRecentBlocks, getNetworkStats, getMempoolInfo } = useExplorerApi()

// Search
const searchQuery = ref('')
const searchError = ref('')
const searching = ref(false)

// Data
const recentBlocks = ref([])
const networkStats = ref(null)
const mempoolInfo = ref(null)
const loading = ref(true)

// Load data
onMounted(async () => {
  try {
    const [blocks, stats, mempool] = await Promise.all([
      getRecentBlocks(10),
      getNetworkStats(),
      getMempoolInfo(),
    ])
    recentBlocks.value = blocks
    networkStats.value = stats
    mempoolInfo.value = mempool
  } catch (e) {
    console.error('Failed to load explorer data:', e)
  } finally {
    loading.value = false
  }
})

// Search handler
async function handleSearch() {
  if (!searchQuery.value.trim()) return

  searching.value = true
  searchError.value = ''

  const query = searchQuery.value.trim()

  try {
    // Detect query type and navigate
    if (/^[0-9]+$/.test(query)) {
      // Block height
      router.push(`/explore/explorer/block/${query}`)
    } else if (/^[a-fA-F0-9]{64}$/.test(query)) {
      // Could be txid or block hash - try txid first
      router.push(`/explore/explorer/tx/${query}`)
    } else if (query.startsWith('lotus')) {
      // Address
      router.push(`/explore/explorer/address/${query}`)
    } else {
      searchError.value =
        'Invalid search query. Enter a txid, address, or block height.'
    }
  } finally {
    searching.value = false
  }
}

// Format hash
function formatHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
}
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-blocks"
      title="Blockchain Explorer"
      subtitle="Search transactions, addresses, and blocks"
    />

    <!-- Search Bar -->
    <AppCard>
      <form @submit.prevent="handleSearch" class="flex gap-3">
        <div class="flex-1 relative">
          <UIcon
            name="i-lucide-search"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by txid, address, or block height..."
            class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
          />
        </div>
        <UButton type="submit" color="primary" :loading="searching">
          Search
        </UButton>
      </form>
      <p v-if="searchError" class="text-sm text-red-500 mt-2">
        {{ searchError }}
      </p>
    </AppCard>

    <!-- Loading State -->
    <AppLoadingState v-if="loading" message="Loading explorer data..." />

    <template v-else>
      <!-- Network Stats -->
      <div class="grid gap-4 md:grid-cols-4">
        <AppStatCard
          label="Block Height"
          :value="networkStats?.blockHeight?.toLocaleString() || '—'"
          icon="i-lucide-box"
        />
        <AppStatCard
          label="Difficulty"
          :value="networkStats?.difficulty?.toFixed(2) || '—'"
          icon="i-lucide-gauge"
        />
        <AppStatCard
          label="Mempool Txs"
          :value="mempoolInfo?.size?.toString() || '0'"
          icon="i-lucide-layers"
        />
        <AppStatCard
          label="Hash Rate"
          :value="networkStats?.hashRate || '—'"
          icon="i-lucide-cpu"
        />
      </div>

      <!-- Recent Blocks -->
      <AppCard title="Recent Blocks" icon="i-lucide-boxes">
        <template #action>
          <NuxtLink
            to="/explore/explorer/blocks"
            class="text-sm text-primary hover:underline"
          >
            View All →
          </NuxtLink>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr
                class="text-left text-sm text-gray-500 border-b border-gray-200 dark:border-gray-700"
              >
                <th class="pb-3 font-medium">Height</th>
                <th class="pb-3 font-medium">Hash</th>
                <th class="pb-3 font-medium">Txs</th>
                <th class="pb-3 font-medium">Size</th>
                <th class="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="block in recentBlocks"
                :key="block.hash"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                @click="router.push(`/explore/explorer/block/${block.hash}`)"
              >
                <td class="py-3 font-mono text-primary">
                  {{ block.height.toLocaleString() }}
                </td>
                <td class="py-3 font-mono text-sm">
                  {{ formatHash(block.hash) }}
                </td>
                <td class="py-3">{{ block.txCount }}</td>
                <td class="py-3">{{ (block.size / 1024).toFixed(2) }} KB</td>
                <td class="py-3 text-gray-500">
                  <TimeAgo :timestamp="block.timestamp" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Mempool Preview -->
      <AppCard title="Mempool" icon="i-lucide-layers">
        <template #action>
          <NuxtLink
            to="/explore/explorer/mempool"
            class="text-sm text-primary hover:underline"
          >
            View All →
          </NuxtLink>
        </template>

        <div v-if="mempoolInfo?.size > 0" class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-gray-500"
              >{{ mempoolInfo.size }} pending transactions</span
            >
            <span class="text-gray-500"
              >{{ (mempoolInfo.bytes / 1024).toFixed(2) }} KB</span
            >
          </div>
          <!-- Could add mempool visualization here -->
        </div>
        <div v-else class="text-center py-8 text-gray-500">
          <UIcon
            name="i-lucide-inbox"
            class="w-12 h-12 mx-auto mb-2 opacity-50"
          />
          <p>Mempool is empty</p>
        </div>
      </AppCard>
    </template>
  </div>
</template>
```

---

## 3. Block Detail Page

### File: `pages/explore/explorer/block/[hash].vue`

```vue
<script setup lang="ts">
import { useExplorerApi } from '~/composables/useExplorerApi'

definePageMeta({
  title: 'Block Details',
})

const route = useRoute()
const { getBlock, getBlockTransactions } = useExplorerApi()

const hash = computed(() => route.params.hash as string)

// Data
const block = ref(null)
const transactions = ref([])
const loading = ref(true)
const error = ref('')

// Load block data
onMounted(async () => {
  try {
    const [blockData, txs] = await Promise.all([
      getBlock(hash.value),
      getBlockTransactions(hash.value),
    ])
    block.value = blockData
    transactions.value = txs
  } catch (e) {
    error.value = 'Failed to load block data'
  } finally {
    loading.value = false
  }
})

// Copy hash
const copied = ref(false)
function copyHash() {
  navigator.clipboard.writeText(hash.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// Share
async function share() {
  if (navigator.share) {
    await navigator.share({
      title: `Lotus Block ${block.value?.height}`,
      url: window.location.href,
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading block..." />

    <!-- Error -->
    <AppErrorState v-else-if="error" :message="error" @retry="$router.go(0)" />

    <template v-else-if="block">
      <!-- Header -->
      <AppHeroCard
        icon="i-lucide-box"
        :title="`Block #${block.height.toLocaleString()}`"
        :subtitle="`${transactions.length} transactions`"
      >
        <template #action>
          <div class="flex gap-2">
            <UButton color="neutral" variant="soft" @click="copyHash">
              <UIcon
                :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                class="w-4 h-4 mr-2"
              />
              {{ copied ? 'Copied!' : 'Copy Hash' }}
            </UButton>
            <UButton
              v-if="navigator.share"
              color="neutral"
              variant="soft"
              @click="share"
            >
              <UIcon name="i-lucide-share" class="w-4 h-4" />
            </UButton>
          </div>
        </template>
      </AppHeroCard>

      <!-- Block Info -->
      <AppCard title="Block Information" icon="i-lucide-info">
        <dl class="grid gap-4 md:grid-cols-2">
          <div>
            <dt class="text-sm text-gray-500">Hash</dt>
            <dd class="font-mono text-sm break-all">{{ block.hash }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Previous Block</dt>
            <dd class="font-mono text-sm">
              <NuxtLink
                :to="`/explore/explorer/block/${block.previousHash}`"
                class="text-primary hover:underline"
              >
                {{ block.previousHash.slice(0, 16) }}...
              </NuxtLink>
            </dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Timestamp</dt>
            <dd>{{ new Date(block.timestamp * 1000).toLocaleString() }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Size</dt>
            <dd>{{ (block.size / 1024).toFixed(2) }} KB</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Difficulty</dt>
            <dd>{{ block.difficulty }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Nonce</dt>
            <dd class="font-mono">{{ block.nonce }}</dd>
          </div>
        </dl>
      </AppCard>

      <!-- Transactions -->
      <AppCard
        :title="`Transactions (${transactions.length})`"
        icon="i-lucide-list"
      >
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <ExplorerTxItem
            v-for="tx in transactions"
            :key="tx.txid"
            :transaction="tx"
          />
        </div>
      </AppCard>

      <!-- Navigation -->
      <div class="flex justify-between">
        <UButton
          v-if="block.height > 0"
          color="neutral"
          variant="soft"
          :to="`/explore/explorer/block/${block.height - 1}`"
        >
          <UIcon name="i-lucide-chevron-left" class="w-4 h-4 mr-2" />
          Previous Block
        </UButton>
        <UButton
          color="neutral"
          variant="soft"
          :to="`/explore/explorer/block/${block.height + 1}`"
        >
          Next Block
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4 ml-2" />
        </UButton>
      </div>
    </template>
  </div>
</template>
```

---

## 4. Transaction Detail Page

### File: `pages/explore/explorer/tx/[txid].vue`

```vue
<script setup lang="ts">
import { useExplorerApi } from '~/composables/useExplorerApi'
import { useContactsStore } from '~/stores/contacts'

definePageMeta({
  title: 'Transaction Details',
})

const route = useRoute()
const { getTransaction } = useExplorerApi()
const contactsStore = useContactsStore()

const txid = computed(() => route.params.txid as string)

// Data
const tx = ref(null)
const loading = ref(true)
const error = ref('')

// View mode
const showRaw = ref(false)

// Load transaction
onMounted(async () => {
  try {
    tx.value = await getTransaction(txid.value)
  } catch (e) {
    error.value = 'Transaction not found'
  } finally {
    loading.value = false
  }
})

// Copy txid
const copied = ref(false)
function copyTxid() {
  navigator.clipboard.writeText(txid.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// Copy raw
function copyRaw() {
  navigator.clipboard.writeText(JSON.stringify(tx.value, null, 2))
}

// Share
async function share() {
  if (navigator.share) {
    await navigator.share({
      title: 'Lotus Transaction',
      url: window.location.href,
    })
  }
}

// Get contact for address
function getContact(address: string) {
  return contactsStore.getContactByAddress(address)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading transaction..." />

    <!-- Error -->
    <AppErrorState v-else-if="error" :message="error" @retry="$router.go(0)" />

    <template v-else-if="tx">
      <!-- Header -->
      <AppHeroCard
        icon="i-lucide-file-text"
        title="Transaction"
        :subtitle="
          tx.confirmations > 0 ? `${tx.confirmations} confirmations` : 'Pending'
        "
      >
        <template #action>
          <div class="flex gap-2">
            <UButton color="neutral" variant="soft" @click="copyTxid">
              <UIcon
                :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                class="w-4 h-4 mr-2"
              />
              {{ copied ? 'Copied!' : 'Copy ID' }}
            </UButton>
            <UButton
              v-if="navigator.share"
              color="neutral"
              variant="soft"
              @click="share"
            >
              <UIcon name="i-lucide-share" class="w-4 h-4" />
            </UButton>
          </div>
        </template>
      </AppHeroCard>

      <!-- Status Banner -->
      <UAlert
        v-if="tx.confirmations === 0"
        color="warning"
        icon="i-lucide-clock"
        title="Pending"
        description="This transaction is waiting to be confirmed."
      />

      <!-- Transaction ID -->
      <AppCard title="Transaction ID" icon="i-lucide-hash">
        <div class="font-mono text-sm break-all">{{ tx.txid }}</div>
      </AppCard>

      <!-- View Toggle -->
      <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 w-fit">
        <button
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="
            !showRaw ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-500'
          "
          @click="showRaw = false"
        >
          Formatted
        </button>
        <button
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="
            showRaw ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-500'
          "
          @click="showRaw = true"
        >
          Raw
        </button>
      </div>

      <!-- Formatted View -->
      <template v-if="!showRaw">
        <!-- Inputs -->
        <AppCard title="Inputs" icon="i-lucide-log-in">
          <div class="space-y-3">
            <div
              v-for="(input, i) in tx.inputs"
              :key="i"
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <div>
                  <NuxtLink
                    v-if="input.address"
                    :to="`/explore/explorer/address/${input.address}`"
                    class="font-mono text-sm text-primary hover:underline"
                  >
                    {{ input.address }}
                  </NuxtLink>
                  <span v-else class="text-gray-500">Coinbase</span>
                  <div
                    v-if="getContact(input.address)"
                    class="text-sm text-gray-500"
                  >
                    {{ getContact(input.address).name }}
                  </div>
                </div>
                <div class="font-mono text-right">
                  {{ (input.value / 1e6).toFixed(6) }} XPI
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Outputs -->
        <AppCard title="Outputs" icon="i-lucide-log-out">
          <div class="space-y-3">
            <div
              v-for="(output, i) in tx.outputs"
              :key="i"
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <div>
                  <NuxtLink
                    v-if="output.address"
                    :to="`/explore/explorer/address/${output.address}`"
                    class="font-mono text-sm text-primary hover:underline"
                  >
                    {{ output.address }}
                  </NuxtLink>
                  <span v-else class="text-gray-500">OP_RETURN</span>
                  <div
                    v-if="getContact(output.address)"
                    class="text-sm text-gray-500"
                  >
                    {{ getContact(output.address).name }}
                  </div>
                </div>
                <div class="font-mono text-right">
                  {{ (output.value / 1e6).toFixed(6) }} XPI
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Details -->
        <AppCard title="Details" icon="i-lucide-info">
          <dl class="grid gap-4 md:grid-cols-2">
            <div>
              <dt class="text-sm text-gray-500">Block</dt>
              <dd>
                <NuxtLink
                  v-if="tx.blockHash"
                  :to="`/explore/explorer/block/${tx.blockHash}`"
                  class="text-primary hover:underline"
                >
                  {{ tx.blockHeight?.toLocaleString() }}
                </NuxtLink>
                <span v-else class="text-gray-500">Pending</span>
              </dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Timestamp</dt>
              <dd>
                {{
                  tx.timestamp
                    ? new Date(tx.timestamp * 1000).toLocaleString()
                    : 'Pending'
                }}
              </dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Size</dt>
              <dd>{{ tx.size }} bytes</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Fee</dt>
              <dd class="font-mono">{{ (tx.fee / 1e6).toFixed(6) }} XPI</dd>
            </div>
          </dl>
        </AppCard>
      </template>

      <!-- Raw View -->
      <AppCard v-else title="Raw Transaction" icon="i-lucide-code">
        <template #action>
          <UButton color="neutral" variant="ghost" size="sm" @click="copyRaw">
            <UIcon name="i-lucide-copy" class="w-4 h-4 mr-2" />
            Copy
          </UButton>
        </template>
        <pre
          class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono"
          >{{ JSON.stringify(tx, null, 2) }}</pre
        >
      </AppCard>
    </template>
  </div>
</template>
```

---

## 5. Address Detail Page

### File: `pages/explore/explorer/address/[address].vue`

```vue
<script setup lang="ts">
import { useExplorerApi } from '~/composables/useExplorerApi'
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Address Details',
})

const route = useRoute()
const router = useRouter()
const { getAddressInfo, getAddressTransactions } = useExplorerApi()
const contactsStore = useContactsStore()
const walletStore = useWalletStore()

const address = computed(() => route.params.address as string)

// Data
const addressInfo = ref(null)
const transactions = ref([])
const loading = ref(true)
const error = ref('')

// Load data
onMounted(async () => {
  try {
    const [info, txs] = await Promise.all([
      getAddressInfo(address.value),
      getAddressTransactions(address.value),
    ])
    addressInfo.value = info
    transactions.value = txs
  } catch (e) {
    error.value = 'Failed to load address data'
  } finally {
    loading.value = false
  }
})

// Check if this is user's address
const isOwnAddress = computed(() =>
  walletStore.addresses.includes(address.value),
)

// Get contact
const contact = computed(() => contactsStore.getContactByAddress(address.value))

// Copy address
const copied = ref(false)
function copyAddress() {
  navigator.clipboard.writeText(address.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// Add to contacts
function addToContacts() {
  router.push(`/people/contacts?add=true&address=${address.value}`)
}

// Send to address
function sendToAddress() {
  router.push(`/transact/send?to=${address.value}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading address..." />

    <!-- Error -->
    <AppErrorState v-else-if="error" :message="error" @retry="$router.go(0)" />

    <template v-else-if="addressInfo">
      <!-- Header -->
      <AppHeroCard
        icon="i-lucide-wallet"
        :title="contact?.name || (isOwnAddress ? 'Your Address' : 'Address')"
        :subtitle="`${transactions.length} transactions`"
      >
        <template #action>
          <div class="flex gap-2">
            <UButton color="neutral" variant="soft" @click="copyAddress">
              <UIcon
                :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                class="w-4 h-4 mr-2"
              />
              {{ copied ? 'Copied!' : 'Copy' }}
            </UButton>
            <UButton
              v-if="!contact && !isOwnAddress"
              color="neutral"
              variant="soft"
              @click="addToContacts"
            >
              <UIcon name="i-lucide-user-plus" class="w-4 h-4 mr-2" />
              Add Contact
            </UButton>
            <UButton
              v-if="!isOwnAddress"
              color="primary"
              @click="sendToAddress"
            >
              <UIcon name="i-lucide-send" class="w-4 h-4 mr-2" />
              Send
            </UButton>
          </div>
        </template>
      </AppHeroCard>

      <!-- Own Address Badge -->
      <UAlert
        v-if="isOwnAddress"
        color="info"
        icon="i-lucide-user"
        title="Your Address"
        description="This address belongs to your wallet."
      />

      <!-- Address -->
      <AppCard title="Address" icon="i-lucide-hash">
        <div class="font-mono text-sm break-all">{{ address }}</div>
      </AppCard>

      <!-- Balance -->
      <div class="grid gap-4 md:grid-cols-3">
        <AppStatCard
          label="Balance"
          :value="`${(addressInfo.balance / 1e6).toFixed(6)} XPI`"
          icon="i-lucide-coins"
          mono
        />
        <AppStatCard
          label="Total Received"
          :value="`${(addressInfo.totalReceived / 1e6).toFixed(6)} XPI`"
          icon="i-lucide-arrow-down-left"
          mono
        />
        <AppStatCard
          label="Total Sent"
          :value="`${(addressInfo.totalSent / 1e6).toFixed(6)} XPI`"
          icon="i-lucide-arrow-up-right"
          mono
        />
      </div>

      <!-- Transactions -->
      <AppCard
        :title="`Transactions (${transactions.length})`"
        icon="i-lucide-list"
      >
        <div
          v-if="transactions.length > 0"
          class="divide-y divide-gray-200 dark:divide-gray-700"
        >
          <ExplorerTxItem
            v-for="tx in transactions"
            :key="tx.txid"
            :transaction="tx"
            :highlight-address="address"
          />
        </div>
        <AppEmptyState
          v-else
          icon="i-lucide-inbox"
          title="No transactions"
          description="This address has no transaction history"
        />
      </AppCard>
    </template>
  </div>
</template>
```

---

## 6. Implementation Checklist

### Pages

- [ ] Create `pages/explore/index.vue` (hub)
- [ ] Create `pages/explore/explorer/index.vue`
- [ ] Create `pages/explore/explorer/block/[hash].vue`
- [ ] Create `pages/explore/explorer/tx/[txid].vue`
- [ ] Create `pages/explore/explorer/address/[address].vue`
- [ ] Create `pages/explore/explorer/mempool.vue` (optional)

### Components

- [ ] Create/update `components/explorer/ExplorerTxItem.vue`
- [ ] Create `components/explorer/ExplorerSearch.vue`
- [ ] Update existing explorer components

### Composables

- [ ] Update `useExplorerApi` with all needed methods

### Features

- [ ] Universal search
- [ ] Block detail with navigation
- [ ] Transaction detail with raw view
- [ ] Address detail with balance
- [ ] Contact integration
- [ ] Share functionality
- [ ] Copy functionality

### Testing

- [ ] Test search by txid
- [ ] Test search by address
- [ ] Test search by block height
- [ ] Test block navigation
- [ ] Test raw transaction view
- [ ] Test contact integration

---

## Next Phase

Once this phase is complete, proceed to [08_SOCIAL_VOTING.md](./08_SOCIAL_VOTING.md) to implement the social/RANK voting system.
