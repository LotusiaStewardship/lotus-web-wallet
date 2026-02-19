<script setup lang="ts">
/**
 * Vote Button Component
 *
 * Endorse/Flag button pair that opens the VoteSlideover via useOverlays.
 * The slideover slides in from the bottom and supports browser back button.
 *
 * Strategy compliance:
 *   R4 (Cost symmetry): Equal visual weight for endorse/flag buttons.
 *     Optimistic state highlights the voted button immediately post-vote.
 *   R38 (Curation language): "Endorse"/"Flag" not "upvote"/"downvote".
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R4
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
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
  /** Post metadata containing user's voting history on this post */
  postMeta?: VoterPostMetadata | null
  /** Disable voting (e.g. not authenticated) */
  disabled?: boolean
}>()

const emit = defineEmits<{
  voted: [txid: string, sentiment: 'positive' | 'negative']
}>()

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()

const walletReady = computed(() => walletStore.isReadyForSigning())

/** R4: Optimistic vote state — highlights voted button immediately */
const votedSentiment = ref<'positive' | 'negative' | null>(null)
const voting = ref(false)

// Initialize optimistic state from existing vote history
onMounted(() => {
  if (props.postMeta?.hasWalletUpvoted) votedSentiment.value = 'positive'
  else if (props.postMeta?.hasWalletDownvoted) votedSentiment.value = 'negative'
})

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
      votedSentiment.value = sentiment
      emit('voted', result.txid, sentiment)
    }
  } finally {
    voting.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-6">
    <!-- R4: Equal visual weight for endorse and flag (cost symmetry) -->
    <!-- R38: Curation language — "Endorse"/"Flag" not "upvote"/"downvote" -->
    <UButton icon="i-lucide-thumbs-up" size="sm" :variant="votedSentiment === 'positive' ? 'soft' : 'ghost'"
      :color="votedSentiment === 'positive' ? 'success' : 'neutral'" :disabled="disabled || !walletReady || voting"
      title="Endorse this content" @click="handleVoteClick('positive')">
      <span v-if="votedSentiment === 'positive'" class="text-xs">Endorsed</span>
    </UButton>
    <UButton icon="i-lucide-thumbs-down" size="sm" :variant="votedSentiment === 'negative' ? 'soft' : 'ghost'"
      :color="votedSentiment === 'negative' ? 'error' : 'neutral'" :disabled="disabled || !walletReady || voting"
      title="Flag this content" @click="handleVoteClick('negative')">
      <span v-if="votedSentiment === 'negative'" class="text-xs">Flagged</span>
    </UButton>
  </div>
</template>
