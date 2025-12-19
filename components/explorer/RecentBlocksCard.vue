<script setup lang="ts">
/**
 * ExplorerRecentBlocksCard
 *
 * Card showing recent blocks.
 */
const props = defineProps<{
  /** Recent blocks */
  blocks: Array<{
    hash: string
    height: number
    timestamp: string | number
    numTxs: string | number
    burnedAmount?: string | bigint
  }>
  /** Loading state */
  loading?: boolean
  /** Maximum items to show */
  maxItems?: number
}>()

const displayBlocks = computed(() =>
  props.blocks.slice(0, props.maxItems || 5),
)
</script>

<template>
  <UiAppCard title="Recent Blocks" icon="i-lucide-box">
    <!-- Loading -->
    <UiAppLoadingState v-if="loading" />

    <!-- Blocks -->
    <div v-else-if="displayBlocks.length" class="divide-y divide-default -mx-4">
      <ExplorerBlockItem v-for="block in displayBlocks" :key="block.hash" :block="block" compact />
    </div>

    <!-- Empty -->
    <UiAppEmptyState v-else icon="i-lucide-box" title="No blocks found" />
  </UiAppCard>
</template>
