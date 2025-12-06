<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import type { ParsedTransaction } from '~/composables/useExplorerApi'

definePageMeta({
  title: 'Wallet',
})

const walletStore = useWalletStore()
const p2pStore = useP2PStore()

// Recent activity from wallet store (limited to 5 most recent)
// Prefer parsed transactions from Explorer API, fallback to basic history
const recentActivity = computed((): ParsedTransaction[] => {
  if (walletStore.parsedTransactions.length > 0) {
    return walletStore.parsedTransactions.slice(0, 5)
  }
  return []
})

// Check if we have any activity to show
const hasActivity = computed(() => {
  return walletStore.parsedTransactions.length > 0 || walletStore.transactionHistory.length > 0
})

// Fetch transaction history on mount (only if wallet is initialized)
onMounted(async () => {
  if (walletStore.initialized && walletStore.transactionHistory.length === 0) {
    await walletStore.fetchTransactionHistory(5)
  }
})

// Watch for initialization to complete and fetch history
watch(() => walletStore.initialized, async (initialized) => {
  if (initialized && walletStore.transactionHistory.length === 0) {
    await walletStore.fetchTransactionHistory(5)
  }
})

// Quick actions
const quickActions = [
  {
    label: 'Send',
    icon: 'i-lucide-send',
    to: '/send',
    color: 'primary' as const,
  },
  {
    label: 'Receive',
    icon: 'i-lucide-qr-code',
    to: '/receive',
    color: 'success' as const,
  },
  {
    label: 'Discover',
    icon: 'i-lucide-compass',
    to: '/discover',
    color: 'info' as const,
  },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Balance Card -->
    <UCard>
      <BalanceDisplay :balance="walletStore.balanceXPI" :spendable="walletStore.spendableXPI">
        <template #extra>
          <!-- Connection Status -->
          <div class="mt-4 flex items-center justify-center gap-2">
            <UBadge v-if="!walletStore.connected && !walletStore.initialized" color="warning" variant="subtle"
              size="sm">
              <template #leading>
                <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin" />
              </template>
              Connecting...
            </UBadge>
            <UBadge v-else :color="walletStore.connected ? 'success' : 'error'" variant="subtle" size="sm">
              <template #leading>
                <UIcon :name="walletStore.connected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'" class="w-3 h-3" />
              </template>
              {{ walletStore.connected ? 'Connected' : 'Disconnected' }}
            </UBadge>

            <UBadge v-if="p2pStore.initialized" color="info" variant="subtle" size="sm">
              <template #leading>
                <UIcon name="i-lucide-users" class="w-3 h-3" />
              </template>
              {{ p2pStore.peerCount }} peers
            </UBadge>
          </div>
        </template>
      </BalanceDisplay>
    </UCard>

    <!-- Quick Actions -->
    <div class="grid grid-cols-3 gap-4">
      <QuickActionCard v-for="action in quickActions" :key="action.label" :label="action.label" :icon="action.icon"
        :to="action.to" :color="action.color" />
    </div>

    <!-- Network Stats -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-activity" class="w-5 h-5" />
            <span class="font-semibold">Network Status</span>
          </div>
          <UButton variant="ghost" size="sm" to="/explorer">
            Explorer
          </UButton>
        </div>
      </template>

      <div class="grid grid-cols-4 gap-4">
        <!-- Block Height - clickable -->
        <NuxtLink to="/explorer"
          class="text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors">
          <div class="text-xl font-bold font-mono">{{ walletStore.tipHeight.toLocaleString() }}</div>
          <div class="text-xs text-muted">Block Height</div>
        </NuxtLink>
        <!-- UTXOs -->
        <div class="text-center">
          <div class="text-xl font-bold font-mono">{{ walletStore.utxoCount }}</div>
          <div class="text-xs text-muted">UTXOs</div>
        </div>
        <!-- P2P Peers -->
        <div class="text-center">
          <div class="text-xl font-bold font-mono">{{ p2pStore.peerCount }}</div>
          <div class="text-xs text-muted">P2P Peers</div>
        </div>
        <!-- Signers -->
        <NuxtLink to="/p2p"
          class="text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors">
          <div class="text-xl font-bold font-mono">{{ p2pStore.signerCount }}</div>
          <div class="text-xs text-muted">Signers</div>
        </NuxtLink>
      </div>
    </UCard>

    <!-- Recent Activity -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-history" class="w-5 h-5" />
            <span class="font-semibold">Recent Activity</span>
          </div>
          <UButton variant="ghost" size="sm" to="/history">
            View All
          </UButton>
        </div>
      </template>

      <EmptyState v-if="!hasActivity && !walletStore.historyLoading" icon="i-lucide-inbox" title="No recent activity"
        description="Your transactions will appear here" />

      <LoadingSpinner v-else-if="walletStore.historyLoading" />

      <div v-else class="divide-y divide-default">
        <ActivityItem v-for="tx in recentActivity" :key="tx.txid" :transaction="tx" :compact="true" />
      </div>
    </UCard>

    <!-- Wallet Address -->
    <!-- <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-key" class="w-5 h-5" />
          <span class="font-semibold">Your Address</span>
        </div>
      </template>

      <AddressDisplay :address="walletStore.address" :show-qr="true" qr-link="/receive" />
    </UCard> -->
  </div>
</template>
