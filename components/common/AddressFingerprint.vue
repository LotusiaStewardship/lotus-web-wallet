<script setup lang="ts">
/**
 * AddressFingerprint
 *
 * Truncated address display with copy functionality.
 * Shows first and last characters with ellipsis in middle.
 */
import { truncateAddress } from '~/utils/formatting'

const props = defineProps<{
  /** Full address string */
  address: string
  /** Number of characters to show at start */
  startChars?: number
  /** Number of characters to show at end */
  endChars?: number
  /** Show copy button */
  copyable?: boolean
  /** Use monospace font */
  mono?: boolean
  /** Link to explorer */
  linkToExplorer?: boolean
}>()

const toast = useToast()

const displayAddress = computed(() =>
  truncateAddress(props.address, props.startChars || 12, props.endChars || 6),
)

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(props.address)
    toast.add({
      title: 'Address copied',
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
  <span class="inline-flex items-center gap-1">
    <NuxtLink v-if="linkToExplorer" :to="`/explorer/address/${address}`"
      :class="['hover:text-primary transition-colors', { 'font-mono': mono }]">
      {{ displayAddress }}
    </NuxtLink>
    <span v-else :class="{ 'font-mono': mono }">{{ displayAddress }}</span>
    <button v-if="copyable" type="button" class="text-muted hover:text-primary transition-colors" title="Copy address"
      @click.stop="copyAddress">
      <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
    </button>
  </span>
</template>
