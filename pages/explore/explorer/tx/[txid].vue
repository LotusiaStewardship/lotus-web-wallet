<script setup lang="ts">
/**
 * Transaction Detail Page
 *
 * Display detailed information about a transaction.
 */
import type { ExplorerTx } from '~/composables/useExplorerApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Transaction',
})

const route = useRoute()
const txid = computed(() => route.params.txid as string)

const explorerApi = useExplorerApi()
const walletStore = useWalletStore()
const { copy } = useClipboard()
const { timeAgo, formatDateTime } = useTime()
const { formatXPI } = useAmount()
const { truncateAddress } = useAddress()

// Fetch transaction data
const loading = ref(true)
const error = ref<string | null>(null)
const transaction = ref<ExplorerTx | null>(null)
const showRawHex = ref(false)

async function fetchTransaction() {
  loading.value = true
  error.value = null
  try {
    const result = await explorerApi.fetchTransaction(txid.value)
    if (result) {
      transaction.value = result
    } else {
      error.value = 'Transaction not found'
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load transaction'
  } finally {
    loading.value = false
  }
}

onMounted(fetchTransaction)

// Watch for route changes
watch(txid, fetchTransaction)

// Transaction type detection
const txType = computed(() => {
  if (!transaction.value) return 'unknown'
  if (transaction.value.isCoinbase) return 'coinbase'

  // Check for RANK output
  const hasRank = transaction.value.outputs.some(o => o.rankOutput)
  if (hasRank) return 'rank'

  // Check for burn
  const burnedSats = BigInt(transaction.value.sumBurnedSats || '0')
  if (burnedSats > 0n) return 'burn'

  return 'transfer'
})

const typeConfig = computed(() => {
  const configs: Record<string, { icon: string; color: string; label: string }> = {
    coinbase: { icon: 'i-lucide-pickaxe', color: 'warning', label: 'Coinbase' },
    rank: { icon: 'i-lucide-thumbs-up', color: 'primary', label: 'RANK Vote' },
    burn: { icon: 'i-lucide-flame', color: 'error', label: 'Burn' },
    transfer: { icon: 'i-lucide-arrow-right-left', color: 'neutral', label: 'Transfer' },
    unknown: { icon: 'i-lucide-circle-dot', color: 'neutral', label: 'Transaction' },
  }
  return configs[txType.value] || configs.unknown
})

// Confirmation status
const isConfirmed = computed(() => transaction.value?.confirmations && transaction.value.confirmations > 0)
const confirmations = computed(() => transaction.value?.confirmations || 0)

// Total input/output values
const totalInputValue = computed(() => {
  if (!transaction.value) return 0n
  return transaction.value.inputs.reduce((sum, input) => sum + BigInt(input.value || '0'), 0n)
})

const totalOutputValue = computed(() => {
  if (!transaction.value) return 0n
  return transaction.value.outputs.reduce((sum, output) => sum + BigInt(output.value || '0'), 0n)
})

// Fee calculation (inputs - outputs for non-coinbase)
const fee = computed(() => {
  if (!transaction.value || transaction.value.isCoinbase) return 0n
  return totalInputValue.value - totalOutputValue.value
})

// RANK data extraction
const rankData = computed(() => {
  if (!transaction.value) return null
  const rankOutput = transaction.value.outputs.find(o => o.rankOutput)
  return rankOutput?.rankOutput || null
})

// Check if address is user's own
function isOwnAddress(address: string | undefined): boolean {
  if (!address) return false
  return address === walletStore.address
}

// Copy functions
function copyTxid() {
  copy(txid.value, 'Transaction ID')
}

function copyRawHex() {
  // Raw hex would come from a different API call - placeholder for now
  copy(txid.value, 'Transaction ID')
}

// Share functionality
const { share, canShare } = useShare()

function shareTx() {
  share({
    title: `Transaction ${truncateAddress(txid.value, 8, 8)}`,
    text: `View transaction on Lotus Explorer`,
    url: window.location.href,
  })
}

// Retry on error
function retry() {
  fetchTransaction()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <div class="flex items-center gap-2">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/explore/explorer">
        Back to Explorer
      </UButton>
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

    <!-- Transaction Content -->
    <template v-else-if="transaction">
      <!-- Summary Card -->
      <UiAppCard>
        <div class="flex items-start gap-4">
          <!-- Type Icon -->
          <div :class="[
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            `bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30`,
          ]">
            <UIcon :name="typeConfig.icon" :class="['w-6 h-6', `text-${typeConfig.color}`]" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-semibold">{{ typeConfig.label }}</h2>
              <UBadge v-if="isConfirmed" color="success" variant="subtle">
                <UIcon name="i-lucide-check" class="w-3 h-3 mr-1" />
                Confirmed
              </UBadge>
              <UBadge v-else color="warning" variant="subtle">
                <UIcon name="i-lucide-clock" class="w-3 h-3 mr-1" />
                Pending
              </UBadge>
            </div>

            <div class="mt-2 space-y-1 text-sm text-muted">
              <p v-if="transaction.block">
                <span class="font-medium">Block:</span>
                <NuxtLink :to="`/explore/explorer/block/${transaction.block.height}`"
                  class="text-primary hover:underline ml-1">
                  {{ transaction.block.height.toLocaleString() }}
                </NuxtLink>
                <span class="mx-2">•</span>
                <span>{{ confirmations }} confirmation{{ confirmations !== 1 ? 's' : '' }}</span>
              </p>
              <p>
                <span class="font-medium">Time:</span>
                <span class="ml-1">
                  {{ formatDateTime(Number(transaction.block?.timestamp || transaction.timeFirstSeen)) }}
                </span>
                <span class="text-muted ml-1">
                  ({{ timeAgo(Number(transaction.block?.timestamp || transaction.timeFirstSeen)) }})
                </span>
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <UButton color="neutral" variant="ghost" icon="i-lucide-copy" @click="copyTxid" />
            <UButton v-if="canShare" color="neutral" variant="ghost" icon="i-lucide-share-2" @click="shareTx" />
          </div>
        </div>

        <!-- Transaction ID -->
        <div class="mt-4 p-3 bg-muted/30 rounded-lg">
          <p class="text-xs text-muted mb-1">Transaction ID</p>
          <code class="text-sm font-mono break-all">{{ txid }}</code>
        </div>
      </UiAppCard>

      <!-- RANK Data (if applicable) -->
      <UiAppCard v-if="rankData" title="RANK Vote" icon="i-lucide-thumbs-up">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-sm text-muted">Platform</p>
            <p class="font-medium capitalize">{{ rankData.platform }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Profile</p>
            <NuxtLink :to="`/explore/social/${rankData.platform}/${rankData.profileId}`"
              class="font-medium text-primary hover:underline">
              @{{ rankData.profileId }}
            </NuxtLink>
          </div>
          <div v-if="rankData.postId">
            <p class="text-sm text-muted">Post ID</p>
            <p class="font-mono text-sm">{{ rankData.postId }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Vote Type</p>
            <UBadge
              :color="rankData.sentiment === 'positive' ? 'success' : rankData.sentiment === 'negative' ? 'error' : 'neutral'"
              variant="subtle">
              <UIcon
                :name="rankData.sentiment === 'positive' ? 'i-lucide-thumbs-up' : rankData.sentiment === 'negative' ? 'i-lucide-thumbs-down' : 'i-lucide-minus'"
                class="w-3 h-3 mr-1" />
              {{ rankData.sentiment === 'positive' ? 'Upvote' : rankData.sentiment === 'negative' ? 'Downvote' :
                'Neutral' }}
            </UBadge>
          </div>
        </div>
      </UiAppCard>

      <!-- Inputs -->
      <UiAppCard :title="`Inputs (${transaction.inputs.length})`" icon="i-lucide-log-in">
        <div class="divide-y divide-default -mx-4">
          <div v-for="(input, index) in transaction.inputs" :key="index"
            class="flex items-center justify-between gap-3 px-4 py-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-mono text-muted">{{ index }}</span>
              </div>
              <div class="min-w-0">
                <CommonAddressDisplay v-if="input.address" :address="input.address" link-to-explorer truncate
                  show-add-to-contacts :show-you-badge="false" />
                <span v-else class="text-muted text-sm">Coinbase</span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="font-mono font-medium">{{ formatXPI(input.value || '0') }}</p>
              <UBadge v-if="isOwnAddress(input.address)" color="primary" variant="subtle" size="xs">
                You
              </UBadge>
            </div>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-default flex justify-between text-sm">
          <span class="text-muted">Total Input</span>
          <span class="font-mono font-medium">{{ formatXPI(totalInputValue) }}</span>
        </div>
      </UiAppCard>

      <!-- Outputs -->
      <UiAppCard :title="`Outputs (${transaction.outputs.length})`" icon="i-lucide-log-out">
        <div class="divide-y divide-default -mx-4">
          <div v-for="(output, index) in transaction.outputs" :key="index"
            class="flex items-center justify-between gap-3 px-4 py-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-mono text-muted">{{ index }}</span>
              </div>
              <div class="min-w-0">
                <CommonAddressDisplay v-if="output.address" :address="output.address" link-to-explorer truncate
                  show-add-to-contacts :show-you-badge="false" />
                <span v-else-if="output.rankOutput" class="text-primary text-sm">
                  <UIcon name="i-lucide-thumbs-up" class="w-4 h-4 inline mr-1" />
                  RANK Vote
                </span>
                <span v-else class="text-warning text-sm">
                  <UIcon name="i-lucide-flame" class="w-4 h-4 inline mr-1" />
                  OP_RETURN (Burn)
                </span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="font-mono font-medium" :class="{ 'text-warning': !output.address }">
                {{ formatXPI(output.value || '0') }}
              </p>
              <UBadge v-if="isOwnAddress(output.address)" color="primary" variant="subtle" size="xs">
                You
              </UBadge>
              <UBadge v-if="output.spentBy" color="neutral" variant="subtle" size="xs">
                Spent
              </UBadge>
            </div>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-default space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Total Output</span>
            <span class="font-mono font-medium">{{ formatXPI(totalOutputValue) }}</span>
          </div>
          <div v-if="!transaction.isCoinbase" class="flex justify-between">
            <span class="text-muted">Fee</span>
            <span class="font-mono text-warning">{{ formatXPI(fee) }}</span>
          </div>
          <div v-if="BigInt(transaction.sumBurnedSats || '0') > 0n" class="flex justify-between">
            <span class="text-muted">Total Burned</span>
            <span class="font-mono text-error">{{ formatXPI(transaction.sumBurnedSats) }}</span>
          </div>
        </div>
      </UiAppCard>

      <!-- Raw Data (Collapsible) -->
      <UiAppCard>
        <UButton color="neutral" variant="ghost" block @click="showRawHex = !showRawHex">
          <UIcon :name="showRawHex ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-4 h-4 mr-2" />
          {{ showRawHex ? 'Hide' : 'Show' }} Raw Data
        </UButton>

        <div v-if="showRawHex" class="mt-4">
          <div class="p-3 bg-muted/30 rounded-lg">
            <pre
              class="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{{ JSON.stringify(transaction, null, 2) }}</pre>
          </div>
        </div>
      </UiAppCard>
    </template>
  </div>
</template>
