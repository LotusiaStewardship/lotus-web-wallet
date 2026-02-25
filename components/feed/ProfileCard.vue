<script setup lang="ts">
/**
 * Profile Card Component
 *
 * Displays a ranked profile summary with platform icon, sentiment indicators,
 * and tier badge. Used in feed lists and search results.
 *
 * Strategy Compliance:
 *   R1: Blind until user voted on THIS specific profile via profileMeta.
 *   R2: Controversial badge (revealed state only).
 *   R4: Equal visual weight for endorse/flag via FeedButtonRow.
 *   R38: "Endorsed/Flagged/Noted" not "upvoted/downvoted".
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1, R2, R4
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { TrendingItem, ProfileListItem, ProfileData, VoterProfileMetadata } from '~/composables/useRankApi'
import { PlatformURL, useRankApi } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { isControversial as checkControversial, bucketVoteCount } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'
import type { ScriptChunkSentimentUTF8 } from 'xpi-ts/lib/rank'

const props = defineProps<{
  /** Profile data from trending or list endpoint */
  profile: TrendingItem | ProfileListItem | ProfileData
  /** Show rank position number */
  rank?: number
  /** Compact mode for list views */
  compact?: boolean
  /** R1 Vote-to-Reveal: whether sentiment is revealed (default false until user votes) */
  revealed?: boolean
  /** Profile metadata for R1 compliance (voting status) */
  profileMeta?: VoterProfileMetadata
}>()

const emit = defineEmits<{
  voted: [txid: string, sentiment?: ScriptChunkSentimentUTF8]
}>()

const walletStore = useWalletStore()
const walletReady = computed(() => walletStore.isReadyForSigning())

// R1: Revealed when user has voted on THIS specific profile
const hasUserVoted = computed(() => {
  return !!(props.profileMeta?.hasWalletUpvoted || props.profileMeta?.hasWalletDownvoted)
})

const isRevealed = computed(() => hasUserVoted.value || props.revealed === true)
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
  return formatXPICompact(ranking.value)
})

const isPositive = computed(() => BigInt(ranking.value) > 0n)
const isNegative = computed(() => BigInt(ranking.value) < 0n)

// R38: Curation language
const sentimentLabel = computed(() => {
  if (isPositive.value) return 'Endorsed'
  if (isNegative.value) return 'Flagged'
  return 'Noted'
})

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[platform.value]
  if (!urlHelper) return null
  return urlHelper.profile(profileId.value)
})

const feedUrl = computed(() => `/feed/${platform.value}/${profileId.value}`)

</script>

<template>
  <NuxtLink :to="feedUrl"
    class="block rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-primary-50/30 to-transparent dark:from-primary-950/20 dark:to-transparent hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
    :class="compact ? 'p-3' : 'p-4'">
    <!-- Main Content -->
    <div class="flex items-center gap-3">
      <!-- Rank Position -->
      <div v-if="rank"
        class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold"
        :class="rank <= 3 ? 'text-primary' : 'text-gray-500'">
        {{ rank }}
      </div>

      <div class="flex-1 min-w-0">
        <FeedAuthorDisplay :platform="platform" :profile-id="profileId" size="md" :to="feedUrl"
          :show-profile-badge="true">
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
        </FeedAuthorDisplay>
      </div>
    </div>

    <!-- Action Row: vote buttons -->
    <div class="pt-3">
      <FeedButtonRow :platform="platform" :profile-id="profileId" post-id="" :post-meta="undefined"
        :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
        :bucketed-votes="bucketedVotes" :ranking-display="rankingDisplay" :can-reply="false" :compact="false"
        :disabled="!walletReady" @voted="(txid, sentiment) => emit('voted', txid, sentiment)" />
    </div>
  </NuxtLink>
</template>
