<script setup lang="ts">
/**
 * Vote Slideover Component
 *
 * Bottom slideover for selecting burn amount and confirming a RANK vote.
 * Managed by useOverlays for proper slide-in animation and back button support.
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import { formatXPI } from '~/utils/formatting'

export interface VoteSlideoverProps {
  sentiment: 'positive' | 'negative'
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
}

export interface VoteSlideoverResult {
  txid: string
}

const props = defineProps<VoteSlideoverProps>()

const emit = defineEmits<{
  (e: 'close', result?: VoteSlideoverResult): void
}>()

const { castVote, status, error, reset, canAffordVote, BURN_PRESETS, MIN_BURN_SATS } = useRankVote()

const selectedBurnSats = ref(BURN_PRESETS[0].sats)
const customBurnInput = ref('')

const isVoting = computed(() =>
  status.value === 'building' || status.value === 'signing' || status.value === 'broadcasting',
)

const formattedBurn = computed(() =>
  formatXPI(selectedBurnSats.value.toString(), { minDecimals: 0, maxDecimals: 2 }),
)

function selectPreset(sats: bigint) {
  selectedBurnSats.value = sats
  customBurnInput.value = ''
}

function applyCustomBurn() {
  const val = parseFloat(customBurnInput.value)
  if (isNaN(val) || val <= 0) return
  const sats = BigInt(Math.floor(val * 1_000_000))
  if (sats < MIN_BURN_SATS) return
  selectedBurnSats.value = sats
}

async function confirmVote() {
  const result = await castVote({
    sentiment: props.sentiment,
    platform: props.platform,
    profileId: props.profileId,
    postId: props.postId,
    burnAmountSats: selectedBurnSats.value,
  })

  if (result.success && result.txid) {
    // Brief success display then close with result
    setTimeout(() => {
      reset()
      emit('close', { txid: result.txid! })
    }, 1500)
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
      <div class="p-4 pb-8 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="w-8" />
          <h2 class="text-lg font-semibold text-center">
            {{ sentiment === 'positive' ? 'Upvote' : 'Downvote' }}
          </h2>
          <UButton variant="ghost" size="xs" icon="i-lucide-x" @click="close" />
        </div>

        <p class="text-sm text-gray-500">
          Choose how much XPI to burn with your vote. Higher burns have more impact on rankings.
        </p>

        <!-- Burn Presets -->
        <div class="grid grid-cols-4 gap-2">
          <button v-for="preset in BURN_PRESETS" :key="preset.label"
            class="py-2 px-3 rounded-lg text-sm font-medium transition-colors border"
            :class="selectedBurnSats === preset.sats
              ? 'border-primary bg-primary-50 dark:bg-primary-900/20 text-primary'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'"
            :disabled="!canAffordVote(preset.sats)"
            @click="selectPreset(preset.sats)">
            {{ preset.label }}
          </button>
        </div>

        <!-- Custom Amount -->
        <div class="flex items-center gap-2">
          <input v-model="customBurnInput" type="number" step="any" min="0"
            placeholder="Custom XPI amount"
            class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:border-primary focus:outline-none"
            @change="applyCustomBurn" />
          <span class="text-sm text-gray-500">XPI</span>
        </div>

        <!-- Selected Amount Display -->
        <div class="text-center py-2">
          <span class="text-2xl font-bold font-mono">{{ formattedBurn }}</span>
          <span class="text-gray-500 ml-1">XPI</span>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="text-sm text-error-500 text-center">
          {{ error }}
        </div>

        <!-- Status Display -->
        <div v-if="isVoting" class="text-sm text-primary text-center flex items-center justify-center gap-2">
          <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
          <span v-if="status === 'building'">Building transaction...</span>
          <span v-else-if="status === 'signing'">Signing...</span>
          <span v-else-if="status === 'broadcasting'">Broadcasting...</span>
        </div>

        <!-- Success Display -->
        <div v-if="status === 'success'" class="text-sm text-success-500 text-center flex items-center justify-center gap-2">
          <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
          <span>Vote cast successfully!</span>
        </div>

        <!-- Confirm Button -->
        <button
          class="w-full py-3 rounded-xl font-semibold text-white transition-colors"
          :class="sentiment === 'positive'
            ? 'bg-success-500 hover:bg-success-600'
            : 'bg-error-500 hover:bg-error-600'"
          :disabled="isVoting || status === 'success' || !canAffordVote(selectedBurnSats)"
          @click="confirmVote">
          <template v-if="!canAffordVote(selectedBurnSats)">
            Insufficient Balance
          </template>
          <template v-else>
            Confirm {{ sentiment === 'positive' ? 'Upvote' : 'Downvote' }}
          </template>
        </button>
      </div>
    </template>
  </USlideover>
</template>
