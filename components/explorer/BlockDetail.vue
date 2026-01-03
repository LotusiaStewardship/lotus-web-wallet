<script setup lang="ts">
/**
 * Block Detail Component
 *
 * Displays detailed block information including transactions,
 * miner info, and navigation between blocks.
 */
import type { ExplorerBlock } from '~/composables/useExplorerApi'

const props = defineProps<{
  height: number
}>()

const explorerApi = useExplorerApi()
const toast = useToast()

const loading = ref(true)
const error = ref(false)
const block = ref<ExplorerBlock | null>(null)

onMounted(async () => {
  await fetchBlock()
})

watch(() => props.height, fetchBlock)

async function fetchBlock() {
  loading.value = true
  error.value = false

  try {
    const result = await explorerApi.fetchBlock(props.height.toString())
    if (result) {
      block.value = result
    } else {
      error.value = true
    }
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function copyHash() {
  if (block.value) {
    navigator.clipboard.writeText(block.value.blockInfo.hash)
    toast.add({ title: 'Copied!', color: 'success' })
  }
}

function formatDate(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  return new Date(ts * 1000).toLocaleString()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return `${str.slice(0, len / 2)}...${str.slice(-len / 2)}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 mx-auto text-error mb-4" />
      <h2 class="text-lg font-medium">Block Not Found</h2>
      <p class="text-gray-500 text-sm">Block {{ height }} could not be found.</p>
    </div>

    <!-- Content -->
    <template v-else-if="block">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 class="text-xl font-bold font-mono">
            Block {{ height.toLocaleString() }}
          </h2>
          <p class="text-sm text-gray-500">{{ formatDate(block.blockInfo.timestamp) }}</p>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex gap-2">
        <UButton v-if="height > 0" variant="outline" icon="i-lucide-chevron-left"
          @click="navigateTo(`/explore/block/${height - 1}`)">
          Previous
        </UButton>
        <UButton variant="outline" trailing-icon="i-lucide-chevron-right"
          @click="navigateTo(`/explore/block/${height + 1}`)">
          Next
        </UButton>
      </div>

      <!-- Block Hash -->
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-xs text-gray-500 mb-1">Block Hash</p>
        <div class="flex items-center gap-2">
          <code class="text-sm font-mono break-all flex-1">{{ block.blockInfo.hash }}</code>
          <UButton variant="ghost" size="xs" icon="i-lucide-copy" @click="copyHash" />
        </div>
      </div>

      <!-- Miner Info -->
      <div v-if="block.minedBy" class="p-4 rounded-xl bg-success/5 border border-success/20">
        <p class="text-xs text-gray-500 mb-1">Mined By</p>
        <NuxtLink :to="`/explore/address/${block.minedBy}`"
          class="text-sm font-mono text-primary hover:underline break-all">
          {{ block.minedBy }}
        </NuxtLink>
      </div>

      <!-- Details -->
      <div class="space-y-3">
        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Transactions</span>
          <span class="font-medium">{{ block.txs.length }}</span>
        </div>

        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Size</span>
          <span>{{ formatBytes(block.blockInfo.nBits || 0) }}</span>
        </div>

        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Height</span>
          <span class="font-mono">{{ block.blockInfo.height.toLocaleString() }}</span>
        </div>

        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Timestamp</span>
          <span class="font-mono">{{ block.blockInfo.timestamp }}</span>
        </div>
      </div>

      <!-- Transactions -->
      <div class="space-y-3">
        <h3 class="font-semibold">Transactions ({{ block.txs.length }})</h3>

        <div class="space-y-2">
          <NuxtLink v-for="tx in block.txs.slice(0, 20)" :key="tx.txid" :to="`/explore/tx/${tx.txid}`"
            class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary/30 transition-colors">
            <div class="flex items-center gap-2">
              <UIcon :name="tx.isCoinbase ? 'i-lucide-pickaxe' : 'i-lucide-arrow-right-left'"
                :class="tx.isCoinbase ? 'text-success' : 'text-gray-500'" class="w-4 h-4" />
              <code class="text-sm font-mono">{{ truncate(tx.txid, 20) }}</code>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400" />
          </NuxtLink>
        </div>

        <p v-if="block.txs.length > 20" class="text-sm text-gray-500 text-center">
          Showing 20 of {{ block.txs.length }} transactions
        </p>
      </div>
    </template>
  </div>
</template>
