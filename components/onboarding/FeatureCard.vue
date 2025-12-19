<script setup lang="ts">
/**
 * OnboardingFeatureCard
 *
 * Feature card for the quick tour step.
 */
const props = defineProps<{
  /** Icon name */
  icon: string
  /** Feature title */
  title: string
  /** Feature description */
  description: string
}>()
</script>

<template>
  <div class="p-4 bg-muted/50 rounded-lg text-center">
    <UIcon :name="icon" class="w-8 h-8 text-primary mx-auto mb-2" />
    <p class="font-medium">{{ title }}</p>
    <p class="text-xs text-muted">{{ description }}</p>
  </div>
</template>
