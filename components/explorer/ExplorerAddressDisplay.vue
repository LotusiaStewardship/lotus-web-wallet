<script setup lang="ts">
import { useContactsStore, getContactAddress } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'

interface ExplorerAddressDisplayProps {
  address: string
  linkToExplorer?: boolean
  showAvatar?: boolean
  showAddContact?: boolean
  size?: 'xs' | 'sm' | 'md'
}

const props = withDefaults(defineProps<ExplorerAddressDisplayProps>(), {
  linkToExplorer: true,
  showAvatar: true,
  showAddContact: false,
  size: 'sm',
})

const contactsStore = useContactsStore()
const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const { formatFingerprint, truncateAddress } = useAddressFormat()

// Initialize contacts store
onMounted(() => {
  contactsStore.initialize()
})

// Check if this is the user's own wallet address
const isOwnAddress = computed(() => {
  return walletStore.address === props.address
})

// Find contact by address
const contact = computed(() => {
  if (!props.address) return null
  return contactsStore.getContactByAddress(props.address)
})

// Display name (contact name, "You", or fingerprint)
const displayName = computed(() => {
  if (isOwnAddress.value) return 'You'
  if (contact.value) return contact.value.name
  return null
})

// Fingerprint for display
const fingerprint = computed(() => {
  return formatFingerprint(props.address)
})

// Avatar size mapping
const avatarSize = computed(() => {
  switch (props.size) {
    case 'xs': return 'xs'
    case 'sm': return 'sm'
    case 'md': return 'md'
    default: return 'sm'
  }
})

// Text size mapping
const textSizeClass = computed(() => {
  switch (props.size) {
    case 'xs': return 'text-xs'
    case 'sm': return 'text-sm'
    case 'md': return 'text-base'
    default: return 'text-sm'
  }
})

// Badge color for own address
const badgeColor = computed(() => {
  if (isOwnAddress.value) return 'success'
  if (contact.value) return 'primary'
  return 'neutral'
})
</script>

<template>
  <component :is="linkToExplorer ? 'NuxtLink' : 'span'"
    :to="linkToExplorer ? `/explorer/address/${address}` : undefined" class="inline-flex items-center gap-1.5 group"
    :class="{ 'hover:text-primary': linkToExplorer }">
    <!-- Avatar for contacts/self -->
    <template v-if="showAvatar && (contact || isOwnAddress)">
      <ContactAvatar v-if="contact" :name="contact.name" :avatar="contact.avatar" :size="avatarSize" />
      <div v-else-if="isOwnAddress"
        class="w-5 h-5 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center">
        <UIcon name="i-lucide-wallet" class="w-3 h-3 text-success-500" />
      </div>
    </template>

    <!-- Display name or fingerprint -->
    <span v-if="displayName" :class="['font-medium', textSizeClass]">
      {{ displayName }}
    </span>
    <UBadge v-else :color="badgeColor" variant="subtle" :size="size === 'xs' ? 'sm' : 'md'" class="font-mono">
      {{ fingerprint }}
    </UBadge>

    <!-- Show fingerprint as subtitle when we have a name -->
    <span v-if="displayName && !isOwnAddress" class="text-muted font-mono"
      :class="size === 'xs' ? 'text-xs' : 'text-sm'">
      ({{ fingerprint }})
    </span>

    <!-- Add to contacts button -->
    <AddToContactButton v-if="showAddContact" :address="address" :size="size === 'xs' ? 'xs' : 'sm'" variant="icon" />
  </component>
</template>
