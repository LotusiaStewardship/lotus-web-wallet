<script setup lang="ts">
import { useContactsStore, type Contact, getContactAddress, hasAddressForNetwork } from '~/stores/contacts'
import { useNetworkStore, NETWORK_CONFIGS } from '~/stores/network'
import { useAddressFormat } from '~/composables/useUtils'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  /** If true, only show contacts that have an address for the current network */
  filterByNetwork?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [contact: Contact]
}>()

const contactsStore = useContactsStore()
const networkStore = useNetworkStore()
const { truncateAddress, getNetworkName } = useAddressFormat()

// Get the address prefix for the current network
const addressPlaceholder = computed(() => {
  const config = NETWORK_CONFIGS[networkStore.currentNetwork]
  return props.placeholder || `Address or contact name (${config.displayName})...`
})

// Get display name for network (always use "Mainnet" instead of "livenet")
const getNetworkDisplayName = (network: string) => {
  switch (network) {
    case 'livenet': return 'Mainnet'
    case 'testnet': return 'Testnet'
    case 'regtest': return 'Regtest'
    default: return ''
  }
}

// Get the address to display for a contact (current network or fallback)
const getDisplayAddress = (contact: Contact): string => {
  return getContactAddress(contact, networkStore.currentNetwork) || contact.address
}

// Local state
const inputValue = ref(props.modelValue)
const showDropdown = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

// Search results - show contacts when typing a name, hide when typing an address
const searchResults = computed(() => {
  if (!inputValue.value) return []
  // If it looks like an address (starts with lotus), don't show contact suggestions
  if (inputValue.value.startsWith('lotus')) return []

  let results = contactsStore.searchContacts(inputValue.value)

  // Filter by network if requested - only show contacts with address for current network
  if (props.filterByNetwork) {
    results = results.filter(c => hasAddressForNetwork(c, networkStore.currentNetwork))
  }

  return results.slice(0, 5)
})

// Show dropdown when there are results
watch(searchResults, (results) => {
  showDropdown.value = results.length > 0
})

// Handle input
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  inputValue.value = target.value
  emit('update:modelValue', target.value)
}

// Handle contact selection - use the address for the current network
const selectContact = (contact: Contact) => {
  const address = getDisplayAddress(contact)
  inputValue.value = address
  emit('update:modelValue', address)
  emit('select', contact)
  showDropdown.value = false
}

// Handle blur with delay to allow click
const handleBlur = () => {
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

// Handle focus
const handleFocus = () => {
  if (searchResults.value.length > 0) {
    showDropdown.value = true
  }
}

// Generate avatar initials
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Generate consistent color
const getAvatarColor = (name: string) => {
  const colors = ['primary', 'success', 'info', 'warning', 'error'] as const
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// truncateAddress is now provided by useAddressFormat composable
</script>

<template>
  <div class="relative w-full">
    <UInput ref="inputRef" :model-value="inputValue" :placeholder="addressPlaceholder" class="w-full"
      @input="handleInput" @focus="handleFocus" @blur="handleBlur">
      <template #leading>
        <UIcon name="i-lucide-search" class="w-4 h-4 text-muted" />
      </template>
    </UInput>

    <!-- Dropdown -->
    <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
      <div v-if="showDropdown && searchResults.length > 0"
        class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-default overflow-hidden">
        <div class="py-1">
          <button v-for="contact in searchResults" :key="contact.id"
            class="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            @mousedown.prevent="selectContact(contact)">
            <!-- Avatar -->
            <div :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
              `bg-${getAvatarColor(contact.name)}-500`
            ]">
              {{ getInitials(contact.name) }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1">
                <p class="font-medium text-sm truncate">{{ contact.name }}</p>
                <UBadge
                  v-if="getNetworkName(getDisplayAddress(contact)) !== networkStore.currentNetwork && getNetworkName(getDisplayAddress(contact)) !== 'unknown'"
                  :color="getNetworkName(getDisplayAddress(contact)) === 'livenet' ? 'primary' : getNetworkName(getDisplayAddress(contact)) === 'testnet' ? 'warning' : 'info'"
                  variant="subtle" size="xs">
                  {{ getNetworkDisplayName(getNetworkName(getDisplayAddress(contact))) }}
                </UBadge>
              </div>
              <p class="text-xs text-muted font-mono truncate">
                {{ truncateAddress(getDisplayAddress(contact)) }}
              </p>
            </div>

            <!-- Service badge -->
            <UBadge v-if="contact.serviceType" color="info" variant="subtle" size="xs">
              {{ contact.serviceType }}
            </UBadge>
          </button>
        </div>

        <!-- Footer hint -->
        <div class="px-3 py-2 bg-muted/30 border-t border-default">
          <p class="text-xs text-muted">
            <UIcon name="i-lucide-info" class="w-3 h-3 inline mr-1" />
            Type a name to search contacts, or paste an address
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
