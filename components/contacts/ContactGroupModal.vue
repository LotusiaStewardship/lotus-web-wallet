<script setup lang="ts">
/**
 * ContactGroupModal
 *
 * Modal for creating a new contact group.
 */
const props = defineProps<{
  /** Whether modal is open */
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  create: [name: string, icon: string, color: string]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Form state
const name = ref('')
const selectedIcon = ref('i-lucide-users')
const selectedColor = ref('primary')

// Available icons
const icons = [
  { value: 'i-lucide-users', label: 'Users' },
  { value: 'i-lucide-home', label: 'Home' },
  { value: 'i-lucide-briefcase', label: 'Work' },
  { value: 'i-lucide-heart', label: 'Heart' },
  { value: 'i-lucide-star', label: 'Star' },
  { value: 'i-lucide-shield', label: 'Shield' },
  { value: 'i-lucide-zap', label: 'Zap' },
  { value: 'i-lucide-coffee', label: 'Coffee' },
]

// Available colors
const colors = [
  { value: 'primary', class: 'bg-primary' },
  { value: 'success', class: 'bg-success' },
  { value: 'warning', class: 'bg-warning' },
  { value: 'error', class: 'bg-error' },
  { value: 'info', class: 'bg-info' },
]

// Validation
const error = ref('')

function validate(): boolean {
  error.value = ''
  if (!name.value.trim()) {
    error.value = 'Group name is required'
    return false
  }
  return true
}

function handleCreate() {
  if (!validate()) return

  emit('create', name.value.trim(), selectedIcon.value, selectedColor.value)

  // Reset form
  name.value = ''
  selectedIcon.value = 'i-lucide-users'
  selectedColor.value = 'primary'
}

// Reset on close
watch(isOpen, open => {
  if (!open) {
    name.value = ''
    error.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-folder-plus" class="w-5 h-5" />
        <span class="font-semibold">Create Group</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4 w-full">
        <!-- Name -->
        <UFormField label="Group Name" :error="error" required>
          <UInput v-model="name" placeholder="Family, Work, etc." autofocus />
        </UFormField>

        <!-- Icon -->
        <UFormField label="Icon">
          <div class="flex flex-wrap gap-2">
            <button v-for="icon in icons" :key="icon.value" type="button" :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              selectedIcon === icon.value
                ? 'bg-primary text-white'
                : 'bg-muted/50 hover:bg-muted',
            ]" :title="icon.label" @click="selectedIcon = icon.value">
              <UIcon :name="icon.value" class="w-5 h-5" />
            </button>
          </div>
        </UFormField>

        <!-- Color -->
        <UFormField label="Color">
          <div class="flex gap-2">
            <button v-for="color in colors" :key="color.value" type="button" :class="[
              'w-8 h-8 rounded-full transition-transform',
              color.class,
              selectedColor === color.value && 'ring-2 ring-offset-2 ring-primary scale-110',
            ]" @click="selectedColor = color.value" />
          </div>
        </UFormField>

        <!-- Preview -->
        <div class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <div :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center text-white',
            `bg-${selectedColor}`,
          ]">
            <UIcon :name="selectedIcon" class="w-5 h-5" />
          </div>
          <span class="font-medium">{{ name || 'Group Name' }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          Cancel
        </UButton>
        <UButton color="primary" icon="i-lucide-plus" @click="handleCreate">
          Create Group
        </UButton>
      </div>
    </template>
  </UModal>
</template>
