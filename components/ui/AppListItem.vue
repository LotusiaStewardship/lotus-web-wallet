<script setup lang="ts">
/**
 * AppListItem
 *
 * Standard list item layout with icon, content, and value.
 * Use for transaction lists, contact lists, etc.
 */
defineProps<{
  /** Icon name (Lucide format: i-lucide-*) */
  icon?: string
  /** Icon color class */
  iconColor?: string
  /** Avatar URL (alternative to icon) */
  avatar?: string
  /** Avatar fallback text */
  avatarFallback?: string
  /** Primary title */
  title: string
  /** Subtitle or description */
  subtitle?: string
  /** Value to display on right */
  value?: string
  /** Value subtext (e.g., timestamp) */
  valueSubtext?: string
  /** Value color class */
  valueColor?: string
  /** Make item clickable */
  clickable?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <div :class="[
    'flex items-center gap-3 py-3',
    clickable && 'cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors',
  ]" @click="clickable && emit('click')">
    <!-- Left: Icon or Avatar -->
    <div v-if="icon || avatar" class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      :class="icon ? (iconColor || 'bg-primary-100 dark:bg-primary-900/30') : ''">
      <img v-if="avatar" :src="avatar" :alt="title" class="w-10 h-10 rounded-full object-cover" />
      <span v-else-if="avatarFallback && !icon" class="text-sm font-medium text-primary">
        {{ avatarFallback }}
      </span>
      <UIcon v-else-if="icon" :name="icon" class="w-5 h-5" :class="iconColor ? '' : 'text-primary'" />
    </div>

    <!-- Middle: Content -->
    <div class="flex-1 min-w-0">
      <p class="font-medium truncate">{{ title }}</p>
      <p v-if="subtitle" class="text-sm text-muted truncate">{{ subtitle }}</p>
      <slot name="subtitle" />
    </div>

    <!-- Right: Value or Action -->
    <div v-if="value || $slots.value" class="text-right flex-shrink-0">
      <slot name="value">
        <p class="font-medium" :class="valueColor">{{ value }}</p>
        <p v-if="valueSubtext" class="text-xs text-muted">{{ valueSubtext }}</p>
      </slot>
    </div>

    <!-- Chevron for clickable items -->
    <UIcon v-if="clickable && !$slots.value && !value" name="i-lucide-chevron-right"
      class="w-5 h-5 text-muted flex-shrink-0" />
  </div>
</template>
