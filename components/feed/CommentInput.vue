<script setup lang="ts">
/**
 * Inline Comment Input Component
 *
 * Replaces the CommentSlideover with an inline form that keeps the user
 * in context with the content they are commenting on — matching the UX
 * pattern used by X/Twitter and other social platforms.
 *
 * Burn amount is auto-calculated from comment byte length × RNKC_MIN_FEE_RATE.
 * There are no burn presets or custom burn inputs — RNKC comments are not
 * RANK votes; their cost is deterministic based on comment length.
 *
 * Strategy compliance:
 *   R3: Autonomy-supportive framing — burn shown as informational cost, not a bet
 *   R6: Burn-weighted comment sorting (handled by CommentThread)
 *   5.1b: CommentInput.vue per spec (was incorrectly implemented as CommentSlideover)
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import { formatXPI } from '~/utils/formatting'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  platform: ScriptChunkPlatformUTF8
  /** Target profile ID for profile/post comments. Omit for new standalone posts. */
  profileId?: string
  /** Target post ID for post-level comments */
  postId?: string
  /** Parent comment txid for reply threading (5.1a spec) */
  inReplyTo?: string
  /** Parent comment text for reply context display (replaces raw txid) */
  parentText?: string
  /** Placeholder text override */
  placeholder?: string
  /** Hide the "Posting as You" label — use when the parent context already identifies the user */
  hideAuthorLabel?: boolean
}>()

const walletStore = useWalletStore()
const { getAvatar } = useAvatars()
const { useResolve } = useFeedIdentity()

const authorIdentity = useResolve(
  () => 'lotusia',
  () => walletStore.scriptPayload || '',
)

/** Short wallet identity display for "Posting as" row */
const authorDisplay = computed(() => {
  if (!walletStore.scriptPayload) return null
  return authorIdentity.value.displayName
})

/** Avatar: real avatar via useAvatars */
const avatarUrl = ref<string | null>(null)
const avatarInitials = computed(() => authorIdentity.value.initials)

/** Truncated parent text for reply context display */
const parentTextSnippet = computed(() => {
  const t = props.parentText
  if (!t) return 'Replying to comment'
  return t.length > 120 ? t.slice(0, 120) + '...' : t
})

const emit = defineEmits<{
  posted: [txid: string]
  cancel: []
}>()

const {
  postComment,
  status,
  error,
  reset,
  canAffordComment,
  validateComment,
  getMinBurnForComment,
  getCommentByteLength,
  MAX_COMMENT_BYTES,
} = useRnkcComment()

const commentText = ref('')

const isPosting = computed(() =>
  status.value === 'building' || status.value === 'signing' || status.value === 'broadcasting',
)

const byteLength = computed(() => getCommentByteLength(commentText.value))
const byteLimitPct = computed(() => Math.min(100, (byteLength.value / MAX_COMMENT_BYTES) * 100))

// Auto-calculated burn: byte length × fee rate per byte
const autoBurn = computed(() =>
  commentText.value.trim().length > 0 ? getMinBurnForComment(commentText.value) : 0n,
)

const formattedBurn = computed(() =>
  formatXPI(autoBurn.value.toString(), { minDecimals: 0, maxDecimals: 2 }),
)

const contentValidation = computed(() => validateComment(commentText.value))

const canSubmit = computed(() =>
  !contentValidation.value
  && canAffordComment(autoBurn.value)
  && !isPosting.value
  && status.value !== 'success',
)

const hasContent = computed(() => commentText.value.trim().length > 0)


async function submitComment() {
  const result = await postComment({
    platform: props.platform,
    profileId: props.profileId,
    postId: props.postId,
    content: commentText.value,
    inReplyTo: props.inReplyTo,
    // burnAmountSats omitted — auto-calculated by composable
  })

  if (result.success && result.txid) {
    commentText.value = ''
    reset()
    emit('posted', result.txid!)
  }
}

function handleCancel() {
  commentText.value = ''
  reset()
  emit('cancel')
}

const textareaRef = ref<{ textarea: HTMLTextAreaElement } | null>(null)

function handleKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl+Enter to submit
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit.value) {
    e.preventDefault()
    submitComment()
  }
}

onMounted(async () => {
  // Focus textarea when mounted (especially for replies)
  nextTick(() => textareaRef.value?.textarea?.focus())
  // Load real avatar
  const sp = walletStore.scriptPayload
  if (sp) {
    const avatar = await getAvatar('lotusia', sp)
    avatarUrl.value = avatar.src
  }
})
</script>

<template>
  <div class="space-y-0">
    <!-- Reply context: show parent text snippet instead of raw txid -->
    <div v-if="props.inReplyTo"
      class="flex items-start gap-2 px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border-l-2 border-primary/40">
      <UIcon name="i-lucide-corner-down-right" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
      <p class="text-xs text-gray-500 line-clamp-2 flex-1">{{ parentTextSnippet }}</p>
      <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="flex-shrink-0 -mt-0.5"
        @click="handleCancel" />
    </div>

    <!-- Twitter-style composer: avatar left column + content right column -->
    <div class="flex gap-3 items-start">
      <!-- Left column: avatar -->
      <div v-if="authorDisplay" class="flex-shrink-0 pt-0.5">
        <UAvatar :src="avatarUrl || undefined" :text="avatarInitials" size="sm" />
      </div>

      <!-- Right column: label + textarea + footer -->
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <!-- Author identity label (hidden when hideAuthorLabel or in reply mode) -->
        <!-- <div v-if="authorDisplay && !props.inReplyTo && !props.hideAuthorLabel"
          class="text-[13px] font-semibold text-gray-700 dark:text-gray-200">
          Posting as You
        </div> -->

        <!-- Textarea: borderless, blends into the card background -->
        <UTextarea ref="textareaRef" v-model="commentText" class="w-full"
          :ui="{ base: 'bg-transparent border-0 focus:ring-0 shadow-none resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-[15px] px-2 py-2 mb-1' }"
          :rows="props.inReplyTo ? 2 : 3" autofocus autoresize :maxrows="5"
          :placeholder="placeholder || 'Share your perspective...'" :disabled="isPosting || status === 'success'"
          @keydown="handleKeydown" />

        <!-- Footer row: byte counter + burn cost + action buttons -->
        <div class="flex items-center justify-between">
          <!-- Left: byte progress -->
          <div class="flex items-center gap-2">
            <Transition name="fade" :duration="100" appear>
              <div v-if="hasContent" class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <div class="w-12 h-2 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden">
                  <div class="h-full rounded-full transition-all"
                    :class="byteLimitPct > 90 ? 'bg-error-500' : 'bg-primary/60'"
                    :style="{ width: `${byteLimitPct}%` }" />
                </div>
                <span class="tabular-nums"
                  :class="byteLength > MAX_COMMENT_BYTES ? 'text-error-500 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'">
                  {{ MAX_COMMENT_BYTES - byteLength }}
                </span>
              </div>
            </Transition>
          </div>

          <!-- Right: burn cost + buttons -->
          <div class="flex items-center gap-1.5">
            <!-- Auto-calculated burn cost (informational, R3) -->
            <Transition name="fade" :duration="100" appear>
              <span v-if="hasContent" class="text-xs text-gray-500 dark:text-gray-400">
                {{ formattedBurn }} XPI
              </span>
            </Transition>
            <!-- Cancel -->
            <UButton variant="ghost" color="neutral" size="xs" @click="handleCancel">
              Cancel
            </UButton>

            <!-- Send / Reply button -->
            <UButton :loading="isPosting" :disabled="!canSubmit" size="xs" variant="outline" @click="submitComment">
              <template v-if="!isPosting">
                {{ props.inReplyTo ? 'Reply' : 'Post' }}
              </template>
            </UButton>
          </div>
        </div>

        <!-- Status messages -->
        <p v-if="hasContent && !canAffordComment(autoBurn)" class="text-xs text-warning-500 dark:text-warning-400">
          Insufficient balance ({{ formattedBurn }} XPI required)
        </p>
        <p v-if="error" class="text-xs text-error-500 dark:text-error-400">{{ error }}</p>
        <div v-if="status === 'success'"
          class="flex items-center gap-1.5 text-xs text-success-500 dark:text-success-400">
          <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5" />
          <span>Posted on-chain</span>
        </div>
      </div>
    </div>
  </div>
</template>
