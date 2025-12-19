<script setup lang="ts">
/**
 * TxItem Component
 *
 * Phase 5: Unified transaction item component.
 * Consolidates wallet/TxItem, history/TxItem, and explorer/TxItem.
 * Supports multiple display variants for different contexts.
 */
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import type { NormalizedTransaction } from '~/composables/useTransactionNormalizer'

const props = withDefaults(
  defineProps<{
    /** Normalized transaction data */
    transaction: NormalizedTransaction
    /** Display variant */
    variant?: 'compact' | 'standard' | 'detailed'
    /** Show transaction fee */
    showFee?: boolean
    /** Show contact info for counterparty */
    showContact?: boolean
    /** Show confirmation count */
    showConfirmations?: boolean
    /** Show transaction type badge */
    showType?: boolean
    /** Show input/output counts */
    showInputOutput?: boolean
    /** Link to explorer on click */
    linkToExplorer?: boolean
    /** Make item clickable (emits click event) */
    clickable?: boolean
  }>(),
  {
    variant: 'standard',
    showFee: false,
    showContact: true,
    showConfirmations: true,
    showType: false,
    showInputOutput: false,
    linkToExplorer: true,
    clickable: false,
  },
)

const emit = defineEmits<{
  click: []
}>()

const contactsStore = useContactsStore()
const walletStore = useWalletStore()
const { formatXPI, getAmountColor } = useAmount()
const { timeAgo } = useTime()
const { truncateAddress } = useAddress()

// Find contact for counterparty address
const contact = computed(() => {
  if (!props.transaction.counterpartyAddress) return null
  return contactsStore.findByAddress(props.transaction.counterpartyAddress)
})

// Check if user is involved (for explorer variant)
const isOwnTx = computed(() => {
  const myAddress = walletStore.address
  if (!myAddress) return false
  return props.transaction.counterpartyAddress === myAddress
})

// Transaction direction helpers
const isIncoming = computed(() =>
  props.transaction.direction === 'incoming' || props.transaction.isCoinbase,
)

// Type configuration
const typeConfig = computed(() => {
  const configs: Record<string, { icon: string; color: string; label: string }> = {
    coinbase: { icon: 'i-lucide-pickaxe', color: 'warning', label: 'Coinbase' },
    rank: { icon: 'i-lucide-thumbs-up', color: 'primary', label: 'RANK Vote' },
    burn: { icon: 'i-lucide-flame', color: 'error', label: 'Burn' },
    transfer: { icon: 'i-lucide-arrow-right-left', color: 'neutral', label: 'Transfer' },
  }
  return configs[props.transaction.type] || configs.transfer
})

// Icon based on transaction type and direction
const icon = computed(() => {
  if (props.transaction.isCoinbase) return 'i-lucide-pickaxe'
  if (props.transaction.type === 'rank') return 'i-lucide-thumbs-up'
  if (props.transaction.type === 'burn') return 'i-lucide-flame'

  switch (props.transaction.direction) {
    case 'incoming':
      return 'i-lucide-arrow-down-left'
    case 'outgoing':
      return 'i-lucide-arrow-up-right'
    case 'self':
      return 'i-lucide-repeat'
    default:
      return 'i-lucide-circle'
  }
})

const iconBgColor = computed(() => {
  if (props.transaction.type === 'coinbase') return 'bg-warning/10'
  if (props.transaction.type === 'rank') return 'bg-primary/10'
  if (props.transaction.type === 'burn') return 'bg-error/10'
  if (isIncoming.value) return 'bg-success/10'
  return 'bg-error/10'
})

const iconColor = computed(() => {
  if (props.transaction.type === 'coinbase') return 'text-warning'
  if (props.transaction.type === 'rank') return 'text-primary'
  if (props.transaction.type === 'burn') return 'text-error'
  if (isIncoming.value) return 'text-success'
  return 'text-error'
})

// Display label
const label = computed(() => {
  if (props.transaction.isCoinbase) return 'Mining Reward'
  if (props.transaction.type === 'rank') return 'RANK Vote'
  if (props.transaction.type === 'burn') return 'Burn'

  // Use contact name if available
  if (contact.value) return contact.value.name
  if (props.transaction.counterpartyAddress) {
    return truncateAddress(props.transaction.counterpartyAddress, 8, 4)
  }
  return isIncoming.value ? 'Received' : 'Sent'
})

// Amount display
const amountDisplay = computed(() => {
  if (props.variant === 'detailed' && props.transaction.totalOutput) {
    return formatXPI(props.transaction.totalOutput, { showUnit: false })
  }

  const prefix = isIncoming.value ? '+' : '-'
  return `${prefix}${formatXPI(props.transaction.amount, { showUnit: false })}`
})

const amountColor = computed(() => {
  if (props.variant === 'detailed') return '' // Neutral for explorer
  return getAmountColor(props.transaction.amount, isIncoming.value ?? false)
})

// Time display
const timeDisplay = computed(() => timeAgo(props.transaction.timestamp))

// Truncated txid for detailed variant
const txidDisplay = computed(() => truncateAddress(props.transaction.txid, 8, 6))

// Component wrapper
const componentTag = computed(() => {
  if (props.linkToExplorer) return resolveComponent('NuxtLink')
  if (props.clickable) return 'button'
  return 'div'
})

const componentProps = computed(() => {
  if (props.linkToExplorer) {
    return { to: `/explore/explorer/tx/${props.transaction.txid}` }
  }
  if (props.clickable) {
    return { type: 'button' }
  }
  return {}
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<template>
  <component :is="componentTag" v-bind="componentProps" :class="[
    'flex items-center gap-3 transition-colors',
    variant === 'compact' ? 'py-2' : 'py-3',
    (linkToExplorer || clickable) && 'hover:bg-muted/30 cursor-pointer',
    variant !== 'detailed' && '-mx-4 px-4',
    variant === 'detailed' && 'px-4',
  ]" @click="handleClick">
    <!-- Icon -->
    <div :class="[
      'flex items-center justify-center flex-shrink-0',
      variant === 'compact' ? 'w-8 h-8 rounded-full' : 'w-10 h-10 rounded-full',
      variant === 'detailed' && 'rounded-lg',
      iconBgColor,
    ]">
      <UIcon :name="icon" :class="[
        variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5',
        iconColor,
      ]" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <!-- For detailed variant, show txid -->
        <template v-if="variant === 'detailed'">
          <p class="font-mono text-sm truncate">{{ txidDisplay }}</p>
          <UBadge v-if="isOwnTx" color="primary" variant="subtle" size="xs">
            You
          </UBadge>
        </template>

        <!-- For standard/compact, show label or AddressDisplay -->
        <template v-else>
          <CommonAddressDisplay v-if="transaction.counterpartyAddress && showContact && !transaction.isCoinbase"
            :address="transaction.counterpartyAddress" :show-address="!!contact" :show-add-to-contacts="!contact"
            :copyable="false" size="sm" />
          <span v-else class="font-medium truncate">{{ label }}</span>
          <CommonConfirmationBadge v-if="showConfirmations && transaction.confirmations < 6"
            :confirmations="transaction.confirmations" class="flex-shrink-0" />
        </template>
      </div>

      <p class="text-sm text-muted">
        <template v-if="variant === 'detailed'">
          {{ typeConfig.label }}
          <span v-if="showInputOutput && transaction.inputCount" class="hidden sm:inline">
            • {{ transaction.inputCount }} in → {{ transaction.outputCount }} out
          </span>
        </template>
        <template v-else>
          {{ timeDisplay }}
        </template>
      </p>
    </div>

    <!-- Amount & Time -->
    <div class="text-right flex-shrink-0">
      <span v-if="transaction.amount > 0n || transaction.totalOutput" :class="['font-mono font-medium', amountColor]">
        {{ amountDisplay }}
      </span>
      <span v-if="variant !== 'detailed'" class="text-muted text-sm ml-1">XPI</span>

      <!-- Fee for standard variant -->
      <p v-if="showFee && transaction.fee && !isIncoming" class="text-xs text-muted">
        Fee: {{ formatXPI(transaction.fee, { showUnit: false }) }}
      </p>

      <!-- Time for detailed variant -->
      <p v-if="variant === 'detailed' && transaction.timestamp" class="text-xs text-muted">
        {{ timeDisplay }}
      </p>

      <!-- Pending badge for detailed variant -->
      <UBadge v-if="variant === 'detailed' && !transaction.blockHeight" color="warning" variant="subtle" size="xs">
        Pending
      </UBadge>
    </div>

    <!-- Chevron for clickable items -->
    <UIcon v-if="linkToExplorer || clickable" name="i-lucide-chevron-right"
      class="w-4 h-4 text-muted flex-shrink-0 hidden sm:block" />
  </component>
</template>
