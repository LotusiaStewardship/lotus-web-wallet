<script setup lang="ts">
/**
 * Explorer Home Component
 *
 * Displays network stats, recent blocks, and mempool overview.
 */
import type { BlockInfo } from 'chronik-client'

const networkStore = useNetworkStore()
const { fetchRecentBlocks } = useExplorerApi()

const loading = ref(true)
const recentBlocks = ref<BlockInfo[]>([])
const tipHeight = ref<number | null>(null)

const network = computed(() =>
  networkStore.isProduction ? 'Mainnet' : 'Testnet',
)

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    // Fetch recent blocks from Explorer API
    const blocksResult = await fetchRecentBlocks()
    if (blocksResult) {
      recentBlocks.value = blocksResult.blocks
      tipHeight.value = blocksResult.tipHeight
    }
  } catch (error) {
    console.error('Failed to fetch explorer data:', error)
  } finally {
    loading.value = false
  }
}

function formatTime(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts * 1000).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Network Stats -->
    <div class="grid grid-cols-2 gap-3">
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-sm text-gray-500">Block Height</p>
        <p class="text-2xl font-bold font-mono">
          {{ tipHeight?.toLocaleString() || '—' }}
        </p>
      </div>
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-sm text-gray-500">Network</p>
        <p class="text-2xl font-bold">{{ network }}</p>
      </div>
    </div>

    <!-- Recent Blocks -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Recent Blocks</h2>

      <div v-if="loading" class="space-y-2">
        <div v-for="i in 5" :key="i" class="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>

      <div v-else-if="recentBlocks.length > 0" class="space-y-2">
        <NuxtLink v-for="block in recentBlocks" :key="block.height" :to="`/explore/block/${block.height}`"
          class="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary/30 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="font-mono font-medium">
                {{ block.height.toLocaleString() }}
              </p>
              <p class="text-xs text-gray-500">{{ block.numTxs }} transactions</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-500">{{ formatTime(block.timestamp) }}</p>
          </div>
        </NuxtLink>
      </div>

      <div v-else class="text-center py-8 text-gray-500">
        <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p class="text-sm">No blocks found</p>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Quick Links</h2>
      <div class="grid grid-cols-2 gap-2">
        <NuxtLink :to="networkStore.config.explorerUrl" target="_blank"
          class="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <UIcon name="i-lucide-external-link" class="w-4 h-4 text-gray-500" />
          <span class="text-sm">Full Explorer</span>
        </NuxtLink>
        <NuxtLink v-if="tipHeight" :to="`/explore/block/${tipHeight}`"
          class="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <UIcon name="i-lucide-box" class="w-4 h-4 text-gray-500" />
          <span class="text-sm">Latest Block</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
