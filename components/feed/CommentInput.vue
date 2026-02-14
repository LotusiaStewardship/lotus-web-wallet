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
  profileId: string
  postId?: string
  /** Parent comment txid for reply threading (5.1a spec) */
  inReplyTo?: string
  /** Placeholder text override */
  placeholder?: string
}>()

const emit = defineEmits<{
  posted: [txid: string]
  cancel: []
}>()

const walletStore = useWalletStore()

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
  MIN_FEE_RATE_PER_BYTE,
} = useRnkcComment()

const commentText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

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

// Auto-resize textarea
function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

watch(commentText, () => {
  nextTick(autoResize)
})

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

function handleKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl+Enter to submit
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit.value) {
    e.preventDefault()
    submitComment()
  }
}

onMounted(() => {
  // Focus textarea when mounted (especially for replies)
  nextTick(() => textareaRef.value?.focus())
})
</script>

<template>
  <div class="space-y-2">
    <!-- Reply context indicator -->
    <div v-if="props.inReplyTo" class="flex items-center gap-2 text-xs text-gray-400">
      <UIcon name="i-lucide-corner-down-right" class="w-3 h-3 flex-shrink-0" />
      <span>Replying to <span class="font-mono">{{ props.inReplyTo.slice(0, 8) }}...</span></span>
      <button class="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="handleCancel">
        <UIcon name="i-lucide-x" class="w-3 h-3" />
      </button>
    </div>

    <!-- Input row -->
    <div class="flex gap-2 items-start">
      <!-- Textarea -->
      <div class="flex-1 min-w-0">
        <textarea ref="textareaRef" v-model="commentText" rows="1"
          :placeholder="placeholder || 'Share your perspective...'"
          class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:border-primary focus:outline-none resize-none leading-5"
          :disabled="isPosting || status === 'success'" @keydown="handleKeydown" />

        <!-- Metadata row (visible when typing) -->
        <Transition name="fade">
          <div v-if="hasContent" class="flex items-center justify-between mt-1.5 px-1">
            <!-- Byte counter -->
            <div class="flex items-center gap-2 text-xs">
              <span :class="byteLength > MAX_COMMENT_BYTES ? 'text-error-500' : 'text-gray-400'">
                {{ byteLength }}/{{ MAX_COMMENT_BYTES }}
              </span>
              <div class="w-12 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div class="h-full rounded-full transition-all"
                  :class="byteLimitPct > 90 ? 'bg-error-500' : 'bg-primary'" :style="{ width: `${byteLimitPct}%` }" />
              </div>
            </div>

            <!-- Auto-calculated burn cost -->
            <span class="text-xs text-gray-400">
              {{ formattedBurn }} XPI
            </span>
          </div>
        </Transition>
      </div>

      <!-- Submit button -->
      <button class="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors" :class="canSubmit
        ? 'bg-primary text-white hover:bg-primary/90'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'" :disabled="!canSubmit"
        @click="submitComment">
        <UIcon v-if="isPosting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        <UIcon v-else name="i-lucide-send" class="w-4 h-4" />
      </button>
    </div>

    <!-- Insufficient balance warning -->
    <p v-if="hasContent && !canAffordComment(autoBurn)" class="text-xs text-warning-500 px-1">
      Insufficient balance ({{ formattedBurn }} XPI required)
    </p>

    <!-- Error display -->
    <p v-if="error" class="text-xs text-error-500 px-1">
      {{ error }}
    </p>

    <!-- Success display -->
    <div v-if="status === 'success'" class="flex items-center gap-1.5 text-xs text-success-500 px-1">
      <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5" />
      <span>Comment posted on-chain</span>
    </div>
  </div>
</template>
