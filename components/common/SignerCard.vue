<script setup lang="ts">
/**
 * CommonSignerCard
 *
 * Unified signer card component for P2P and Shared Wallets contexts.
 * Follows ContactCard patterns for consistency.
 *
 * Phase 4: Migrated to use identity store for online status.
 * Phase 5.1: Created as part of UI Component Consolidation.
 * Replaces:
 * - components/p2p/SignerCard.vue
 * - components/shared-wallets/SignerCard.vue
 */
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
import type { SignerCapabilities } from '~/types/musig2'

interface SignerData {
  id: string
  peerId: string
  publicKey?: string
  publicKeyHex?: string
  nickname?: string
  reputation?: number
  isOnline?: boolean
  responseTime?: number
  capabilities?: SignerCapabilities | Record<string, boolean>
  transactionTypes?: string[]
  fee?: number | string
  walletAddress?: string
  amountRange?: { min?: number; max?: number }
}

const props = withDefaults(
  defineProps<{
    /** Signer data */
    signer: SignerData
    /** Primary action configuration */
    primaryAction?: {
      label: string
      icon: string
      event: string
    }
    /** Show compact variant */
    compact?: boolean
    /** Card variant: 'list' for list items, 'card' for standalone */
    variant?: 'list' | 'card'
  }>(),
  {
    primaryAction: () => ({
      label: 'Request',
      icon: 'i-lucide-pen-tool',
      event: 'request',
    }),
    compact: false,
    variant: 'list',
  },
)

const emit = defineEmits<{
  request: []
  addToWallet: []
  saveContact: []
  viewDetails: []
  [key: string]: any
}>()

const contactsStore = useContactsStore()
const identityStore = useIdentityStore()
const { formatXPI } = useAmount()

const isContact = computed(() =>
  contactsStore.contacts.some(c => c.peerId === props.signer.peerId),
)

const publicKey = computed(
  () => props.signer.publicKeyHex || props.signer.publicKey || '',
)

// Use identity store as canonical source for online status
const onlineStatus = computed(() => {
  if (!publicKey.value) return 'unknown'
  return identityStore.getOnlineStatus(publicKey.value)
})

const isOnline = computed(() => {
  // Fall back to prop if identity store doesn't have data
  if (onlineStatus.value === 'unknown') {
    return props.signer.isOnline ?? true
  }
  return onlineStatus.value === 'online'
})

const txTypeLabels = computed(() => {
  if (props.signer.capabilities) {
    return Object.entries(props.signer.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => formatTxType(type))
  }
  if (props.signer.transactionTypes) {
    return props.signer.transactionTypes.map(formatTxType)
  }
  return []
})

function formatTxType(type: string): string {
  const labels: Record<string, string> = {
    spend: 'Spend',
    swap: 'Swap',
    coinjoin: 'CoinJoin',
    custody: 'Custody',
    escrow: 'Escrow',
    channel: 'Channel',
  }
  return labels[type.toLowerCase()] || type
}

const feeDisplay = computed(() => {
  if (!props.signer.fee) return 'Free'
  const fee =
    typeof props.signer.fee === 'string'
      ? BigInt(props.signer.fee)
      : BigInt(props.signer.fee)
  return formatXPI(fee)
})

const initials = computed(() => {
  if (!props.signer.nickname) return null
  const parts = props.signer.nickname.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.signer.nickname.slice(0, 2).toUpperCase()
})

function handlePrimaryAction() {
  emit(props.primaryAction.event as any)
}
</script>

<template>
  <!-- Phase 6: Semantic color classes instead of hardcoded gray -->
  <div :class="[
    'transition-colors',
    variant === 'card'
      ? 'p-4 bg-background rounded-lg border border-default hover:border-primary'
      : 'px-4 py-4 hover:bg-muted/50',
  ]">
    <div class="flex items-start gap-3">
      <!-- Avatar with Online Indicator - Phase 6: Using OnlineStatusBadge -->
      <div class="relative flex-shrink-0">
        <div :class="[
          'rounded-full flex items-center justify-center',
          compact ? 'w-10 h-10' : 'w-12 h-12',
          'bg-primary-100 dark:bg-primary-900/30',
        ]">
          <span v-if="initials" class="font-semibold text-primary">
            {{ initials }}
          </span>
          <UIcon v-else name="i-lucide-user" :class="compact ? 'w-5 h-5' : 'w-6 h-6'" class="text-primary" />
        </div>
        <div v-if="onlineStatus !== 'unknown'" class="absolute -bottom-1 -right-1">
          <CommonOnlineStatusBadge :status="onlineStatus" size="xs" />
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <p class="font-medium">{{ signer.nickname || 'Anonymous' }}</p>
          <UBadge v-if="signer.reputation" color="warning" variant="subtle" size="xs">
            ⭐ {{ signer.reputation }}
          </UBadge>
          <!-- Phase 6: Using OnlineStatusBadge with label for status text -->
          <CommonOnlineStatusBadge :status="onlineStatus" show-label size="xs" />
        </div>

        <div v-if="txTypeLabels.length" class="flex flex-wrap gap-1 mb-2">
          <UBadge v-for="type in txTypeLabels" :key="type" color="neutral" variant="outline" size="xs">
            {{ type }}
          </UBadge>
        </div>

        <p class="text-sm text-muted">
          Fee: {{ feeDisplay }}
          <span v-if="signer.responseTime">
            • Avg response: {{ signer.responseTime }}s
          </span>
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <UButton v-if="!isContact" color="neutral" variant="ghost" size="sm" icon="i-lucide-user-plus"
          title="Save as contact" @click="emit('saveContact')" />
        <UButton color="primary" size="sm" :icon="primaryAction.icon" @click="handlePrimaryAction">
          {{ primaryAction.label }}
        </UButton>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-chevron-right" title="View details"
          @click="emit('viewDetails')" />
      </div>
    </div>
  </div>
</template>
