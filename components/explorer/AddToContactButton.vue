<script setup lang="ts">
/**
 * AddToContactButton
 *
 * Button to add an address to contacts.
 */
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  /** Address to add */
  address: string
  /** Button size */
  size?: 'xs' | 'sm' | 'md'
  /** Icon only mode */
  iconOnly?: boolean
}>()

const contactsStore = useContactsStore()
const { success } = useNotifications()

const isAdding = ref(false)
const showModal = ref(false)
const contactName = ref('')

// Check if already a contact
const isContact = computed(() => {
  return contactsStore.contacts.some(c => c.address === props.address)
})

// Quick add with default name
function quickAdd() {
  showModal.value = true
  contactName.value = ''
}

// Save contact
function saveContact() {
  if (!contactName.value.trim()) return

  contactsStore.addContact({
    name: contactName.value.trim(),
    address: props.address,
  })

  success('Contact Added', `${contactName.value} has been added to your contacts`)
  showModal.value = false
  contactName.value = ''
}
</script>

<template>
  <div v-if="!isContact">
    <UButton v-if="iconOnly" color="neutral" variant="ghost" :size="size || 'xs'" icon="i-lucide-user-plus"
      title="Add to contacts" @click.prevent.stop="quickAdd" />
    <UButton v-else color="neutral" variant="outline" :size="size || 'sm'" icon="i-lucide-user-plus"
      @click.prevent.stop="quickAdd">
      Add to Contacts
    </UButton>

    <!-- Quick Add Modal -->
    <UModal v-model:open="showModal">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user-plus" class="w-5 h-5" />
          <span class="font-semibold">Add Contact</span>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" required>
            <UInput v-model="contactName" placeholder="Enter contact name" autofocus @keydown.enter="saveContact" />
          </UFormField>

          <UFormField label="Address">
            <p class="text-sm font-mono text-muted break-all">
              {{ address }}
            </p>
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showModal = false">
            Cancel
          </UButton>
          <UButton color="primary" :disabled="!contactName.trim()" @click="saveContact">
            Add Contact
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
