<script setup lang="ts">
/**
 * Form Field Component
 *
 * Wrapper component that provides consistent label, description, and error styling
 * for form inputs. Use this to wrap any form input for consistent layout.
 */
const props = withDefaults(
  defineProps<{
    label?: string
    description?: string
    error?: string | null
    required?: boolean
  }>(),
  {
    required: false,
  },
)
</script>

<template>
  <div class="space-y-1.5">
    <!-- Label -->
    <label v-if="label" class="block text-sm font-medium text-gray-900 dark:text-gray-100">
      {{ label }}
      <span v-if="required" class="text-error ml-0.5">*</span>
    </label>

    <!-- Input slot -->
    <slot />

    <!-- Description or Error -->
    <p v-if="error" class="text-xs text-error">
      {{ error }}
    </p>
    <p v-else-if="description" class="text-xs text-gray-500">
      {{ description }}
    </p>
  </div>
</template>
