<script setup lang="ts">
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'

interface AddToContactButtonProps {
  address: string
  size?: 'xs' | 'sm' | 'md'
  variant?: 'icon' | 'text' | 'button'
}

const props = withDefaults(defineProps<AddToContactButtonProps>(), {
  size: 'sm',
  variant: 'icon',
})

const contactsStore = useContactsStore()
const walletStore = useWalletStore()

// Initialize contacts store
onMounted(() => {
  contactsStore.initialize()
})

// Check if address is already a contact
const isContact = computed(() => {
  return contactsStore.getContactByAddress(props.address) !== undefined
})

// Check if address is own wallet
const isOwnAddress = computed(() => {
  return walletStore.address === props.address
})

// Should show button
const shouldShow = computed(() => {
  return !isContact.value && !isOwnAddress.value && props.address
})

// Slideover state
const isOpen = ref(false)
const newContactName = ref('')
const newContactNotes = ref('')
const newContactIsFavorite = ref(false)
const saving = ref(false)

// Open slideover
const openAddContact = () => {
  newContactName.value = ''
  isOpen.value = true
}

// Save contact
const saveContact = () => {
  if (!newContactName.value.trim()) return

  saving.value = true
  try {
    contactsStore.addContact({
      name: newContactName.value.trim(),
      address: props.address,
      notes: newContactNotes.value.trim() || undefined,
      isFavorite: newContactIsFavorite.value,
    })
    isOpen.value = false
  } catch (e) {
    console.error('Failed to save contact:', e)
  } finally {
    saving.value = false
  }
}

// Size classes
const iconSize = computed(() => {
  switch (props.size) {
    case 'xs': return 'w-3 h-3'
    case 'sm': return 'w-4 h-4'
    case 'md': return 'w-5 h-5'
    default: return 'w-4 h-4'
  }
})
</script>

<template>
  <template v-if="shouldShow">
    <!-- Icon variant -->
    <UButton v-if="variant === 'icon'" color="neutral" variant="ghost" :size="size" icon="i-lucide-user-plus"
      @click.stop.prevent="openAddContact" title="Add to Contacts" />

    <!-- Text variant -->
    <UButton v-else-if="variant === 'text'" color="neutral" variant="ghost" :size="size" icon="i-lucide-user-plus"
      @click.stop.prevent="openAddContact">
      <UIcon name="i-lucide-user-plus" :class="iconSize" />
      Add to Contacts
    </UButton>

    <!-- Button variant -->
    <UButton v-else color="primary" variant="soft" :size="size" icon="i-lucide-user-plus"
      @click.stop.prevent="openAddContact">
      Add to Contacts
    </UButton>

    <!-- Add Contact Slideover -->
    <USlideover :dismissible="true" v-model:open="isOpen" side="bottom">

      <template #title>
        Add to Contacts
      </template>

      <template #body>
        <div class="space-y-4">
          <!-- Name input -->
          <div>
            <label class="text-sm font-medium text-muted mb-1 block">Name</label>
            <UInput class="w-full" v-model="newContactName" placeholder="Enter contact name" autofocus
              @keyup.enter="saveContact" />
          </div>

          <!-- Notes -->
          <UFormField label="Notes" hint="Optional">
            <UTextarea class="w-full" v-model="newContactNotes" placeholder="Add notes about this contact..."
              :rows="3" />
          </UFormField>

          <!-- Favorite Toggle -->
          <div class="flex items-center gap-3 p-3 rounded-lg border border-default">
            <UCheckbox v-model="newContactIsFavorite" />
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-star" :class="newContactIsFavorite ? 'text-warning-500' : 'text-muted'"
                class="w-5 h-5" />
              <div>
                <p class="font-medium text-sm">Add to Favorites</p>
                <p class="text-xs text-muted">Favorites appear first in search and quick send</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2">
          <UButton color="primary" :loading="saving" :disabled="!newContactName.trim()" @click="saveContact">
            Save Contact
          </UButton>
          <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
        </div>
      </template>
    </USlideover>
  </template>
</template>
