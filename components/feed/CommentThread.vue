<script setup lang="ts">
/**
 * Comment Thread Component
 *
 * Displays a threaded list of RNKC comments sorted by net burn descending.
 * Negative net burn comments are collapsed by default (handled by CommentItem).
 * Includes a "Add Comment" button that opens the CommentSlideover.
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { RnkcComment } from '~/composables/useRankApi'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
}>()

const emit = defineEmits<{
  commented: [txid: string]
}>()

const walletStore = useWalletStore()
const { getProfileComments, getPostComments } = useRankApi()
const { openCommentSlideover } = useOverlays()

const comments = ref<RnkcComment[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const page = ref(1)
const numPages = ref(1)

const walletReady = computed(() => walletStore.isReadyForSigning())

/** Sort comments by net burn descending (highest burn first) */
const sortedComments = computed(() => {
  return [...comments.value].sort((a, b) => {
    const netA = BigInt(a.netBurn || a.sats || '0')
    const netB = BigInt(b.netBurn || b.sats || '0')
    if (netB > netA) return 1
    if (netB < netA) return -1
    return 0
  })
})

async function fetchComments() {
  loading.value = true
  loadError.value = null
  try {
    const result = props.postId
      ? await getPostComments(props.platform, props.profileId, props.postId, page.value)
      : await getProfileComments(props.platform, props.profileId, page.value)

    if (result) {
      comments.value = result.comments
      numPages.value = result.numPages
    }
  } catch (err: any) {
    loadError.value = err?.message || 'Failed to load comments'
    console.error('[CommentThread] fetchComments failed:', err)
  } finally {
    loading.value = false
  }
}

async function handleAddComment() {
  const result = await openCommentSlideover({
    platform: props.platform,
    profileId: props.profileId,
    postId: props.postId,
  })

  if (result?.txid) {
    emit('commented', result.txid)
    // Refresh comments after posting
    await fetchComments()
  }
}

async function loadMore() {
  if (page.value < numPages.value) {
    page.value++
    await fetchComments()
  }
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
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="walletReady
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'"
        :disabled="!walletReady"
        @click="handleAddComment"
      >
        <UIcon name="i-lucide-message-square-plus" class="w-4 h-4" />
        <span>Comment</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-6">
      <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-gray-400" />
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="text-sm text-error-500 text-center py-4">
      {{ loadError }}
      <button class="ml-2 text-primary underline" @click="fetchComments">Retry</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="comments.length === 0" class="text-center py-6">
      <UIcon name="i-lucide-message-circle" class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
      <p class="text-sm text-gray-400">No comments yet. Be the first to share your perspective.</p>
    </div>

    <!-- Comment list -->
    <div v-else class="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
      <FeedCommentItem
        v-for="comment in sortedComments"
        :key="comment.txid"
        :comment="comment"
      />
    </div>

    <!-- Load more -->
    <button
      v-if="!loading && page < numPages"
      class="w-full py-2 text-sm text-primary hover:underline"
      @click="loadMore"
    >
      Load more comments
    </button>
  </div>
</template>
