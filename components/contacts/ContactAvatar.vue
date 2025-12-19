<script setup lang="ts">
/**
 * ContactAvatar
 *
 * Avatar component for contacts with fallback to initials.
 */
import type { Contact } from '~/stores/contacts'

const props = defineProps<{
  /** Contact data */
  contact: Contact
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>()

// Get initials from name
const initials = computed(() => {
  const name = props.contact.name || ''
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

// Generate avatar from address if no custom avatar
const avatarUrl = computed(() => {
  if (props.contact.avatar) return props.contact.avatar
  // Use Gravatar identicon as fallback based on address hash
  const hash = props.contact.address
    .split('')
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(16)
    .replace('-', '')
    .padStart(32, '0')
  return `https://www.gravatar.com/avatar/${hash}?s=80&d=identicon&r=g`
})

// Size classes
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-6 h-6 text-xs'
    case 'sm':
      return 'w-8 h-8 text-sm'
    case 'md':
      return 'w-10 h-10 text-sm'
    case 'lg':
      return 'w-12 h-12 text-base'
    case 'xl':
      return 'w-16 h-16 text-lg'
    default:
      return 'w-10 h-10 text-sm'
  }
})

// Background color based on name hash
const bgColor = computed(() => {
  const colors = [
    'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
    'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
    'bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-300',
  ]
  const hash = props.contact.name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
})

const showImage = ref(true)

function handleImageError() {
  showImage.value = false
}
</script>

<template>
  <div :class="[
    'rounded-full flex items-center justify-center font-medium overflow-hidden flex-shrink-0',
    sizeClasses,
    !showImage && bgColor,
  ]">
    <img v-if="avatarUrl && showImage" :src="avatarUrl" :alt="contact.name" class="w-full h-full object-cover"
      @error="handleImageError" />
    <span v-else>{{ initials }}</span>
  </div>
</template>
