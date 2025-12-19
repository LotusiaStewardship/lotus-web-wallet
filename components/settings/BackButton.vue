<script setup lang="ts">
/**
 * SettingsBackButton
 *
 * Back navigation button for settings sub-pages.
 */
const props = defineProps<{
  /** Custom back path */
  to?: string
  /** Custom label */
  label?: string
}>()
</script>

<template>
  <NuxtLink :to="to || '/settings'"
    class="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
    <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
    {{ label || 'Back to Settings' }}
  </NuxtLink>
</template>
