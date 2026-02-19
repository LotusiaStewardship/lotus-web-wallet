<script setup lang="ts">
/**
 * @deprecated Superseded by CommentInput.vue per 5.1b spec.
 *
 * This component is dead code — not imported or registered anywhere.
 * It has a TS error (COMMENT_BURN_PRESETS removed from useRnkcComment)
 * and violates R3 (autonomy-supportive framing) by presenting burn presets
 * as a "bet" rather than auto-calculating burn as informational cost.
 *
 * TODO: Delete this file once confirmed no longer needed.
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import { formatXPI } from '~/utils/formatting'

export interface CommentSlideoverProps {
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
  /** Parent comment txid for reply threading (5.1a spec) */
  inReplyTo?: string
}

export interface CommentSlideoverResult {
  txid: string
}

const props = defineProps<CommentSlideoverProps>()

const emit = defineEmits<{
  (e: 'close', result?: CommentSlideoverResult): void
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
  COMMENT_BURN_PRESETS,
  MAX_COMMENT_BYTES,
} = useRnkcComment()

const commentText = ref('')
const selectedBurnSats = ref(COMMENT_BURN_PRESETS[0].sats)
const customBurnInput = ref('')

const isPosting = computed(() =>
  status.value === 'building' || status.value === 'signing' || status.value === 'broadcasting',
)

const byteLength = computed(() => getCommentByteLength(commentText.value))
const byteLimitPct = computed(() => Math.min(100, (byteLength.value / MAX_COMMENT_BYTES) * 100))

const minBurn = computed(() =>
  commentText.value.trim().length > 0 ? getMinBurnForComment(commentText.value) : 0n,
)

const formattedBurn = computed(() =>
  formatXPI(selectedBurnSats.value.toString(), { minDecimals: 0, maxDecimals: 2 }),
)

const formattedMinBurn = computed(() =>
  formatXPI(minBurn.value.toString(), { minDecimals: 0, maxDecimals: 2 }),
)

const contentValidation = computed(() => validateComment(commentText.value))

const burnTooLow = computed(() =>
  commentText.value.trim().length > 0 && selectedBurnSats.value < minBurn.value,
)

const canSubmit = computed(() =>
  !contentValidation.value
  && !burnTooLow.value
  && canAffordComment(selectedBurnSats.value)
  && !isPosting.value
  && status.value !== 'success',
)

function selectPreset(sats: bigint) {
  selectedBurnSats.value = sats
  customBurnInput.value = ''
}

function applyCustomBurn() {
  const val = parseFloat(customBurnInput.value)
  if (isNaN(val) || val <= 0) return
  const sats = BigInt(Math.floor(val * 1_000_000))
  selectedBurnSats.value = sats
}

async function confirmComment() {
  const result = await postComment({
    platform: props.platform,
    profileId: props.profileId,
    postId: props.postId,
    content: commentText.value,
    burnAmountSats: selectedBurnSats.value,
    inReplyTo: props.inReplyTo,
  })

  if (result.success && result.txid) {
    reset()
    emit('close', { txid: result.txid! })
  }
}

function close() {
  reset()
  emit('close')
}
</script>

<template>
  <USlideover :open="true" side="bottom">
    <template #content>
      <div class="p-4 pb-8 space-y-4 max-h-[85vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="w-8" />
          <h2 class="text-lg font-semibold text-center">
            {{ props.inReplyTo ? 'Reply to Comment' : 'Add Comment' }}
          </h2>
          <UButton variant="ghost" size="xs" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Reply context indicator -->
        <div v-if="props.inReplyTo"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500">
          <UIcon name="i-lucide-reply" class="w-3.5 h-3.5 flex-shrink-0" />
          <span>Replying to comment <span class="font-mono">{{ props.inReplyTo.slice(0, 8) }}...</span></span>
        </div>

        <!-- Comment Input -->
        <div class="space-y-1">
          <UTextarea v-model="commentText" :rows="4" autoresize :maxrows="10" placeholder="Share your perspective..."
            size="sm" :disabled="isPosting || status === 'success'" />
          <div class="flex items-center justify-between text-xs">
            <span :class="byteLength > MAX_COMMENT_BYTES ? 'text-error-500' : 'text-gray-400'">
              {{ byteLength }}/{{ MAX_COMMENT_BYTES }} bytes
            </span>
            <div class="w-16 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div class="h-full rounded-full transition-all" :class="byteLimitPct > 90 ? 'bg-error-500' : 'bg-primary'"
                :style="{ width: `${byteLimitPct}%` }" />
            </div>
          </div>
        </div>

        <!-- Burn Info -->
        <p class="text-sm text-gray-500">
          Comments require a burn of at least
          <span class="font-medium text-primary">{{ formattedMinBurn }} XPI</span>
          ({{ byteLength }} bytes × fee rate). This burn is permanent and irreversible.
        </p>

        <!-- Burn Presets -->
        <div class="grid grid-cols-4 gap-2">
          <UButton v-for="preset in COMMENT_BURN_PRESETS" :key="preset.label"
            :variant="selectedBurnSats === preset.sats ? 'soft' : 'outline'"
            :color="selectedBurnSats === preset.sats ? 'primary' : 'neutral'" size="sm"
            :disabled="!canAffordComment(preset.sats)" @click="selectPreset(preset.sats)">
            {{ preset.label }}
          </UButton>
        </div>

        <!-- Custom Amount -->
        <div class="flex items-center gap-2">
          <UInput v-model="customBurnInput" type="number" step="any" min="0" placeholder="Custom XPI amount"
            class="flex-1" size="sm" @change="applyCustomBurn" />
          <span class="text-sm text-gray-500">XPI</span>
        </div>

        <!-- Selected Amount Display -->
        <div class="text-center py-2">
          <span class="text-2xl font-bold font-mono">{{ formattedBurn }}</span>
          <span class="text-gray-500 ml-1">XPI</span>
        </div>

        <!-- Burn Too Low Warning -->
        <div v-if="burnTooLow" class="text-sm text-warning-500 text-center">
          Minimum burn for this comment is {{ formattedMinBurn }} XPI
        </div>

        <!-- Error Display -->
        <div v-if="error" class="text-sm text-error-500 text-center">
          {{ error }}
        </div>

        <!-- Status Display -->
        <div v-if="isPosting" class="text-sm text-primary text-center flex items-center justify-center gap-2">
          <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
          <span v-if="status === 'building'">Building transaction...</span>
          <span v-else-if="status === 'signing'">Signing...</span>
          <span v-else-if="status === 'broadcasting'">Broadcasting...</span>
        </div>

        <!-- Success Display -->
        <div v-if="status === 'success'"
          class="text-sm text-success-500 text-center flex items-center justify-center gap-2">
          <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
          <span>Comment posted on-chain!</span>
        </div>

        <!-- Submit Button -->
        <UButton block size="lg" :loading="isPosting" :disabled="!canSubmit" @click="confirmComment">
          <template v-if="!canAffordComment(selectedBurnSats)">
            Insufficient Balance
          </template>
          <template v-else>
            Post Comment
          </template>
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
