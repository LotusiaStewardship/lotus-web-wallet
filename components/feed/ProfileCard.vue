<script setup lang="ts">
/**
 * Profile Card Component
 *
 * Displays a ranked profile summary with platform icon, sentiment indicators,
 * and tier badge. Used in feed lists and search results.
 */
import type { TrendingItem, ProfileListItem } from '~/composables/useRankApi'
import { PlatformURL } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { isControversial as checkControversial, bucketVoteCount } from '~/utils/feed'

const props = defineProps<{
  /** Profile data from trending or list endpoint */
  profile: TrendingItem | ProfileListItem
  /** Show rank position number */
  rank?: number
  /** Compact mode for list views */
  compact?: boolean
  /** R1 Vote-to-Reveal: whether sentiment is revealed (default true until backend R1 deployed) */
  revealed?: boolean
}>()

// R1: Default to revealed until backend enforces conditional response
const isRevealed = computed(() => props.revealed !== false)
const bucketedVotes = computed(() => bucketVoteCount(totalVotes.value))

const profileId = computed(() => {
  if ('profileId' in props.profile) return props.profile.profileId
  return props.profile.id
})

const platform = computed(() => props.profile.platform)

const ranking = computed(() => {
  if ('total' in props.profile) return props.profile.total.ranking
  return props.profile.ranking
})

const votesPositive = computed(() => {
  if ('total' in props.profile) return props.profile.total.votesPositive
  return props.profile.votesPositive
})

const votesNegative = computed(() => {
  if ('total' in props.profile) return props.profile.total.votesNegative
  return props.profile.votesNegative
})

const satsPos = computed(() => {
  if ('total' in props.profile) return '0'
  return props.profile.satsPositive
})

const satsNeg = computed(() => {
  if ('total' in props.profile) return '0'
  return props.profile.satsNegative
})

const totalVotes = computed(() => votesPositive.value + votesNegative.value)

const isControversial = computed(() =>
  checkControversial(satsPos.value, satsNeg.value, totalVotes.value),
)

const sentimentRatio = computed(() => {
  if (totalVotes.value === 0) return 50
  return Math.round((votesPositive.value / totalVotes.value) * 100)
})

const rankingDisplay = computed(() => {
  const val = BigInt(ranking.value)
  return formatXPICompact(val.toString())
})

const isPositive = computed(() => BigInt(ranking.value) > 0n)
const isNegative = computed(() => BigInt(ranking.value) < 0n)

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[platform.value]
  if (!urlHelper) return null
  return urlHelper.profile(profileId.value)
})

const feedUrl = computed(() => `/feed/${platform.value}/${profileId.value}`)

</script>

<template>
  <NuxtLink :to="feedUrl"
    class="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
    :class="compact ? 'p-3' : 'p-4'">
    <div class="flex items-center gap-3">
      <!-- Rank Position -->
      <div v-if="rank"
        class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold"
        :class="rank <= 3 ? 'text-primary' : 'text-gray-500'">
        {{ rank }}
      </div>

      <div class="flex-1 min-w-0">
        <FeedAuthorDisplay :platform="platform" :profile-id="profileId" size="md" :to="feedUrl">
          <template #inline>
            <UBadge v-if="isRevealed && isControversial" color="warning" size="xs" variant="subtle">
              Controversial
            </UBadge>
            <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
              class="text-gray-400 hover:text-primary transition-colors" @click.stop>
              <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
            </a>
          </template>

          <!-- R1: Sentiment Bar (revealed) or bucketed count (blind) -->
          <div v-if="!compact && isRevealed" class="mt-1.5 flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full bg-success-500 rounded-full transition-all" :style="{ width: `${sentimentRatio}%` }" />
            </div>
            <span class="text-xs text-gray-500 whitespace-nowrap">
              {{ sentimentRatio }}% positive
            </span>
          </div>
          <div v-else-if="!compact" class="mt-1.5">
            <span class="text-xs text-gray-400">{{ bucketedVotes }}</span>
          </div>
        </FeedAuthorDisplay>
      </div>

      <!-- Ranking Score (revealed) or vote count (blind) -->
      <div class="flex-shrink-0 text-right">
        <template v-if="isRevealed">
          <div class="font-mono font-bold text-sm"
            :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
            {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
          </div>
          <div class="text-xs text-gray-500">
            {{ totalVotes }} {{ totalVotes === 1 ? 'vote' : 'votes' }}
          </div>
        </template>
        <template v-else>
          <div class="text-xs text-gray-400">{{ bucketedVotes }}</div>
        </template>
      </div>
    </div>
  </NuxtLink>
</template>
