<script setup lang="ts">
/**
 * Form Section Component
 *
 * Groups related form fields with an optional title and description.
 * Use this to organize complex forms into logical sections.
 */
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="space-y-4">
    <div v-if="title || description">
      <h3 v-if="title" class="text-base font-semibold text-gray-900 dark:text-gray-100">
        {{ title }}
      </h3>
      <p v-if="description" class="text-sm text-gray-500 mt-0.5">
        {{ description }}
      </p>
    </div>
    <div class="space-y-4">
      <slot />
    </div>
  </div>
</template>
