<script setup lang="ts">
/**
 * Vote Button Component
 *
 * Upvote/downvote button that opens the VoteSlideover via useOverlays.
 * The slideover slides in from the bottom and supports browser back button.
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  /** Platform identifier */
  platform: ScriptChunkPlatformUTF8
  /** Profile ID */
  profileId: string
  /** Optional post ID */
  postId?: string
  /** Disable voting (e.g. not authenticated) */
  disabled?: boolean
}>()

const emit = defineEmits<{
  voted: [txid: string, sentiment: 'positive' | 'negative']
}>()

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()

const walletReady = computed(() => walletStore.isReadyForSigning())

/** Optimistic local state: tracks the user's last vote sentiment */
const votedSentiment = ref<'positive' | 'negative' | null>(null)
const voting = ref(false)

async function handleVoteClick(sentiment: 'positive' | 'negative') {
  if (props.disabled || !walletReady.value || voting.value) return

  voting.value = true
  try {
    const result = await openVoteSlideover({
      sentiment,
      platform: props.platform,
      profileId: props.profileId,
      postId: props.postId,
    })

    if (result?.txid) {
      // Optimistic update: highlight button immediately
      votedSentiment.value = sentiment
      emit('voted', result.txid, sentiment)
    }
  } finally {
    voting.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- R4: Equal visual weight for upvote and downvote (cost symmetry) -->
    <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="[
      disabled || !walletReady
        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
        : votedSentiment === 'positive'
          ? 'bg-success-500/15 text-success-600 dark:text-success-400'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
    ]" :disabled="disabled || !walletReady || voting" @click="handleVoteClick('positive')">
      <UIcon name="i-lucide-thumbs-up" class="w-4 h-4" />
      <span>{{ votedSentiment === 'positive' ? 'Upvoted' : 'Upvote' }}</span>
    </button>

    <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="[
      disabled || !walletReady
        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
        : votedSentiment === 'negative'
          ? 'bg-error-500/15 text-error-600 dark:text-error-400'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
    ]" :disabled="disabled || !walletReady || voting" @click="handleVoteClick('negative')">
      <UIcon name="i-lucide-thumbs-down" class="w-4 h-4" />
      <span>{{ votedSentiment === 'negative' ? 'Downvoted' : 'Downvote' }}</span>
    </button>
  </div>
</template>
