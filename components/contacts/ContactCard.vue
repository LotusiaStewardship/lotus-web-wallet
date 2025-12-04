<script setup lang="ts">
import type { Contact } from '~/stores/contacts'
import { getContactAddress } from '~/stores/contacts'
import { useNetworkStore } from '~/stores/network'
import { useAddressFormat } from '~/composables/useUtils'

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
const { truncateAddress, getNetworkName } = useAddressFormat()

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
      <!-- Avatar -->
      <div :class="[
        'flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        compact ? 'w-10 h-10 text-sm' : 'w-12 h-12',
        `bg-${avatarColor}-500`
      ]">
        {{ initials }}
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <UIcon v-if="contact.isFavorite" name="i-lucide-star" class="w-4 h-4 text-warning-500 shrink-0" />
          <h3 :class="['font-semibold truncate', compact ? 'text-sm' : '']">
            {{ contact.name }}
          </h3>
          <UBadge v-if="contact.serviceType" :color="avatarColor" variant="subtle" size="xs">
            {{ contact.serviceType }}
          </UBadge>
          <UBadge v-if="contact.peerId" color="success" variant="subtle" size="xs">
            P2P
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
