<script setup lang="ts">
interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  iconSize?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<EmptyStateProps>(), {
  iconSize: 'md',
})

// Icon size classes
const iconSizeClasses = computed(() => {
  switch (props.iconSize) {
    case 'sm':
      return 'w-8 h-8'
    case 'md':
      return 'w-12 h-12'
    case 'lg':
      return 'w-16 h-16'
    default:
      return 'w-12 h-12'
  }
})
</script>

<template>
  <div class="text-center py-8">
    <div class="rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4"
      :class="iconSize === 'lg' ? 'w-20 h-20' : iconSize === 'md' ? 'w-16 h-16' : 'w-12 h-12'">
      <UIcon :name="icon" :class="[iconSizeClasses, 'text-muted']" />
    </div>
    <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
    <p v-if="description" class="text-muted mb-6 max-w-md mx-auto">
      {{ description }}
    </p>
    <slot name="actions" />
  </div>
</template>
