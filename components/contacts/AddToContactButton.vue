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
const saving = ref(false)

// Open slideover
const openAddContact = () => {
  newContactName.value = ''
  isOpen.value = true
}

// Save contact
const saveContact = async () => {
  if (!newContactName.value.trim()) return

  saving.value = true
  try {
    await contactsStore.addContact({
      name: newContactName.value.trim(),
      address: props.address,
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
    <button v-else-if="variant === 'text'" class="text-xs text-muted hover:text-primary inline-flex items-center gap-1"
      @click.stop.prevent="openAddContact">
      <UIcon name="i-lucide-user-plus" :class="iconSize" />
      Add to Contacts
    </button>

    <!-- Button variant -->
    <UButton v-else color="primary" variant="soft" :size="size" icon="i-lucide-user-plus"
      @click.stop.prevent="openAddContact">
      Add to Contacts
    </UButton>

    <!-- Add Contact Slideover -->
    <USlideover v-model:open="isOpen">
      <template #title>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user-plus" class="w-5 h-5 text-primary" />
          <span>Add Contact</span>
        </div>
      </template>

      <div class="p-4 space-y-4">
        <!-- Address display -->
        <div>
          <label class="text-sm font-medium text-muted mb-1 block">Address</label>
          <div class="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg break-all">
            {{ address }}
          </div>
        </div>

        <!-- Name input -->
        <div>
          <label class="text-sm font-medium text-muted mb-1 block">Name</label>
          <UInput v-model="newContactName" placeholder="Enter contact name" autofocus @keyup.enter="saveContact" />
        </div>
      </div>

      <template #footer>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
          <UButton color="primary" :loading="saving" :disabled="!newContactName.trim()" @click="saveContact">
            Save Contact
          </UButton>
        </div>
      </template>
    </USlideover>
  </template>
</template>
