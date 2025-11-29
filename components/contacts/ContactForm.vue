<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useContactsStore, type Contact } from '~/stores/contacts'

const props = defineProps<{
  contact?: Contact | null
  prefillAddress?: string
  prefillName?: string
  prefillPeerId?: string
  prefillServiceType?: string
}>()

const emit = defineEmits<{
  saved: [contact: Contact]
  cancel: []
}>()

const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const toast = useToast()

// Form state
const name = ref(props.contact?.name || props.prefillName || '')
const address = ref(props.contact?.address || props.prefillAddress || '')
const notes = ref(props.contact?.notes || '')
const tagsInput = ref(props.contact?.tags?.join(', ') || '')
const peerId = ref(props.contact?.peerId || props.prefillPeerId || '')
const serviceType = ref(props.contact?.serviceType || props.prefillServiceType || '')
const isFavorite = ref(props.contact?.isFavorite || false)

const saving = ref(false)

// Computed
const isEditing = computed(() => !!props.contact)

const isValidAddress = computed(() => {
  if (!address.value) return null
  if (!walletStore.initialized) return null
  return walletStore.isValidAddress(address.value)
})

const isValidName = computed(() => {
  return name.value.trim().length >= 1
})

const addressExists = computed(() => {
  if (!address.value || isEditing.value) return false
  return contactsStore.hasAddress(address.value)
})

const canSave = computed(() => {
  return (
    isValidName.value &&
    isValidAddress.value === true &&
    !addressExists.value &&
    !saving.value
  )
})

// Parse tags from comma-separated input
const parsedTags = computed(() => {
  if (!tagsInput.value.trim()) return []
  return tagsInput.value
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
})

// Save contact
const saveContact = async () => {
  if (!canSave.value) return

  saving.value = true

  try {
    const contactData = {
      name: name.value.trim(),
      address: address.value.trim(),
      notes: notes.value.trim() || undefined,
      tags: parsedTags.value.length > 0 ? parsedTags.value : undefined,
      peerId: peerId.value || undefined,
      serviceType: serviceType.value || undefined,
      isFavorite: isFavorite.value,
    }

    let savedContact: Contact

    if (isEditing.value && props.contact) {
      savedContact = contactsStore.updateContact(props.contact.id, contactData)!
      toast.add({
        title: 'Contact Updated',
        description: `${savedContact.name} has been updated`,
        color: 'success',
        icon: 'i-lucide-check',
      })
    } else {
      savedContact = contactsStore.addContact(contactData)
      toast.add({
        title: 'Contact Added',
        description: `${savedContact.name} has been added to your contacts`,
        color: 'success',
        icon: 'i-lucide-user-plus',
      })
    }

    emit('saved', savedContact)
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save contact',
      color: 'error',
      icon: 'i-lucide-x',
    })
  } finally {
    saving.value = false
  }
}

// Cancel
const cancel = () => {
  emit('cancel')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Name -->
    <UFormField label="Name" required>
      <UInput v-model="name" placeholder="Contact name" :color="name && !isValidName ? 'error' : undefined">
        <template #leading>
          <UIcon name="i-lucide-user" class="w-5 h-5 text-muted" />
        </template>
      </UInput>
      <template #hint>
        <span v-if="name && !isValidName" class="text-error-500">
          Name is required
        </span>
      </template>
    </UFormField>

    <!-- Address -->
    <UFormField label="Lotus Address" required>
      <UInput v-model="address" placeholder="lotus_..." class="font-mono"
        :color="isValidAddress === false || addressExists ? 'error' : undefined" :disabled="isEditing">
        <template #leading>
          <UIcon name="i-lucide-wallet" class="w-5 h-5 text-muted" />
        </template>
      </UInput>
      <template #hint>
        <span v-if="isValidAddress === null && address" class="text-muted">
          Validating...
        </span>
        <span v-else-if="isValidAddress === false" class="text-error-500">
          Invalid Lotus address
        </span>
        <span v-else-if="addressExists" class="text-error-500">
          This address is already in your contacts
        </span>
        <span v-else-if="isValidAddress === true" class="text-success-500">
          Valid address
        </span>
      </template>
    </UFormField>

    <!-- Notes -->
    <UFormField label="Notes" hint="Optional">
      <UTextarea v-model="notes" placeholder="Add notes about this contact..." :rows="2" />
    </UFormField>

    <!-- Tags -->
    <UFormField label="Tags" hint="Comma-separated, optional">
      <UInput v-model="tagsInput" placeholder="friend, business, exchange">
        <template #leading>
          <UIcon name="i-lucide-tag" class="w-5 h-5 text-muted" />
        </template>
      </UInput>
      <template #hint>
        <div v-if="parsedTags.length" class="flex flex-wrap gap-1 mt-1">
          <UBadge v-for="tag in parsedTags" :key="tag" color="primary" variant="subtle" size="xs">
            {{ tag }}
          </UBadge>
        </div>
      </template>
    </UFormField>

    <!-- Favorite Toggle -->
    <div class="flex items-center gap-3 p-3 rounded-lg border border-default">
      <UCheckbox v-model="isFavorite" />
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-star" :class="isFavorite ? 'text-warning-500' : 'text-muted'" class="w-5 h-5" />
        <div>
          <p class="font-medium text-sm">Add to Favorites</p>
          <p class="text-xs text-muted">Favorites appear first in search and quick send</p>
        </div>
      </div>
    </div>

    <!-- P2P Info (read-only if present) -->
    <div v-if="peerId" class="space-y-2 pt-2 border-t border-default">
      <p class="text-sm text-muted">P2P Information</p>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span class="text-muted">Peer ID:</span>
          <code class="ml-1 text-xs">{{ peerId.slice(0, 16) }}...</code>
        </div>
        <div v-if="serviceType">
          <span class="text-muted">Service:</span>
          <UBadge color="info" variant="subtle" size="xs" class="ml-1">
            {{ serviceType }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 pt-2">
      <UButton block :loading="saving" :disabled="!canSave" :icon="isEditing ? 'i-lucide-save' : 'i-lucide-user-plus'"
        @click="saveContact">
        {{ saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Contact' }}
      </UButton>
      <UButton color="neutral" variant="outline" icon="i-lucide-x" @click="cancel">
        Cancel
      </UButton>
    </div>
  </div>
</template>
