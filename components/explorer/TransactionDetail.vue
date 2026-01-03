<script setup lang="ts">
/**
 * Transaction Detail Component
 *
 * Displays detailed transaction information including inputs, outputs,
 * confirmations, and fee.
 */
import type { ExplorerTx } from '~/composables/useExplorerApi'

const props = defineProps<{
  txid: string
}>()

const explorerApi = useExplorerApi()
const toast = useToast()

const loading = ref(true)
const error = ref<string | null>(null)
const tx = ref<ExplorerTx | null>(null)

onMounted(async () => {
  await fetchTransaction()
})

watch(() => props.txid, fetchTransaction)

async function fetchTransaction() {
  loading.value = true
  error.value = null

  try {
    const result = await explorerApi.fetchTransaction(props.txid)
    if (result) {
      tx.value = result
    } else {
      error.value = 'Transaction not found'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch transaction'
  } finally {
    loading.value = false
  }
}

function copyTxid() {
  navigator.clipboard.writeText(props.txid)
  toast.add({ title: 'Copied!', color: 'success' })
}

function formatDate(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  return new Date(ts * 1000).toLocaleString()
}

function formatXPI(sats: string | number): string {
  const val = typeof sats === 'string' ? parseInt(sats) : sats
  return (val / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

// Calculate total input/output values
const totalInputValue = computed(() => {
  if (!tx.value) return 0
  return tx.value.inputs.reduce((sum, input) => sum + parseInt(input.value || '0'), 0)
})

const totalOutputValue = computed(() => {
  if (!tx.value) return 0
  return tx.value.outputs.reduce((sum, output) => sum + parseInt(output.value || '0'), 0)
})

const fee = computed(() => {
  if (!tx.value || tx.value.isCoinbase) return 0
  return totalInputValue.value - totalOutputValue.value
})
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
      <h2 class="text-lg font-medium">Transaction Not Found</h2>
      <p class="text-gray-500 text-sm">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else-if="tx">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div :class="[
          'w-10 h-10 rounded-full flex items-center justify-center',
          tx.confirmations > 0 ? 'bg-success/10' : 'bg-warning/10',
        ]">
          <UIcon :name="tx.confirmations > 0 ? 'i-lucide-check-circle' : 'i-lucide-clock'"
            :class="tx.confirmations > 0 ? 'text-success' : 'text-warning'" class="w-5 h-5" />
        </div>
        <div>
          <h2 class="font-semibold">
            {{ tx.isCoinbase ? 'Block Reward' : 'Transaction' }}
          </h2>
          <p class="text-sm text-gray-500">
            {{ tx.confirmations > 0 ? `${tx.confirmations} confirmations` : 'Pending' }}
          </p>
        </div>
      </div>

      <!-- TXID -->
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <p class="text-xs text-gray-500 mb-1">Transaction ID</p>
        <div class="flex items-center gap-2">
          <code class="text-sm font-mono break-all flex-1">{{ txid }}</code>
          <UButton variant="ghost" size="xs" icon="i-lucide-copy" @click="copyTxid" />
        </div>
      </div>

      <!-- Details -->
      <div class="space-y-3">
        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Status</span>
          <UBadge :color="tx.confirmations > 0 ? 'success' : 'warning'">
            {{ tx.confirmations > 0 ? 'Confirmed' : 'Pending' }}
          </UBadge>
        </div>

        <div v-if="tx.block" class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Block</span>
          <NuxtLink :to="`/explore/block/${tx.block.height}`" class="text-primary hover:underline font-mono">
            {{ tx.block.height.toLocaleString() }}
          </NuxtLink>
        </div>

        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Time</span>
          <span>{{ formatDate(tx.block?.timestamp || tx.timeFirstSeen) }}</span>
        </div>

        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Size</span>
          <span>{{ tx.size }} bytes</span>
        </div>

        <div v-if="!tx.isCoinbase" class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Fee</span>
          <span class="font-mono">{{ formatXPI(fee) }} XPI</span>
        </div>

        <div v-if="parseInt(tx.sumBurnedSats) > 0"
          class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
          <span class="text-gray-500">Burned</span>
          <span class="font-mono text-warning">{{ formatXPI(tx.sumBurnedSats) }} XPI</span>
        </div>
      </div>

      <!-- Inputs -->
      <div v-if="!tx.isCoinbase" class="space-y-3">
        <h3 class="font-semibold">Inputs ({{ tx.inputs.length }})</h3>
        <div class="space-y-2">
          <div v-for="(input, index) in tx.inputs" :key="index" class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
            <ExplorerAddressDisplay :address="input.address || 'Unknown'" :amount="input.value" />
          </div>
        </div>
      </div>

      <!-- Block Reward indicator -->
      <div v-else class="p-3 rounded-lg bg-success/10 border border-success/20">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pickaxe" class="w-4 h-4 text-success" />
          <span class="text-sm font-medium text-success">Block Reward (New Lotus Created)</span>
        </div>
      </div>

      <!-- Outputs -->
      <div class="space-y-3">
        <h3 class="font-semibold">Outputs ({{ tx.outputs.length }})</h3>
        <div class="space-y-2">
          <div v-for="(output, index) in tx.outputs" :key="index" class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
            <!-- OP_RETURN output -->
            <div v-if="output.outputScript?.startsWith('6a')" class="flex items-center gap-2">
              <UIcon name="i-lucide-flame" class="w-4 h-4 text-warning" />
              <span class="text-sm text-warning">OP_RETURN (Burned)</span>
              <span class="font-mono text-sm ml-auto">{{ formatXPI(output.value) }} XPI</span>
            </div>
            <!-- Regular output -->
            <ExplorerAddressDisplay v-else :address="output.address || 'Unknown Script'" :amount="output.value" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
