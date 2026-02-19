<script setup lang="ts">
/**
 * Post Card Component — Simplified List View
 *
 * Displays a ranked post in list views (TopPosts, profile pages) with full
 * RANK strategy compliance matching ActivityItem.vue design language.
 *
 * Strategy Compliance:
 *   - R1 (Vote-to-Reveal): Blind state until user votes, then reveal full sentiment
 *   - R2 (Controversial badge): Shows when controversy score > 0.3
 *   - R4 (Cost symmetry): Equal visual weight for up/down vote buttons
 *   - R38 (Curation language): "Endorsed/Flagged/Noted" instead of up/down
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1, R2, R4
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { TrendingItem, PostListItem, PostData } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { bucketVoteCount, isControversial } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'

const props = defineProps<{
  /** Post data from trending or list endpoint */
  post: TrendingItem | PostListItem | PostData
  /** Platform for URL construction (optional if post is PostData) */
  platform?: ScriptChunkPlatformUTF8
  /** Profile ID for URL construction (optional if post is PostData) */
  profileId?: string
  /** Show rank position number */
  rank?: number
}>()

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()
const walletReady = computed(() => walletStore.isReadyForSigning())

// Extract post properties from various input types
const postId = computed(() => {
  if ('postId' in props.post && props.post.postId) return props.post.postId
  if ('id' in props.post) return (props.post as PostListItem).id
  return ''
})

const postPlatform = computed<ScriptChunkPlatformUTF8>(() => {
  if (props.platform) return props.platform
  if ('platform' in props.post) return props.post.platform
  return 'twitter'
})

const postProfileId = computed(() => {
  if (props.profileId) return props.profileId
  if ('profileId' in props.post) return props.post.profileId
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

const satsPositive = computed(() => {
  if ('total' in props.post) return '0'
  return (props.post as PostData).satsPositive || '0'
})

const satsNegative = computed(() => {
  if ('total' in props.post) return '0'
  return (props.post as PostData).satsNegative || '0'
})

/** R1: Determine if the current user has voted on this post (for PostData with meta) */
const hasUserVoted = computed(() => {
  if (!('postMeta' in props.post)) return false
  const meta = (props.post as PostData).postMeta
  return !!(meta?.hasWalletUpvoted || meta?.hasWalletDownvoted)
})

/** R1: Determine user's voted sentiment if they've voted */
const userSentiment = computed(() => {
  if (!('postMeta' in props.post)) return null
  const meta = (props.post as PostData).postMeta
  if (meta?.hasWalletUpvoted) return 'positive'
  if (meta?.hasWalletDownvoted) return 'negative'
  return null
})

/** R1: Revealed state shows full sentiment, blind shows only bucketed count */
const isRevealed = computed(() => hasUserVoted.value)

/** R2: Check if post is controversial */
const isControversialFlag = computed(() =>
  isControversial(
    satsPositive.value,
    satsNegative.value,
    totalVotes.value,
    5, // min votes threshold per R2
  ),
)

/** R38: Curation language based on aggregate sentiment (for revealed state) */
const sentimentLabel = computed(() => {
  if (isPositive.value) return 'Endorsed'
  if (isNegative.value) return 'Flagged'
  return 'Noted'
})

/** R38: Badge color for sentiment */
const sentimentColor = computed(() => {
  if (isPositive.value) return 'success'
  if (isNegative.value) return 'error'
  return 'neutral'
})

/** R1: Bucketed vote count for blind state */
const bucketedVotesDisplay = computed(() => bucketVoteCount(totalVotes.value))

const rankingDisplay = computed(() => {
  const val = BigInt(ranking.value || '0')
  return formatXPICompact(val.toString())
})

const isPositive = computed(() => BigInt(ranking.value || '0') > 0n)
const isNegative = computed(() => BigInt(ranking.value || '0') < 0n)

const feedUrl = computed(() =>
  `/feed/${postPlatform.value}/${postProfileId.value}/${postId.value}`,
)

const isTwitterPost = computed(() => postPlatform.value === 'twitter')

// Optimistic local state: tracks the user's vote on this item without feed refresh
const votedSentiment = ref<'positive' | 'negative' | null>(null)
const voting = ref(false)

// R1: Initialize optimistic state with user's existing vote if they've already voted
onMounted(() => {
  if (userSentiment.value) {
    votedSentiment.value = userSentiment.value
  }
})

async function handleVoteClick(sentiment: 'positive' | 'negative', event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (!walletReady.value || voting.value) return

  voting.value = true
  try {
    const result = await openVoteSlideover({
      sentiment,
      platform: postPlatform.value as string,
      profileId: postProfileId.value,
      postId: postId.value || undefined,
    })

    if (result?.txid) {
      // Optimistic update: highlight the button immediately, no feed refresh
      votedSentiment.value = sentiment
    }
  } finally {
    voting.value = false
  }
}

</script>

<template>
  <NuxtLink :to="feedUrl" class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <div class="flex items-center gap-3">
      <!-- Rank Position (if provided) -->
      <div v-if="rank"
        class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold"
        :class="rank <= 3 ? 'text-primary' : 'text-gray-500'">
        {{ rank }}
      </div>

      <div class="flex-1 min-w-0">
        <FeedAuthorDisplay :platform="postPlatform" :profile-id="postProfileId" size="md" :to="feedUrl">
          <template #inline>
            <!-- R1: Only show sentiment badge in revealed state -->
            <template v-if="isRevealed">
              <UBadge :color="sentimentColor" size="sm" variant="subtle">
                {{ sentimentLabel }}
              </UBadge>
              <!-- R2: Controversial flag -->
              <UBadge v-if="isControversialFlag" color="warning" size="sm" variant="subtle">
                Controversial
              </UBadge>
            </template>
          </template>
        </FeedAuthorDisplay>
      </div>
    </div>

    <!-- Bottom action row: vote buttons + ranking metric (standard social media layout) -->
    <div class="flex items-center gap-4 mt-2">
      <!-- R4: Upvote button (equal visual weight) -->
      <UButton icon="i-lucide-thumbs-up" size="xs" :variant="votedSentiment === 'positive' ? 'soft' : 'ghost'"
        :color="votedSentiment === 'positive' ? 'success' : 'neutral'" :disabled="!walletReady || voting"
        title="Endorse this content" @click="handleVoteClick('positive', $event)">
        <span v-if="votedSentiment === 'positive'" class="text-[11px]">Voted</span>
        <!-- R1: Show exact count only when revealed, otherwise hide -->
        <span v-else-if="isRevealed" class="text-[11px] text-gray-500">{{ votesPositive }}</span>
      </UButton>

      <!-- R4: Downvote button (equal visual weight) -->
      <UButton icon="i-lucide-thumbs-down" size="xs" :variant="votedSentiment === 'negative' ? 'soft' : 'ghost'"
        :color="votedSentiment === 'negative' ? 'error' : 'neutral'" :disabled="!walletReady || voting"
        title="Flag this content" @click="handleVoteClick('negative', $event)">
        <span v-if="votedSentiment === 'negative'" class="text-[11px]">Voted</span>
        <!-- R1: Show exact count only when revealed, otherwise hide -->
        <span v-else-if="isRevealed" class="text-[11px] text-gray-500">{{ votesNegative }}</span>
      </UButton>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- R1: Ranking and vote display -->
      <span class="text-[11px] text-gray-400">
        <template v-if="isRevealed">
          <!-- Revealed: Show full sentiment breakdown -->
          {{ rankingDisplay }} XPI ({{ votesPositive }}↑ / {{ votesNegative }}↓)
        </template>
        <template v-else>
          <!-- Blind: Show only bucketed vote count per R1 spec -->
          {{ bucketedVotesDisplay }}
        </template>
      </span>
    </div>
  </NuxtLink>
</template>
