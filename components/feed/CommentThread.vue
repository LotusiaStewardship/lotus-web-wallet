<script setup lang="ts">
/**
 * Comment Thread Component
 *
 * Displays a threaded list of RNKC comments with an inline comment form.
 *
 * Data source: Comments are embedded in the profile/post API responses from
 * rank-backend-ts. There are no dedicated /comments/ endpoints. The backend
 * returns comments as nested PostAPI[] arrays via convertRankCommentToPostAPI().
 *
 * R1: When user has voted, sorts by ranking (net burn) descending.
 *     When user has NOT voted, sorts chronologically to prevent sentiment leakage.
 * R3: Burn amount is auto-calculated (informational cost, not a bet).
 * R6: Negative net burn comments are collapsed by default (handled by CommentItem).
 * 5.1b: Inline CommentInput replaces the CommentSlideover for contextual commenting.
 * Threading: Reply events bubble up from CommentItem and show inline reply form.
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { RnkcComment } from '~/composables/useRankApi'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
  /** R1: Whether the user has voted on the parent content */
  hasVoted?: boolean
}>()

const emit = defineEmits<{
  commented: [txid: string]
}>()

const walletStore = useWalletStore()
const { getProfileComments, getPostComments } = useRankApi()

const comments = ref<RnkcComment[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const showCommentInput = ref(false)
const activeReplyTo = ref<string | null>(null)

const walletReady = computed(() => walletStore.isReadyForSigning())

/**
 * R1: Sort by ranking (net burn) when voted, chronologically when not voted.
 * Backend field mapping: ranking = satsPositive - satsNegative (net burn).
 * Timestamps are seconds since epoch as strings.
 */
const sortedComments = computed(() => {
  return [...comments.value].sort((a, b) => {
    if (props.hasVoted) {
      // Post-vote: sort by ranking (net burn) descending (highest burn first)
      const netA = BigInt(a.ranking || '0')
      const netB = BigInt(b.ranking || '0')
      if (netB > netA) return 1
      if (netB < netA) return -1
      return 0
    }
    // Pre-vote: sort chronologically (oldest first) to avoid leaking sentiment
    const tsA = Number(a.timestamp || a.firstSeen || '0')
    const tsB = Number(b.timestamp || b.firstSeen || '0')
    return tsA - tsB
  })
})

async function fetchComments() {
  loading.value = true
  loadError.value = null
  try {
    // Comments are extracted from the existing profile/post API responses.
    // The API functions handle fetching the parent entity and returning the comments array.
    const result = props.postId
      ? await getPostComments(props.platform, props.profileId, props.postId, walletStore.scriptPayload)
      : await getProfileComments(props.platform, props.profileId)

    comments.value = result
  } catch (err: any) {
    loadError.value = err?.message || 'Failed to load comments'
    console.error('[CommentThread] fetchComments failed:', err)
  } finally {
    loading.value = false
  }
}

function toggleCommentInput() {
  showCommentInput.value = !showCommentInput.value
  activeReplyTo.value = null
}

async function handleCommentPosted(txid: string) {
  showCommentInput.value = false
  activeReplyTo.value = null
  emit('commented', txid)
  await fetchComments()
}

function handleReply(parentTxid: string) {
  activeReplyTo.value = parentTxid
  showCommentInput.value = false
}

function handleReplyCancelled() {
  activeReplyTo.value = null
}

function handleCancelComment() {
  showCommentInput.value = false
}

onMounted(() => {
  fetchComments()
})
</script>

<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Comments
        <span v-if="comments.length > 0" class="text-gray-400 font-normal">
          ({{ comments.length }})
        </span>
      </h3>
      <button v-if="!showCommentInput"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="walletReady
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'" :disabled="!walletReady"
        @click="toggleCommentInput">
        <UIcon name="i-lucide-message-square-plus" class="w-4 h-4" />
        <span>Comment</span>
      </button>
    </div>

    <!-- Inline comment form (top-level) -->
    <FeedCommentInput v-if="showCommentInput && walletReady" :platform="platform" :profile-id="profileId"
      :post-id="postId" @posted="handleCommentPosted" @cancel="handleCancelComment" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-6">
      <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-gray-400" />
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="text-sm text-error-500 text-center py-4">
      {{ loadError }}
      <button class="ml-2 text-primary underline" @click="fetchComments()">Retry</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="comments.length === 0 && !showCommentInput" class="text-center py-6">
      <UIcon name="i-lucide-message-circle" class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
      <p class="text-sm text-gray-400">No comments yet. Be the first to share your perspective.</p>
    </div>

    <!-- Comment list -->
    <div v-if="sortedComments.length > 0" class="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
      <FeedCommentItem v-for="comment in sortedComments" :key="comment.id" :comment="comment" :has-voted="hasVoted"
        :active-reply-to="activeReplyTo" :platform="platform" :profile-id="profileId" :post-id="postId"
        @reply="handleReply" @reply-posted="handleCommentPosted" @reply-cancelled="handleReplyCancelled" />
    </div>
  </div>
</template>
