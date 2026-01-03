<script setup lang="ts">
/**
 * Settings Section Component
 *
 * Groups related settings items with a title and icon.
 */
withDefaults(
  defineProps<{
    title: string
    icon: string
    variant?: 'default' | 'danger'
  }>(),
  {
    variant: 'default',
  },
)
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2 px-1">
      <UIcon :name="icon" :class="['w-5 h-5', variant === 'danger' ? 'text-error' : 'text-gray-500']" />
      <h2 :class="[
        'text-sm font-semibold',
        variant === 'danger' ? 'text-error' : 'text-gray-500',
      ]">
        {{ title }}
      </h2>
    </div>

    <div :class="[
      'rounded-xl border divide-y',
      variant === 'danger'
        ? 'border-error/20 divide-error/10 bg-error/5'
        : 'border-gray-200 dark:border-gray-800 divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900',
    ]">
      <slot />
    </div>
  </div>
</template>
