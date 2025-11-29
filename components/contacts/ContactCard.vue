<script setup lang="ts">
import type { Contact } from '~/stores/contacts'
import { useAddressFormat } from '~/composables/useUtils'

const props = defineProps<{
  contact: Contact
  compact?: boolean
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  edit: [contact: Contact]
  delete: [contact: Contact]
  select: [contact: Contact]
}>()

const { truncateAddress } = useAddressFormat()

// Generate avatar initials from name
const initials = computed(() => {
  const parts = props.contact.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.contact.name.slice(0, 2).toUpperCase()
})

// Generate consistent color based on name
const avatarColor = computed(() => {
  const colors = [
    'primary',
    'success',
    'info',
    'warning',
    'error',
  ] as const
  let hash = 0
  for (let i = 0; i < props.contact.name.length; i++) {
    hash = props.contact.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

// Truncate address for display using the composable
const truncatedAddressDisplay = computed(() => truncateAddress(props.contact.address))

// Format date
const formattedDate = computed(() => {
  return new Date(props.contact.updatedAt).toLocaleDateString()
})

// Handle click
const handleClick = () => {
  if (props.selectable) {
    emit('select', props.contact)
  }
}
</script>

<template>
  <div :class="[
    'group rounded-lg border transition-all',
    selectable ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : 'border-default',
    selected ? 'border-primary bg-primary/10' : '',
    compact ? 'p-3' : 'p-4'
  ]" @click="handleClick">
    <div class="flex items-center gap-3">
      <!-- Avatar -->
      <div :class="[
        'flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        compact ? 'w-10 h-10 text-sm' : 'w-12 h-12',
        `bg-${avatarColor}-500`
      ]">
        {{ initials }}
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 :class="['font-semibold truncate', compact ? 'text-sm' : '']">
            {{ contact.name }}
          </h3>
          <UBadge v-if="contact.serviceType" :color="avatarColor" variant="subtle" size="xs">
            {{ contact.serviceType }}
          </UBadge>
        </div>
        <p class="text-sm text-muted font-mono truncate">
          {{ truncatedAddressDisplay }}
        </p>
        <div v-if="!compact && contact.tags?.length" class="flex flex-wrap gap-1 mt-1">
          <UBadge v-for="tag in contact.tags.slice(0, 3)" :key="tag" color="neutral" variant="subtle" size="xs">
            {{ tag }}
          </UBadge>
          <UBadge v-if="contact.tags.length > 3" color="neutral" variant="subtle" size="xs">
            +{{ contact.tags.length - 3 }}
          </UBadge>
        </div>
      </div>

      <!-- Actions (only show when not in selectable mode) -->
      <div v-if="!selectable" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <UTooltip text="Edit">
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-pencil"
            @click.stop="emit('edit', contact)" />
        </UTooltip>
        <UTooltip text="Delete">
          <UButton color="error" variant="ghost" size="xs" icon="i-lucide-trash-2"
            @click.stop="emit('delete', contact)" />
        </UTooltip>
      </div>

      <!-- Selection indicator -->
      <UIcon v-if="selectable && selected" name="i-lucide-check-circle" class="w-5 h-5 text-primary shrink-0" />
    </div>

    <!-- Notes (only in full mode) -->
    <p v-if="!compact && contact.notes" class="text-sm text-muted mt-2 line-clamp-2">
      {{ contact.notes }}
    </p>
  </div>
</template>
