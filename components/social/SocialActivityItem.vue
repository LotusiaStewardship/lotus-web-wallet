<script setup lang="ts">
import type { ScriptChunkPlatformUTF8 } from 'lotus-sdk/lib/rank'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'

interface SocialActivityItemProps {
  txid: string
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string | null
  sentiment: 'positive' | 'negative' | 'neutral'
  sats: string
  timestamp: number | string
  voterAddress?: string | null
  compact?: boolean
}

const props = withDefaults(defineProps<SocialActivityItemProps>(), {
  compact: false,
})

const { avatarCache, preloadAvatars } = useAvatars()
const { formatXPI } = useLotusUnits()

// Preload avatar
onMounted(() => {
  preloadAvatars([{ platform: props.platform, profileId: props.profileId }])
})

// Sentiment styling
const sentimentInfo = computed(() => {
  switch (props.sentiment) {
    case 'positive':
      return {
        icon: 'i-lucide-arrow-up',
        label: 'Upvote',
        bgClass: 'bg-success-100 dark:bg-success-900/20',
        textClass: 'text-success-500',
      }
    case 'negative':
      return {
        icon: 'i-lucide-arrow-down',
        label: 'Downvote',
        bgClass: 'bg-error-100 dark:bg-error-900/20',
        textClass: 'text-error-500',
      }
    default:
      return {
        icon: 'i-lucide-minus',
        label: 'Neutral',
        bgClass: 'bg-gray-100 dark:bg-gray-800',
        textClass: 'text-muted',
      }
  }
})

// Format timestamp
const relativeTime = computed(() => {
  const ts = typeof props.timestamp === 'string' ? parseInt(props.timestamp) : props.timestamp
  const now = Date.now()
  const txTime = ts * 1000
  const diff = now - txTime

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(txTime).toLocaleDateString()
})

// Format amount
const formattedAmount = computed(() => {
  return formatXPI(props.sats)
})

// External post URL
const postUrl = computed(() => {
  if (!props.postId) return null
  const config = PlatformURL[props.platform]
  return config ? config.post(props.profileId, props.postId) : null
})

// Platform name
const platformName = computed(() => {
  return props.platform.charAt(0).toUpperCase() + props.platform.slice(1).toLowerCase()
})

// Avatar
const avatarSrc = computed(() => avatarCache.value[`${props.platform}:${props.profileId}`])
</script>

<template>
  <NuxtLink :to="`/explorer/tx/${txid}`"
    class="flex items-center gap-3 py-3 -mx-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Avatar with sentiment indicator -->
    <div class="relative">
      <UAvatar :src="avatarSrc" :alt="profileId" size="md" />
      <div
        class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900"
        :class="sentimentInfo.bgClass">
        <UIcon :name="sentimentInfo.icon" class="w-3 h-3" :class="sentimentInfo.textClass" />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Profile link -->
      <div class="flex items-center gap-2 flex-wrap">
        <NuxtLink :to="`/social/${platform}/${profileId}`" class="font-medium hover:text-primary hover:underline"
          @click.stop>
          @{{ profileId }}
        </NuxtLink>
        <UIcon :name="PlatformIcon[platform]" class="w-4 h-4 text-muted" />
      </div>

      <!-- Action description -->
      <p class="text-sm text-muted">
        <span :class="sentimentInfo.textClass">{{ sentimentInfo.label }}</span>
        <template v-if="postId">
          on
          <NuxtLink v-if="postUrl" :to="postUrl" target="_blank" external class="text-primary hover:underline"
            @click.stop>
            post
            <UIcon name="i-lucide-external-link" class="w-3 h-3 inline" />
          </NuxtLink>
          <span v-else>post</span>
        </template>
        <template v-else>
          profile
        </template>
      </p>

      <!-- Voter address (non-compact) -->
      <div v-if="!compact && voterAddress" class="flex items-center gap-1 mt-0.5">
        <span class="text-xs text-muted">by</span>
        <ExplorerAddressDisplay :address="voterAddress" size="xs" :show-add-contact="true" />
      </div>

      <!-- Txid display (non-compact) -->
      <span v-if="!compact" class="text-xs text-muted font-mono">
        {{ txid.slice(0, 8) }}...{{ txid.slice(-6) }}
      </span>
    </div>

    <!-- Right side: Amount + Time -->
    <div class="text-right shrink-0">
      <p class="font-mono font-medium" :class="sentimentInfo.textClass">
        {{ formattedAmount }} XPI
      </p>
      <p class="text-xs text-muted">{{ relativeTime }}</p>
    </div>
  </NuxtLink>
</template>
