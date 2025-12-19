<script setup lang="ts">
/**
 * Explorer Page
 *
 * Browse blocks, transactions, and addresses.
 */
import type { ChronikBlockInfo } from '~/composables/useExplorerApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Explorer',
})

const walletStore = useWalletStore()
const explorerApi = useExplorerApi()
const { copy } = useClipboard()

// Search
const searchQuery = ref('')

function handleSearch(query: string) {
  if (!query) return

  const trimmed = query.trim()

  // Detect type and navigate
  if (trimmed.startsWith('lotus_') || trimmed.startsWith('lotusT')) {
    navigateTo(`/explore/explorer/address/${trimmed}`)
  } else if (trimmed.length === 64) {
    // Could be txid or block hash
    navigateTo(`/explore/explorer/tx/${trimmed}`)
  } else if (/^\d+$/.test(trimmed)) {
    // Block height
    navigateTo(`/explore/explorer/block/${trimmed}`)
  }
}

// Recent blocks
const recentBlocks = ref<ChronikBlockInfo[]>([])
const loadingBlocks = ref(true)

// Mempool (simulated - would need real mempool API)
const mempoolTxs = ref<Array<{ txid: string; timestamp?: number }>>([])
const loadingMempool = ref(false)
const autoRefresh = ref(false)
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Fetch recent blocks
async function fetchRecentBlocks() {
  loadingBlocks.value = true
  try {
    const result = await explorerApi.fetchBlocks(1, 5)
    if (result) {
      recentBlocks.value = result.blocks
    }
  } catch (e) {
    console.error('Failed to fetch recent blocks:', e)
  } finally {
    loadingBlocks.value = false
  }
}

// Toggle auto-refresh for mempool
function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    refreshInterval = setInterval(() => {
      // Would fetch mempool here
    }, 10000)
  } else if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

onMounted(() => {
  fetchRecentBlocks()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Copy address
function copyAddress() {
  if (walletStore.address) {
    copy(walletStore.address, 'Address')
  }
}
</script>

<template>
  <div class="space-y-6">
    <UiAppHeroCard icon="i-lucide-blocks" title="Explorer" subtitle="Browse the Lotus blockchain" />

    <!-- Search -->
    <UiAppCard>
      <ExplorerSearchBar v-model="searchQuery" @search="handleSearch" />
    </UiAppCard>

    <!-- Network Stats -->
    <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
      <ExplorerStatCard :value="walletStore.tipHeight.toLocaleString()" label="Block Height" icon="i-lucide-box" mono />
      <ExplorerStatCard :value="walletStore.connected ? 'Connected' : 'Disconnected'" label="Network Status"
        :icon="walletStore.connected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'" />
      <ExplorerStatCard :value="walletStore.utxos.size.toString()" label="Your UTXOs" icon="i-lucide-coins" mono />
      <ExplorerStatCard :value="walletStore.formattedBalance" label="Your Balance" icon="i-lucide-wallet" mono />
    </div>

    <!-- Mempool Section -->
    <ExplorerMempoolCard :transactions="mempoolTxs" :total-count="mempoolTxs.length" :loading="loadingMempool" />

    <!-- Recent Blocks -->
    <ExplorerRecentBlocksCard :blocks="recentBlocks" :loading="loadingBlocks" />

    <!-- Quick Links -->
    <div class="grid gap-4 md:grid-cols-2">
      <UiAppCard title="Your Transactions" icon="i-lucide-history">
        <div class="text-center py-4">
          <p class="text-muted mb-3">View your transaction history</p>
          <UButton color="primary" variant="soft" to="/transact/history">
            View History
          </UButton>
        </div>
      </UiAppCard>

      <UiAppCard title="Social / RANK" icon="i-lucide-thumbs-up">
        <div class="text-center py-4">
          <p class="text-muted mb-3">Vote on social profiles with RANK</p>
          <UButton color="primary" variant="soft" to="/explore/social">
            Browse Profiles
          </UButton>
        </div>
      </UiAppCard>
    </div>

    <!-- Your Address -->
    <UiAppCard title="Your Address" icon="i-lucide-wallet">
      <div class="flex items-center gap-3">
        <code class="flex-1 text-sm font-mono break-all bg-muted/30 p-3 rounded-lg">
      {{ walletStore.address || 'Loading...' }}
    </code>
        <UButton color="neutral" variant="ghost" icon="i-lucide-copy" @click="copyAddress" />
        <UButton v-if="walletStore.address" color="primary" variant="soft"
          :to="`/explore/explorer/address/${walletStore.address}`">
          View
        </UButton>
      </div>
    </UiAppCard>
  </div>
</template>
