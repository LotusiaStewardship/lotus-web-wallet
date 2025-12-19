<script setup lang="ts">
/**
 * TxidDisplay
 *
 * Transaction ID display with truncation and copy functionality.
 */
import { truncateTxid } from '~/utils/formatting'

const props = defineProps<{
  /** Transaction ID */
  txid: string
  /** Number of characters to show at start */
  startChars?: number
  /** Number of characters to show at end */
  endChars?: number
  /** Show copy button */
  copyable?: boolean
  /** Link to explorer */
  linkToExplorer?: boolean
}>()

const toast = useToast()

const displayTxid = computed(() =>
  truncateTxid(props.txid, props.startChars || 16, props.endChars || 6),
)

async function copyTxid() {
  try {
    await navigator.clipboard.writeText(props.txid)
    toast.add({
      title: 'Transaction ID copied',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch {
    toast.add({
      title: 'Failed to copy',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}
</script>

<template>
  <span class="inline-flex items-center gap-1 font-mono text-sm">
    <NuxtLink v-if="linkToExplorer" :to="`/explorer/tx/${txid}`" class="hover:text-primary transition-colors">
      {{ displayTxid }}
    </NuxtLink>
    <span v-else>{{ displayTxid }}</span>
    <button v-if="copyable" type="button" class="text-muted hover:text-primary transition-colors"
      title="Copy transaction ID" @click.stop="copyTxid">
      <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
    </button>
    <NuxtLink v-if="linkToExplorer" :to="`/explorer/tx/${txid}`" class="text-muted hover:text-primary transition-colors"
      title="View in explorer">
      <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
    </NuxtLink>
  </span>
</template>
