<script setup lang="ts">
/**
 * Block Detail Page
 *
 * Display detailed information about a block.
 */
import type { ExplorerBlock } from '~/composables/useExplorerApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Block',
})

const route = useRoute()
const hashOrHeight = computed(() => route.params.hashOrHeight as string)

// Determine if the param is a hash (64 hex chars) or height (numeric)
const isHash = computed(() => /^[a-fA-F0-9]{64}$/.test(hashOrHeight.value))
const heightNum = computed(() => {
  if (isHash.value) return block.value?.blockInfo?.height ?? -1
  return parseInt(hashOrHeight.value, 10)
})

const explorerApi = useExplorerApi()
const walletStore = useWalletStore()
const { copy } = useClipboard()
const { formatXPI } = useAmount()
const { timeAgo, formatDateTime } = useTime()
const { share, canShare } = useShare()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const block = ref<ExplorerBlock | null>(null)

// Fetch block data
async function fetchBlock() {
  loading.value = true
  error.value = null
  try {
    const result = await explorerApi.fetchBlock(hashOrHeight.value)
    if (result) {
      block.value = result
    } else {
      error.value = 'Block not found'
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load block'
  } finally {
    loading.value = false
  }
}

onMounted(fetchBlock)

// Watch for route changes
watch(hashOrHeight, fetchBlock)

// Navigation helpers
const canGoPrev = computed(() => heightNum.value > 0)
const canGoNext = computed(() => heightNum.value < walletStore.tipHeight)

function goToPrev() {
  if (canGoPrev.value) {
    navigateTo(`/explore/explorer/block/${heightNum.value - 1}`)
  }
}

function goToNext() {
  if (canGoNext.value) {
    navigateTo(`/explore/explorer/block/${heightNum.value + 1}`)
  }
}

// Jump to height
const jumpHeight = ref('')

function jumpToBlock() {
  const h = parseInt(jumpHeight.value, 10)
  if (!isNaN(h) && h >= 0) {
    navigateTo(`/explore/explorer/block/${h}`)
    jumpHeight.value = ''
  }
}

// Block stats
const totalBurned = computed(() => {
  if (!block.value?.txs) return 0n
  return block.value.txs.reduce(
    (sum, tx) => sum + BigInt((tx as any).sumBurnedSats || '0'),
    0n,
  )
})

const totalOutput = computed(() => {
  if (!block.value?.txs) return 0n
  return block.value.txs.reduce((sum, tx) => {
    const txOutput = tx.outputs.reduce(
      (s, o) => s + BigInt(o.value || '0'),
      0n,
    )
    return sum + txOutput
  }, 0n)
})

// Copy and share functions
function copyBlockHash() {
  if (block.value?.blockInfo?.hash) {
    copy(block.value.blockInfo.hash, 'Block Hash')
  }
}

function copyBlockHeight() {
  copy(String(heightNum.value), 'Block Height')
}

function shareBlock() {
  share({
    title: `Lotus Block ${heightNum.value.toLocaleString()}`,
    text: `View block ${heightNum.value.toLocaleString()} on Lotus Explorer`,
    url: window.location.href,
  })
}

// Retry on error
function retry() {
  fetchBlock()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button & Navigation -->
    <div class="flex items-center justify-between gap-2">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/explore/explorer">
        Back to Explorer
      </UButton>

      <!-- Block Navigation -->
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-left" :disabled="!canGoPrev"
          @click="goToPrev" />
        <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-right" :disabled="!canGoNext"
          @click="goToNext" />
      </div>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <UiAppCard>
        <div class="flex items-center justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
        </div>
      </UiAppCard>
    </template>

    <!-- Error State -->
    <template v-else-if="error">
      <UAlert color="error" variant="subtle" icon="i-lucide-alert-circle" :title="error">
        <template #actions>
          <UButton color="error" variant="soft" size="sm" @click="retry">
            Retry
          </UButton>
        </template>
      </UAlert>
    </template>

    <!-- Block Content -->
    <template v-else-if="block">
      <!-- Summary Card -->
      <UiAppCard>
        <div class="flex items-start gap-4">
          <!-- Icon -->
          <div
            class="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-lucide-box" class="w-7 h-7 text-primary" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-2xl font-bold font-mono">{{ heightNum.toLocaleString() }}</h2>
              <UBadge color="success" variant="subtle">
                <UIcon name="i-lucide-check" class="w-3 h-3 mr-1" />
                Confirmed
              </UBadge>
            </div>

            <div class="mt-2 text-sm text-muted">
              <p v-if="block.blockInfo?.timestamp">
                {{ formatDateTime(Number(block.blockInfo.timestamp)) }}
                <span class="ml-1">({{ timeAgo(Number(block.blockInfo.timestamp)) }})</span>
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <UButton color="neutral" variant="ghost" icon="i-lucide-copy" @click="copyBlockHeight" />
            <UButton v-if="canShare" color="neutral" variant="ghost" icon="i-lucide-share-2" @click="shareBlock" />
          </div>
        </div>

        <!-- Block Hash -->
        <div v-if="block.blockInfo?.hash" class="mt-4 p-3 bg-muted/30 rounded-lg">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-muted mb-1">Block Hash</p>
              <code class="text-sm font-mono break-all">{{ block.blockInfo.hash }}</code>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-copy" size="sm" @click="copyBlockHash" />
          </div>
        </div>
      </UiAppCard>

      <!-- Stats Grid -->
      <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
        <ExplorerStatCard :value="block.txs?.length?.toString() || '0'" label="Transactions" icon="i-lucide-list"
          mono />
        <ExplorerStatCard :value="formatXPI(totalBurned)" label="Total Burned" icon="i-lucide-flame" mono />
        <ExplorerStatCard v-if="block.blockInfo?.nBits"
          :value="(parseInt(String(block.blockInfo.nBits), 16) / 1e9).toFixed(2) + ' G'" label="Difficulty"
          icon="i-lucide-gauge" mono />
        <ExplorerStatCard v-if="block.blockInfo?.numTxs" :value="block.blockInfo.numTxs.toString()" label="TX Count"
          icon="i-lucide-hash" mono />
      </div>

      <!-- Miner Info -->
      <UiAppCard v-if="block.minedBy" title="Miner" icon="i-lucide-pickaxe">
        <div class="flex items-center gap-3">
          <CommonAddressDisplay :address="block.minedBy" link-to-explorer truncate show-add-to-contacts />
        </div>
      </UiAppCard>

      <!-- Jump to Block -->
      <UiAppCard title="Jump to Block" icon="i-lucide-navigation">
        <form @submit.prevent="jumpToBlock" class="flex gap-2">
          <UInput v-model="jumpHeight" type="number" placeholder="Enter block height..." class="flex-1" />
          <UButton type="submit" color="primary" :disabled="!jumpHeight">
            Go
          </UButton>
        </form>
      </UiAppCard>

      <!-- Transactions -->
      <UiAppCard :title="`Transactions (${block.txs?.length || 0})`" icon="i-lucide-list">
        <div v-if="block.txs?.length" class="divide-y divide-default -mx-4">
          <NuxtLink v-for="tx in block.txs" :key="tx.txid" :to="`/explore/explorer/tx/${tx.txid}`"
            class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
            <!-- Icon -->
            <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="tx.isCoinbase ? 'bg-warning-100 dark:bg-warning-900/30' : 'bg-muted/50'">
              <UIcon :name="tx.isCoinbase ? 'i-lucide-pickaxe' : 'i-lucide-arrow-right-left'"
                :class="tx.isCoinbase ? 'text-warning' : 'text-muted'" class="w-5 h-5" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="font-mono text-sm truncate">
                {{ tx.txid.slice(0, 8) }}...{{ tx.txid.slice(-8) }}
              </p>
              <p class="text-sm text-muted">
                {{ tx.isCoinbase ? 'Coinbase' : `${tx.inputs.length} in → ${tx.outputs.length} out` }}
              </p>
            </div>

            <!-- Burned Amount -->
            <div class="text-right flex-shrink-0">
              <p v-if="BigInt(tx.sumBurnedSats || '0') > 0n" class="text-sm text-warning font-mono">
                -{{ formatXPI(tx.sumBurnedSats) }}
              </p>
              <UBadge v-if="tx.isCoinbase" color="warning" variant="subtle" size="xs">
                Coinbase
              </UBadge>
            </div>

            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted flex-shrink-0" />
          </NuxtLink>
        </div>

        <UiAppEmptyState v-else icon="i-lucide-inbox" title="No transactions"
          description="This block has no transactions" />
      </UiAppCard>
    </template>
  </div>
</template>
