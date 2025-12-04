<script setup lang="ts">
import type { ExplorerTx } from '~/composables/useExplorerApi'

interface ExplorerTxItemProps {
  tx: ExplorerTx
  compact?: boolean
  showBlockLink?: boolean
}

const props = withDefaults(defineProps<ExplorerTxItemProps>(), {
  compact: false,
  showBlockLink: true,
})

const { truncateTxid, formatTimestamp } = useExplorerFormat()
const { formatXPI } = useLotusUnits()
const { getSentimentInfo } = useExplorerApi()

// Determine transaction type
const txType = computed(() => {
  if (props.tx.isCoinbase) return 'coinbase'

  // Check for RANK outputs
  const hasRankOutput = props.tx.outputs.some(o => o.rankOutput)
  if (hasRankOutput) return 'rank'

  // Check for burn (OP_RETURN with value)
  if (Number(props.tx.sumBurnedSats) > 0) return 'burn'

  return 'transfer'
})

// Type display info
const typeInfo = computed(() => {
  switch (txType.value) {
    case 'coinbase':
      return {
        icon: 'i-lucide-pickaxe',
        label: 'Mining Reward',
        bgClass: 'bg-success-100 dark:bg-success-900/20',
        textClass: 'text-success-500',
      }
    case 'rank':
      return {
        icon: 'i-lucide-thumbs-up',
        label: 'RANK Vote',
        bgClass: 'bg-info-100 dark:bg-info-900/20',
        textClass: 'text-info-500',
      }
    case 'burn':
      return {
        icon: 'i-lucide-flame',
        label: 'Burn',
        bgClass: 'bg-warning-100 dark:bg-warning-900/20',
        textClass: 'text-warning-500',
      }
    default:
      return {
        icon: 'i-lucide-arrow-right-left',
        label: 'Transfer',
        bgClass: 'bg-primary/10',
        textClass: 'text-primary',
      }
  }
})

// Get RANK info if present
const rankOutput = computed(() => {
  return props.tx.outputs.find(o => o.rankOutput)?.rankOutput
})

// Format relative time
const relativeTime = computed(() => {
  const timestamp = props.tx.block?.timestamp || props.tx.timeFirstSeen
  if (!timestamp) return 'Pending'

  const now = Date.now()
  const txTime = Number(timestamp) * 1000
  const diff = now - txTime

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return formatTimestamp(timestamp)
})

// Confirmation status
const confirmationStatus = computed(() => {
  if (!props.tx.block) return { label: 'Pending', color: 'warning' as const }
  const conf = props.tx.confirmations || 1
  if (conf < 6) return { label: `${conf} conf`, color: 'info' as const }
  return { label: 'Confirmed', color: 'success' as const }
})
</script>

<template>
  <NuxtLink :to="`/explorer/tx/${tx.txid}`"
    class="flex items-center gap-3 py-3 -mx-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Icon -->
    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :class="typeInfo.bgClass">
      <UIcon :name="typeInfo.icon" class="w-5 h-5" :class="typeInfo.textClass" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Header row -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-mono text-sm truncate">{{ truncateTxid(tx.txid) }}</span>
        <UBadge v-if="tx.isCoinbase" color="success" variant="subtle" size="sm">Coinbase</UBadge>
        <UBadge v-else-if="rankOutput" color="info" variant="subtle" size="sm">
          <UIcon :name="getSentimentInfo(rankOutput.sentiment).icon" class="w-3 h-3 mr-0.5" />
          RANK
        </UBadge>
      </div>

      <!-- Secondary info -->
      <div class="text-sm text-muted mt-0.5">
        <template v-if="!compact">
          {{ tx.inputs.length }} input{{ tx.inputs.length !== 1 ? 's' : '' }} →
          {{ tx.outputs.length }} output{{ tx.outputs.length !== 1 ? 's' : '' }}
          <span v-if="showBlockLink && tx.block" class="ml-1">
            ·
            <NuxtLink :to="`/explorer/block/${tx.block.height}`" class="hover:text-primary" @click.stop>
              Block #{{ tx.block.height.toLocaleString() }}
            </NuxtLink>
          </span>
        </template>
        <template v-else>
          {{ relativeTime }}
        </template>
      </div>

      <!-- RANK target (if applicable) -->
      <div v-if="rankOutput && !compact" class="text-xs text-muted mt-0.5">
        <NuxtLink :to="`/social/${rankOutput.platform}/${rankOutput.profileId}`" class="text-primary hover:underline"
          @click.stop>
          @{{ rankOutput.profileId }}
        </NuxtLink>
        on {{ rankOutput.platform }}
      </div>
    </div>

    <!-- Right side -->
    <div class="text-right shrink-0">
      <!-- Burned amount or status -->
      <div v-if="Number(tx.sumBurnedSats) > 0" class="font-mono text-warning-500 text-sm">
        {{ formatXPI(tx.sumBurnedSats) }} burned
      </div>
      <UBadge v-else :color="confirmationStatus.color" variant="subtle" size="sm">
        {{ confirmationStatus.label }}
      </UBadge>

      <!-- Time (non-compact) -->
      <div v-if="!compact" class="text-xs text-muted mt-0.5">
        {{ relativeTime }}
      </div>
    </div>
  </NuxtLink>
</template>
