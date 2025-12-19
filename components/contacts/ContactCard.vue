<script setup lang="ts">
/**
 * ContactCard Component
 *
 * Phase 4: Migrated to use useContactContext facade composable.
 * Phase 6: Enhanced with relationship indicators and shared wallet integration.
 * Shows MuSig2 badge, online status, shared wallets, and activity stats.
 */
import type { Contact } from '~/stores/contacts'
import { getContactAddress } from '~/stores/contacts'
import { useNetworkStore } from '~/stores/network'
import { useContactContext } from '~/composables/useContactContext'
import { useAddress } from '~/composables/useAddress'
import { useAmount } from '~/composables/useAmount'
import { useTime } from '~/composables/useTime'

const props = defineProps<{
  contact: Contact
  compact?: boolean
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  edit: [contact: Contact]
  delete: [contact: Contact]
  select: [contact: Contact]
  send: [contact: Contact]
  copy: [contact: Contact]
  toggleFavorite: [contact: Contact]
}>()

const networkStore = useNetworkStore()
const { truncateAddress, getNetworkName } = useAddress()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

// Use facade composable for unified contact data
const contactId = computed(() => props.contact.id)
const {
  identity,
  onlineStatus,
  sharedWallets,
  canMuSig2: isMuSig2Ready,
} = useContactContext(contactId)

// Phase 6: Removed isOnline/isRecent - now using OnlineStatusBadge component directly

// Activity stats
const stats = computed(() => ({
  transactions: props.contact.transactionCount || 0,
  sent: props.contact.totalSent || 0n,
  received: props.contact.totalReceived || 0n,
}))

// Last activity display
const lastActivity = computed(() => {
  if (!props.contact.lastTransactionAt) return null
  return timeAgo(props.contact.lastTransactionAt)
})

// Get the address for the current network (or fall back to legacy address)
const currentNetworkAddress = computed(() =>
  getContactAddress(props.contact, networkStore.currentNetwork)
)

// Check if contact's displayed address matches current network
const displayAddress = computed(() => currentNetworkAddress.value || props.contact.address)
const contactNetwork = computed(() => getNetworkName(displayAddress.value))
const isCurrentNetwork = computed(() => contactNetwork.value === networkStore.currentNetwork)
const networkMismatch = computed(() =>
  contactNetwork.value !== 'unknown' && !isCurrentNetwork.value
)

// Get display name for network (always use "Mainnet" instead of "livenet")
const networkDisplayName = computed(() => {
  switch (contactNetwork.value) {
    case 'livenet': return 'Mainnet'
    case 'testnet': return 'Testnet'
    case 'regtest': return 'Regtest'
    default: return ''
  }
})

// Get badge color based on the contact's network vs current network
const networkBadgeColor = computed(() => {
  if (!networkMismatch.value) return 'neutral' // Same network, shouldn't show
  switch (contactNetwork.value) {
    case 'livenet': return 'primary' // Mainnet = primary/pink
    case 'testnet': return 'warning' // Testnet = warning/orange
    case 'regtest': return 'info' // Regtest = info/blue
    default: return 'neutral'
  }
})

// Generate avatar initials from name
const initials = computed(() => {
  const parts = props.contact.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.contact.name.slice(0, 2).toUpperCase()
})

// Generate consistent color based on name
const avatarColor = computed(() => {
  const colors = [
    'primary',
    'success',
    'info',
    'warning',
    'error',
  ] as const
  let hash = 0
  for (let i = 0; i < props.contact.name.length; i++) {
    hash = props.contact.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

// Truncate address for display using the composable
const truncatedAddressDisplay = computed(() => truncateAddress(displayAddress.value))

// Format date
const formattedDate = computed(() => {
  return new Date(props.contact.updatedAt).toLocaleDateString()
})

// Handle click
const handleClick = () => {
  if (props.selectable) {
    emit('select', props.contact)
  }
}
</script>

<template>
  <div :class="[
    'group rounded-lg border transition-all',
    selectable ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : 'border-default',
    selected ? 'border-primary bg-primary/10' : '',
    compact ? 'p-3' : 'p-4'
  ]" @click="handleClick">
    <!-- Main content row -->
    <div class="flex items-center gap-3">
      <!-- Avatar with online indicator -->
      <div class="relative shrink-0">
        <div :class="[
          'flex items-center justify-center rounded-full font-semibold text-white',
          compact ? 'w-10 h-10 text-sm' : 'w-12 h-12',
          `bg-${avatarColor}-500`
        ]">
          {{ initials }}
        </div>
        <!-- Phase 6: Online status indicator using OnlineStatusBadge -->
        <div v-if="contact.peerId || contact.identityId" class="absolute -bottom-1 -right-1">
          <CommonOnlineStatusBadge :status="onlineStatus" size="xs" />
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <UIcon v-if="contact.isFavorite" name="i-lucide-star" class="w-4 h-4 text-warning-500 shrink-0" />
          <h3 :class="['font-semibold truncate', compact ? 'text-sm' : '']">
            {{ contact.name }}
          </h3>
          <UBadge v-if="isMuSig2Ready" color="secondary" variant="subtle" size="xs" title="MuSig2 capable">
            <UIcon name="i-lucide-shield" class="w-3 h-3 mr-0.5" />
            <span class="hidden sm:inline">MuSig2</span>
          </UBadge>
          <UBadge v-if="sharedWallets.length" color="info" variant="subtle" size="xs"
            :title="`${sharedWallets.length} shared wallet(s)`">
            <UIcon name="i-lucide-users" class="w-3 h-3 mr-0.5" />
            {{ sharedWallets.length }}
          </UBadge>
          <UBadge v-if="contact.serviceType" :color="avatarColor" variant="subtle" size="xs">
            {{ contact.serviceType }}
          </UBadge>
          <UBadge v-if="networkMismatch" :color="networkBadgeColor" variant="subtle" size="xs">
            {{ networkDisplayName }}
          </UBadge>
        </div>
        <div class="text-sm">
          <ExplorerAddressDisplay :address="displayAddress" size="xs" :show-avatar="false" />
        </div>
        <div v-if="!compact && contact.tags?.length" class="flex flex-wrap gap-1 mt-1">
          <UBadge v-for="tag in contact.tags.slice(0, 3)" :key="tag" color="neutral" variant="subtle" size="xs">
            {{ tag }}
          </UBadge>
          <UBadge v-if="contact.tags.length > 3" color="neutral" variant="subtle" size="xs">
            +{{ contact.tags.length - 3 }}
          </UBadge>
        </div>
      </div>

      <!-- Selection indicator -->
      <UIcon v-if="selectable && selected" name="i-lucide-check-circle" class="w-5 h-5 text-primary shrink-0" />
    </div>

    <!-- Notes (only in full mode) -->
    <p v-if="!compact && contact.notes" class="text-sm text-muted mt-3 line-clamp-2">
      {{ contact.notes }}
    </p>

    <!-- Activity Stats (only in full mode with activity) -->
    <div v-if="!compact && !selectable && (stats.transactions > 0 || sharedWallets.length > 0)"
      class="mt-3 pt-3 border-t border-default">
      <!-- Transaction Stats -->
      <div v-if="stats.transactions > 0" class="grid grid-cols-3 gap-2 text-center text-sm mb-3">
        <div>
          <p class="font-semibold">{{ stats.transactions }}</p>
          <p class="text-xs text-muted">Transactions</p>
        </div>
        <div>
          <p class="font-semibold text-error">{{ formatXPI(stats.sent.toString(), { showUnit: false }) }}</p>
          <p class="text-xs text-muted">Sent</p>
        </div>
        <div>
          <p class="font-semibold text-success">{{ formatXPI(stats.received.toString(), { showUnit: false }) }}</p>
          <p class="text-xs text-muted">Received</p>
        </div>
      </div>

      <!-- Shared Wallets -->
      <div v-if="sharedWallets.length" class="space-y-1">
        <p class="text-xs text-muted">Shared Wallets</p>
        <div class="flex flex-wrap gap-1">
          <UBadge v-for="wallet in sharedWallets.slice(0, 3)" :key="wallet.id" color="neutral" variant="subtle"
            size="xs" class="cursor-pointer hover:bg-muted"
            @click.stop="navigateTo(`/people/shared-wallets/${wallet.id}`)">
            {{ wallet.name }}
          </UBadge>
          <UBadge v-if="sharedWallets.length > 3" color="neutral" variant="subtle" size="xs">
            +{{ sharedWallets.length - 3 }} more
          </UBadge>
        </div>
      </div>

      <!-- Last Activity -->
      <p v-if="lastActivity" class="text-xs text-muted mt-2">
        Last transaction: {{ lastActivity }}
      </p>
    </div>

    <!-- Action buttons footer (visible on mobile, hover on desktop) -->
    <div v-if="!selectable && !compact"
      class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-default md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      <div class="flex items-center gap-1">
        <UButton :color="contact.isFavorite ? 'warning' : 'neutral'" variant="ghost" size="xs"
          :icon="contact.isFavorite ? 'i-lucide-star' : 'i-lucide-star-off'"
          @click.stop="emit('toggleFavorite', contact)">
          <span class="hidden sm:inline">{{ contact.isFavorite ? 'Favorited' : 'Favorite' }}</span>
        </UButton>
      </div>
      <div class="flex items-center gap-1">
        <UButton color="primary" variant="ghost" size="xs" icon="i-lucide-send" @click.stop="emit('send', contact)">
          <span class="hidden sm:inline">Send</span>
        </UButton>
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click.stop="emit('copy', contact)">
          <span class="hidden sm:inline">Copy</span>
        </UButton>
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-pencil" @click.stop="emit('edit', contact)">
          <span class="hidden sm:inline">Edit</span>
        </UButton>
        <UButton color="error" variant="ghost" size="xs" icon="i-lucide-trash-2" @click.stop="emit('delete', contact)">
          <span class="hidden sm:inline">Delete</span>
        </UButton>
      </div>
    </div>

    <!-- Compact mode actions (inline) -->
    <div v-if="!selectable && compact" class="flex items-center gap-1 mt-2">
      <UButton color="primary" variant="ghost" size="xs" icon="i-lucide-send" @click.stop="emit('send', contact)" />
      <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click.stop="emit('copy', contact)" />
    </div>
  </div>
</template>
