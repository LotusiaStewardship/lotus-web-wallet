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
import { bucketVoteCount, isControversial, controversyScore } from '~/utils/feed'
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
  /** Detail mode: full post view with larger content, controversial explanation, R1 blind/revealed states */
  detail?: boolean
}>()

const emit = defineEmits<{
  reply: [parentTxid: string]
  replyPosted: [txid: string]
  replyCancelled: []
  voted: [txid: string, sentiment?: 'positive' | 'negative']
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

const sentimentRatio = computed(() => {
  if (totalVotes.value === 0) return 50
  return Math.round((votesPositive.value / totalVotes.value) * 100)
})

const controvScore = computed(() => {
  if (!satsPositive.value || !satsNegative.value) return 0
  return controversyScore(satsPositive.value, satsNegative.value)
})

const feedUrl = computed(() => `/feed/${postPlatform.value}/${postProfileId.value}/${postId.value}`)
const profileUrl = computed(() => `/feed/${postPlatform.value}/${postProfileId.value}`)
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
  const ts = p.firstVoted || p.timestamp || p.firstSeen
  if (!ts) return undefined
  return timeAgo(Number(ts))
})

const localeTime = computed(() => {
  if (!props.detail) return undefined
  const p = props.post as PostData
  const ts = p.firstVoted || p.timestamp || p.firstSeen
  if (!ts) return undefined
  return new Date(Number(ts) * 1000).toLocaleString()
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
            <!-- <UBadge :color="sentimentColor" size="sm" variant="subtle">{{ sentimentLabel }}</UBadge> -->
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
    <FeedAuthorDisplay :compact="true" :platform="postPlatform" :profile-id="postProfileId" size="xl" :to="feedUrl"
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
      <NuxtLink :to="feedUrl" class="block group mb-2 text-[15px]">
        <p v-if="isLotusiaPost && postData"
          class="leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words group-hover:opacity-90 transition-opacity line-clamp-3">
          {{ postData }}
        </p>
        <div v-else-if="isTwitterPost">
          <FeedXPostEmbed :tweet-id="postId" :profile-id="postProfileId" />
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
        <div class="flex flex-col items-center flex-shrink-0 w-10 pb-2 -mt-4">
          <div class="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>
    </template>

    <NuxtLink :to="feedUrl" class="block mb-3">
      <FeedAuthorDisplay :platform="postPlatform" :profile-id="postProfileId" size="xl" :to="feedUrl"
        :time="formattedTime">
        <template #inline>
          <!-- R1: Sentiment badge — revealed state only -->
          <template v-if="isRevealed">
            <!-- <UBadge :color="sentimentColor" size="xs" variant="subtle">{{ sentimentLabel }}</UBadge> -->
            <UBadge v-if="isControversialFlag" color="warning" size="xs" variant="subtle">Controversial</UBadge>
          </template>
          <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
            class="ml-auto text-gray-400 hover:text-primary transition-colors" @click.stop>
            <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
          </a>
        </template>

        <!-- Post content -->
        <div class="text-[15px]">
          <p v-if="postData" class="leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {{ postData }}
          </p>
          <FeedXPostEmbed v-else-if="isTwitterPost" :tweet-id="postId" :profile-id="postProfileId" />
        </div>
      </FeedAuthorDisplay>
    </NuxtLink>

    <!-- ButtonRow: outside NuxtLink to avoid nested interactive elements -->
    <div class="pl-[50px]">
      <FeedButtonRow :platform="postPlatform" :profile-id="postProfileId" :post-id="postId" :post-meta="postMeta"
        :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
        :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay" :can-reply="isLotusiaPost"
        :reply-platform="postPlatform" :reply-profile-id="postProfileId" :reply-post-id="postId" :compact="true"
        :disabled="!walletReady" />
    </div>
  </div>

  <!-- =====================================================================
       DETAIL MODE
       Full post view with larger content, controversial explanation, R1 blind/revealed states.
       Used in: post detail page ([postId].vue).
       ===================================================================== -->
  <div v-else-if="detail">
    <!-- Post Header: Author info -->
    <div class="space-y-2 mb-3">
      <FeedAuthorDisplay :compact="false" :platform="postPlatform" :profile-id="postProfileId" size="xl"
        :to="profileUrl" :time="localeTime">
        <template #inline>
          <!-- External link for non-Lotusia posts -->
          <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
            class="ml-auto text-gray-400 hover:text-primary transition-colors" @click.stop>
            <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
          </a>
        </template>
      </FeedAuthorDisplay>

      <!-- Post Content -->
      <div class="text-[17px]">
        <p v-if="isLotusiaPost && postData" class="leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line">{{
          postData }}</p>
        <!-- Embedded X Post (Twitter only) -->
        <FeedXPostEmbed v-else-if="isTwitterPost" :tweet-id="postId" :profile-id="postProfileId" />
      </div>
    </div>

    <!-- R2: Controversial Callout (visible regardless of vote status — binary flag, not directional) -->
    <div v-if="isControversialFlag"
      class="mb-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800/30">
      <div class="flex items-start gap-2.5">
        <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-warning-700 dark:text-warning-400">Controversial Post</div>
          <p class="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
            This post has significant engagement from both supporters and critics.
            <!-- R1: Only show the detailed ratio post-vote to avoid leaking directional sentiment -->
            <template v-if="isRevealed">
              The minority position represents {{ Math.round(controvScore * 100) }}% of the majority burn weight,
              indicating genuine disagreement rather than one-sided consensus.
            </template>
            <template v-else>
              Vote to see the full sentiment breakdown.
            </template>
          </p>
        </div>
      </div>
    </div>

    <!-- R1 Vote-to-Reveal: Pre-vote blind state -->
    <Transition name="fade" mode="out-in">
      <div v-if="!isRevealed" key="blind"
        class="flex items-center justify-center gap-2 py-3 mb-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <UIcon name="i-lucide-eye-off" class="w-5 h-5 text-gray-400" />
        <span class="text-sm font-medium text-gray-500">{{ bucketedVotesDisplay }}</span>
        <span class="text-xs text-gray-400">&middot; Vote to show sentiment data</span>
      </div>

      <!-- R1 Vote-to-Reveal: Post-vote revealed state -->
      <div v-else key="revealed" class="space-y-2 mb-3">
        <!-- Compact ranking + breakdown row -->
        <div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <!-- Ranking Score -->
          <div class="text-xl font-mono font-bold"
            :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
            {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
          </div>
          <span class="text-xs text-gray-400">XPI</span>

          <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

          <!-- Inline breakdown -->
          <div class="flex items-center gap-3 text-xs">
            <span class="text-success-600 dark:text-success-400 font-semibold">{{ votesPositive }} Endorsed</span>
            <span class="text-error-600 dark:text-error-400 font-semibold">{{ votesNegative }} Flagged</span>
            <span class="text-gray-500">{{ totalVotes }} votes</span>
          </div>
        </div>

        <!-- Sentiment Bar -->
        <div class="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all"
            :class="sentimentRatio >= 50 ? 'bg-success-500' : 'bg-error-500'"
            :style="{ width: `${sentimentRatio}%` }" />
        </div>
      </div>
    </Transition>

    <!-- Action Row: vote + reply -->
    <div class="pt-3 border-t border-gray-100 dark:border-gray-800">
      <FeedButtonRow :platform="postPlatform" :profile-id="postProfileId" :post-id="postId" :post-meta="postMeta"
        :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
        :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay" :can-reply="isLotusiaPost"
        :reply-platform="postPlatform" :reply-profile-id="postProfileId" :reply-post-id="postId" :compact="true"
        :disabled="!walletReady" :bypass-ranking-display="true"
        @voted="(txid, sentiment) => emit('voted', txid, sentiment)" />
    </div>
  </div>

  <!-- =====================================================================
       LIST VIEW MODE (default)
       Compact row with optional rank number. Used in: TopPosts, profile pages.
       ===================================================================== -->
  <div v-else class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <div class="flex items-start gap-3">
      <!-- Rank Position -->
      <!-- <div v-if="rank" class="flex-shrink-0 w-6 text-center mt-1 text-xs font-bold"
        :class="rank <= 3 ? 'text-primary' : 'text-gray-400'">
        {{ rank }}
      </div> -->
      <div class="flex-1 min-w-0">
        <NuxtLink :to="feedUrl" class="block">
          <FeedAuthorDisplay :platform="postPlatform" :profile-id="postProfileId" size="xl" :to="feedUrl"
            :time="formattedTime">
            <template #inline>
              <template v-if="isRevealed">
                <!-- <UBadge :color="sentimentColor" size="xs" variant="subtle">{{ sentimentLabel }}</UBadge> -->
                <UBadge v-if="isControversialFlag" color="warning" size="xs" variant="subtle">Controversial</UBadge>
              </template>
            </template>

            <!-- Content preview -->
            <div v-if="postData" class="mt-1 mb-2">
              <p
                class="text-[15px] leading-snug text-gray-900 dark:text-gray-100 line-clamp-2 whitespace-pre-wrap break-words">
                {{ postData }}
              </p>
            </div>
            <div v-else-if="isTwitterPost" class="mt-1 mb-2">
              <FeedXPostEmbed font-size="md" :tweet-id="postId" :profile-id="postProfileId" />
            </div>
          </FeedAuthorDisplay>
        </NuxtLink>

        <!-- ButtonRow: outside NuxtLink to avoid nested interactive elements -->
        <div class="mt-2 pl-[52px]">
          <FeedButtonRow :platform="postPlatform" :profile-id="postProfileId" :post-id="postId" :post-meta="postMeta"
            :is-revealed="isRevealed" :votes-positive="votesPositive" :votes-negative="votesNegative"
            :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay" :can-reply="isLotusiaPost"
            :reply-platform="postPlatform" :reply-profile-id="postProfileId" :reply-post-id="postId" :compact="true"
            :disabled="!walletReady" />
        </div>
      </div>
    </div>
  </div>
</template>
