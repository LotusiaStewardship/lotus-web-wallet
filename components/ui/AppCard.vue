<script setup lang="ts">
/**
 * AppCard
 *
 * Standardized card wrapper with consistent styling.
 * Use this for all card-based layouts throughout the app.
 */
defineProps<{
  /** Card title displayed in header */
  title?: string
  /** Icon name (Lucide format: i-lucide-*) */
  icon?: string
  /** Custom icon background color class */
  iconColor?: string
  /** Header action button */
  action?: { label: string; to?: string; onClick?: () => void }
  /** Remove default body padding */
  noPadding?: boolean
  /** Allow content to overflow (for dropdowns) */
  allowOverflow?: boolean
}>()
</script>

<template>
  <UCard :class="[allowOverflow ? 'overflow-visible [&>div]:overflow-visible' : '', noPadding ? '' : '']">
    <template v-if="title || $slots.header" #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div v-if="icon" class="w-8 h-8 rounded-lg flex items-center justify-center"
            :class="iconColor || 'bg-primary-100 dark:bg-primary-900/30'">
            <UIcon :name="icon" class="w-4 h-4 text-primary" />
          </div>
          <span class="font-semibold">{{ title }}</span>
          <slot name="header-badge" />
        </div>
        <slot name="header-action">
          <UButton v-if="action" :to="action.to" size="xs" color="neutral" variant="ghost" @click="action.onClick">
            {{ action.label }}
          </UButton>
        </slot>
      </div>
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
</template>
