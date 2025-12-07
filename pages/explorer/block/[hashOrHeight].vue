<script setup lang="ts">
import type { ExplorerBlock } from '~/composables/useExplorerApi'

definePageMeta({
  title: 'Block Details',
})

const route = useRoute()
const { fetchBlock } = useExplorerApi()
const { formatTimestamp, truncateBlockHash, toMinifiedNumber } = useExplorerFormat()
const { formatXPI } = useLotusUnits()
const { copy } = useClipboard()

// State
const block = ref<ExplorerBlock | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Get hash or height from route
const hashOrHeight = computed(() => route.params.hashOrHeight as string)

// Fetch block data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await fetchBlock(hashOrHeight.value)
    if (data) {
      block.value = data
    } else {
      error.value = 'Block not found'
    }
  } catch (e) {
    error.value = 'Failed to fetch block'
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Watch for route changes
watch(hashOrHeight, () => {
  fetchData()
})

// Block info cards
const blockInfoCards = computed(() => {
  if (!block.value) return []
  const info = block.value.blockInfo
  return [
    { label: 'Height', value: info.height.toLocaleString(), icon: 'i-lucide-hash' },
    { label: 'Timestamp', value: formatTimestamp(info.timestamp), icon: 'i-lucide-clock' },
    { label: 'Transactions', value: info.numTxs, icon: 'i-lucide-file-text' },
    { label: 'Size', value: toMinifiedNumber('blocksize', info.blockSize), icon: 'i-lucide-hard-drive' },
    { label: 'Inputs', value: info.numInputs, icon: 'i-lucide-log-in' },
    { label: 'Outputs', value: info.numOutputs, icon: 'i-lucide-log-out' },
  ]
})

// Navigation to adjacent blocks
const prevBlockHeight = computed(() => {
  if (!block.value) return null
  const height = block.value.blockInfo.height
  return height > 0 ? height - 1 : null
})

const nextBlockHeight = computed(() => {
  if (!block.value) return null
  return block.value.blockInfo.height + 1
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back link with navigation -->
    <div class="flex items-center justify-between">
      <NuxtLink to="/explorer/blocks" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Blocks
      </NuxtLink>
      <div v-if="block" class="flex items-center gap-1">
        <NuxtLink v-if="prevBlockHeight !== null" :to="`/explorer/block/${prevBlockHeight}`">
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left" />
        </NuxtLink>
        <NuxtLink :to="`/explorer/block/${nextBlockHeight}`">
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right" />
        </NuxtLink>
      </div>
    </div>

    <!-- Error State -->
    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error">
      <template #actions>
        <UButton color="error" variant="soft" size="xs" @click="fetchData">Retry</UButton>
      </template>
    </UAlert>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <template v-else-if="block">
      <!-- Block Header (like Balance Display) -->
      <UCard>
        <div class="text-center py-6">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-box" class="w-8 h-8 text-primary" />
          </div>
          <h1 class="text-3xl font-bold font-mono mb-2">#{{ block.blockInfo.height.toLocaleString() }}</h1>
          <p class="text-muted text-sm mb-4">{{ formatTimestamp(block.blockInfo.timestamp) }}</p>

          <!-- Hash (copyable) -->
          <button class="font-mono text-xs text-muted hover:text-primary break-all max-w-full px-4"
            @click="copy(block.blockInfo.hash, 'Block hash copied')">
            {{ block.blockInfo.hash }}
          </button>
        </div>
      </UCard>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-3">
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ block.blockInfo.numTxs }}</div>
          <div class="text-xs text-muted">Transactions</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ toMinifiedNumber('blocksize', block.blockInfo.blockSize) }}</div>
          <div class="text-xs text-muted">Size</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold" :class="Number(block.blockInfo.sumBurnedSats) > 0 ? 'text-warning-500' : ''">
            {{ Number(block.blockInfo.sumBurnedSats) > 0 ? formatXPI(block.blockInfo.sumBurnedSats) : '0' }}
          </div>
          <div class="text-xs text-muted">Burned</div>
        </UCard>
      </div>

      <!-- Financial Summary -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-coins" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Block Rewards</span>
          </div>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-muted">Block Subsidy</span>
            <span class="font-mono text-success-500">
              <ExplorerAmountXPI :sats="block.blockInfo.sumCoinbaseOutputSats" />
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">Total Output</span>
            <span class="font-mono">
              <ExplorerAmountXPI :sats="block.blockInfo.sumNormalOutputSats" />
            </span>
          </div>
          <div v-if="block.minedBy" class="flex items-center justify-between">
            <span class="text-muted">Miner</span>
            <div class="flex items-right gap-2">
              <ExplorerAddressDisplay :link-to-explorer="true" :address="block.minedBy" size="sm"
                :show-add-contact="true" />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Transactions -->
      <UCard v-if="block.txs && block.txs.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Transactions</span>
            <UBadge color="neutral" variant="subtle" size="sm">{{ block.txs.length }}</UBadge>
          </div>
        </template>
        <div class="divide-y divide-default">
          <ExplorerTxItem v-for="tx in block.txs" :key="tx.txid" :tx="tx" :show-block-link="false" />
        </div>
      </UCard>

      <!-- Previous Block -->
      <UCard>
        <div class="flex items-center justify-between">
          <span class="text-muted text-sm">Previous Block</span>
          <NuxtLink :to="`/explorer/block/${block.blockInfo.prevHash}`"
            class="font-mono text-xs text-primary hover:underline truncate max-w-[200px]">
            {{ block.blockInfo.prevHash.slice(0, 16) }}...
          </NuxtLink>
        </div>
      </UCard>
    </template>
  </div>
</template>
