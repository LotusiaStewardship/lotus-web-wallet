<script setup lang="ts">
/**
 * SocialPlatformIcon
 *
 * Icon for a social platform.
 */
const props = defineProps<{
  /** Platform name */
  platform: string
  /** Icon size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Show label */
  showLabel?: boolean
}>()

const iconName = computed(() => {
  const icons: Record<string, string> = {
    twitter: 'i-lucide-twitter',
    youtube: 'i-lucide-youtube',
    twitch: 'i-lucide-twitch',
    github: 'i-lucide-github',
    instagram: 'i-lucide-instagram',
    tiktok: 'i-lucide-music',
    discord: 'i-lucide-message-circle',
    reddit: 'i-lucide-message-square',
  }
  return icons[props.platform.toLowerCase()] || 'i-lucide-user'
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-3 h-3'
    case 'sm':
      return 'w-4 h-4'
    case 'lg':
      return 'w-6 h-6'
    default:
      return 'w-5 h-5'
  }
})

const platformLabel = computed(() => {
  const labels: Record<string, string> = {
    twitter: 'Twitter',
    youtube: 'YouTube',
    twitch: 'Twitch',
    github: 'GitHub',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    discord: 'Discord',
    reddit: 'Reddit',
  }
  return labels[props.platform.toLowerCase()] || props.platform
})
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <UIcon :name="iconName" :class="['text-muted', sizeClass]" />
    <span v-if="showLabel" class="text-sm text-muted capitalize">
      {{ platformLabel }}
    </span>
  </span>
</template>
