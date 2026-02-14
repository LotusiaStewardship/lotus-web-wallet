<script setup lang="ts">
/**
 * Comment Item Component
 *
 * Displays a single RNKC comment with burn weight, author, and collapse behavior.
 * Supports inline reply forms that keep the user in context (X/Twitter pattern).
 *
 * R1 compliance: Net burn badge and burn-colored styling are only shown when
 *   the user has voted on the parent content (hasVoted=true). Pre-vote users
 *   see a neutral presentation to prevent sentiment leakage.
 *
 * R6 compliance: Comments with negative net burn are collapsed by default,
 *   UNLESS the comment author matches the current wallet (own comments always visible).
 *
 * Threading: Reply button shows an inline CommentInput below this comment.
 *   Thread depth limited to 3 levels for readability (per 5.1c spec).
 *
 * Data shape: RnkcComment matches the backend PostAPI shape from convertRankCommentToPostAPI():
 *   id = txid, profileId = scriptPayload (author), data = comment text,
 *   ranking = net burn, satsPositive/satsNegative = community votes, comments = nested replies.
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { RnkcComment } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  comment: RnkcComment
  /** Current nesting depth (max 3 levels) */
  depth?: number
  /** R1: Whether the user has voted on the parent content */
  hasVoted?: boolean
  /** Currently active reply target txid (managed by CommentThread) */
  activeReplyTo?: string | null
  /** Platform for inline reply form */
  platform?: ScriptChunkPlatformUTF8
  /** Profile ID for inline reply form */
  profileId?: string
  /** Post ID for inline reply form */
  postId?: string
}>()

const emit = defineEmits<{
  reply: [parentTxid: string]
  replyPosted: [txid: string]
  replyCancelled: []
}>()

const walletStore = useWalletStore()
const depth = computed(() => props.depth ?? 0)

// Whether the inline reply form is shown for THIS comment
const isReplyActive = computed(() => props.activeReplyTo === props.comment.id)

// Net burn = ranking = satsPositive - satsNegative (computed by backend)
const netBurn = computed(() => {
  return BigInt(props.comment.ranking || '0')
})

const isNegative = computed(() => netBurn.value < 0n)

// R6: Comment authors see their own comments uncollapsed regardless of score
// In the backend PostAPI, profileId = scriptPayload (the comment author)
const isOwnComment = computed(() => {
  if (!walletStore.scriptPayload) return false
  return props.comment.profileId === walletStore.scriptPayload
})

const isCollapsed = ref(isNegative.value && !isOwnComment.value)

// Initial burn = satsPositive (the author's own burn is the initial positive ranking)
const formattedBurn = computed(() =>
  formatXPI(props.comment.satsPositive, { minDecimals: 0, maxDecimals: 2 }),
)

// R1: Only compute net burn display when user has voted on parent content
const formattedNetBurn = computed(() => {
  if (!props.hasVoted) return null
  if (netBurn.value === 0n) return null
  const abs = netBurn.value < 0n ? -netBurn.value : netBurn.value
  const prefix = netBurn.value > 0n ? '+' : netBurn.value < 0n ? '-' : ''
  return prefix + formatXPI(abs.toString(), { minDecimals: 0, maxDecimals: 0 })
})

// In the backend PostAPI, profileId = scriptPayload (the comment author)
const truncatedAuthor = computed(() => {
  const sp = props.comment.profileId
  if (!sp || sp.length < 12) return sp || 'Unknown'
  if (isOwnComment.value) return 'You'
  return sp.slice(0, 6) + '...' + sp.slice(-6)
})

const timeAgo = computed(() => {
  const ts = props.comment.timestamp || props.comment.firstSeen
  if (!ts) return ''
  // Backend returns seconds since epoch as string; convert to milliseconds
  const tsMs = Number(ts) * 1000
  if (isNaN(tsMs)) return ''
  const diff = Date.now() - tsMs
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
})

const hasReplies = computed(() =>
  props.comment.comments && props.comment.comments.length > 0,
)

const canReply = computed(() => depth.value < 2 && walletStore.isReadyForSigning())

function handleReply() {
  emit('reply', props.comment.id)
}

function handleReplyPosted(txid: string) {
  emit('replyPosted', txid)
}

function handleReplyCancelled() {
  emit('replyCancelled')
}
</script>

<template>
  <div class="group" :class="depth > 0 ? 'ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-700' : ''">
    <!-- Collapsed state -->
    <button v-if="isCollapsed"
      class="w-full text-left py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      @click="isCollapsed = false">
      <UIcon name="i-lucide-chevron-right" class="w-3 h-3 inline mr-1" />
      Comment hidden (negative score) — tap to expand
    </button>

    <!-- Expanded state -->
    <div v-else class="py-2 space-y-1.5">
      <!-- Author + metadata row -->
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="font-mono" :class="isOwnComment ? 'text-primary font-semibold' : ''">{{ truncatedAuthor }}</span>
        <span>·</span>
        <span>{{ timeAgo }}</span>
        <!-- R1: Only show burn amount coloring when user has voted on parent content -->
        <template v-if="hasVoted">
          <span>·</span>
          <span class="font-medium" :class="isNegative ? 'text-error-500' : 'text-success-500'">
            {{ formattedBurn }} XPI
          </span>
          <span v-if="formattedNetBurn" class="text-xs px-1.5 py-0.5 rounded-full" :class="isNegative
            ? 'bg-error-50 dark:bg-error-900/20 text-error-500'
            : 'bg-success-50 dark:bg-success-900/20 text-success-500'">
            {{ formattedNetBurn }}
          </span>
        </template>
        <!-- Pre-vote: show neutral burn amount without sentiment coloring -->
        <template v-else>
          <span>·</span>
          <span class="font-medium text-gray-500">{{ formattedBurn }} XPI</span>
        </template>
        <!-- Collapse button for negative comments (only when sentiment is visible) -->
        <button v-if="isNegative && hasVoted && !isOwnComment" class="ml-auto text-gray-400 hover:text-gray-600"
          @click="isCollapsed = true">
          <UIcon name="i-lucide-chevron-up" class="w-3 h-3" />
        </button>
      </div>

      <!-- Comment content -->
      <p class="text-sm whitespace-pre-wrap break-words">
        {{ comment.data }}
      </p>

      <!-- Action row -->
      <div class="flex items-center gap-3">
        <!-- Reply button (hidden at max depth, requires wallet) -->
        <button v-if="canReply && !isReplyActive"
          class="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
          @click="handleReply">
          <UIcon name="i-lucide-reply" class="w-3 h-3" />
          Reply
        </button>
      </div>

      <!-- Inline reply form (shown when this comment is the active reply target) -->
      <div v-if="isReplyActive && platform && profileId" class="mt-2">
        <FeedCommentInput :platform="platform" :profile-id="profileId" :post-id="postId" :in-reply-to="comment.id"
          placeholder="Write a reply..." @posted="handleReplyPosted" @cancel="handleReplyCancelled" />
      </div>

      <!-- Replies (recursive, max depth 3) -->
      <div v-if="hasReplies && depth < 3" class="mt-2 space-y-1">
        <FeedCommentItem v-for="reply in comment.comments" :key="reply.id" :comment="reply" :depth="depth + 1"
          :has-voted="hasVoted" :active-reply-to="activeReplyTo" :platform="platform" :profile-id="profileId"
          :post-id="postId" @reply="$emit('reply', $event)" @reply-posted="$emit('replyPosted', $event)"
          @reply-cancelled="$emit('replyCancelled')" />
      </div>
    </div>
  </div>
</template>
