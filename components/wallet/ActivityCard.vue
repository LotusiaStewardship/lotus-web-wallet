<script setup lang="ts">
/**
 * WalletActivityCard
 *
 * Phase 5: Updated to use unified CommonTxItem component.
 * Recent transaction activity list.
 */
import type { TransactionHistoryItem } from '~/stores/wallet'

const props = defineProps<{
  /** Transactions to display */
  transactions: TransactionHistoryItem[]
  /** Whether loading */
  loading?: boolean
  /** Maximum items to show */
  maxItems?: number
}>()

const emit = defineEmits<{
  loadMore: []
}>()

const { normalizeWalletTx } = useTransactionNormalizer()

const displayTransactions = computed(() =>
  props.transactions.slice(0, props.maxItems || 5),
)

const hasMore = computed(() =>
  props.transactions.length > (props.maxItems || 5),
)
</script>

<template>
  <UiAppCard title="Recent Activity" icon="i-lucide-activity" :action="{ label: 'View All', to: '/transact/history' }">
    <!-- Loading State -->
    <div v-if="loading && !transactions.length" class="py-8">
      <UiAppLoadingState message="Loading transactions..." size="sm" />
    </div>

    <!-- Empty State -->
    <UiAppEmptyState v-else-if="!transactions.length" icon="i-lucide-inbox" title="No transactions yet"
      description="Your recent activity will appear here" />

    <!-- Transaction List -->
    <div v-else class="divide-y divide-default -mx-4">
      <CommonTxItem v-for="tx in displayTransactions" :key="tx.txid" :transaction="normalizeWalletTx(tx)"
        variant="standard" class="px-4" />
    </div>

    <!-- Load More -->
    <div v-if="hasMore" class="mt-4 text-center">
      <UButton variant="ghost" color="neutral" size="sm" @click="emit('loadMore')">
        Load More
      </UButton>
    </div>
  </UiAppCard>
</template>
