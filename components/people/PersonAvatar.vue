<script setup lang="ts">
/**
 * Person Avatar Component
 *
 * Displays a person's avatar with consistent color generation from name.
 */
import type { Person } from '~/types/people'

const props = withDefaults(
  defineProps<{
    person: Person
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    size: 'md',
  },
)

const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

const initials = computed(() => {
  const parts = props.person.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return props.person.name.slice(0, 2).toUpperCase()
})

// Generate consistent color from name
const colorIndex = computed(() => {
  let hash = 0
  for (let i = 0; i < props.person.name.length; i++) {
    hash = props.person.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 6
})

const bgColorClass = computed(() => {
  const colors = [
    'bg-primary/20',
    'bg-success/20',
    'bg-warning/20',
    'bg-error/20',
    'bg-info/20',
    'bg-purple-500/20',
  ]
  return colors[colorIndex.value]
})

const textColorClass = computed(() => {
  const colors = [
    'text-primary',
    'text-success',
    'text-warning',
    'text-error',
    'text-info',
    'text-purple-500',
  ]
  return colors[colorIndex.value]
})
</script>

<template>
  <div :class="['rounded-full overflow-hidden flex-shrink-0', sizeClasses[size]]">
    <img v-if="person.avatarUrl" :src="person.avatarUrl" :alt="person.name" class="w-full h-full object-cover" />
    <div v-else :class="[
      'w-full h-full flex items-center justify-center',
      'font-semibold',
      bgColorClass,
      textColorClass,
    ]">
      {{ initials }}
    </div>
  </div>
</template>
