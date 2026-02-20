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

const hasAncestors = computed(() => {
  return props.post.ancestors && props.post.ancestors.length > 0
})

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[props.post.platform]
  if (!urlHelper) return null
  return urlHelper.post(props.post.profileId, props.post.id)
})

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
  <div class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Ancestor chain: Twitter-style conversation context above the focal post -->
    <template v-if="hasAncestors">
      <FeedAncestorItem font-size="md" v-for="ancestor in props.post.ancestors" :key="ancestor.id" :post="ancestor"
        :show-connector="true" />
      <!-- Connector stub into the focal post below: aligns with ancestor avatar center -->
      <!-- UAvatar size="md" = size-8 = 32px = w-8 -->
      <div class="flex">
        <div class="flex flex-col items-center flex-shrink-0 w-8 pb-2 -mt-4">
          <div class="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>
    </template>
    <NuxtLink :to="feedUrl">
      <!-- Post Header: Author info -->
      <div class="mb-2">
        <FeedAuthorDisplay :platform="post.platform" :profile-id="post.profileId" size="md" :to="feedUrl"
          :time="formattedTime">
          <template #inline>
            <!-- R1: Only show sentiment badge in revealed state -->
            <template v-if="isRevealed">
              <!-- NOTE: The sentiment badge is already shown in the FeedVoteButton component -->
              <!-- R2: Controversial flag -->
              <UBadge v-if="isControversialFlag" color="warning" size="sm" variant="subtle">
                Controversial
              </UBadge>
            </template>
            <!-- External link for non-Lotusia posts -->
            <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
              class="ml-auto text-gray-400 hover:text-primary transition-colors" @click.stop>
              <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
            </a>
          </template>
        </FeedAuthorDisplay>
      </div>

      <!-- Post Content -->
      <div class="mb-2">
        <!-- Lotusia post content has data property -->
        <p v-if="post.data" class="text-md leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line">{{
          post.data }}</p>
        <!-- Embedded tweet content (Twitter posts only, matches [postId].vue:256) -->
        <FeedXPostEmbed v-else-if="isTwitterPost" :tweet-id="post.id" :profile-id="post.profileId" />
      </div>
    </NuxtLink>

    <!-- Bottom action row: vote buttons + ranking metric (standard social media layout) -->
    <div class="flex items-center justify-between mt-1">
      <!-- TODO: Add handleVoted() to capture the vote transaction ID and update local state -->
      <FeedVoteButton :platform="post.platform" :profile-id="post.profileId" :post-id="post.id"
        :post-meta="post.postMeta" :disabled="!walletReady" :compact="true" />

      <!-- R1: Ranking and vote display -->
      <span class="text-xs text-gray-500 dark:text-gray-400">
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
  </div>
</template>