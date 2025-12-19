# Phase 6: Contacts System

## Overview

The contacts system needs organization features (groups), per-contact transaction history, and verification capabilities. This phase builds a complete contact management experience.

**Priority**: P1 (High)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 5 (History), existing contacts components

---

## Goals

1. Contact list with search and favorites
2. Contact groups (Family, Business, Services, etc.)
3. Per-contact transaction history
4. Contact verification via QR code
5. Import/export contacts
6. Quick stats per contact

---

## 1. People Hub Page

### File: `pages/people/index.vue`

```vue
<script setup lang="ts">
import { useContactsStore } from '~/stores/contacts'
import { useP2PStore } from '~/stores/p2p'

definePageMeta({
  title: 'People',
})

const contactsStore = useContactsStore()
const p2pStore = useP2PStore()

const subPages = [
  {
    label: 'Contacts',
    icon: 'i-lucide-users',
    to: '/people/contacts',
    description: 'Manage your saved addresses',
    color: 'primary',
    badge: contactsStore.contacts.length,
  },
  {
    label: 'P2P Network',
    icon: 'i-lucide-globe',
    to: '/people/p2p',
    description: 'Connect with other wallets',
    color: 'info',
    badge: p2pStore.connectedPeers.length,
  },
]
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-users"
      title="People"
      subtitle="Manage contacts and connect with others"
    />

    <div class="grid gap-4 md:grid-cols-2">
      <AppActionCard
        v-for="page in subPages"
        :key="page.to"
        :icon="page.icon"
        :label="page.label"
        :description="page.description"
        :to="page.to"
        :icon-color="page.color"
      >
        <template #badge v-if="page.badge">
          <UBadge color="neutral" variant="soft" size="sm">
            {{ page.badge }}
          </UBadge>
        </template>
      </AppActionCard>
    </div>
  </div>
</template>
```

---

## 2. Contacts Page

### File: `pages/people/contacts.vue`

```vue
<script setup lang="ts">
import { useContactsStore } from '~/stores/contacts'
import { useOnboardingStore } from '~/stores/onboarding'
import type { Contact, ContactGroup } from '~/types/contact'

definePageMeta({
  title: 'Contacts',
})

const route = useRoute()
const router = useRouter()
const contactsStore = useContactsStore()
const onboardingStore = useOnboardingStore()

// Search
const searchQuery = ref('')

// Selected group filter
const selectedGroup = ref<string | null>(null)

// Show favorites only
const showFavoritesOnly = ref(false)

// Modals
const showAddModal = ref(route.query.add === 'true')
const showImportModal = ref(false)
const showGroupModal = ref(false)
const selectedContact = ref<Contact | null>(null)

// Pre-fill address from query
const prefillAddress = ref((route.query.address as string) || '')

// Filtered contacts
const filteredContacts = computed(() => {
  let contacts = [...contactsStore.contacts]

  // Favorites filter
  if (showFavoritesOnly.value) {
    contacts = contacts.filter(c => c.favorite)
  }

  // Group filter
  if (selectedGroup.value) {
    contacts = contacts.filter(c => c.groups?.includes(selectedGroup.value!))
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    contacts = contacts.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query) ||
        c.notes?.toLowerCase().includes(query),
    )
  }

  // Sort: favorites first, then alphabetically
  contacts.sort((a, b) => {
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1
    return a.name.localeCompare(b.name)
  })

  return contacts
})

// Groups
const groups = computed(() => contactsStore.groups)

// Handle add contact
function handleAddContact(contact: Partial<Contact>) {
  contactsStore.addContact(contact)
  showAddModal.value = false
  prefillAddress.value = ''
  onboardingStore.completeChecklistItem('addContact')
}

// Handle edit contact
function handleEditContact(contact: Contact) {
  selectedContact.value = contact
  showAddModal.value = true
}

// Handle delete contact
function handleDeleteContact(contact: Contact) {
  if (confirm(`Delete ${contact.name}?`)) {
    contactsStore.deleteContact(contact.id)
  }
}

// Handle toggle favorite
function toggleFavorite(contact: Contact) {
  contactsStore.updateContact(contact.id, { favorite: !contact.favorite })
}

// View contact details
function viewContact(contact: Contact) {
  selectedContact.value = contact
}

// Send to contact
function sendToContact(contact: Contact) {
  router.push(`/transact/send?to=${contact.address}`)
}

// Export contacts
function exportContacts() {
  const data = JSON.stringify(contactsStore.contacts, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lotus-contacts-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-users"
      title="Contacts"
      :subtitle="`${contactsStore.contacts.length} saved contacts`"
    >
      <template #action>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="showImportModal = true"
          >
            <UIcon name="i-lucide-upload" class="w-4 h-4 mr-2" />
            Import
          </UButton>
          <UButton color="primary" @click="showAddModal = true">
            <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
            Add Contact
          </UButton>
        </div>
      </template>
    </AppHeroCard>

    <!-- Search & Filters -->
    <div class="flex flex-wrap gap-3">
      <!-- Search -->
      <div class="flex-1 min-w-[200px] relative">
        <UIcon
          name="i-lucide-search"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search contacts..."
          class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      <!-- Favorites Toggle -->
      <UButton
        :color="showFavoritesOnly ? 'primary' : 'neutral'"
        :variant="showFavoritesOnly ? 'soft' : 'ghost'"
        @click="showFavoritesOnly = !showFavoritesOnly"
      >
        <UIcon name="i-lucide-star" class="w-4 h-4 mr-2" />
        Favorites
      </UButton>

      <!-- Group Filter -->
      <USelectMenu
        v-model="selectedGroup"
        :items="[
          { value: null, label: 'All Groups' },
          ...groups.map(g => ({ value: g.id, label: g.name })),
        ]"
        value-key="value"
        placeholder="All Groups"
        class="w-40"
      />

      <!-- Manage Groups -->
      <UButton color="neutral" variant="ghost" @click="showGroupModal = true">
        <UIcon name="i-lucide-folder-plus" class="w-4 h-4" />
      </UButton>
    </div>

    <!-- Contact List -->
    <div
      v-if="filteredContacts.length > 0"
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <ContactCard
        v-for="contact in filteredContacts"
        :key="contact.id"
        :contact="contact"
        @click="viewContact(contact)"
        @edit="handleEditContact(contact)"
        @delete="handleDeleteContact(contact)"
        @toggle-favorite="toggleFavorite(contact)"
        @send="sendToContact(contact)"
      />
    </div>

    <!-- Empty State -->
    <AppEmptyState
      v-else
      icon="i-lucide-users"
      :title="searchQuery ? 'No contacts found' : 'No contacts yet'"
      :description="
        searchQuery
          ? 'Try a different search term'
          : 'Add contacts to easily send Lotus to friends and family'
      "
    >
      <template #action>
        <UButton color="primary" @click="showAddModal = true">
          <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
          Add Your First Contact
        </UButton>
      </template>
    </AppEmptyState>

    <!-- Add/Edit Contact Modal -->
    <ContactFormModal
      v-model:open="showAddModal"
      :contact="selectedContact"
      :prefill-address="prefillAddress"
      @save="handleAddContact"
      @close="
        selectedContact = null
        prefillAddress = ''
      "
    />

    <!-- Contact Detail Slideover -->
    <ContactDetailSlideover
      v-model:open="!!selectedContact && !showAddModal"
      :contact="selectedContact"
      @edit="handleEditContact"
      @delete="handleDeleteContact"
      @send="sendToContact"
      @close="selectedContact = null"
    />

    <!-- Import Modal -->
    <ContactImportModal v-model:open="showImportModal" />

    <!-- Group Management Modal -->
    <ContactGroupModal v-model:open="showGroupModal" />
  </div>
</template>
```

---

## 3. Contact Card Component

### File: `components/contacts/ContactCard.vue`

```vue
<script setup lang="ts">
import type { Contact } from '~/types/contact'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  contact: Contact
}>()

const emit = defineEmits<{
  click: []
  edit: []
  delete: []
  toggleFavorite: []
  send: []
}>()

const walletStore = useWalletStore()

// Get transaction stats with this contact
const stats = computed(() => {
  const txs = walletStore.transactions.filter(
    tx =>
      tx.toAddress === props.contact.address ||
      tx.fromAddress === props.contact.address,
  )
  const sent = txs
    .filter(tx => tx.type === 'send')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const received = txs
    .filter(tx => tx.type === 'receive')
    .reduce((sum, tx) => sum + tx.amount, 0)
  return {
    count: txs.length,
    sent: sent / 1e6,
    received: received / 1e6,
    lastTx: txs[0]?.timestamp,
  }
})

// Format last transaction time
const lastTxTime = computed(() => {
  if (!stats.value.lastTx) return null
  const date = new Date(stats.value.lastTx * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
})

// Menu items
const menuItems = computed(() => [
  [
    { label: 'Send', icon: 'i-lucide-send', click: () => emit('send') },
    { label: 'Edit', icon: 'i-lucide-pencil', click: () => emit('edit') },
  ],
  [
    {
      label: props.contact.favorite
        ? 'Remove from Favorites'
        : 'Add to Favorites',
      icon: 'i-lucide-star',
      click: () => emit('toggleFavorite'),
    },
  ],
  [
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      click: () => emit('delete'),
      color: 'error',
    },
  ],
])
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    @click="emit('click')"
  >
    <div class="flex items-start gap-3">
      <!-- Avatar -->
      <ContactAvatar :contact="contact" size="lg" />

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold truncate">{{ contact.name }}</h3>
          <UIcon
            v-if="contact.favorite"
            name="i-lucide-star"
            class="w-4 h-4 text-yellow-500 shrink-0"
          />
        </div>
        <div class="text-sm text-gray-500 font-mono truncate">
          {{ contact.address.slice(0, 12) }}...{{ contact.address.slice(-6) }}
        </div>

        <!-- Groups -->
        <div v-if="contact.groups?.length" class="flex flex-wrap gap-1 mt-2">
          <UBadge
            v-for="groupId in contact.groups.slice(0, 2)"
            :key="groupId"
            color="neutral"
            variant="soft"
            size="xs"
          >
            {{ groupId }}
          </UBadge>
          <UBadge
            v-if="contact.groups.length > 2"
            color="neutral"
            variant="soft"
            size="xs"
          >
            +{{ contact.groups.length - 2 }}
          </UBadge>
        </div>
      </div>

      <!-- Menu -->
      <UDropdownMenu :items="menuItems" @click.stop>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-more-vertical"
        />
      </UDropdownMenu>
    </div>

    <!-- Stats -->
    <div
      v-if="stats.count > 0"
      class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700"
    >
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">{{ stats.count }} transactions</span>
        <span v-if="lastTxTime" class="text-gray-400"
          >Last: {{ lastTxTime }}</span
        >
      </div>
    </div>
  </div>
</template>
```

---

## 4. Contact Detail Slideover

### File: `components/contacts/ContactDetailSlideover.vue`

```vue
<script setup lang="ts">
import type { Contact } from '~/types/contact'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  contact: Contact | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  edit: [contact: Contact]
  delete: [contact: Contact]
  send: [contact: Contact]
  close: []
}>()

const walletStore = useWalletStore()

// Transactions with this contact
const transactions = computed(() => {
  if (!props.contact) return []
  return walletStore.transactions
    .filter(
      tx =>
        tx.toAddress === props.contact!.address ||
        tx.fromAddress === props.contact!.address,
    )
    .slice(0, 10)
})

// Stats
const stats = computed(() => {
  if (!props.contact) return null
  const txs = walletStore.transactions.filter(
    tx =>
      tx.toAddress === props.contact!.address ||
      tx.fromAddress === props.contact!.address,
  )
  const sent = txs
    .filter(tx => tx.type === 'send')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const received = txs
    .filter(tx => tx.type === 'receive')
    .reduce((sum, tx) => sum + tx.amount, 0)
  return {
    totalTx: txs.length,
    sent: sent / 1e6,
    received: received / 1e6,
    net: (received - sent) / 1e6,
  }
})

// Copy address
const copied = ref(false)
function copyAddress() {
  if (!props.contact) return
  navigator.clipboard.writeText(props.contact.address)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <USlideover v-model:open="open" side="right" :ui="{ width: 'max-w-md' }">
    <template v-if="contact">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-start gap-4 mb-6">
          <ContactAvatar :contact="contact" size="xl" />
          <div class="flex-1">
            <h2 class="text-xl font-bold">{{ contact.name }}</h2>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-sm text-gray-500 font-mono truncate">
                {{ contact.address.slice(0, 16) }}...
              </span>
              <button
                @click="copyAddress"
                class="text-gray-400 hover:text-primary"
              >
                <UIcon
                  :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                  class="w-4 h-4"
                />
              </button>
            </div>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            @click="emit('close')"
          />
        </div>

        <!-- Quick Actions -->
        <div class="flex gap-2 mb-6">
          <UButton
            color="primary"
            class="flex-1"
            @click="emit('send', contact)"
          >
            <UIcon name="i-lucide-send" class="w-4 h-4 mr-2" />
            Send
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            @click="emit('edit', contact)"
          >
            <UIcon name="i-lucide-pencil" class="w-4 h-4" />
          </UButton>
        </div>

        <!-- Stats -->
        <div v-if="stats" class="grid grid-cols-3 gap-4 mb-6">
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="text-2xl font-bold">{{ stats.totalTx }}</div>
            <div class="text-xs text-gray-500">Transactions</div>
          </div>
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="text-2xl font-bold text-red-500">
              {{ stats.sent.toFixed(2) }}
            </div>
            <div class="text-xs text-gray-500">Sent (XPI)</div>
          </div>
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="text-2xl font-bold text-green-500">
              {{ stats.received.toFixed(2) }}
            </div>
            <div class="text-xs text-gray-500">Received (XPI)</div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="contact.notes" class="mb-6">
          <h3
            class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2"
          >
            Notes
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ contact.notes }}
          </p>
        </div>

        <!-- Groups -->
        <div v-if="contact.groups?.length" class="mb-6">
          <h3
            class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2"
          >
            Groups
          </h3>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="groupId in contact.groups"
              :key="groupId"
              color="primary"
              variant="soft"
            >
              {{ groupId }}
            </UBadge>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div>
          <h3
            class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2"
          >
            Recent Transactions
          </h3>
          <div v-if="transactions.length > 0" class="space-y-2">
            <TransactionListItem
              v-for="tx in transactions"
              :key="tx.txid"
              :transaction="tx"
              compact
            />
          </div>
          <div v-else class="text-sm text-gray-500 text-center py-4">
            No transactions with this contact yet
          </div>
        </div>

        <!-- Delete Button -->
        <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <UButton
            color="error"
            variant="soft"
            block
            @click="emit('delete', contact)"
          >
            <UIcon name="i-lucide-trash-2" class="w-4 h-4 mr-2" />
            Delete Contact
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
```

---

## 5. Contact Form Modal

### File: `components/contacts/ContactFormModal.vue`

```vue
<script setup lang="ts">
import type { Contact } from '~/types/contact'
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  contact?: Contact | null
  prefillAddress?: string
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  save: [contact: Partial<Contact>]
  close: []
}>()

const contactsStore = useContactsStore()
const walletStore = useWalletStore()

// Form state
const form = reactive({
  name: '',
  address: '',
  notes: '',
  groups: [] as string[],
  favorite: false,
})

// Reset form when modal opens
watch(open, isOpen => {
  if (isOpen) {
    if (props.contact) {
      // Edit mode
      form.name = props.contact.name
      form.address = props.contact.address
      form.notes = props.contact.notes || ''
      form.groups = props.contact.groups || []
      form.favorite = props.contact.favorite || false
    } else {
      // Add mode
      form.name = ''
      form.address = props.prefillAddress || ''
      form.notes = ''
      form.groups = []
      form.favorite = false
    }
  }
})

// Validation
const addressValid = computed(() => {
  if (!form.address) return null
  return walletStore.validateAddress(form.address)
})

const canSave = computed(() => {
  return form.name.trim() && form.address.trim() && addressValid.value
})

// Save
function save() {
  if (!canSave.value) return

  emit('save', {
    id: props.contact?.id,
    name: form.name.trim(),
    address: form.address.trim(),
    notes: form.notes.trim() || undefined,
    groups: form.groups.length > 0 ? form.groups : undefined,
    favorite: form.favorite,
  })
}

// Available groups
const availableGroups = computed(() => contactsStore.groups)
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <div class="p-6">
      <h2 class="text-xl font-bold mb-6">
        {{ contact ? 'Edit Contact' : 'Add Contact' }}
      </h2>

      <form @submit.prevent="save" class="space-y-4">
        <!-- Name -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Name *
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Enter name"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          />
        </div>

        <!-- Address -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Address *
          </label>
          <input
            v-model="form.address"
            type="text"
            placeholder="lotus_test1q..."
            class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
            :class="{
              'border-red-500 focus:ring-red-500': addressValid === false,
              'border-green-500 focus:ring-green-500': addressValid === true,
            }"
            required
          />
          <p v-if="addressValid === false" class="text-sm text-red-500 mt-1">
            Invalid address format
          </p>
        </div>

        <!-- Notes -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Notes
          </label>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Add notes about this contact..."
            class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <!-- Groups -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Groups
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="group in availableGroups"
              :key="group.id"
              type="button"
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="
                form.groups.includes(group.id)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              "
              @click="
                form.groups.includes(group.id)
                  ? (form.groups = form.groups.filter(g => g !== group.id))
                  : form.groups.push(group.id)
              "
            >
              {{ group.name }}
            </button>
          </div>
        </div>

        <!-- Favorite -->
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="form.favorite"
            type="checkbox"
            class="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span class="text-sm">Add to favorites</span>
        </label>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            class="flex-1"
            @click="
              open = false
              emit('close')
            "
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            class="flex-1"
            :disabled="!canSave"
          >
            {{ contact ? 'Save Changes' : 'Add Contact' }}
          </UButton>
        </div>
      </form>
    </div>
  </UModal>
</template>
```

---

## 6. Contact Group Modal

### File: `components/contacts/ContactGroupModal.vue`

```vue
<script setup lang="ts">
import { useContactsStore } from '~/stores/contacts'

const open = defineModel<boolean>('open', { default: false })

const contactsStore = useContactsStore()

// New group name
const newGroupName = ref('')

// Add group
function addGroup() {
  if (!newGroupName.value.trim()) return
  contactsStore.addGroup({
    id: newGroupName.value.toLowerCase().replace(/\s+/g, '-'),
    name: newGroupName.value.trim(),
  })
  newGroupName.value = ''
}

// Delete group
function deleteGroup(groupId: string) {
  if (
    confirm('Delete this group? Contacts in this group will not be deleted.')
  ) {
    contactsStore.deleteGroup(groupId)
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-sm' }">
    <div class="p-6">
      <h2 class="text-xl font-bold mb-6">Manage Groups</h2>

      <!-- Add Group -->
      <div class="flex gap-2 mb-6">
        <input
          v-model="newGroupName"
          type="text"
          placeholder="New group name"
          class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
          @keyup.enter="addGroup"
        />
        <UButton
          color="primary"
          :disabled="!newGroupName.trim()"
          @click="addGroup"
        >
          Add
        </UButton>
      </div>

      <!-- Group List -->
      <div class="space-y-2">
        <div
          v-for="group in contactsStore.groups"
          :key="group.id"
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-folder" class="w-4 h-4 text-gray-400" />
            <span>{{ group.name }}</span>
          </div>
          <UButton
            color="error"
            variant="ghost"
            size="xs"
            icon="i-lucide-trash-2"
            @click="deleteGroup(group.id)"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="contactsStore.groups.length === 0"
        class="text-center py-8 text-gray-500"
      >
        <UIcon
          name="i-lucide-folder-plus"
          class="w-12 h-12 mx-auto mb-2 opacity-50"
        />
        <p>No groups yet</p>
        <p class="text-sm">Create groups to organize your contacts</p>
      </div>

      <!-- Close -->
      <UButton
        color="neutral"
        variant="soft"
        block
        class="mt-6"
        @click="open = false"
      >
        Done
      </UButton>
    </div>
  </UModal>
</template>
```

---

## 7. Implementation Checklist

### Pages

- [ ] Create `pages/people/index.vue` (hub)
- [ ] Create `pages/people/contacts.vue`

### Components

- [ ] Create/update `components/contacts/ContactCard.vue`
- [ ] Create/update `components/contacts/ContactDetailSlideover.vue`
- [ ] Create/update `components/contacts/ContactFormModal.vue`
- [ ] Create `components/contacts/ContactGroupModal.vue`
- [ ] Create `components/contacts/ContactImportModal.vue`
- [ ] Create/update `components/contacts/ContactAvatar.vue`

### Store Updates

- [ ] Add `groups` to contacts store
- [ ] Add `addGroup`, `deleteGroup` methods
- [ ] Add `getContactByAddress` method
- [ ] Add `recentContacts` getter

### Features

- [ ] Contact search
- [ ] Favorites filter
- [ ] Group filter
- [ ] Contact groups management
- [ ] Per-contact transaction history
- [ ] Contact stats
- [ ] Import/export contacts
- [ ] Add from send success

### Testing

- [ ] Test add/edit/delete contact
- [ ] Test search and filters
- [ ] Test group management
- [ ] Test contact detail view
- [ ] Test transaction history per contact
- [ ] Test import/export

---

## Next Phase

Once this phase is complete, proceed to [07_EXPLORER_PAGES.md](./07_EXPLORER_PAGES.md) to implement the explorer pages.
