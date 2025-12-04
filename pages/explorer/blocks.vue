<script setup lang="ts">
import type { ChronikBlockInfo } from '~/composables/useExplorerApi'

definePageMeta({
  title: 'Blocks',
})

const { fetchBlocks } = useExplorerApi()
const { formatTimestamp, truncateBlockHash, toMinifiedNumber } = useExplorerFormat()
const { formatXPI } = useLotusUnits()

// State - BlockInfo is the summary type returned by /blocks endpoint
const blocks = ref<ChronikBlockInfo[]>([])
const tipHeight = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(25)
const autoRefresh = ref(true)

// Pagination
const totalPages = computed(() => Math.ceil(tipHeight.value / pageSize.value))

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const data = await fetchBlocks(page.value, pageSize.value)
    if (data) {
      blocks.value = data.blocks
      tipHeight.value = data.tipHeight
    }
    error.value = null
  } catch (e) {
    error.value = 'Failed to fetch blocks'
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Watch page changes
watch([page, pageSize], () => {
  fetchData()
})

// Auto-refresh every 5 seconds (only on first page)
let refreshInterval: ReturnType<typeof setInterval> | null = null

const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = setInterval(() => {
    if (autoRefresh.value && page.value === 1) fetchData()
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

// Page size options
const pageSizeOptions = [10, 25, 50, 100]
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back link -->
    <NuxtLink to="/explorer" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Explorer
    </NuxtLink>

    <!-- Error State -->
    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error" />

    <!-- Blocks List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
            <span class="font-semibold">All Blocks</span>
            <UBadge v-if="tipHeight" color="neutral" variant="subtle" size="xs">
              {{ tipHeight.toLocaleString() }}
            </UBadge>
          </div>
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="loading"
            @click="fetchData" />
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="loading && blocks.length === 0" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <!-- Block List (card-based) -->
      <div v-else class="divide-y divide-default">
        <NuxtLink v-for="block in blocks" :key="block.hash" :to="`/explorer/block/${block.height}`"
          class="flex items-center gap-3 py-3 -mx-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-mono font-medium">#{{ block.height.toLocaleString() }}</div>
            <div class="text-sm text-muted">
              {{ formatTimestamp(block.timestamp) }} · {{ block.numTxs }} txs · {{ toMinifiedNumber('blocksize',
                block.blockSize) }}
            </div>
          </div>
          <div class="text-right shrink-0">
            <div v-if="Number(block.sumBurnedSats) > 0" class="font-mono text-warning-500 text-sm">
              {{ formatXPI(block.sumBurnedSats) }} burned
            </div>
            <div class="text-xs text-muted font-mono">{{ truncateBlockHash(block.hash) }}</div>
          </div>
        </NuxtLink>
      </div>

      <!-- Pagination -->
      <template #footer>
        <div class="flex items-center justify-center gap-2">
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left" :disabled="page <= 1"
            @click="page--" />
          <span class="text-sm text-muted">{{ page }} / {{ totalPages.toLocaleString() }}</span>
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right"
            :disabled="page >= totalPages" @click="page++" />
        </div>
      </template>
    </UCard>
  </div>
</template>
