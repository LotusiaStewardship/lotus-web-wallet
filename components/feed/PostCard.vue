<script setup lang="ts">
/**
 * Post Card Component
 *
 * Unified post display for ALL feed contexts:
 *   - List view (TopPosts, profile pages): compact row with optional rank number
 *   - Activity stream: ancestor chain, timestamp, embed content
 *   - Ancestor chain: R1 gated on the ancestor's own postMeta (not parent vote)
 *   - Comment / RNKC: R6 collapse, depth threading, inline reply form
 *
 * Strategy Compliance:
 *   R1: Blind until user voted on THIS specific post. Ancestors reveal when
 *       the user has voted on that ancestor independently.
 *   R2: Controversial badge (revealed state only).
 *   R4: Equal visual weight for endorse/flag via ButtonRow.
 *   R6: Negative net-burn comments collapsed by default (own posts exempt).
 *   R38: "Endorsed/Flagged/Noted" not "upvoted/downvoted".
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1, R2, R4, R6
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { TrendingItem, PostListItem, PostData, RnkcComment } from '~/composables/useRankApi'
import { PlatformURL } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { bucketVoteCount, isControversial } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'
import { useTime } from '~/composables/useTime'
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'

const props = defineProps<{
  post: TrendingItem | PostListItem | PostData | RnkcComment
  platform?: ScriptChunkPlatformUTF8
  profileId?: string
  rank?: number
  /** Activity stream: ancestor chain, timestamp, embed, div wrapper */
  activity?: boolean
  /** Ancestor chain: R1 gated on this ancestor's own postMeta */
  ancestor?: boolean
  showConnector?: boolean
  connectorMinHeight?: string
  /** Comment / RNKC: R6 collapse, depth threading, inline reply */
  comment?: boolean
  depth?: number
  /** R1 for comments: whether user voted on the PARENT post/profile */
  parentHasVoted?: boolean
  /** Active reply target txid */
  activeReplyTo?: string | null
  /** Reply target context for ButtonRow's inline CommentInput */
  replyPlatform?: ScriptChunkPlatformUTF8
  replyProfileId?: string
  replyPostId?: string
}>()

const emit = defineEmits<{
  reply: [parentTxid: string]
  replyPosted: [txid: string]
  replyCancelled: []
}>()

const walletStore = useWalletStore()
const { timeAgo } = useTime()
const { useResolve } = useFeedIdentity()
const walletReady = computed(() => walletStore.isReadyForSigning())

// ---------------------------------------------------------------------------
// Normalised post properties
// ---------------------------------------------------------------------------

const postId = computed(() => {
  if ('postId' in props.post && props.post.postId) return props.post.postId
  if ('id' in props.post) return props.post.id
  return ''
})

const postPlatform = computed<ScriptChunkPlatformUTF8>(() => {
  if (props.platform) return props.platform
  if ('platform' in props.post) return props.post.platform
  return 'lotusia'
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

const postData = computed(() => {
  if ('data' in props.post) return (props.post as PostData | RnkcComment).data
  return undefined
})

const postMeta = computed(() => {
  if ('postMeta' in props.post) return (props.post as PostData).postMeta
  return undefined
})

const ancestors = computed(() => {
  if ('ancestors' in props.post) return (props.post as PostData).ancestors
  return undefined
})
const hasAncestors = computed(() => !!ancestors.value?.length)

const directReplies = computed<RnkcComment[]>(() => {
  if ('comments' in props.post) return (props.post as RnkcComment).comments ?? []
  return []
})
const replyCount = computed(() => directReplies.value.length)
const currentDepth = computed(() => props.depth ?? 0)
const showInlineReplies = computed(() => props.comment && currentDepth.value < 2 && replyCount.value > 0)
const showViewMoreLink = computed(() => props.comment && currentDepth.value >= 2 && replyCount.value > 0)

// ---------------------------------------------------------------------------
// R1: Vote-to-Reveal
// ---------------------------------------------------------------------------

/**
 * R1: Revealed when the user has voted on THIS specific post.
 * - Regular posts / ancestors: check postMeta directly.
 * - Comments: gated on parentHasVoted (user voted on the parent post/profile).
 */
const hasUserVoted = computed(() => {
  if (props.comment) return !!props.parentHasVoted
  return !!(postMeta.value?.hasWalletUpvoted || postMeta.value?.hasWalletDownvoted)
})

const isRevealed = computed(() => hasUserVoted.value)

// ---------------------------------------------------------------------------
// R6: Collapse (comment mode only)
// ---------------------------------------------------------------------------

const identity = useResolve(() => postPlatform.value, () => postProfileId.value)
const isOwnPost = computed(() => identity.value.isOwn)
const isNegative = computed(() => BigInt(ranking.value || '0') < 0n)
const isPositive = computed(() => BigInt(ranking.value || '0') > 0n)

const isCollapsed = ref(props.comment && isNegative.value && !isOwnPost.value)

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const isControversialFlag = computed(() =>
  isControversial(satsPositive.value, satsNegative.value, totalVotes.value, 5),
)

const sentimentLabel = computed(() => {
  if (isPositive.value) return 'Endorsed'
  if (isNegative.value) return 'Flagged'
  return 'Noted'
})

const sentimentColor = computed(() => {
  if (isPositive.value) return 'success'
  if (isNegative.value) return 'error'
  return 'neutral'
})

const bucketedVotesDisplay = computed(() => bucketVoteCount(totalVotes.value))
const rankingDisplay = computed(() => formatXPICompact(BigInt(ranking.value || '0').toString()))

const feedUrl = computed(() => `/feed/${postPlatform.value}/${postProfileId.value}/${postId.value}`)
const isTwitterPost = computed(() => postPlatform.value === 'twitter')
const isLotusiaPost = computed(() => postPlatform.value === 'lotusia')

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[postPlatform.value]
  if (!urlHelper) return null
  return urlHelper.post(postProfileId.value, postId.value)
})

const formattedTime = computed(() => {
  if (!props.activity && !props.ancestor && !props.comment) return undefined
  const p = props.post as PostData
  const ts = p.lastVoted || p.timestamp || p.firstSeen
  if (!ts) return undefined
  return timeAgo(Number(ts))
})

// ---------------------------------------------------------------------------
// Reply (comment mode)
// ---------------------------------------------------------------------------

const isReplyActive = computed(() => props.activeReplyTo === postId.value)
const hasConnector = computed(() => showInlineReplies.value)

function handleReply() { emit('reply', postId.value) }
function handleReplyPosted(txid: string) { emit('replyPosted', txid) }
function handleReplyCancelled() { emit('replyCancelled') }
</script>

<template>
  <!-- =====================================================================
       COMMENT MODE (RNKC posts / replies)
       R6 collapse, depth-aware threading, inline reply via ButtonRow.
       Used in: CommentThread (replaces CommentItem).
       ===================================================================== -->
  <div v-if="comment" class="relative">
    <!-- R6: Collapsed state — negative net burn, not own post -->
    <div v-if="isCollapsed"
      class="flex items-center gap-2 py-1.5 px-4 text-xs text-gray-400 cursor-pointer hover:text-gray-500 transition-colors"
      @click="isCollapsed = false">
      <UIcon name="i-lucide-chevron-right" class="w-3.5 h-3.5 flex-shrink-0" />
      <span>Hidden · low score · tap to show</span>
    </div>

    <!-- Expanded state -->
    <div v-else class="py-3">
      <FeedAuthorDisplay :compact="true" :platform="postPlatform" :profile-id="postProfileId" size="md" :to="feedUrl"
        :time="formattedTime" :show-connector="hasConnector">
        <template #inline>
          <!-- R1: Sentiment badges — revealed state only -->
          <template v-if="isRevealed">
            <UBadge :color="sentimentColor" size="sm" variant="subtle">{{ sentimentLabel }}</UBadge>
            <UBadge v-if="isControversialFlag" color="warning" size="sm" variant="subtle">Controversial</UBadge>
          </template>
          <!-- R6: Collapse button — only post-vote for negative comments, not own -->
          <button v-if="isNegative && isRevealed && !isOwnPost"
            class="ml-auto text-gray-300 hover:text-gray-500 transition-colors" @click.stop="isCollapsed = true">
            <UIcon name="i-lucide-chevron-up" class="w-3.5 h-3.5" />
          </button>
        </template>

        <!-- Comment text -->
        <div class="mb-3 mt-1">
          <NuxtLink :to="feedUrl" @click.stop>
            <p
              class="text-[15px] leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words hover:opacity-90 transition-opacity">
              {{ postData }}
            </p>
          </NuxtLink>
        </div>

        <!-- ButtonRow: endorse/flag + reply -->
        <FeedButtonRow :platform="postPlatform" :profile-id="postProfileId" :post-id="postId" :post-meta="postMeta"
          :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
          :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay" :can-reply="true"
          :reply-count="replyCount" :reply-active="isReplyActive" :reply-platform="replyPlatform"
          :reply-profile-id="replyProfileId" :reply-post-id="replyPostId" :parent-text="postData" :compact="true"
          @reply="handleReply" @reply-posted="handleReplyPosted" @reply-cancelled="handleReplyCancelled" />

        <!-- "View conversation" link for deep replies (depth >= 2) -->
        <NuxtLink v-if="showViewMoreLink" :to="feedUrl" class="text-xs text-primary hover:underline block mt-1"
          @click.stop>
          View {{ replyCount }} {{ replyCount === 1 ? 'reply' : 'replies' }}
        </NuxtLink>
      </FeedAuthorDisplay>

      <!-- Inline reply chain (depth 0→1 only) -->
      <div v-if="showInlineReplies">
        <FeedPostCard v-for="reply in directReplies" :key="reply.id" :post="reply" :comment="true"
          :depth="currentDepth + 1" :parent-has-voted="parentHasVoted" :active-reply-to="activeReplyTo"
          :reply-platform="replyPlatform" :reply-profile-id="replyProfileId" :reply-post-id="replyPostId"
          @reply="$emit('reply', $event)" @reply-posted="$emit('replyPosted', $event)"
          @reply-cancelled="$emit('replyCancelled')" />
      </div>
    </div>
  </div>

  <!-- =====================================================================
       ANCESTOR MODE
       R1 gated on this ancestor's own postMeta. Connector line, compact.
       Used in: activity stream ancestor chain, [postId].vue ancestor chain.
       ===================================================================== -->
  <div v-else-if="ancestor" class="pb-2">
    <FeedAuthorDisplay :compact="true" :platform="postPlatform" :profile-id="postProfileId" size="md" :to="feedUrl"
      :time="formattedTime" :show-connector="showConnector" :connector-min-height="connectorMinHeight || '16px'">
      <template #inline>
        <!-- R1: Show exact counts if user voted on this ancestor, else bucketed -->
        <!-- <span class="text-xs text-gray-500 dark:text-gray-400">&middot;</span>
        <template v-if="isRevealed">
          <UBadge :color="sentimentColor" size="xs" variant="subtle">{{ sentimentLabel }}</UBadge>
        </template>
    <span v-else class="text-xs text-gray-500 dark:text-gray-400">{{ bucketedVotesDisplay }}</span> -->
        <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
          class="ml-auto text-gray-400 hover:text-primary transition-colors" @click.stop>
          <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
        </a>
      </template>

      <!-- Content -->
      <NuxtLink :to="feedUrl" class="block group mb-2">
        <p v-if="isLotusiaPost && postData"
          class="mt-1 text-md leading-snug text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words group-hover:opacity-90 transition-opacity line-clamp-3">
          {{ postData }}
        </p>
        <div v-else-if="isTwitterPost" class="mt-1">
          <FeedXPostEmbed font-size="md" :tweet-id="postId" :profile-id="postProfileId" />
        </div>
        <p v-else class="text-sm text-gray-400 italic">
          {{ postPlatform }} post · {{ postId.slice(0, 12) }}...
        </p>
      </NuxtLink>

      <!-- ButtonRow: endorse/flag (no reply for ancestors) -->
      <FeedButtonRow :platform="postPlatform" :profile-id="postProfileId" :post-id="postId" :post-meta="postMeta"
        :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
        :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay" :compact="true" />
    </FeedAuthorDisplay>
  </div>

  <!-- =====================================================================
       ACTIVITY STREAM MODE
       Ancestor chain, timestamp, embed, external link.
       Used in: ActivityStream.vue
       ===================================================================== -->
  <div v-else-if="activity" class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Ancestor chain -->
    <template v-if="hasAncestors">
      <FeedPostCard v-for="anc in ancestors" :key="anc.id" :post="anc" :ancestor="true" :show-connector="true" />
      <div class="flex">
        <div class="flex flex-col items-center flex-shrink-0 w-8 pb-2 -mt-4">
          <div class="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>
    </template>

    <NuxtLink :to="feedUrl">
      <div class="mb-2 flex-1 min-w-0 relative">
        <FeedAuthorDisplay :platform="postPlatform" :profile-id="postProfileId" size="md" :to="feedUrl"
          :time="formattedTime">
          <template #inline>
            <template v-if="isRevealed">
              <UBadge v-if="isControversialFlag" color="warning" size="sm" variant="subtle">Controversial</UBadge>
            </template>
            <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
              class="ml-auto text-gray-400 hover:text-primary transition-colors absolute right-0 top-0" @click.stop>
              <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
            </a>
          </template>
        </FeedAuthorDisplay>
      </div>
      <div class="mb-2">
        <p v-if="postData" class="text-md leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line">{{
          postData }}</p>
        <FeedXPostEmbed v-else-if="isTwitterPost" :tweet-id="postId" :profile-id="postProfileId" />
      </div>
    </NuxtLink>

    <!-- ButtonRow: endorse/flag + reply (Lotusia posts only) -->
    <FeedButtonRow :platform="postPlatform" :profile-id="postProfileId" :post-id="postId" :post-meta="postMeta"
      :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
      :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay" :can-reply="isLotusiaPost"
      :reply-platform="postPlatform" :reply-profile-id="postProfileId" :reply-post-id="postId" :compact="true"
      :disabled="!walletReady" />
  </div>

  <!-- =====================================================================
       LIST VIEW MODE (default)
       Compact row with optional rank number. Used in: TopPosts, profile pages.
       ===================================================================== -->
  <div v-else class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <NuxtLink :to="feedUrl" class="block">
      <div class="flex items-center gap-3">
        <!-- Rank Position -->
        <div v-if="rank"
          class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold"
          :class="rank <= 3 ? 'text-primary' : 'text-gray-500'">
          {{ rank }}
        </div>
        <div class="flex-1 min-w-0">
          <FeedAuthorDisplay :platform="postPlatform" :profile-id="postProfileId" size="md" :to="feedUrl">
            <template #inline>
              <template v-if="isRevealed">
                <UBadge :color="sentimentColor" size="sm" variant="subtle">{{ sentimentLabel }}</UBadge>
                <UBadge v-if="isControversialFlag" color="warning" size="sm" variant="subtle">Controversial</UBadge>
              </template>
            </template>
          </FeedAuthorDisplay>
        </div>
      </div>
    </NuxtLink>

    <!-- ButtonRow: endorse/flag + reply (Lotusia posts only) -->
    <div class="mt-2">
      <FeedButtonRow :platform="postPlatform" :profile-id="postProfileId" :post-id="postId" :post-meta="postMeta"
        :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
        :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay" :can-reply="isLotusiaPost"
        :reply-platform="postPlatform" :reply-profile-id="postProfileId" :reply-post-id="postId" :compact="true"
        :disabled="!walletReady" />
    </div>
  </div>
</template>
