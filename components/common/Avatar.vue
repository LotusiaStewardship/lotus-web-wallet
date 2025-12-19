<script setup lang="ts">
/**
 * Avatar
 *
 * User/contact avatar with fallback to initials or icon.
 */
const props = defineProps<{
  /** Image URL */
  src?: string
  /** Alt text / name for fallback initials */
  alt?: string
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Fallback icon if no image or name */
  fallbackIcon?: string
  /** Custom background color class */
  bgColor?: string
}>()

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

const sizeClass = computed(() => sizeClasses[props.size || 'md'])
const iconSize = computed(() => iconSizes[props.size || 'md'])

const initials = computed(() => {
  if (!props.alt) return ''
  const words = props.alt.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
})

const imageError = ref(false)

function handleImageError() {
  imageError.value = true
}
</script>

<template>
  <div :class="[
    'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
    sizeClass,
    bgColor || 'bg-primary-100 dark:bg-primary-900/30',
  ]">
    <!-- Image -->
    <img v-if="src && !imageError" :src="src" :alt="alt || 'Avatar'" class="w-full h-full object-cover"
      @error="handleImageError" />

    <!-- Initials fallback -->
    <span v-else-if="initials" class="font-medium text-primary">
      {{ initials }}
    </span>

    <!-- Icon fallback -->
    <UIcon v-else :name="fallbackIcon || 'i-lucide-user'" :class="[iconSize, 'text-primary']" />
  </div>
</template>
