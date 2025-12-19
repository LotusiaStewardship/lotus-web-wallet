<script setup lang="ts">
/**
 * SendRecipientInput
 *
 * Address input with contact picker, paste, and scan buttons.
 */
import type { Contact } from '~/stores/contacts'

const props = defineProps<{
  /** Current address value */
  modelValue: string
  /** Available contacts */
  contacts?: Contact[]
  /** Validation error */
  error?: string | null
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  selectContact: [contact: Contact]
  scanQr: []
}>()

const { paste } = useClipboard()
const { isValidAddress } = useAddress()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const contactsOpen = ref(false)

// Filter contacts based on input
const filteredContacts = computed(() => {
  if (!props.contacts) return []
  if (!inputValue.value) return props.contacts.slice(0, 5)

  const query = inputValue.value.toLowerCase()
  return props.contacts
    .filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query),
    )
    .slice(0, 5)
})

// Show contact suggestions
const showSuggestions = computed(() =>
  contactsOpen.value && filteredContacts.value.length > 0,
)

// Paste from clipboard
async function handlePaste() {
  const text = await paste()
  if (text) {
    inputValue.value = text.trim()
  }
}

// Select a contact
function selectContact(contact: Contact) {
  inputValue.value = contact.address
  contactsOpen.value = false
  emit('selectContact', contact)
}

// Handle focus
function handleFocus() {
  if (props.contacts?.length) {
    contactsOpen.value = true
  }
}

// Handle blur with delay to allow click
function handleBlur() {
  setTimeout(() => {
    contactsOpen.value = false
  }, 200)
}
</script>

<template>
  <div class="relative">
    <UInput v-model="inputValue" :placeholder="placeholder || 'Enter address or select contact'" :disabled="disabled"
      :color="error ? 'error' : undefined" class="font-mono" @focus="handleFocus" @blur="handleBlur">
      <template #trailing>
        <div class="flex items-center gap-1">
          <!-- Paste button -->
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-clipboard" title="Paste"
            :disabled="disabled" @click="handlePaste" />
          <!-- Scan QR button -->
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-scan" title="Scan QR" :disabled="disabled"
            @click="emit('scanQr')" />
          <!-- Contacts button -->
          <UButton v-if="contacts?.length" color="neutral" variant="ghost" size="xs" icon="i-lucide-users"
            title="Select contact" :disabled="disabled" @click="contactsOpen = !contactsOpen" />
        </div>
      </template>
    </UInput>

    <!-- Error message -->
    <p v-if="error" class="mt-1 text-sm text-error">
      {{ error }}
    </p>

    <!-- Phase 6: Contact suggestions dropdown with semantic colors -->
    <div v-if="showSuggestions"
      class="absolute z-10 w-full mt-1 bg-background border border-default rounded-lg shadow-lg overflow-hidden">
      <button v-for="contact in filteredContacts" :key="contact.id" type="button"
        class="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
        @click="selectContact(contact)">
        <Avatar :alt="contact.name" size="sm" />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ contact.name }}</p>
          <p class="text-sm text-muted font-mono truncate">
            {{ contact.address }}
          </p>
        </div>
      </button>
    </div>
  </div>
</template>
