<script setup lang="ts">
/**
 * New Post Slideover Component
 *
 * Bottom slideover for creating native Lotusia posts.
 * Managed by useOverlays for proper slide-in animation and back button support.
 *
 * Uses FeedCommentInput component for the comment posting logic.
 * Posts are recorded on-chain with auto-calculated burn (byte length × fee rate).
 *
 * Strategy compliance:
 *   R3: Autonomy-supportive framing — burn shown as informational cost
 *   R38: Curation language — "Noted" for neutral posts
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import { useWalletStore } from '~/stores/wallet'

export interface NewPostSlideoverProps {
  platform: ScriptChunkPlatformUTF8
}

export interface NewPostSlideoverResult {
  txid: string
}

const props = defineProps<NewPostSlideoverProps>()
const walletStore = useWalletStore()

const emit = defineEmits<{
  (e: 'close', result?: NewPostSlideoverResult): void
}>()

function handlePosted(txid: string) {
  emit('close', { txid })
}

function handleCancel() {
  emit('close')
}
</script>

<template>
  <USlideover :open="true" side="bottom">
    <template #content>
      <div class="p-4 pb-8 space-y-3">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="w-8" />
          <h2 class="text-lg font-semibold text-center">New Post</h2>
          <UButton variant="ghost" size="xs" icon="i-lucide-x" @click="handleCancel" />
        </div>


        <!-- Comment Input — hideAuthorLabel since header already sets context -->
        <!-- For new standalone posts, profileId defaults to wallet's scriptPayload -->
        <FeedCommentInput :platform="props.platform" :profileId="walletStore.scriptPayload || undefined"
          placeholder="What's on your mind?" hide-author-label @posted="handlePosted" @cancel="handleCancel" />
      </div>
    </template>
  </USlideover>
</template>
