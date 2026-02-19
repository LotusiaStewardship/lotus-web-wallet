<script setup lang="ts">
/**
 * Comment Item Component
 *
 * Displays a single RNKC comment as a first-class post, matching the visual
 * language of ActivityItem.vue. Each comment IS a post (id = txid) and is
 * therefore a clickable link to its own detail page.
 *
 * Threading model: Twitter/X-style flat chain (depth 0→1 inline, depth≥2 linked).
 *
 * Strategy compliance:
 *   R1 (Vote-to-Reveal): Burn/sentiment hidden pre-vote; bucketed count shown instead.
 *   R2 (Controversial flag): Badge shown post-vote when controversy score > 0.3.
 *   R4 (Cost symmetry): Equal visual weight for endorse/flag; optimistic state post-vote.
 *   R6 (Burn-weighted collapse): Negative net burn collapsed by default (own exempt).
 *   R38 (Curation language): "Endorse"/"Flag"/"Noted" not "upvote"/"downvote".
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1, R2, R4, R6
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { RnkcComment } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { bucketVoteCount, isControversial } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'
import { useTime } from '~/composables/useTime'

const props = defineProps<{
  comment: RnkcComment
  depth?: number
  hasVoted?: boolean
  activeReplyTo?: string | null
  platform?: ScriptChunkPlatformUTF8
  profileId?: string
  postId?: string
}>()

const emit = defineEmits<{
  reply: [parentTxid: string]
  replyPosted: [txid: string]
  replyCancelled: []
}>()

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()
const { timeAgo } = useTime()
const { useResolve } = useFeedIdentity()
const depth = computed(() => props.depth ?? 0)

const identity = useResolve(
  () => props.comment.platform,
  () => props.comment.profileId,
)

const isReplyActive = computed(() => props.activeReplyTo === props.comment.id)

const netBurn = computed(() => BigInt(props.comment.ranking || '0'))
const isNegative = computed(() => netBurn.value < 0n)
const isPositive = computed(() => netBurn.value > 0n)
const totalVotes = computed(() => props.comment.votesPositive + props.comment.votesNegative)

/** R1: Revealed state — full sentiment shown only after user has voted on parent */
const isRevealed = computed(() => !!props.hasVoted)

/** R2: Controversial flag — only in revealed state */
const isControversialFlag = computed(() =>
  isControversial(props.comment.satsPositive || '0', props.comment.satsNegative || '0', totalVotes.value, 5),
)

/** R38: Curation language */
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

/** R1: Bucketed count for pre-vote blind state */
const bucketedVotesDisplay = computed(() => bucketVoteCount(totalVotes.value))

/** R1: Net ranking display — revealed state only */
const rankingDisplay = computed(() => formatXPICompact(netBurn.value.toString()))

// R6: Own comments always uncollapsed
const isOwnComment = computed(() => identity.value.isOwn)
const isCollapsed = ref(isNegative.value && !isOwnComment.value)

const formattedTime = computed(() => {
  const ts = props.comment.timestamp || props.comment.firstSeen
  if (!ts) return ''
  return timeAgo(Number(ts))
})

const directReplies = computed(() => props.comment.comments ?? [])
const hasReplies = computed(() => directReplies.value.length > 0)
const replyCount = computed(() => directReplies.value.length)
const showInlineReplies = computed(() => depth.value < 2 && hasReplies.value)
const showViewMoreLink = computed(() => depth.value >= 2 && hasReplies.value)
const hasConnector = computed(() => showInlineReplies.value)

const commentDetailUrl = computed(() =>
  `/feed/${props.comment.platform}/${props.comment.profileId}/${props.comment.id}`,
)

const walletReady = computed(() => walletStore.isReadyForSigning())
const canReply = computed(() => walletReady.value)

/** R4: Optimistic vote state — highlights voted button immediately */
const votedSentiment = ref<'positive' | 'negative' | null>(null)
const voting = ref(false)

async function handleVoteClick(sentiment: 'positive' | 'negative', event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (!walletReady.value || voting.value || !props.platform) return
  voting.value = true
  try {
    const result = await openVoteSlideover({
      sentiment,
      platform: props.comment.platform as string,
      profileId: props.comment.profileId,
      postId: props.comment.id,
    })
    if (result?.txid) {
      votedSentiment.value = sentiment
    }
  } finally {
    voting.value = false
  }
}

function handleReply(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  emit('reply', props.comment.id)
}

function handleReplyPosted(txid: string) { emit('replyPosted', txid) }
function handleReplyCancelled() { emit('replyCancelled') }
</script>

<template>
  <div class="relative">
    <!-- R6: Collapsed state -->
    <div v-if="isCollapsed"
      class="flex items-center gap-2 py-1.5 px-4 text-xs text-gray-400 cursor-pointer hover:text-gray-500 transition-colors"
      @click="isCollapsed = false">
      <UIcon name="i-lucide-chevron-right" class="w-3.5 h-3.5 flex-shrink-0" />
      <span>Hidden · low score · tap to show</span>
    </div>

    <!-- Expanded state: mirrors ActivityItem py-3 wrapper exactly -->
    <div v-else class="py-3">
      <FeedAuthorDisplay :compact="true" :platform="comment.platform" :profile-id="comment.profileId" size="md"
        :to="commentDetailUrl" :time="formattedTime" :show-connector="hasConnector">
        <template #inline>
          <!-- R1: Sentiment badges — revealed state only -->
          <template v-if="isRevealed">
            <UBadge :color="sentimentColor" size="sm" variant="subtle">
              {{ sentimentLabel }}
            </UBadge>
            <!-- R2: Controversial flag -->
            <UBadge v-if="isControversialFlag" color="warning" size="sm" variant="subtle">
              Controversial
            </UBadge>
          </template>
          <!-- R6: Collapse button — only post-vote for negative comments -->
          <button v-if="isNegative && isRevealed && !isOwnComment"
            class="ml-auto text-gray-300 hover:text-gray-500 transition-colors" @click.stop="isCollapsed = true">
            <UIcon name="i-lucide-chevron-up" class="w-3.5 h-3.5" />
          </button>
        </template>

        <!-- Comment text: matches ActivityItem content block exactly -->
        <div class="mb-4 mt-1">
          <NuxtLink :to="commentDetailUrl" @click.stop>
            <p
              class="text-[15px] leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words hover:opacity-90 transition-opacity">
              {{ comment.data }}
            </p>
          </NuxtLink>
        </div>

        <!-- Action row: matches ActivityItem justify-between mt-1 exactly -->
        <div class="flex items-center justify-between">
          <!-- R4: Endorse button -->
          <UButton icon="i-lucide-thumbs-up" size="xs" :variant="votedSentiment === 'positive' ? 'soft' : 'ghost'"
            :color="votedSentiment === 'positive' ? 'success' : 'neutral'" :disabled="!walletReady || voting"
            title="Endorse this comment" @click="handleVoteClick('positive', $event)">
            <span v-if="votedSentiment === 'positive'" class="text-xs">Voted</span>
            <span v-else-if="isRevealed" class="text-xs text-gray-500">{{ comment.votesPositive }}</span>
          </UButton>

          <!-- R4: Flag button -->
          <UButton icon="i-lucide-thumbs-down" size="xs" :variant="votedSentiment === 'negative' ? 'soft' : 'ghost'"
            :color="votedSentiment === 'negative' ? 'error' : 'neutral'" :disabled="!walletReady || voting"
            title="Flag this comment" @click="handleVoteClick('negative', $event)">
            <span v-if="votedSentiment === 'negative'" class="text-xs">Voted</span>
            <span v-else-if="isRevealed" class="text-xs text-gray-500">{{ comment.votesNegative }}</span>
          </UButton>

          <!-- Reply button -->
          <UButton v-if="canReply && !isReplyActive" icon="i-lucide-reply" size="xs" variant="ghost" color="neutral"
            @click="handleReply($event)">
            <span v-if="replyCount > 0" class="text-xs">{{ replyCount }}</span>
            <span v-else class="text-xs">Reply</span>
          </UButton>

          <!-- R1: Ranking metric — matches ActivityItem right-side metric -->
          <span class="text-xs text-gray-400">
            <template v-if="isRevealed">
              {{ rankingDisplay }} XPI ({{ comment.votesPositive }}↑ / {{ comment.votesNegative }}↓)
            </template>
            <template v-else>
              {{ bucketedVotesDisplay }}
            </template>
          </span>
        </div>

        <!-- "View conversation" link for deep replies (Twitter pattern) -->
        <NuxtLink v-if="showViewMoreLink" :to="commentDetailUrl" class="text-xs text-primary hover:underline block mt-1"
          @click.stop>
          View {{ replyCount }} {{ replyCount === 1 ? 'reply' : 'replies' }}
        </NuxtLink>

        <!-- Inline reply form -->
        <div v-if="isReplyActive && platform && profileId" class="mt-2">
          <FeedCommentInput :platform="platform" :profile-id="comment.profileId" :post-id="comment.id"
            :in-reply-to="comment.id" :parent-text="comment.data" placeholder="Write a reply..."
            @posted="handleReplyPosted" @cancel="handleReplyCancelled" />
        </div>
      </FeedAuthorDisplay>

      <!-- Twitter-style inline reply chain (depth 0→1 and 1→2 only) -->
      <div v-if="showInlineReplies">
        <FeedCommentItem v-for="reply in directReplies" :key="reply.id" :comment="reply" :depth="depth + 1"
          :has-voted="hasVoted" :active-reply-to="activeReplyTo" :platform="platform" :profile-id="profileId"
          :post-id="postId" @reply="$emit('reply', $event)" @reply-posted="$emit('replyPosted', $event)"
          @reply-cancelled="$emit('replyCancelled')" />
      </div>
    </div>
  </div>
</template>
