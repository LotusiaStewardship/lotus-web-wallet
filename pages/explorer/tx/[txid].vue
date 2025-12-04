<script setup lang="ts">
import type { ExplorerTx } from '~/composables/useExplorerApi'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Transaction Details',
})

const route = useRoute()
const walletStore = useWalletStore()
const { fetchTransaction, getSentimentInfo, formatPlatformName } = useExplorerApi()
const { formatTimestamp, truncateTxid } = useExplorerFormat()
const { formatXPI } = useLotusUnits()
const { copy } = useClipboard()

// State
const tx = ref<ExplorerTx | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Get txid from route
const txid = computed(() => route.params.txid as string)

// Fetch transaction data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await fetchTransaction(txid.value)
    if (data) {
      tx.value = data
    } else {
      error.value = 'Transaction not found'
    }
  } catch (e) {
    error.value = 'Failed to fetch transaction'
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Watch for route changes
watch(txid, () => {
  fetchData()
})

// Computed values
const totalInputValue = computed(() => {
  if (!tx.value) return '0'
  return tx.value.inputs.reduce((sum, input) => sum + BigInt(input.value), 0n).toString()
})

const totalOutputValue = computed(() => {
  if (!tx.value) return '0'
  return tx.value.outputs.reduce((sum, output) => sum + BigInt(output.value), 0n).toString()
})

const fee = computed(() => {
  if (!tx.value || tx.value.isCoinbase) return '0'
  const inputVal = BigInt(totalInputValue.value)
  const outputVal = BigInt(totalOutputValue.value)
  return (inputVal - outputVal).toString()
})

// Find RANK outputs
const rankOutputs = computed(() => {
  if (!tx.value) return []
  return tx.value.outputs.filter(o => o.rankOutput)
})

// Transaction type
const txType = computed(() => {
  if (!tx.value) return 'unknown'
  if (tx.value.isCoinbase) return 'coinbase'
  if (rankOutputs.value.length > 0) return 'rank'
  if (Number(tx.value.sumBurnedSats) > 0) return 'burn'
  return 'transfer'
})

// Type display info
const typeInfo = computed(() => {
  switch (txType.value) {
    case 'coinbase':
      return { icon: 'i-lucide-pickaxe', label: 'Mining Reward', color: 'success' }
    case 'rank':
      return { icon: 'i-lucide-thumbs-up', label: 'RANK Vote', color: 'info' }
    case 'burn':
      return { icon: 'i-lucide-flame', label: 'Burn', color: 'warning' }
    default:
      return { icon: 'i-lucide-arrow-right-left', label: 'Transfer', color: 'primary' }
  }
})

// Check if user is involved in this tx
const isUserInvolved = computed(() => {
  if (!tx.value || !walletStore.address) return false
  const userAddr = walletStore.address.toLowerCase()
  const inInputs = tx.value.inputs.some(i => i.address?.toLowerCase() === userAddr)
  const inOutputs = tx.value.outputs.some(o => o.address?.toLowerCase() === userAddr)
  return inInputs || inOutputs
})

// External post URL for RANK
const getExternalPostUrl = (platform: string, profileId: string, postId?: string) => {
  const config = PlatformURL[platform as keyof typeof PlatformURL]
  if (config && postId) {
    return config.post(profileId, postId)
  }
  return null
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back link -->
    <NuxtLink to="/explorer" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Explorer
    </NuxtLink>

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

    <template v-else-if="tx">
      <!-- Transaction Header -->
      <UCard>
        <div class="text-center py-6">
          <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            :class="`bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/20`">
            <UIcon :name="typeInfo.icon" :class="`w-8 h-8 text-${typeInfo.color}-500`" />
          </div>
          <h1 class="text-xl font-bold mb-2">{{ typeInfo.label }}</h1>

          <!-- Status badges -->
          <div class="flex items-center justify-center gap-2 mb-4">
            <UBadge v-if="tx.confirmations > 0" color="success" variant="subtle" size="sm">
              {{ tx.confirmations }} confirmations
            </UBadge>
            <UBadge v-else color="warning" variant="subtle" size="sm">
              Unconfirmed
            </UBadge>
            <UBadge v-if="isUserInvolved" color="primary" variant="subtle" size="sm">
              <UIcon name="i-lucide-wallet" class="w-3 h-3 mr-1" />
              Your Transaction
            </UBadge>
          </div>

          <!-- Txid (copyable) -->
          <button class="font-mono text-xs text-muted hover:text-primary break-all max-w-full px-4"
            @click="copy(tx.txid, 'Transaction ID copied')">
            {{ tx.txid }}
          </button>
        </div>
      </UCard>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-3">
        <UCard class="text-center py-3">
          <div class="text-xl font-bold font-mono">{{ formatXPI(fee) }}</div>
          <div class="text-xs text-muted">Fee (XPI)</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ tx.inputs.length }} / {{ tx.outputs.length }}</div>
          <div class="text-xs text-muted">In / Out</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ tx.size }}</div>
          <div class="text-xs text-muted">Bytes</div>
        </UCard>
      </div>

      <!-- Block Info -->
      <UCard v-if="tx.block">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
            <span class="text-muted text-sm">Block</span>
          </div>
          <NuxtLink :to="`/explorer/block/${tx.block.height}`" class="font-mono text-primary hover:underline">
            #{{ tx.block.height.toLocaleString() }}
          </NuxtLink>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-muted text-sm">Time</span>
          <span class="text-sm">{{ formatTimestamp(tx.block.timestamp) }}</span>
        </div>
      </UCard>

      <!-- First Seen (unconfirmed) -->
      <UCard v-else>
        <div class="flex items-center justify-between">
          <span class="text-muted text-sm">First Seen</span>
          <span class="text-sm">{{ formatTimestamp(tx.timeFirstSeen) }}</span>
        </div>
      </UCard>

      <!-- RANK Vote Details -->
      <UCard v-if="rankOutputs.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-thumbs-up" class="w-5 h-5 text-info-500" />
            <span class="font-semibold">Vote Details</span>
          </div>
        </template>
        <div v-for="(output, idx) in rankOutputs" :key="idx" class="py-2">
          <div v-if="output.rankOutput" class="flex items-center gap-3">
            <UIcon :name="PlatformIcon[output.rankOutput.platform] || 'i-lucide-user'" class="w-6 h-6 text-muted" />
            <div class="flex-1">
              <NuxtLink :to="`/social/${output.rankOutput.platform}/${output.rankOutput.profileId}`"
                class="font-medium text-primary hover:underline">
                @{{ output.rankOutput.profileId }}
              </NuxtLink>
              <div class="text-xs text-muted">{{ formatPlatformName(output.rankOutput.platform) }}</div>
            </div>
            <UBadge :color="getSentimentInfo(output.rankOutput.sentiment).color" variant="subtle" size="sm">
              <UIcon :name="getSentimentInfo(output.rankOutput.sentiment).icon" class="w-3 h-3 mr-1" />
              {{ getSentimentInfo(output.rankOutput.sentiment).label }}
            </UBadge>
            <span class="font-mono text-sm">{{ formatXPI(output.value) }} XPI</span>
          </div>
          <div v-if="output.rankOutput?.postId" class="mt-2 ml-9">
            <NuxtLink
              v-if="getExternalPostUrl(output.rankOutput.platform, output.rankOutput.profileId, output.rankOutput.postId)"
              :to="getExternalPostUrl(output.rankOutput.platform, output.rankOutput.profileId, output.rankOutput.postId)!"
              target="_blank" external class="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View Post
              <UIcon name="i-lucide-external-link" class="w-3 h-3" />
            </NuxtLink>
          </div>
        </div>
      </UCard>

      <!-- Inputs -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-log-in" class="w-5 h-5 text-error-500" />
              <span class="font-semibold">Inputs</span>
              <UBadge color="neutral" variant="subtle" size="sm">{{ tx.inputs.length }}</UBadge>
            </div>
            <span class="font-mono text-sm text-muted">{{ formatXPI(totalInputValue) }} XPI</span>
          </div>
        </template>
        <div class="divide-y divide-default">
          <div v-for="(input, idx) in tx.inputs" :key="idx" class="flex items-center gap-3 py-3">
            <div
              class="w-8 h-8 rounded-full bg-error-100 dark:bg-error-900/20 flex items-center justify-center shrink-0">
              <span class="text-xs font-mono text-error-500">{{ idx }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <ExplorerAddressDisplay v-if="input.address" :address="input.address" size="sm" />
              <span v-else class="text-muted text-sm">Coinbase (new coins)</span>
              <div v-if="!tx.isCoinbase && input.prevOut" class="text-xs text-muted mt-0.5">
                <NuxtLink :to="`/explorer/tx/${input.prevOut.txid}`" class="hover:text-primary font-mono">
                  {{ truncateTxid(input.prevOut.txid, 8, 4) }}:{{ input.prevOut.outIdx }}
                </NuxtLink>
              </div>
            </div>
            <div class="font-mono text-sm shrink-0">{{ formatXPI(input.value) }}</div>
          </div>
        </div>
      </UCard>

      <!-- Outputs -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-log-out" class="w-5 h-5 text-success-500" />
              <span class="font-semibold">Outputs</span>
              <UBadge color="neutral" variant="subtle" size="sm">{{ tx.outputs.length }}</UBadge>
            </div>
            <span class="font-mono text-sm text-muted">{{ formatXPI(totalOutputValue) }} XPI</span>
          </div>
        </template>
        <div class="divide-y divide-default">
          <div v-for="(output, idx) in tx.outputs" :key="idx" class="flex items-center gap-3 py-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              :class="output.rankOutput ? 'bg-info-100 dark:bg-info-900/20' : output.address ? 'bg-success-100 dark:bg-success-900/20' : 'bg-warning-100 dark:bg-warning-900/20'">
              <UIcon v-if="output.rankOutput" name="i-lucide-thumbs-up" class="w-4 h-4 text-info-500" />
              <UIcon v-else-if="!output.address" name="i-lucide-flame" class="w-4 h-4 text-warning-500" />
              <span v-else class="text-xs font-mono text-success-500">{{ idx }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <ExplorerAddressDisplay v-if="output.address" :address="output.address" size="sm" />
              <div v-else-if="output.rankOutput" class="flex items-center gap-2">
                <UBadge :color="getSentimentInfo(output.rankOutput.sentiment).color" variant="subtle" size="sm">
                  RANK
                </UBadge>
                <NuxtLink :to="`/social/${output.rankOutput.platform}/${output.rankOutput.profileId}`"
                  class="text-sm text-primary hover:underline">
                  @{{ output.rankOutput.profileId }}
                </NuxtLink>
              </div>
              <span v-else class="text-muted text-sm italic">OP_RETURN (burned)</span>
              <div v-if="output.spentBy" class="text-xs text-muted mt-0.5">
                Spent →
                <NuxtLink :to="`/explorer/tx/${output.spentBy.txid}`" class="hover:text-primary font-mono">
                  {{ truncateTxid(output.spentBy.txid, 8, 4) }}
                </NuxtLink>
              </div>
            </div>
            <div class="font-mono text-sm shrink-0"
              :class="{ 'text-warning-500': !output.address && Number(output.value) > 0 }">
              {{ formatXPI(output.value) }}
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
