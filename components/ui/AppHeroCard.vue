<script setup lang="ts">
/**
 * AppHeroCard
 *
 * Hero card for page headers with centered content.
 * Use at the top of pages for primary information display.
 */
defineProps<{
  /** Icon name (Lucide format: i-lucide-*) */
  icon?: string
  /** Custom icon container class */
  iconClass?: string
  /** Main title (large, bold) - optional when using default slot */
  title?: string
  /** Subtitle text (muted) */
  subtitle?: string
  /** Apply gradient background */
  gradient?: boolean
}>()
</script>

<template>
  <UCard :class="gradient &&
    'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20'
    ">
    <div class="text-center py-6">
      <div v-if="icon" class="mb-4">
        <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
          :class="iconClass || 'bg-primary-100 dark:bg-primary-900/30'">
          <UIcon :name="icon" class="w-8 h-8 text-primary" />
        </div>
      </div>
      <slot name="icon" />
      <h1 v-if="title" class="text-3xl font-bold mb-2">{{ title }}</h1>
      <slot />
      <p v-if="subtitle" class="text-muted">{{ subtitle }}</p>
      <slot name="subtitle" />
      <div v-if="$slots.actions" class="mt-4">
        <slot name="actions" />
      </div>
    </div>
  </UCard>
</template>
