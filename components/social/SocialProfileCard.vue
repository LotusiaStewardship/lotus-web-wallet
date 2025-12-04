<script setup lang="ts">
import type { ScriptChunkPlatformUTF8 } from 'lotus-sdk/lib/rank'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'

interface SocialProfileCardProps {
  platform: ScriptChunkPlatformUTF8
  profileId: string
  ranking: string | number
  satsPositive?: string | number
  satsNegative?: string | number
  votesPositive?: number
  votesNegative?: number
  rankingChange?: string | number
  compact?: boolean
}

const props = withDefaults(defineProps<SocialProfileCardProps>(), {
  compact: false,
})

const { avatarCache, preloadAvatars } = useAvatars()
const { toMinifiedPercent, toPercentColor, toMinifiedStatCount } = useExplorerFormat()
const { formatXPI } = useLotusUnits()

// Preload avatar
onMounted(() => {
  preloadAvatars([{ platform: props.platform, profileId: props.profileId }])
})

// Avatar
const avatarSrc = computed(() => avatarCache.value[`${props.platform}:${props.profileId}`])

// Platform name
const platformName = computed(() => {
  return props.platform.charAt(0).toUpperCase() + props.platform.slice(1).toLowerCase()
})

// External profile URL
const profileUrl = computed(() => {
  const config = PlatformURL[props.platform]
  return config ? config.profile(props.profileId) : null
})

// Vote ratio - supports both sats and vote counts
const voteRatio = computed(() => {
  // Use sats if available, otherwise use vote counts
  if (props.satsPositive !== undefined || props.satsNegative !== undefined) {
    return toMinifiedPercent(String(props.satsPositive || '0'), String(props.satsNegative || '0'))
  }
  if (props.votesPositive !== undefined || props.votesNegative !== undefined) {
    const pos = props.votesPositive || 0
    const neg = props.votesNegative || 0
    if (pos === 0 && neg === 0) return null
    const total = pos + neg
    return ((pos / total) * 100).toFixed(1)
  }
  return null
})

// Ranking display
const formattedRanking = computed(() => {
  return toMinifiedStatCount(Number(props.ranking))
})

// Ranking change
const rankingChangeInfo = computed(() => {
  if (!props.rankingChange) return null
  const change = Number(props.rankingChange)
  if (change > 0) {
    return {
      value: `+${toMinifiedStatCount(change)}`,
      color: 'text-success-500',
      icon: 'i-lucide-trending-up',
    }
  } else if (change < 0) {
    return {
      value: toMinifiedStatCount(change),
      color: 'text-error-500',
      icon: 'i-lucide-trending-down',
    }
  }
  return null
})
</script>

<template>
  <NuxtLink :to="`/social/${platform}/${profileId}`"
    class="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Avatar -->
    <UAvatar :src="avatarSrc" :alt="profileId" :size="compact ? 'md' : 'lg'" />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-medium truncate">@{{ profileId }}</span>
        <UIcon :name="PlatformIcon[platform]" class="w-4 h-4 text-muted shrink-0" />
      </div>
      <div class="flex items-center gap-2 text-sm text-muted mt-0.5">
        <span>{{ platformName }}</span>
        <template v-if="voteRatio !== null">
          <span>•</span>
          <UBadge :color="toPercentColor(voteRatio)" variant="subtle" size="sm">
            {{ voteRatio }}% positive
          </UBadge>
        </template>
      </div>
    </div>

    <!-- Right side: Ranking -->
    <div class="text-right shrink-0">
      <div class="font-mono font-medium">{{ formattedRanking }} XPI</div>
      <div v-if="rankingChangeInfo" class="flex items-center justify-end gap-1 text-sm"
        :class="rankingChangeInfo.color">
        <UIcon :name="rankingChangeInfo.icon" class="w-3 h-3" />
        <span>{{ rankingChangeInfo.value }}</span>
      </div>
      <div v-else class="text-xs text-muted">ranking</div>
    </div>
  </NuxtLink>
</template>
