<script setup lang="ts">
/**
 * ExplorerMempoolCard
 *
 * Phase 5: Updated to use unified CommonTxItem component.
 * Card showing pending mempool transactions.
 */
const props = defineProps<{
  /** Mempool transactions */
  transactions: Array<{
    txid: string
    timestamp?: number
    totalOutput?: string | bigint
    isRank?: boolean
    burnAmount?: string | bigint
  }>
  /** Total mempool size */
  totalCount: number
  /** Loading state */
  loading?: boolean
  /** Maximum items to show */
  maxItems?: number
}>()

const emit = defineEmits<{
  viewAll: []
}>()

const { normalizeExplorerTx } = useTransactionNormalizer()

const displayTxs = computed(() =>
  props.transactions.slice(0, props.maxItems || 5),
)
</script>

<template>
  <UiAppCard title="Mempool" icon="i-lucide-clock"
    :action="totalCount > 0 ? { label: 'View All', onClick: () => emit('viewAll') } : undefined">
    <template #header-badge>
      <UBadge v-if="totalCount > 0" color="warning" variant="subtle" size="sm">
        {{ totalCount }} pending
      </UBadge>
    </template>

    <!-- Loading -->
    <UiAppLoadingState v-if="loading" />

    <!-- Transactions -->
    <div v-else-if="displayTxs.length" class="divide-y divide-default -mx-4">
      <CommonTxItem v-for="tx in displayTxs" :key="tx.txid" :transaction="normalizeExplorerTx(tx)" variant="compact" />
    </div>

    <!-- Empty -->
    <UiAppEmptyState v-else icon="i-lucide-check-circle" title="Mempool is empty"
      description="All transactions have been confirmed" />
  </UiAppCard>
</template>
