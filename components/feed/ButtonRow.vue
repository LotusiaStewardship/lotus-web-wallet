<script setup lang="ts">
/**
 * Button Row Component
 *
 * Unified action footer for every PostCard instance. Replaces VoteButton.
 * Provides:
 *   - Endorse / Flag vote buttons (R4 cost symmetry, R38 curation language)
 *   - Reply button that opens an inline CommentInput (RNKC Lotusia posts only)
 *   - Ranking metric display (R1 gated: revealed vs bucketed)
 *
 * Strategy compliance:
 *   R1 (Vote-to-Reveal): Exact counts only shown when isRevealed is true.
 *   R4 (Cost symmetry): Equal visual weight for endorse/flag.
 *   R38 (Curation language): "Endorse"/"Flag" not "upvote"/"downvote".
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1, R4
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import { useWalletStore } from '~/stores/wallet'

const props = withDefaults(defineProps<{
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
  /** Post metadata containing user's existing vote on this post */
  postMeta?: VoterPostMetadata | null
  /** R1: Whether to show exact vote counts and ranking */
  isRevealed?: boolean
  /** Exact positive vote count (shown when isRevealed) */
  votesPositive?: number
  /** Exact negative vote count (shown when isRevealed) */
  votesNegative?: number
  /** Bucketed vote count string (shown when !isRevealed) */
  bucketedVotes?: string
  /** Ranking display string (shown when isRevealed) */
  rankingDisplay?: string
  /** Whether to show the reply button (Lotusia posts only) */
  canReply?: boolean
  /** Number of existing replies (shown on reply button) */
  replyCount?: number
  /** Whether the inline reply form is currently active */
  replyActive?: boolean
  /** Disable voting (e.g. wallet not initialized) */
  disabled?: boolean
  /** Compact mode */
  compact?: boolean
  /** Platform and profileId for the reply target (may differ from post's platform for cross-platform comments) */
  replyPlatform?: ScriptChunkPlatformUTF8
  replyProfileId?: string
  replyPostId?: string
  /** Parent text for reply context display */
  parentText?: string
  /** Whether to show the ranking display (not necessary in some contexts) */
  showRankingDisplay?: boolean
}>(), {
  compact: false,
  canReply: false,
  replyCount: 0,
  isRevealed: false,
  showRankingDisplay: true
})

const emit = defineEmits<{
  voted: [txid: string, sentiment: 'positive' | 'negative']
  reply: []
  replyPosted: [txid: string]
  replyCancelled: []
}>()

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()

const walletReady = computed(() => walletStore.isReadyForSigning())

/** R4: Optimistic vote state — highlights voted button immediately */
const votedSentiment = ref<'positive' | 'negative' | null>(null)
const voting = ref(false)

const showInlineReply = ref(false)

onMounted(() => {
  if (props.postMeta?.hasWalletUpvoted) votedSentiment.value = 'positive'
  else if (props.postMeta?.hasWalletDownvoted) votedSentiment.value = 'negative'
})

async function handleVoteClick(sentiment: 'positive' | 'negative', event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (props.disabled || !walletReady.value || voting.value) return

  voting.value = true
  try {
    const result = await openVoteSlideover({
      sentiment,
      platform: props.platform as string,
      profileId: props.profileId,
      postId: props.postId,
    })

    if (result?.txid) {
      votedSentiment.value = sentiment
      emit('voted', result.txid, sentiment)
    }
  } finally {
    voting.value = false
  }
}

function handleReplyClick(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (props.replyActive) {
    emit('replyCancelled')
  } else {
    showInlineReply.value = false
    emit('reply')
  }
}

function handleReplyPosted(txid: string) {
  showInlineReply.value = false
  emit('replyPosted', txid)
}

function handleReplyCancelled() {
  showInlineReply.value = false
  emit('replyCancelled')
}
</script>

<template>
  <div>
    <!-- Action row -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- R4: Endorse button (equal visual weight) -->
        <!-- R38: "Endorse" not "upvote" -->
        <button class="flex items-center gap-1 group" :disabled="disabled || !walletReady || voting"
          title="Endorse this content" @click="handleVoteClick('positive', $event)">
          <span class="flex items-center justify-center rounded-full p-1.5 transition-colors" :class="votedSentiment === 'positive'
            ? 'text-success-500 bg-success-50 dark:bg-success-900/20'
            : 'text-gray-400 group-hover:text-success-500 group-hover:bg-success-50 dark:group-hover:bg-success-900/20'
            ">
            <UIcon name="i-lucide-thumbs-up" class="w-[18px] h-[18px]" />
          </span>
          <span class="text-[13px]"
            :class="votedSentiment === 'positive' ? 'text-success-500' : 'text-gray-500 dark:text-gray-400'">
            <template v-if="isRevealed && votesPositive !== undefined">{{ votesPositive }}</template>
          </span>
        </button>

        <!-- R4: Flag button (equal visual weight) -->
        <!-- R38: "Flag" not "downvote" -->
        <button class="flex items-center gap-1 group" :disabled="disabled || !walletReady || voting"
          title="Flag this content" @click="handleVoteClick('negative', $event)">
          <span class="flex items-center justify-center rounded-full p-1.5 transition-colors" :class="votedSentiment === 'negative'
            ? 'text-error-500 bg-error-50 dark:bg-error-900/20'
            : 'text-gray-400 group-hover:text-error-500 group-hover:bg-error-50 dark:group-hover:bg-error-900/20'
            ">
            <UIcon name="i-lucide-thumbs-down" class="w-[18px] h-[18px]" />
          </span>
          <span class="text-[13px]"
            :class="votedSentiment === 'negative' ? 'text-error-500' : 'text-gray-500 dark:text-gray-400'">
            <template v-if="isRevealed && votesNegative !== undefined">{{ votesNegative }}</template>
          </span>
        </button>

        <!-- Reply button (Lotusia posts only, wallet required) -->
        <button v-if="canReply && walletReady" class="flex items-center gap-1 group" title="Reply"
          @click="handleReplyClick($event)">
          <span class="flex items-center justify-center rounded-full p-1.5 transition-colors" :class="replyActive
            ? 'text-primary bg-primary/10'
            : 'text-gray-400 group-hover:text-primary group-hover:bg-primary/10'
            ">
            <UIcon name="i-lucide-message-circle" class="w-[18px] h-[18px]" />
          </span>
          <span class="text-[13px] text-gray-500 dark:text-gray-400" v-if="replyCount > 0">{{ replyCount }}</span>
        </button>
      </div>

      <!-- R1: Ranking metric — exact when revealed, bucketed when blind -->
      <span v-show="showRankingDisplay" class="text-[13px] text-gray-500 dark:text-gray-400">
        <template v-if="isRevealed && rankingDisplay">
          {{ rankingDisplay }} XPI
        </template>
        <template v-else-if="bucketedVotes">
          {{ bucketedVotes }}
        </template>
      </span>
    </div>

    <!-- Inline reply form (shown when replyActive and replyPlatform/replyProfileId provided) -->
    <div v-if="replyActive && replyPlatform && replyProfileId" class="mt-2">
      <FeedCommentInput :platform="replyPlatform" :profile-id="replyProfileId" :post-id="replyPostId"
        :in-reply-to="postId" :parent-text="parentText" placeholder="Write a reply..." @posted="handleReplyPosted"
        @cancel="handleReplyCancelled" />
    </div>
  </div>
</template>
