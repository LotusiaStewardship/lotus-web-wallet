<script setup lang="ts">
/**
 * Post Card Component
 *
 * Displays a ranked post summary with vote counts, burn amounts,
 * and controversy badge. Used in profile detail and feed lists.
 */
import type { TrendingItem, PostListItem } from '~/composables/useRankApi'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'

const props = defineProps<{
  /** Post data from trending or list endpoint */
  post: TrendingItem | PostListItem
  /** Platform for URL construction */
  platform: string
  /** Profile ID for URL construction */
  profileId: string
  /** Show rank position number */
  rank?: number
}>()

const postId = computed(() => {
  if ('postId' in props.post && props.post.postId) return props.post.postId
  if ('id' in props.post) return (props.post as PostListItem).id
  return ''
})

const ranking = computed(() => {
  if ('total' in props.post) return props.post.total.ranking
  return props.post.ranking
})

const votesPositive = computed(() => {
  if ('total' in props.post) return props.post.total.votesPositive
  return props.post.votesPositive
})

const votesNegative = computed(() => {
  if ('total' in props.post) return props.post.total.votesNegative
  return props.post.votesNegative
})

const totalVotes = computed(() => votesPositive.value + votesNegative.value)

const rankingDisplay = computed(() => {
  const val = BigInt(ranking.value)
  return formatXPI(val.toString(), { minDecimals: 0, maxDecimals: 2 })
})

const isPositive = computed(() => BigInt(ranking.value) > 0n)
const isNegative = computed(() => BigInt(ranking.value) < 0n)

const isControversial = computed(() => {
  if (totalVotes.value < 5) return false
  const ratio = votesPositive.value / totalVotes.value
  return ratio > 0.35 && ratio < 0.65
})

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[props.platform]
  if (!urlHelper) return null
  return urlHelper.post(props.profileId, postId.value)
})

const feedUrl = computed(() =>
  `/feed/${props.platform}/${props.profileId}/${postId.value}`,
)

const platformIcon = computed(() => PlatformIcon[props.platform] || 'i-lucide-globe')
</script>

<template>
  <NuxtLink :to="feedUrl"
    class="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-300 dark:hover:border-primary-700 transition-colors p-4">
    <div class="flex items-start gap-3">
      <!-- Rank Position -->
      <div v-if="rank"
        class="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold"
        :class="rank <= 3 ? 'text-primary' : 'text-gray-500'">
        {{ rank }}
      </div>

      <!-- Post Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <UIcon :name="platformIcon" class="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span class="text-sm text-gray-500 truncate">{{ profileId }}/{{ postId }}</span>
          <UBadge v-if="isControversial" color="warning" size="xs" variant="subtle">
            Controversial
          </UBadge>
          <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
            class="ml-auto text-gray-400 hover:text-primary transition-colors flex-shrink-0" @click.stop>
            <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
          </a>
        </div>

        <!-- Vote Stats -->
        <div class="flex items-center gap-4 text-sm">
          <span class="flex items-center gap-1 text-success-500">
            <UIcon name="i-lucide-thumbs-up" class="w-3.5 h-3.5" />
            {{ votesPositive }}
          </span>
          <span class="flex items-center gap-1 text-error-500">
            <UIcon name="i-lucide-thumbs-down" class="w-3.5 h-3.5" />
            {{ votesNegative }}
          </span>
        </div>
      </div>

      <!-- Ranking Score -->
      <div class="flex-shrink-0 text-right">
        <div class="font-mono font-bold text-sm"
          :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
          {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
        </div>
        <div class="text-xs text-gray-500">XPI</div>
      </div>
    </div>
  </NuxtLink>
</template>
