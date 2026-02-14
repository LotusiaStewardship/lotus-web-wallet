<script setup lang="ts">
/**
 * Profile Card Component
 *
 * Displays a ranked profile summary with platform icon, sentiment indicators,
 * and tier badge. Used in feed lists and search results.
 */
import type { TrendingItem, ProfileListItem } from '~/composables/useRankApi'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'

const props = defineProps<{
  /** Profile data from trending or list endpoint */
  profile: TrendingItem | ProfileListItem
  /** Show rank position number */
  rank?: number
  /** Compact mode for list views */
  compact?: boolean
}>()

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

const totalVotes = computed(() => votesPositive.value + votesNegative.value)

const sentimentRatio = computed(() => {
  if (totalVotes.value === 0) return 50
  return Math.round((votesPositive.value / totalVotes.value) * 100)
})

const rankingDisplay = computed(() => {
  const val = BigInt(ranking.value)
  return formatXPI(val.toString(), { minDecimals: 0, maxDecimals: 2 })
})

const isPositive = computed(() => BigInt(ranking.value) > 0n)
const isNegative = computed(() => BigInt(ranking.value) < 0n)

const platformIcon = computed(() => PlatformIcon[platform.value] || 'i-lucide-globe')

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

      <!-- Platform Icon -->
      <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <UIcon :name="platformIcon" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </div>

      <!-- Profile Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-semibold truncate">{{ profileId }}</span>
          <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
            class="text-gray-400 hover:text-primary transition-colors" @click.stop>
            <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
          </a>
        </div>

        <!-- Sentiment Bar -->
        <div v-if="!compact" class="mt-1.5 flex items-center gap-2">
          <div class="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full bg-success-500 rounded-full transition-all"
              :style="{ width: `${sentimentRatio}%` }" />
          </div>
          <span class="text-xs text-gray-500 whitespace-nowrap">
            {{ sentimentRatio }}% positive
          </span>
        </div>
      </div>

      <!-- Ranking Score -->
      <div class="flex-shrink-0 text-right">
        <div class="font-mono font-bold text-sm"
          :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
          {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
        </div>
        <div class="text-xs text-gray-500">
          {{ totalVotes }} {{ totalVotes === 1 ? 'vote' : 'votes' }}
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
