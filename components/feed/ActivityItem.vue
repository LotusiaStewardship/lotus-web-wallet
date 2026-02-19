<script setup lang="ts">
/**
 * Activity Item Component
 *
 * Displays a post in the activity stream with full RANK strategy compliance:
 *   - R1 (Vote-to-Reveal): Blind state until user votes, then reveal full sentiment
 *   - R2 (Controversial badge): Shows when controversy score > 0.3
 *   - R4 (Cost symmetry): Equal visual weight for up/down vote buttons
 *   - R38 (Curation language): "Endorsed/Flagged/Noted" instead of up/down
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1, R2, R4
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { PostData } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { bucketVoteCount, isControversial } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'
import { useTime } from '~/composables/useTime'

const props = defineProps<{
  post: PostData
}>()

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()
const { timeAgo } = useTime()
const walletReady = computed(() => walletStore.isReadyForSigning())
const { useResolve } = useFeedIdentity()
const identity = useResolve(() => props.post.platform, () => props.post.profileId)

/** R1: Determine if the current user has voted on this post */
const hasUserVoted = computed(() => {
  return !!(props.post.postMeta?.hasWalletUpvoted || props.post.postMeta?.hasWalletDownvoted)
})

/** R1: Determine user's voted sentiment if they've voted */
const userSentiment = computed(() => {
  if (props.post.postMeta?.hasWalletUpvoted) return 'positive'
  if (props.post.postMeta?.hasWalletDownvoted) return 'negative'
  return null
})

/** R1: Revealed state shows full sentiment, blind shows only bucketed count */
const isRevealed = computed(() => hasUserVoted.value)

/** R2: Check if post is controversial */
const isControversialFlag = computed(() =>
  isControversial(
    props.post.satsPositive || '0',
    props.post.satsNegative || '0',
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

/** Formatted timestamp for display */
const formattedTime = computed(() => {
  const ts = props.post.lastVoted || props.post.timestamp || props.post.firstSeen
  if (!ts) return ''
  return timeAgo(Number(ts))
})

/** Optimistic local state: tracks the user's vote on this item without feed refresh */
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
      platform: props.post.platform as string,
      profileId: props.post.profileId,
      postId: props.post.id || undefined,
    })

    if (result?.txid) {
      // Optimistic update: highlight the button immediately, no feed refresh
      votedSentiment.value = sentiment
    }
  } finally {
    voting.value = false
  }
}

const isTwitterPost = computed(
  () => props.post.platform === 'twitter',
)

const feedUrl = computed(() => {
  return `/feed/${props.post.platform}/${props.post.profileId}/${props.post.id}`
})

const rankingDisplay = computed(() => {
  const val = BigInt(props.post.ranking || '0')
  return formatXPICompact(val.toString())
})

const isPositive = computed(() => BigInt(props.post.ranking || '0') > 0n)
const isNegative = computed(() => BigInt(props.post.ranking || '0') < 0n)

const totalVotes = computed(() => props.post.votesPositive + props.post.votesNegative)

</script>

<template>
  <NuxtLink :to="feedUrl" class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <FeedAuthorDisplay :platform="post.platform" :profile-id="post.profileId" size="md" :to="feedUrl"
      :time="formattedTime">
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

      <!-- Post content div -->
      <div class="mb-1 mt-0.5">
        <!-- Lotusia post content has data property -->
        <p v-if="post.data" class="text-[15px] leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line">{{
          post.data }}</p>
        <!-- Embedded tweet content (Twitter posts only, matches [postId].vue:198-200) -->
        <FeedXPostEmbed v-else-if="isTwitterPost" :tweet-id="post.id" :profile-id="post.profileId" />
      </div>

      <!-- Bottom action row: vote buttons + ranking metric (standard social media layout) -->
      <div class="flex items-center justify-between mt-1">
        <!-- R4: Upvote button (equal visual weight) -->
        <UButton icon="i-lucide-thumbs-up" size="xs" :variant="votedSentiment === 'positive' ? 'soft' : 'ghost'"
          :color="votedSentiment === 'positive' ? 'success' : 'neutral'" :disabled="!walletReady || voting"
          title="Endorse this content" @click="handleVoteClick('positive', $event)">
          <span v-if="votedSentiment === 'positive'" class="text-xs">Voted</span>
          <!-- R1: Show exact count only when revealed, otherwise hide -->
          <span v-else-if="isRevealed" class="text-xs text-gray-500">{{ post.votesPositive }}</span>
        </UButton>

        <!-- R4: Downvote button (equal visual weight) -->
        <UButton icon="i-lucide-thumbs-down" size="xs" :variant="votedSentiment === 'negative' ? 'soft' : 'ghost'"
          :color="votedSentiment === 'negative' ? 'error' : 'neutral'" :disabled="!walletReady || voting"
          title="Flag this content" @click="handleVoteClick('negative', $event)">
          <span v-if="votedSentiment === 'negative'" class="text-xs">Voted</span>
          <!-- R1: Show exact count only when revealed, otherwise hide -->
          <span v-else-if="isRevealed" class="text-xs text-gray-500">{{ post.votesNegative }}</span>
        </UButton>

        <!-- R1: Ranking and vote display -->
        <span class="text-xs text-gray-400">
          <template v-if="isRevealed">
            <!-- Revealed: Show full sentiment breakdown -->
            {{ rankingDisplay }} XPI ({{ post.votesPositive }}↑ / {{ post.votesNegative }}↓)
          </template>
          <template v-else>
            <!-- Blind: Show only bucketed vote count per R1 spec -->
            {{ bucketedVotesDisplay }}
          </template>
        </span>
      </div>
    </FeedAuthorDisplay>
  </NuxtLink>
</template>