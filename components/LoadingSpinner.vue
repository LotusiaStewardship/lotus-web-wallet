<script setup lang="ts">
interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<LoadingSpinnerProps>(), {
  size: 'md',
})

// Size classes
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-6 h-6'
    case 'md':
      return 'w-8 h-8'
    case 'lg':
      return 'w-12 h-12'
    default:
      return 'w-8 h-8'
  }
})
</script>

<template>
  <div class="text-center py-8">
    <UIcon name="i-lucide-loader-2" :class="[sizeClasses, 'animate-spin text-muted mx-auto', { 'mb-4': message }]" />
    <p v-if="message" class="text-muted">{{ message }}</p>
  </div>
</template>
