<script setup lang="ts">
import { useAddressFormat } from '~/composables/useUtils'
import { useExplorerApi, type ParsedTransaction, type TransactionType } from '~/composables/useExplorerApi'
import { toLotusUnits } from '~/stores/wallet'

interface ActivityItemProps {
  transaction: ParsedTransaction
  compact?: boolean
  showExplorerLink?: boolean
}

const props = withDefaults(defineProps<ActivityItemProps>(), {
  compact: false,
  showExplorerLink: false,
})

const config = useRuntimeConfig()
const { truncateAddress, formatFingerprint } = useAddressFormat()
const { getTransactionTypeInfo, getSentimentInfo, formatPlatformName } = useExplorerApi()

// Get type info
const typeInfo = computed(() => getTransactionTypeInfo(props.transaction.type))

// Format amount in XPI
const formattedAmount = computed(() => {
  const amount = props.transaction.amount
  if (!amount) return null
  const xpi = toLotusUnits(amount)
  return xpi.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
})

// Format burned amount for RANK
const formattedBurnedAmount = computed(() => {
  const burned = props.transaction.rankData?.burnedAmount || props.transaction.burnedAmount
  if (!burned) return null
  const xpi = toLotusUnits(burned)
  return xpi.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
})

// Format date
const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString()
}

// Format detailed date/time
const formatDateTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString()
}

// Relative time (e.g., "2 hours ago")
const relativeTime = computed(() => {
  const now = Date.now()
  const txTime = props.transaction.timestamp * 1000
  const diff = now - txTime

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return formatDate(props.transaction.timestamp)
})

// Get confirmation status
const confirmationStatus = computed(() => {
  const conf = props.transaction.confirmations
  if (conf <= 0) return { label: 'Pending', color: 'warning' as const }
  if (conf < 6) return { label: `${conf} conf`, color: 'info' as const }
  return { label: 'Confirmed', color: 'success' as const }
})

// Truncated txid for display
const truncatedTxid = computed(() => {
  const txid = props.transaction.txid
  return `${txid.slice(0, 8)}...${txid.slice(-6)}`
})

// Counterparty fingerprint for quick identification
const counterpartyFingerprint = computed(() => {
  const addr = props.transaction.counterpartyAddress
  if (!addr) return null
  return formatFingerprint(addr)
})

// Sentiment info for RANK
const sentimentInfo = computed(() => {
  if (!props.transaction.rankData) return null
  return getSentimentInfo(props.transaction.rankData.sentiment)
})

// Explorer URL
const explorerUrl = computed(() => {
  return `${config.public.explorerUrl}/tx/${props.transaction.txid}`
})
</script>

<template>
  <div class="flex items-center gap-3 py-3">
    <!-- Icon -->
    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :class="typeInfo.bgClass">
      <UIcon :name="typeInfo.icon" class="w-5 h-5" :class="typeInfo.textClass" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Header row: Type + Status -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-medium">{{ typeInfo.label }}</span>

        <!-- RANK sentiment badge -->
        <UBadge v-if="transaction.type === 'rank' && sentimentInfo" :color="sentimentInfo.color" variant="subtle"
          size="xs">
          <template #leading>
            <UIcon :name="sentimentInfo.icon" class="w-3 h-3" />
          </template>
          {{ sentimentInfo.label }}
        </UBadge>

        <!-- Confirmation status -->
        <UBadge :color="confirmationStatus.color" variant="subtle" size="xs">
          {{ confirmationStatus.label }}
        </UBadge>
      </div>

      <!-- Secondary info based on type -->
      <div class="mt-0.5">
        <!-- Give/Receive: Show counterparty -->
        <template v-if="transaction.type === 'give' || transaction.type === 'receive'">
          <div v-if="transaction.counterpartyAddress" class="flex items-center gap-1.5 text-sm text-muted">
            <span>{{ transaction.type === 'give' ? 'To' : 'From' }}</span>
            <UBadge color="neutral" variant="subtle" size="xs" class="font-mono">
              {{ counterpartyFingerprint }}
            </UBadge>
          </div>
        </template>

        <!-- RANK: Show platform and profile -->
        <template v-else-if="transaction.type === 'rank' && transaction.rankData">
          <div class="flex items-center gap-1.5 text-sm text-muted">
            <span>{{ formatPlatformName(transaction.rankData.platform) }}</span>
            <span class="text-muted">·</span>
            <span class="font-mono text-xs">@{{ transaction.rankData.profileId }}</span>
          </div>
        </template>

        <!-- Burn: Simple label -->
        <template v-else-if="transaction.type === 'burn'">
          <p class="text-sm text-muted">OP_RETURN data</p>
        </template>

        <!-- Coinbase: Mining reward -->
        <template v-else-if="transaction.type === 'coinbase'">
          <p class="text-sm text-muted">Mining reward</p>
        </template>

        <!-- Self: Consolidation -->
        <template v-else-if="transaction.type === 'self'">
          <p class="text-sm text-muted">Consolidation</p>
        </template>
      </div>

      <!-- Timestamp (non-compact mode) -->
      <p v-if="!compact" class="text-xs text-muted mt-1">
        {{ formatDateTime(transaction.timestamp) }}
      </p>

      <!-- Explorer link -->
      <a v-if="showExplorerLink" :href="explorerUrl" target="_blank"
        class="text-xs text-primary hover:underline font-mono mt-1 inline-block">
        {{ truncatedTxid }}
      </a>
    </div>

    <!-- Right side: Amount + Time -->
    <div class="text-right shrink-0">
      <!-- Amount display based on type -->
      <template v-if="transaction.type === 'give' || transaction.type === 'receive' || transaction.type === 'coinbase'">
        <p class="font-mono font-medium" :class="typeInfo.textClass">
          {{ transaction.type === 'give' ? '-' : '+' }}{{ formattedAmount }} XPI
        </p>
      </template>

      <template v-else-if="transaction.type === 'rank' || transaction.type === 'burn'">
        <p class="font-mono font-medium" :class="typeInfo.textClass">
          -{{ formattedBurnedAmount }} XPI
        </p>
      </template>

      <template v-else-if="transaction.type === 'self'">
        <p class="font-mono text-sm text-muted">
          Fee: {{ formattedAmount }} XPI
        </p>
      </template>

      <!-- Compact time display -->
      <p v-if="compact" class="text-xs text-muted mt-0.5">
        {{ relativeTime }}
      </p>
    </div>
  </div>
</template>
