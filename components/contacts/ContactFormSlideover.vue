<script setup lang="ts">
/**
 * ContactFormSlideover
 *
 * Slideover form for adding/editing contacts.
 */
import type { Contact } from '~/stores/contacts'
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  /** Whether slideover is open */
  open: boolean
  /** Contact to edit (null for new) */
  contact?: Contact | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: Partial<Contact>]
}>()

const contactsStore = useContactsStore()
const { isValidAddress } = useAddress()
const { success, error } = useNotifications()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const isEditing = computed(() => !!props.contact)

// Form state
const form = reactive({
  name: '',
  address: '',
  notes: '',
  isFavorite: false,
  groupId: undefined as string | undefined,
  tags: [] as string[],
})

// Reset form when contact changes
watch(
  () => props.contact,
  contact => {
    if (contact) {
      form.name = contact.name
      form.address = contact.address
      form.notes = contact.notes || ''
      form.isFavorite = contact.isFavorite ?? false
      form.groupId = contact.groupId
      form.tags = contact.tags || []
    } else {
      form.name = ''
      form.address = ''
      form.notes = ''
      form.isFavorite = false
      form.groupId = undefined
      form.tags = []
    }
  },
  { immediate: true },
)

// Validation
const errors = reactive({
  name: '',
  address: '',
})

function validate(): boolean {
  errors.name = ''
  errors.address = ''

  if (!form.name.trim()) {
    errors.name = 'Name is required'
  }

  if (!form.address.trim()) {
    errors.address = 'Address is required'
  } else if (!isValidAddress(form.address)) {
    errors.address = 'Invalid address'
  } else if (!isEditing.value) {
    // Check for duplicate address
    const existing = contactsStore.findByAddress(form.address)
    if (existing) {
      errors.address = `Address already saved as "${existing.name}"`
    }
  }

  return !errors.name && !errors.address
}

// Submit
function handleSubmit() {
  if (!validate()) return

  emit('save', {
    name: form.name.trim(),
    address: form.address.trim(),
    notes: form.notes.trim() || undefined,
    isFavorite: form.isFavorite,
    groupId: form.groupId,
    tags: form.tags,
  })

  success(isEditing.value ? 'Contact Updated' : 'Contact Added')
}

// Tag input
const tagInput = ref('')

function addTag() {
  const tag = tagInput.value.trim().toLowerCase()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter(t => t !== tag)
}
</script>

<template>
  <USlideover v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon :name="isEditing ? 'i-lucide-edit' : 'i-lucide-user-plus'" class="w-5 h-5" />
        <span class="font-semibold">
          {{ isEditing ? 'Edit Contact' : 'Add Contact' }}
        </span>
      </div>
    </template>

    <template #body>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Name -->
        <UFormField label="Name" :error="errors.name" required>
          <UInput v-model="form.name" placeholder="Alice" icon="i-lucide-user" />
        </UFormField>

        <!-- Address -->
        <UFormField label="Address" :error="errors.address" required>
          <UInput v-model="form.address" placeholder="lotus_..." class="font-mono" :disabled="isEditing" />
        </UFormField>

        <!-- Notes -->
        <UFormField label="Notes">
          <UTextarea v-model="form.notes" placeholder="Add notes about this contact..." :rows="3" />
        </UFormField>


        <!-- Tags -->
        <UFormField label="Tags">
          <div class="space-y-2">
            <div class="flex gap-2">
              <UInput v-model="tagInput" placeholder="Add tag..." class="flex-1" @keydown.enter.prevent="addTag" />
              <UButton type="button" color="neutral" variant="outline" icon="i-lucide-plus" @click="addTag" />
            </div>
            <div v-if="form.tags.length" class="flex flex-wrap gap-1">
              <UBadge v-for="tag in form.tags" :key="tag" color="neutral" variant="subtle" class="cursor-pointer"
                @click="removeTag(tag)">
                {{ tag }}
                <UIcon name="i-lucide-x" class="w-3 h-3 ml-1" />
              </UBadge>
            </div>
          </div>
        </UFormField>

        <!-- Favorite -->
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">Add to Favorites</label>
          <USwitch v-model="form.isFavorite" />
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          Cancel
        </UButton>
        <UButton color="primary" icon="i-lucide-check" @click="handleSubmit">
          {{ isEditing ? 'Save Changes' : 'Add Contact' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
