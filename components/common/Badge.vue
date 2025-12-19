<script setup lang="ts">
/**
 * Badge
 *
 * Status and label badges with consistent styling.
 */
defineProps<{
  /** Badge text */
  label: string
  /** Badge color */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
  /** Badge variant */
  variant?: 'solid' | 'subtle' | 'outline'
  /** Badge size */
  size?: 'xs' | 'sm' | 'md'
  /** Optional icon */
  icon?: string
  /** Dot indicator instead of icon */
  dot?: boolean
}>()
</script>

<template>
  <UBadge :color="color || 'neutral'" :variant="variant || 'subtle'" :size="size || 'sm'">
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
    <UIcon v-else-if="icon" :name="icon" class="w-3 h-3 mr-1" />
    {{ label }}
  </UBadge>
</template>
