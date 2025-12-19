<script setup lang="ts">
/**
 * AppActionCard
 *
 * Quick action card with icon and label.
 * Use for navigation shortcuts or action buttons.
 */
defineProps<{
  /** Icon name (Lucide format: i-lucide-*) */
  icon: string
  /** Action label */
  label: string
  /** Optional description */
  description?: string
  /** Navigation target */
  to?: string
  /** Custom icon color class */
  iconColor?: string
  /** Disabled state */
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <UCard :class="[
    'cursor-pointer transition-all hover:shadow-md',
    disabled && 'opacity-50 cursor-not-allowed',
  ]" @click="!disabled && (to ? navigateTo(to) : emit('click'))">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        :class="iconColor || 'bg-primary-100 dark:bg-primary-900/30'">
        <UIcon :name="icon" class="w-5 h-5 text-primary" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium">{{ label }}</p>
        <p v-if="description" class="text-sm text-muted truncate">
          {{ description }}
        </p>
      </div>
      <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
    </div>
  </UCard>
</template>
