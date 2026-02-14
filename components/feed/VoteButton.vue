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
  voted: [txid: string]
}>()

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()

const walletReady = computed(() => walletStore.isReadyForSigning())

async function handleVoteClick(sentiment: 'positive' | 'negative') {
  if (props.disabled || !walletReady.value) return

  const result = await openVoteSlideover({
    sentiment,
    platform: props.platform,
    profileId: props.profileId,
    postId: props.postId,
  })

  if (result?.txid) {
    emit('voted', result.txid)
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- R4: Equal visual weight for upvote and downvote (cost symmetry) -->
    <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="disabled || !walletReady
      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
      : 'bg-primary/10 text-primary hover:bg-primary/20'" :disabled="disabled || !walletReady"
      @click="handleVoteClick('positive')">
      <UIcon name="i-lucide-thumbs-up" class="w-4 h-4" />
      <span>Upvote</span>
    </button>

    <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="disabled || !walletReady
      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
      : 'bg-primary/10 text-primary hover:bg-primary/20'" :disabled="disabled || !walletReady"
      @click="handleVoteClick('negative')">
      <UIcon name="i-lucide-thumbs-down" class="w-4 h-4" />
      <span>Downvote</span>
    </button>
  </div>
</template>
