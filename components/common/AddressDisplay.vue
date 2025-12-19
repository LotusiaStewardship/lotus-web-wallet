<script setup lang="ts">
/**
 * AddressDisplay Component
 *
 * Phase 5: Unified address display component.
 * Consolidates common/AddressDisplay and explorer/AddressDisplay.
 * Shows contact info when available, raw address otherwise.
 * Includes copy, add-to-contacts, and explorer link features.
 */
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'

const props = withDefaults(
  defineProps<{
    /** The address to display */
    address: string
    /** Show the address fingerprint alongside contact name */
    showAddress?: boolean
    /** Show "Add to Contacts" button for unknown addresses */
    showAddToContacts?: boolean
    /** Truncate the address display */
    truncate?: boolean
    /** Show copy button */
    copyable?: boolean
    /** Size variant */
    size?: 'xs' | 'sm' | 'md'
    /** Link to explorer address page */
    linkToExplorer?: boolean
    /** Show "You" badge for own addresses */
    showYouBadge?: boolean
    /** Show "Contact" badge for known contacts */
    showContactBadge?: boolean
    /** Show avatar for contacts */
    showAvatar?: boolean
  }>(),
  {
    showAddress: true,
    showAddToContacts: true,
    truncate: true,
    copyable: true,
    size: 'sm',
    linkToExplorer: false,
    showYouBadge: true,
    showContactBadge: false,
    showAvatar: true,
  },
)

const contactStore = useContactsStore()
const walletStore = useWalletStore()
const { copy } = useClipboard()
const toast = useToast()

const isOwnAddress = computed(() => props.address === walletStore.address)

const contact = computed(() => {
  if (!props.address) return null
  return contactStore.findByAddress(props.address)
})

const displayName = computed(() => {
  if (isOwnAddress.value) return 'You'
  if (contact.value) return contact.value.name
  return props.truncate ? fingerprint.value : props.address
})

const fingerprint = computed(() => {
  if (!props.address) return ''
  if (props.address.length <= 18) return props.address
  return `${props.address.slice(0, 12)}...${props.address.slice(-6)}`
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return {
        text: 'text-xs',
        avatar: 'w-5 h-5',
        button: 'xs' as const,
      }
    case 'md':
      return {
        text: 'text-base',
        avatar: 'w-8 h-8',
        button: 'sm' as const,
      }
    default:
      return {
        text: 'text-sm',
        avatar: 'w-6 h-6',
        button: 'xs' as const,
      }
  }
})

function addToContacts() {
  navigateTo(`/people/contacts?add=true&address=${encodeURIComponent(props.address)}`)
}

async function copyAddress() {
  await copy(props.address)
  toast.add({
    title: 'Address copied',
    color: 'success',
    icon: 'i-lucide-check',
  })
}
// Component to render (NuxtLink or span)
const componentTag = computed(() => (props.linkToExplorer ? resolveComponent('NuxtLink') : 'span'))
const componentProps = computed(() =>
  props.linkToExplorer
    ? { to: `/explore/explorer/address/${props.address}` }
    : {},
)
</script>

<template>
  <component :is="componentTag" v-bind="componentProps" class="inline-flex items-center gap-2 min-w-0" :class="[
    linkToExplorer && 'hover:text-primary cursor-pointer',
  ]">
    <!-- Contact Avatar -->
    <ContactsContactAvatar v-if="contact && showAvatar" :contact="contact" :class="sizeClasses.avatar" show-presence />

    <!-- Display Name / Address -->
    <div class="min-w-0 flex items-center gap-1">
      <span v-if="contact || isOwnAddress" :class="['font-medium truncate', sizeClasses.text]">
        {{ displayName }}
      </span>
      <code v-else :class="['font-mono truncate', sizeClasses.text]">
        {{ truncate ? fingerprint : address }}
      </code>

      <!-- Address fingerprint for contacts -->
      <span v-if="contact && showAddress" :class="['text-muted truncate', sizeClasses.text]">
        ({{ fingerprint }})
      </span>
    </div>

    <!-- Badges -->
    <UBadge v-if="isOwnAddress && showYouBadge" color="primary" variant="subtle" size="xs">
      You
    </UBadge>
    <UBadge v-else-if="contact && showContactBadge" color="success" variant="subtle" size="xs">
      Contact
    </UBadge>

    <!-- Actions -->
    <div class="flex items-center gap-0.5 flex-shrink-0">
      <UButton v-if="!contact && !isOwnAddress && showAddToContacts && address" color="neutral" variant="ghost"
        :size="sizeClasses.button" icon="i-lucide-user-plus" title="Add to Contacts" @click.stop="addToContacts" />
      <UButton v-if="copyable && address" color="neutral" variant="ghost" :size="sizeClasses.button"
        icon="i-lucide-copy" title="Copy Address" @click.stop="copyAddress" />
    </div>
  </component>
</template>
