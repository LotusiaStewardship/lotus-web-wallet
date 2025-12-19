<script setup lang="ts">
/**
 * ContactPicker
 *
 * Dropdown/modal for selecting a contact.
 */
import type { Contact } from '~/stores/contacts'
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  /** Whether picker is open */
  open: boolean
  /** Placeholder text */
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [contact: Contact]
}>()

const contactsStore = useContactsStore()
const { toFingerprint } = useAddress()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const searchQuery = ref('')

const filteredContacts = computed(() => {
  const contacts = contactsStore.contacts
  if (!searchQuery.value) {
    return contacts.slice(0, 10)
  }

  const query = searchQuery.value.toLowerCase()
  return contacts
    .filter(
      (c: Contact) =>
        c.name.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query),
    )
    .slice(0, 10)
})

function selectContact(contact: Contact) {
  emit('select', contact)
  isOpen.value = false
  searchQuery.value = ''
}

// Reset search on close
watch(isOpen, open => {
  if (!open) {
    searchQuery.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-users" class="w-5 h-5" />
        <span class="font-semibold">Select Contact</span>
      </div>
    </template>

    <template #body>
      <!-- Search -->
      <UInput v-model="searchQuery" icon="i-lucide-search" :placeholder="placeholder || 'Search contacts...'" autofocus
        class="mb-4" />

      <!-- Contact List -->
      <div v-if="filteredContacts.length" class="divide-y divide-default max-h-64 overflow-y-auto -mx-4">
        <button v-for="contact in filteredContacts" :key="contact.id" type="button"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
          @click="selectContact(contact)">
          <ContactsAvatar :contact="contact" size="sm" />
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }}</p>
            <p class="text-sm text-muted truncate">
              {{ toFingerprint(contact.address) }}
            </p>
          </div>
          <UIcon v-if="contact.isFavorite" name="i-lucide-star" class="w-4 h-4 text-warning flex-shrink-0" />
        </button>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-8">
        <UIcon name="i-lucide-users" class="w-12 h-12 text-muted mx-auto mb-2" />
        <p class="text-muted">
          {{ searchQuery ? 'No contacts found' : 'No contacts yet' }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          Cancel
        </UButton>
      </div>
    </template>
  </UModal>
</template>
