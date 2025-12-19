<script setup lang="ts">
/**
 * AppEmptyState
 *
 * Empty state with illustration and call-to-action.
 * Use when a list or section has no content to display.
 */
defineProps<{
  /** Icon name (Lucide format: i-lucide-*) */
  icon: string
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Action button configuration */
  action?: { label: string; to?: string; onClick?: () => void }
}>()
</script>

<template>
  <div class="text-center py-12">
    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
      <UIcon :name="icon" class="w-8 h-8 text-muted" />
    </div>
    <h3 class="text-lg font-medium mb-2">{{ title }}</h3>
    <p v-if="description" class="text-sm text-muted mb-4 max-w-sm mx-auto">
      {{ description }}
    </p>
    <slot name="actions">
      <UButton v-if="action" :to="action.to" color="primary" @click="action.onClick">
        {{ action.label }}
      </UButton>
    </slot>
  </div>
</template>
