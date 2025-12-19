<script setup lang="ts">
/**
 * Contacts Page
 *
 * Manage saved addresses and contacts.
 */
import { useContactsStore, type Contact } from '~/stores/contacts'
import { useOnboardingStore } from '~/stores/onboarding'

definePageMeta({
  title: 'Contacts',
})

const contactsStore = useContactsStore()
const onboardingStore = useOnboardingStore()
const route = useRoute()
const { success, error } = useNotifications()

// Search
const searchQuery = ref('')

// window navigator
const navigator = window.navigator

// Add contact modal
const showAddModal = ref(false)
const newContact = ref({
  name: '',
  address: '',
  notes: '',
})
const saving = ref(false)

// Edit contact modal
const showEditModal = ref(false)
const editingContact = ref<{ id: string; name: string; address: string; notes: string } | null>(null)

// Contact detail slideover
const showDetailSlideover = ref(false)
const selectedContact = ref<Contact | null>(null)

function openContactDetail(contact: Contact) {
  selectedContact.value = contact
  showDetailSlideover.value = true
}

function handleSendToContact(contact: Contact) {
  showDetailSlideover.value = false
  navigateTo(`/transact/send?to=${contact.address}`)
}

function handleEditFromDetail(contact: Contact) {
  showDetailSlideover.value = false
  openEditModal(contact)
}

async function handleDeleteFromDetail(contact: Contact) {
  showDetailSlideover.value = false
  await deleteContact(contact)
}

function openEditModal(contact: Contact) {
  editingContact.value = {
    id: contact.id,
    name: contact.name,
    address: contact.address,
    notes: contact.notes || '',
  }
  showEditModal.value = true
}

async function saveEditedContact() {
  if (!editingContact.value || !editingContact.value.name || !editingContact.value.address) return

  saving.value = true
  try {
    await contactsStore.updateContact(editingContact.value.id, {
      name: editingContact.value.name,
      address: editingContact.value.address,
      notes: editingContact.value.notes,
    })
    success('Contact Updated', `${editingContact.value.name} has been updated`)
    showEditModal.value = false
    editingContact.value = null
  } catch (e: any) {
    error('Failed', e.message || 'Could not update contact')
  } finally {
    saving.value = false
  }
}

// Check for add query param
onMounted(() => {
  contactsStore.initialize()
  if (route.query.add === 'true') {
    showAddModal.value = true
  }
})

// Filtered contacts
const filteredContacts = computed(() => {
  if (!searchQuery.value) {
    return contactsStore.sortedContacts
  }
  return contactsStore.searchContacts(searchQuery.value)
})

// Add contact
async function addContact() {
  if (!newContact.value.name || !newContact.value.address) return

  saving.value = true
  try {
    await contactsStore.addContact({
      name: newContact.value.name,
      address: newContact.value.address,
      notes: newContact.value.notes,
    })

    // Mark checklist item complete
    onboardingStore.completeChecklistItem('addContact')

    success('Contact Added', `${newContact.value.name} has been added`)
    showAddModal.value = false
    newContact.value = { name: '', address: '', notes: '' }
  } catch (e: any) {
    error('Failed', e.message || 'Could not add contact')
  } finally {
    saving.value = false
  }
}

// Delete contact
async function deleteContact(contact: { id: string; name: string }) {
  if (!confirm(`Delete ${contact.name}?`)) return

  try {
    await contactsStore.deleteContact(contact.id)
    success('Deleted', `${contact.name} has been removed`)
  } catch (e: any) {
    error('Failed', e.message || 'Could not delete contact')
  }
}

// Toggle favorite
function toggleFavorite(contact: { id: string }) {
  contactsStore.toggleFavorite(contact.id)
}

// Group management
const showGroupModal = ref(false)
const selectedGroupFilter = ref<string | null>(null)

function createGroup(name: string, icon: string, color: string) {
  contactsStore.createGroup(name, icon, color)
  showGroupModal.value = false
  success('Group Created', `${name} has been created`)
}

function deleteGroup(groupId: string) {
  const group = contactsStore.getGroupById(groupId)
  if (!group) return
  if (!confirm(`Delete group "${group.name}"? Contacts will be ungrouped.`)) return

  contactsStore.deleteGroup(groupId)
  if (selectedGroupFilter.value === groupId) {
    selectedGroupFilter.value = null
  }
  success('Group Deleted', `${group.name} has been deleted`)
}

function assignContactToGroup(contactId: string, groupId: string | null) {
  contactsStore.assignToGroup(contactId, groupId)
}

// Filtered contacts with group filter
const displayedContacts = computed(() => {
  let contacts = filteredContacts.value
  if (selectedGroupFilter.value) {
    contacts = contacts.filter(c => c.groupId === selectedGroupFilter.value)
  }
  return contacts
})

// Get group for a contact
function getContactGroup(contact: any) {
  if (!contact.groupId) return null
  return contactsStore.getGroupById(contact.groupId)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header with Search and Add -->
    <div class="flex items-center gap-3">
      <UInput v-model="searchQuery" placeholder="Search contacts..." icon="i-lucide-search" class="flex-1" />
      <UButton color="primary" icon="i-lucide-plus" @click="showAddModal = true">
        Add
      </UButton>
    </div>

    <!-- Groups Filter -->
    <div v-if="contactsStore.groups.length > 0" class="flex items-center gap-2 overflow-x-auto pb-1">
      <button :class="[
        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
        !selectedGroupFilter ? 'bg-primary text-white' : 'bg-muted/50 hover:bg-muted'
      ]" @click="selectedGroupFilter = null">
        All
      </button>
      <button v-for="group in contactsStore.sortedGroups" :key="group.id" :class="[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
        selectedGroupFilter === group.id ? `bg-${group.color} text-white` : 'bg-muted/50 hover:bg-muted'
      ]" @click="selectedGroupFilter = group.id">
        <UIcon :name="group.icon" class="w-3.5 h-3.5" />
        {{ group.name }}
        <span class="text-xs opacity-75">({{ contactsStore.getContactsByGroup(group.id).length }})</span>
      </button>
      <button class="px-2 py-1.5 rounded-full text-sm text-muted hover:text-primary transition-colors"
        @click="showGroupModal = true">
        <UIcon name="i-lucide-plus" class="w-4 h-4" />
      </button>
    </div>

    <!-- Create First Group (if none exist) -->
    <div v-else-if="contactsStore.contacts.length > 0"
      class="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-folder" class="w-4 h-4 text-muted" />
        <span class="text-sm text-muted">Organize contacts with groups</span>
      </div>
      <UButton size="xs" variant="ghost" color="primary" @click="showGroupModal = true">
        Create Group
      </UButton>
    </div>

    <!-- Contacts List -->
    <UiAppCard :no-padding="true">
      <!-- Empty State -->
      <UiAppEmptyState v-if="displayedContacts.length === 0" icon="i-lucide-users"
        :title="searchQuery ? 'No contacts found' : 'No contacts yet'"
        :description="searchQuery ? 'Try a different search' : 'Add contacts to easily send XPI'">
        <template v-if="!searchQuery" #action>
          <UButton color="primary" icon="i-lucide-plus" @click="showAddModal = true">
            Add Contact
          </UButton>
        </template>
      </UiAppEmptyState>

      <!-- Contact Items -->
      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="contact in displayedContacts" :key="contact.id"
          class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
          @click="openContactDetail(contact)">
          <!-- Avatar -->
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-sm font-semibold text-primary">
              {{ contact.name.charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-sm">{{ contact.name }}</span>
              <UIcon v-if="contact.isFavorite" name="i-lucide-star" class="w-3.5 h-3.5 text-yellow-500" />
              <UBadge v-if="getContactGroup(contact)" :color="getContactGroup(contact)?.color as any" variant="subtle"
                size="sm">
                {{ getContactGroup(contact)?.name }}
              </UBadge>
            </div>
            <div class="text-xs text-muted truncate font-mono">
              {{ contact.address }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-0.5 shrink-0" @click.stop>
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-send"
              :to="`/transact/send?to=${contact.address}`" />
            <UDropdownMenu :items="[
              [
                { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => openContactDetail(contact) },
                { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEditModal(contact) },
                { label: 'Copy Address', icon: 'i-lucide-copy', onSelect: () => navigator.clipboard.writeText(contact.address) },
                { label: contact.isFavorite ? 'Remove Favorite' : 'Add Favorite', icon: 'i-lucide-star', onSelect: () => toggleFavorite(contact) },
              ],
              contactsStore.groups.length > 0 ? [
                { label: 'Remove from group', icon: 'i-lucide-folder-minus', disabled: !contact.groupId, onSelect: () => assignContactToGroup(contact.id, null) },
                ...contactsStore.sortedGroups.map(g => ({
                  label: `Move to ${g.name}`,
                  icon: g.icon,
                  onSelect: () => assignContactToGroup(contact.id, g.id),
                })),
              ] : [],
              [
                { label: 'Delete', icon: 'i-lucide-trash', onSelect: () => deleteContact(contact) },
              ],
            ].filter(g => g.length > 0)">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-more-vertical" />
            </UDropdownMenu>
          </div>
        </div>
      </div>
    </UiAppCard>

    <!-- Add Contact Modal -->
    <UModal v-model:open="showAddModal">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user-plus" class="w-5 h-5" />
          <span>Add Contact</span>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" required>
            <UInput class="w-full" v-model="newContact.name" placeholder="Contact name" icon="i-lucide-user" />
          </UFormField>

          <UFormField label="Address" required>
            <UInput class="w-full font-mono" v-model="newContact.address" placeholder="lotus_..."
              icon="i-lucide-wallet" />
          </UFormField>

          <UFormField label="Notes (optional)">
            <UTextarea class="w-full" v-model="newContact.notes" placeholder="Add notes..." :rows="3" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="outline" @click="showAddModal = false">
            Cancel
          </UButton>
          <UButton color="primary" :disabled="!newContact.name || !newContact.address" :loading="saving"
            @click="addContact">
            Add Contact
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit Contact Modal -->
    <UModal v-model:open="showEditModal">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pencil" class="w-5 h-5" />
          <span>Edit Contact</span>
        </div>
      </template>

      <template #body>
        <div v-if="editingContact" class="space-y-4">
          <UFormField label="Name" required>
            <UInput class="w-full" v-model="editingContact.name" placeholder="Contact name" icon="i-lucide-user" />
          </UFormField>

          <UFormField label="Address" required>
            <UInput v-model="editingContact.address" placeholder="lotus_..." icon="i-lucide-wallet"
              class="font-mono w-full" />
          </UFormField>

          <UFormField label="Notes (optional)">
            <UTextarea class="w-full" v-model="editingContact.notes" placeholder="Add notes..." :rows="2" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="outline" @click="showEditModal = false; editingContact = null">
            Cancel
          </UButton>
          <UButton color="primary" :disabled="!editingContact?.name || !editingContact?.address" :loading="saving"
            @click="saveEditedContact">
            Save Changes
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Create Group Modal -->
    <ContactsContactGroupModal v-model:open="showGroupModal" @create="createGroup" />

    <!-- Contact Detail Slideover -->
    <ContactsContactDetailSlideover v-model:open="showDetailSlideover" :contact="selectedContact"
      @send="handleSendToContact" @edit="handleEditFromDetail" @delete="handleDeleteFromDetail" />
  </div>
</template>
