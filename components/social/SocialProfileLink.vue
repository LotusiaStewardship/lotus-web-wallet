<script setup lang="ts">
import type { ScriptChunkPlatformUTF8 } from 'lotus-sdk/lib/rank'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'

const props = defineProps<{
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
  showAvatar?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()

const { avatarCache, preloadAvatars } = useAvatars()

// Preload avatar on mount
onMounted(() => {
  preloadAvatars([{
    platform: props.platform,
    profileId: props.profileId,
  }])
})

const avatarSrc = computed(() => avatarCache.value[`${props.platform}:${props.profileId}`])
const platformIcon = computed(() => PlatformIcon[props.platform] || 'i-lucide-globe')
const externalPostUrl = computed(() => {
  if (!props.postId) return null
  const platformConfig = PlatformURL[props.platform]
  if (!platformConfig) return null
  return platformConfig.post(props.profileId, props.postId)
})
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <NuxtLink :to="`/social/${props.platform}/${props.profileId}`"
      class="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
      <UAvatar v-if="showAvatar !== false" :src="avatarSrc" :size="size || 'sm'" :alt="`${props.profileId}'s avatar`" />
      <span class="text-sm">{{ props.profileId }}</span>
      <UIcon :name="platformIcon" class="w-4 h-4 text-muted" />
    </NuxtLink>
    <NuxtLink v-if="props.postId && externalPostUrl" :to="externalPostUrl" target="_blank" external>
      <UBadge color="primary" variant="subtle" size="xs" class="cursor-pointer">
        See Post
        <UIcon name="i-lucide-external-link" class="w-3 h-3 ml-1" />
      </UBadge>
    </NuxtLink>
  </span>
</template>
