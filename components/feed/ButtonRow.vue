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
}>(), {
  compact: false,
  canReply: false,
  replyCount: 0,
  isRevealed: false,
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
      <div class="flex items-center gap-1">
        <!-- R4: Endorse button (equal visual weight) -->
        <!-- R38: "Endorse" not "upvote" -->
        <UButton icon="i-lucide-thumbs-up" :size="compact ? 'xs' : 'sm'"
          :variant="votedSentiment === 'positive' ? 'soft' : 'ghost'"
          :color="votedSentiment === 'positive' ? 'success' : 'neutral'"
          :disabled="disabled || !walletReady || voting" title="Endorse this content"
          @click="handleVoteClick('positive', $event)">
          <span v-if="votedSentiment === 'positive'" class="text-xs">Voted</span>
          <span v-else-if="isRevealed && votesPositive !== undefined" class="text-xs text-gray-500">{{
            votesPositive }}</span>
        </UButton>

        <!-- R4: Flag button (equal visual weight) -->
        <!-- R38: "Flag" not "downvote" -->
        <UButton icon="i-lucide-thumbs-down" :size="compact ? 'xs' : 'sm'"
          :variant="votedSentiment === 'negative' ? 'soft' : 'ghost'"
          :color="votedSentiment === 'negative' ? 'error' : 'neutral'"
          :disabled="disabled || !walletReady || voting" title="Flag this content"
          @click="handleVoteClick('negative', $event)">
          <span v-if="votedSentiment === 'negative'" class="text-xs">Voted</span>
          <span v-else-if="isRevealed && votesNegative !== undefined" class="text-xs text-gray-500">{{
            votesNegative }}</span>
        </UButton>

        <!-- Reply button (Lotusia posts only, wallet required) -->
        <UButton v-if="canReply && walletReady" icon="i-lucide-reply" :size="compact ? 'xs' : 'sm'"
          :variant="replyActive ? 'soft' : 'ghost'" color="neutral" title="Reply"
          @click="handleReplyClick($event)">
          <span v-if="replyCount > 0" class="text-xs">{{ replyCount }}</span>
          <span v-else class="text-xs">Reply</span>
        </UButton>
      </div>

      <!-- R1: Ranking metric — exact when revealed, bucketed when blind -->
      <span class="text-xs text-gray-400 dark:text-gray-500">
        <template v-if="isRevealed && rankingDisplay">
          {{ rankingDisplay }} XPI ({{ votesPositive }}↑ / {{ votesNegative }}↓)
        </template>
        <template v-else-if="bucketedVotes">
          {{ bucketedVotes }}
        </template>
      </span>
    </div>

    <!-- Inline reply form (shown when replyActive and replyPlatform/replyProfileId provided) -->
    <div v-if="replyActive && replyPlatform && replyProfileId" class="mt-2">
      <FeedCommentInput :platform="replyPlatform" :profile-id="replyProfileId" :post-id="replyPostId"
        :in-reply-to="postId" :parent-text="parentText" placeholder="Write a reply..."
        @posted="handleReplyPosted" @cancel="handleReplyCancelled" />
    </div>
  </div>
</template>
