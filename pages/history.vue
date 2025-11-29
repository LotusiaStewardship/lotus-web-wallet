<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import type { ParsedTransaction } from '~/composables/useExplorerApi'

definePageMeta({
  title: 'Transaction History',
})

const walletStore = useWalletStore()
const config = useRuntimeConfig()

// Use parsed transactions from Explorer API
const transactions = computed((): ParsedTransaction[] => {
  return walletStore.parsedTransactions
})

// Check if we have any transactions
const hasTransactions = computed(() => {
  return walletStore.parsedTransactions.length > 0 || walletStore.transactionHistory.length > 0
})

// Fetch history on mount (only if wallet is initialized)
onMounted(async () => {
  if (walletStore.initialized) {
    await walletStore.fetchTransactionHistory()
  }
})

// Watch for initialization to complete and fetch history
watch(() => walletStore.initialized, async (initialized) => {
  if (initialized && walletStore.transactionHistory.length === 0) {
    await walletStore.fetchTransactionHistory()
  }
})


// Refresh history
const refreshHistory = async () => {
  await walletStore.fetchTransactionHistory()
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-history" class="w-5 h-5" />
            <span class="font-semibold">Transaction History</span>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="walletStore.historyLoading"
            @click="refreshHistory">
            Refresh
          </UButton>
        </div>
      </template>

      <!-- Loading State -->
      <LoadingSpinner v-if="walletStore.historyLoading && !hasTransactions" message="Loading transaction history..."
        size="lg" />

      <!-- Empty State -->
      <EmptyState v-else-if="!hasTransactions" icon="i-lucide-inbox" icon-size="lg" title="No Transactions Yet"
        description="Your transaction history will appear here.">
        <template #actions>
          <UButton color="primary" to="/receive" icon="i-lucide-qr-code">
            Receive Lotus
          </UButton>
        </template>
      </EmptyState>

      <!-- Transaction List -->
      <div v-else class="divide-y divide-default">
        <ActivityItem v-for="tx in transactions" :key="tx.txid" :transaction="tx" :show-explorer-link="true" />
      </div>
    </UCard>

    <!-- Transaction Type Legend -->
    <UCard>
      <div class="flex items-center gap-2 mb-3">
        <UIcon name="i-lucide-info" class="w-4 h-4 text-muted" />
        <span class="text-sm font-medium">Transaction Types</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center">
            <UIcon name="i-lucide-arrow-down-left" class="w-3 h-3 text-success-500" />
          </div>
          <span class="text-muted">Received</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-error-100 dark:bg-error-900/20 flex items-center justify-center">
            <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3 text-error-500" />
          </div>
          <span class="text-muted">Gave</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-info-100 dark:bg-info-900/20 flex items-center justify-center">
            <UIcon name="i-lucide-thumbs-up" class="w-3 h-3 text-info-500" />
          </div>
          <span class="text-muted">RANK Vote</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-warning-100 dark:bg-warning-900/20 flex items-center justify-center">
            <UIcon name="i-lucide-flame" class="w-3 h-3 text-warning-500" />
          </div>
          <span class="text-muted">Burned</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center">
            <UIcon name="i-lucide-pickaxe" class="w-3 h-3 text-success-500" />
          </div>
          <span class="text-muted">Mined</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
            <UIcon name="i-lucide-rotate-cw" class="w-3 h-3 text-muted" />
          </div>
          <span class="text-muted">Self</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
