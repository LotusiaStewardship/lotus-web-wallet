<script setup lang="ts">
import { useContactsStore, type Contact } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'
import { useAddressFormat } from '~/composables/useUtils'

definePageMeta({
  title: 'Contacts',
})

const contactsStore = useContactsStore()
const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const toast = useToast()
const { getAddressFingerprint, truncateAddress } = useAddressFormat()

// Initialize contacts store
onMounted(() => {
  contactsStore.initialize()
})

// UI State
const searchQuery = ref('')
const selectedTag = ref<string | null>(null)
const showFavoritesOnly = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showImportModal = ref(false)
const editingContact = ref<Contact | null>(null)
const deletingContact = ref<Contact | null>(null)

// Filtered contacts (favorites first)
const filteredContacts = computed(() => {
  let contacts = contactsStore.contactsWithFavoritesFirst

  // Filter by favorites only
  if (showFavoritesOnly.value) {
    contacts = contacts.filter((c) => c.isFavorite)
  }

  // Filter by search
  if (searchQuery.value) {
    contacts = contactsStore.searchContacts(searchQuery.value)
    if (showFavoritesOnly.value) {
      contacts = contacts.filter((c) => c.isFavorite)
    }
  }

  // Filter by tag
  if (selectedTag.value) {
    contacts = contacts.filter((c) =>
      c.tags?.some((t) => t.toLowerCase() === selectedTag.value?.toLowerCase())
    )
  }

  return contacts
})

// Toggle favorite
const toggleFavorite = (contact: Contact) => {
  const isFavorite = contactsStore.toggleFavorite(contact.id)
  toast.add({
    title: isFavorite ? 'Added to Favorites' : 'Removed from Favorites',
    description: `${contact.name} ${isFavorite ? 'is now a favorite' : 'is no longer a favorite'}`,
    color: isFavorite ? 'warning' : 'neutral',
    icon: isFavorite ? 'i-lucide-star' : 'i-lucide-star-off',
  })
}

// Tag options for filter
const tagOptions = computed(() => {
  return [
    { label: 'All Tags', value: null },
    ...contactsStore.allTags.map((t) => ({ label: t, value: t })),
  ]
})

// Open edit modal
const openEditModal = (contact: Contact) => {
  editingContact.value = contact
  showEditModal.value = true
}

// Open delete confirmation
const openDeleteModal = (contact: Contact) => {
  deletingContact.value = contact
  showDeleteModal.value = true
}

// Handle contact saved
const handleContactSaved = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingContact.value = null
}

// Handle contact deleted
const confirmDelete = () => {
  if (deletingContact.value) {
    contactsStore.deleteContact(deletingContact.value.id)
    toast.add({
      title: 'Contact Deleted',
      description: `${deletingContact.value.name} has been removed`,
      color: 'success',
      icon: 'i-lucide-trash-2',
    })
  }
  showDeleteModal.value = false
  deletingContact.value = null
}

// Copy address
const copyAddress = async (contact: Contact) => {
  try {
    await navigator.clipboard.writeText(contact.address)
    toast.add({
      title: 'Address Copied',
      description: `${contact.name}'s address copied to clipboard`,
      color: 'success',
      icon: 'i-lucide-copy',
    })
  } catch {
    toast.add({
      title: 'Copy Failed',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Export contacts
const exportContacts = () => {
  const data = contactsStore.exportContacts()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lotus-contacts-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: 'Contacts Exported',
    description: `${contactsStore.contactCount} contacts exported`,
    color: 'success',
    icon: 'i-lucide-download',
  })
}

// Import contacts
const importFileInput = ref<HTMLInputElement | null>(null)
const importData = ref('')

const triggerImport = () => {
  importFileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    importData.value = text
    showImportModal.value = true
  } catch {
    toast.add({
      title: 'Import Failed',
      description: 'Could not read file',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }

  // Reset input
  target.value = ''
}

const confirmImport = () => {
  try {
    const contacts = JSON.parse(importData.value)
    const count = contactsStore.importContacts(contacts, true)
    toast.add({
      title: 'Contacts Imported',
      description: `${count} new contacts imported`,
      color: 'success',
      icon: 'i-lucide-upload',
    })
  } catch {
    toast.add({
      title: 'Import Failed',
      description: 'Invalid contacts file',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
  showImportModal.value = false
  importData.value = ''
}

// Navigate to send with contact
const sendToContact = (contact: Contact) => {
  navigateTo({
    path: '/send',
    query: { address: contact.address },
  })
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header Card -->
    <UCard>
      <div class="text-center py-4">
        <UIcon name="i-lucide-users" class="w-12 h-12 text-primary mx-auto mb-3" />
        <h1 class="text-2xl font-bold mb-1">Contacts</h1>
        <p class="text-muted text-sm">
          {{ contactsStore.contactCount }} contact{{ contactsStore.contactCount !== 1 ? 's' : '' }}
          <span v-if="contactsStore.favoriteCount > 0"> · {{ contactsStore.favoriteCount }} favorite{{
            contactsStore.favoriteCount !== 1 ? 's' : '' }}</span>
        </p>
      </div>
    </UCard>

    <!-- Actions Bar -->
    <div class="flex items-center justify-end gap-2">
      <UDropdownMenu :items="[
        [
          { label: 'Export Contacts', icon: 'i-lucide-download', click: exportContacts, disabled: contactsStore.contactCount === 0 },
          { label: 'Import Contacts', icon: 'i-lucide-upload', click: triggerImport },
        ],
      ]">
        <UButton color="neutral" variant="outline" icon="i-lucide-more-horizontal" />
      </UDropdownMenu>
      <UButton color="primary" icon="i-lucide-user-plus" @click="showAddModal = true">
        Add Contact
      </UButton>
    </div>

    <!-- Hidden file input for import -->
    <input ref="importFileInput" type="file" accept=".json" class="hidden" @change="handleFileSelect" />

    <!-- Search and Filters -->
    <UCard>
      <div class="flex flex-col md:flex-row gap-4">
        <UInput v-model="searchQuery" placeholder="Search by name, address, or tag..." class="flex-1"
          icon="i-lucide-search" />
        <div class="flex gap-2">
          <UButton :color="showFavoritesOnly ? 'warning' : 'neutral'" :variant="showFavoritesOnly ? 'solid' : 'outline'"
            icon="i-lucide-star" @click="showFavoritesOnly = !showFavoritesOnly">
            <span class="hidden sm:inline">Favorites</span>
            <UBadge v-if="contactsStore.favoriteCount > 0" color="warning" variant="subtle" size="xs" class="ml-1">
              {{ contactsStore.favoriteCount }}
            </UBadge>
          </UButton>
          <USelectMenu v-if="contactsStore.allTags.length > 0" v-model="selectedTag" :items="tagOptions"
            value-key="value" class="w-full md:w-40">
            <template #leading>
              <UIcon name="i-lucide-tag" class="w-4 h-4" />
            </template>
          </USelectMenu>
        </div>
      </div>
    </UCard>

    <!-- Empty State -->
    <UCard v-if="contactsStore.contactCount === 0">
      <EmptyState icon="i-lucide-users" icon-size="lg" title="No Contacts Yet"
        description="Add contacts to quickly send Lotus to friends, family, or services you use frequently.">
        <template #actions>
          <div class="flex gap-2 justify-center">
            <UButton color="primary" icon="i-lucide-user-plus" @click="showAddModal = true">
              Add Your First Contact
            </UButton>
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" @click="triggerImport">
              Import Contacts
            </UButton>
          </div>
        </template>
      </EmptyState>
    </UCard>

    <!-- No Results -->
    <UCard v-else-if="filteredContacts.length === 0">
      <EmptyState icon="i-lucide-search-x" title="No Contacts Found"
        description="Try adjusting your search or filters" />
    </UCard>

    <!-- Contact List -->
    <div v-else class="grid gap-3">
      <ContactsContactCard v-for="contact in filteredContacts" :key="contact.id" :contact="contact"
        @edit="openEditModal" @delete="openDeleteModal" @send="sendToContact" @copy="copyAddress"
        @toggle-favorite="toggleFavorite" />
    </div>

    <!-- Add Contact Modal -->
    <UModal v-model:open="showAddModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-plus" class="w-5 h-5" />
              <span class="font-semibold">Add Contact</span>
            </div>
          </template>
          <ContactsContactForm @saved="handleContactSaved" @cancel="showAddModal = false" />
        </UCard>
      </template>
    </UModal>

    <!-- Edit Contact Modal -->
    <UModal v-model:open="showEditModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-pencil" class="w-5 h-5" />
              <span class="font-semibold">Edit Contact</span>
            </div>
          </template>
          <ContactsContactForm :contact="editingContact" @saved="handleContactSaved"
            @cancel="showEditModal = false; editingContact = null" />
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-error-500">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" />
              <span class="font-semibold">Delete Contact</span>
            </div>
          </template>
          <div class="space-y-4">
            <p>
              Are you sure you want to delete
              <strong>{{ deletingContact?.name }}</strong>?
            </p>
            <p class="text-sm text-muted">This action cannot be undone.</p>
            <div class="flex gap-2">
              <UButton block color="error" icon="i-lucide-trash-2" @click="confirmDelete">
                Delete Contact
              </UButton>
              <UButton color="neutral" variant="outline" @click="showDeleteModal = false; deletingContact = null">
                Cancel
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Import Confirmation Modal -->
    <UModal v-model:open="showImportModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-upload" class="w-5 h-5" />
              <span class="font-semibold">Import Contacts</span>
            </div>
          </template>
          <div class="space-y-4">
            <p>
              Import contacts from the selected file? Existing contacts with the same address will be skipped.
            </p>
            <div class="flex gap-2">
              <UButton block color="primary" icon="i-lucide-upload" @click="confirmImport">
                Import
              </UButton>
              <UButton color="neutral" variant="outline" @click="showImportModal = false; importData = ''">
                Cancel
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
