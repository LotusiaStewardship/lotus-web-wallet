<script setup lang="ts">
interface ContactAvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'info' | 'warning' | 'error'
}

const props = withDefaults(defineProps<ContactAvatarProps>(), {
  size: 'md',
})

// Generate avatar initials from name
const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.name.slice(0, 2).toUpperCase()
})

// Generate consistent color based on name (if not provided)
const avatarColor = computed(() => {
  if (props.color) return props.color

  const colors = ['primary', 'success', 'info', 'warning', 'error'] as const
  let hash = 0
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

// Size classes
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-6 h-6 text-xs'
    case 'sm':
      return 'w-8 h-8 text-sm'
    case 'md':
      return 'w-10 h-10'
    case 'lg':
      return 'w-12 h-12 text-lg'
    default:
      return 'w-10 h-10'
  }
})
</script>

<template>
  <div :class="[
    'rounded-full flex items-center justify-center dark:text-white text-black font-semibold shrink-0',
    sizeClasses,
    `bg-${avatarColor}-700`,
    `dark:bg-${avatarColor}-300`,
  ]">
    {{ initials }}
  </div>
</template>
