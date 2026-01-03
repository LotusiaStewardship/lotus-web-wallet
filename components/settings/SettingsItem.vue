<script setup lang="ts">
/**
 * Settings Item Component
 *
 * Individual setting row with label, description, and action slot.
 */
const props = defineProps<{
  label: string
  description?: string
  badge?: string
  badgeColor?: 'warning' | 'error' | 'success' | 'info'
}>()

const emit = defineEmits<{
  click: []
}>()

const attrs = useAttrs()
const clickable = computed(() => !!attrs.onClick)

function handleClick() {
  emit('click')
}
</script>

<template>
  <div :class="[
    'flex items-center justify-between p-4',
    clickable && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
  ]" @click="handleClick">
    <div class="flex-1 min-w-0 mr-4">
      <div class="flex items-center gap-2">
        <p class="font-medium">{{ label }}</p>
        <UBadge v-if="badge" :color="badgeColor || 'neutral'" size="xs">
          {{ badge }}
        </UBadge>
      </div>
      <p v-if="description" class="text-sm text-gray-500 truncate">
        {{ description }}
      </p>
    </div>

    <div class="flex-shrink-0">
      <slot name="right" />
    </div>
  </div>
</template>
