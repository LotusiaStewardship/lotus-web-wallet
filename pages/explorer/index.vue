<script setup lang="ts">
import type { NetworkOverview, ChronikBlockInfo } from '~/composables/useExplorerApi'

definePageMeta({
  title: 'Explorer',
})

const { fetchNetworkOverview, fetchBlocks } = useExplorerApi()
const { toMinifiedNumber, toMinifiedTime, formatTimestamp, truncateBlockHash } = useExplorerFormat()
const { formatXPI } = useLotusUnits()

// State
const overview = ref<NetworkOverview | null>(null)
const blocks = ref<ChronikBlockInfo[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const autoRefresh = ref(true)

// Fetch data
const fetchData = async () => {
  try {
    const [overviewData, blocksData] = await Promise.all([
      fetchNetworkOverview(),
      fetchBlocks(1, 5),
    ])
    if (overviewData) overview.value = overviewData
    if (blocksData) blocks.value = blocksData.blocks
    error.value = null
  } catch (e) {
    error.value = 'Failed to fetch network data'
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Auto-refresh every 5 seconds
let refreshInterval: ReturnType<typeof setInterval> | null = null

const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = setInterval(() => {
    if (autoRefresh.value) fetchData()
  }, 5000)
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

onMounted(() => {
  fetchData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Computed stats
const networkStats = computed(() => {
  if (!overview.value) return []
  const { mininginfo, peerinfo } = overview.value
  return [
    {
      label: 'Block Height',
      value: mininginfo.blocks.toLocaleString(),
      icon: 'i-lucide-box',
    },
    {
      label: 'Network Hashrate',
      value: toMinifiedNumber('hashrate', mininginfo.networkhashps),
      icon: 'i-lucide-cpu',
    },
    {
      label: 'Difficulty',
      value: mininginfo.difficulty.toFixed(2),
      icon: 'i-lucide-gauge',
    },
    {
      label: 'Connected Peers',
      value: peerinfo.length.toString(),
      icon: 'i-lucide-users',
    },
    {
      label: 'Mempool Txs',
      value: mininginfo.pooledtx.toString(),
      icon: 'i-lucide-layers',
    },
    {
      label: 'Chain',
      value: mininginfo.chain,
      icon: 'i-lucide-link',
    },
  ]
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header Card -->
    <UCard>
      <div class="text-center py-4">
        <UIcon name="i-lucide-blocks" class="w-12 h-12 text-primary mx-auto mb-3" />
        <h1 class="text-2xl font-bold mb-1">Block Explorer</h1>
        <p class="text-muted text-sm">Browse the Lotus blockchain</p>
      </div>
    </UCard>

    <!-- Error State -->
    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error" />

    <!-- Loading State -->
    <div v-if="loading && !overview" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <template v-else>
      <!-- Network Stats (compact grid) -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
              <span class="font-semibold">Network Status</span>
            </div>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="loading"
              @click="fetchData" />
          </div>
        </template>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div v-for="stat in networkStats" :key="stat.label" class="text-center">
            <div class="text-xl font-bold font-mono">{{ stat.value }}</div>
            <div class="text-xs text-muted">{{ stat.label }}</div>
          </div>
        </div>
      </UCard>

      <!-- Latest Blocks (card-based) -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
              <span class="font-semibold">Latest Blocks</span>
            </div>
            <UButton to="/explorer/blocks" color="primary" variant="ghost" size="xs"
              trailing-icon="i-lucide-arrow-right">
              View All
            </UButton>
          </div>
        </template>

        <div class="divide-y divide-default">
          <NuxtLink v-for="block in blocks" :key="block.hash" :to="`/explorer/block/${block.height}`"
            class="flex items-center gap-3 py-3 -mx-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-mono font-medium">#{{ block.height.toLocaleString() }}</div>
              <div class="text-sm text-muted">{{ formatTimestamp(block.timestamp) }} · {{ block.numTxs }} txs</div>
            </div>
            <div class="text-right shrink-0">
              <div v-if="Number(block.sumBurnedSats) > 0" class="font-mono text-warning-500 text-sm">
                {{ formatXPI(block.sumBurnedSats) }} burned
              </div>

            </div>
          </NuxtLink>
        </div>
      </UCard>

      <!-- Peers (simplified) -->
      <UCard v-if="overview?.peerinfo.length">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Connected Peers</span>
            <UBadge color="neutral" variant="subtle" size="sm">{{ overview.peerinfo.length }}</UBadge>
          </div>
        </template>

        <div class="divide-y divide-default">
          <div v-for="peer in overview.peerinfo.slice(0, 5)" :key="peer.id" class="flex items-center gap-3 py-2">
            <div
              class="w-8 h-8 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-server" class="w-4 h-4 text-success-500" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm truncate">{{ peer.addr }}</div>
              <div class="text-xs text-muted">
                <span v-if="peer.geoip">{{ peer.geoip.city }}, {{ peer.geoip.countryCode }}</span>
                <span v-else>Unknown location</span>
              </div>
            </div>
            <UBadge :color="peer.inbound ? 'info' : 'success'" variant="subtle" size="sm">
              {{ peer.inbound ? 'In' : 'Out' }}
            </UBadge>
          </div>
        </div>

        <template v-if="overview.peerinfo.length > 5" #footer>
          <p class="text-center text-sm text-muted">
            + {{ overview.peerinfo.length - 5 }} more peers
          </p>
        </template>
      </UCard>
    </template>
  </div>
</template>
