<script setup lang="ts">
/**
 * Home Page
 *
 * Main wallet dashboard showing balance, quick actions, and recent activity.
 */
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'
import { useContactsStore } from '~/stores/contacts'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'

definePageMeta({
  title: 'Home',
})

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const contactsStore = useContactsStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

// Initialize contacts for transaction display
onMounted(() => {
  contactsStore.initialize()
  // Fetch transaction history if wallet is initialized
  if (walletStore.initialized) {
    walletStore.fetchTransactionHistory()
  }
})

// Watch for wallet initialization to fetch history
watch(() => walletStore.initialized, (initialized) => {
  if (initialized && walletStore.transactionHistory.length === 0) {
    walletStore.fetchTransactionHistory()
  }
})

// P2P status
const p2pConnected = computed(() => p2pStore.connected)
const peerCount = computed(() => p2pStore.peerCount)

// Pending signing requests count
const pendingRequestsCount = computed(() => {
  return musig2Store.pendingSessions.filter(s => !s.isInitiator).length
})

// Shared wallets (show first 3)
const sharedWallets = computed(() => musig2Store.sharedWallets.slice(0, 3))
const hasSharedWallets = computed(() => musig2Store.sharedWallets.length > 0)

// Quick actions for the home page
const quickActions = computed(() => {
  const actions = [
    {
      label: 'Send',
      icon: 'i-lucide-send',
      to: '/transact/send',
    },
    {
      label: 'Receive',
      icon: 'i-lucide-qr-code',
      to: '/transact/receive',
    },
    {
      label: 'Scan',
      icon: 'i-lucide-scan',
      to: '/transact/send?scan=true',
    },
    {
      label: 'History',
      icon: 'i-lucide-history',
      to: '/transact/history',
    },
  ]
  return actions
})

// Balance visibility toggle
const balanceVisible = ref(true)

// Show getting started if checklist not complete
const showGettingStarted = computed(() => !onboardingStore.isChecklistComplete)

// Recent transactions for activity card
const recentTransactions = computed(() => walletStore.transactionHistory)
const isLoadingHistory = computed(() => !walletStore.initialized)
</script>

<template>
  <div class="space-y-4">
    <!-- Backup Reminder (if not backed up) -->
    <OnboardingBackupReminder />

    <!-- Balance Card -->
    <div
      class="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-900 rounded-2xl p-5 text-white shadow-lg">
      <!-- Balance Section -->
      <div class="text-center mb-5">
        <div class="flex items-center justify-center gap-2 mb-1">
          <span class="text-primary-100 text-sm">Total Balance</span>
          <button class="text-primary-200 hover:text-white transition-colors" @click="balanceVisible = !balanceVisible">
            <UIcon :name="balanceVisible ? 'i-lucide-eye' : 'i-lucide-eye-off'" class="w-4 h-4" />
          </button>
        </div>

        <div class="text-3xl md:text-4xl font-bold font-mono">
          <template v-if="balanceVisible">
            {{ walletStore.formattedBalance }}
            <span class="text-xl text-primary-200">XPI</span>
          </template>
          <template v-else>••••••••</template>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-4 gap-2">
        <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to"
          class="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <div class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <UIcon :name="action.icon" class="w-4 h-4" />
          </div>
          <span class="text-[11px] font-medium">{{ action.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- P2P Status Bar -->
    <div class="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="p2pConnected ? 'bg-success' : 'bg-neutral-400'" />
        <span class="text-sm">
          {{ p2pConnected ? `P2P: ${peerCount} peers` : 'P2P offline' }}
        </span>
      </div>
      <NuxtLink to="/people/p2p?tab=requests"
        class="relative flex items-center gap-1 text-sm text-primary hover:underline">
        <UIcon name="i-lucide-inbox" class="w-4 h-4" />
        <span>Requests</span>
        <UBadge v-if="pendingRequestsCount > 0" color="error" size="xs" class="absolute -top-1 -right-3">
          {{ pendingRequestsCount }}
        </UBadge>
      </NuxtLink>
    </div>

    <!-- Shared Wallets Section -->
    <UCard v-if="hasSharedWallets">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Shared Wallets</span>
          </div>
          <NuxtLink to="/people/shared-wallets" class="text-sm text-primary hover:underline">
            View All
          </NuxtLink>
        </div>
      </template>

      <div class="divide-y divide-default">
        <NuxtLink v-for="wallet in sharedWallets" :key="wallet.id" :to="`/people/shared-wallets/${wallet.id}`"
          class="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-4 px-4 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="font-medium">{{ wallet.name }}</p>
              <p class="text-xs text-muted">{{ wallet.participants.length }} participants</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-mono text-sm">{{ (Number(wallet.balanceSats) / 1_000_000).toFixed(2) }} XPI</p>
          </div>
        </NuxtLink>
      </div>
    </UCard>

    <!-- Network Status -->
    <CommonNetworkStatus variant="compact" />

    <!-- Getting Started Checklist (for new users) -->
    <OnboardingGettingStartedChecklist v-if="showGettingStarted" />

    <!-- Recent Activity -->
    <WalletActivityCard :transactions="recentTransactions" :loading="isLoadingHistory" :max-items="5" />
  </div>
</template>
