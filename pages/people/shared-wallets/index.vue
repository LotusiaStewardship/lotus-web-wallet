<script setup lang="ts">
/**
 * Shared Wallets Page - Unified Experience
 *
 * Phase 6: Improved tab navigation with proper defaults.
 * Phase 10 R10.1.1: Redesigned with tabs for unified P2P/MuSig2 experience.
 * Consolidates wallet management, signer discovery, and signing requests.
 *
 * Tabs:
 * - My Wallets: List of shared wallets
 * - Available Signers: Discovered signers from P2P network
 * - Pending Requests: Incoming and outgoing signing requests
 */
import { useMuSig2Store, type StoreSigner } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import { useContactsStore } from '~/stores/contacts'
import type { WalletSigningSession } from '~/plugins/05.musig2.client'

definePageMeta({
  title: 'Shared Wallets',
})

const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()
const contactsStore = useContactsStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

// Tab navigation with proper slot names
const tabs = [
  { label: 'My Wallets', slot: 'wallets', icon: 'i-lucide-shield' },
  { label: 'Available Signers', slot: 'signers', icon: 'i-lucide-users' },
  { label: 'Pending Requests', slot: 'requests', icon: 'i-lucide-inbox' },
]

// Default to first tab's slot name when no query param
function getInitialTab(): string {
  const queryTab = route.query.tab as string | undefined
  if (queryTab && tabs.some(t => t.slot === queryTab)) {
    return queryTab
  }
  return tabs[0].slot
}

const selectedTab = ref<string>(getInitialTab())

// Only update URL when user clicks a tab (not on initial load)
const isInitialLoad = ref(true)

watch(selectedTab, tab => {
  if (isInitialLoad.value) {
    isInitialLoad.value = false
    return
  }
  router.replace({ query: { ...route.query, tab } })
})

// Modal state
const showCreateModal = ref(false)
const showFundModal = ref(false)
const showSpendModal = ref(false)
const showSignerDetail = ref(false)
const selectedWallet = ref<typeof musig2Store.sharedWallets[0] | null>(null)
const selectedSigner = ref<StoreSigner | null>(null)

// Loading state
const loading = ref(false)

// Pending requests badge count
const pendingRequestsBadge = computed(() => {
  const count = musig2Store.pendingRequestCount
  return count > 0 ? count : undefined
})

// Connect to P2P
async function handleConnect() {
  try {
    await p2pStore.initialize()
    await p2pStore.connect()
  } catch (err) {
    toast.add({
      title: 'Connection Failed',
      description: err instanceof Error ? err.message : 'Failed to connect',
      color: 'error',
    })
  }
}

// Disconnect from P2P
async function handleDisconnect() {
  try {
    await p2pStore.disconnect()
  } catch (err) {
    console.error('Failed to disconnect:', err)
  }
}

// Navigate to P2P settings
function handleManageNetwork() {
  navigateTo('/settings/p2p')
}

// Refresh wallets
async function refreshWallets() {
  loading.value = true
  try {
    await musig2Store.refreshSharedWalletBalances()
  } finally {
    loading.value = false
  }
}

// Refresh signers
async function refreshSigners() {
  try {
    await musig2Store.refreshSigners()
  } catch (err) {
    toast.add({
      title: 'Refresh Failed',
      description: err instanceof Error ? err.message : 'Failed to refresh signers',
      color: 'error',
    })
  }
}

// Handle wallet actions
function handleFund(wallet: typeof musig2Store.sharedWallets[0]) {
  selectedWallet.value = wallet
  showFundModal.value = true
}

function handleSpend(wallet: typeof musig2Store.sharedWallets[0]) {
  selectedWallet.value = wallet
  showSpendModal.value = true
}

function handleViewWalletDetails(wallet: typeof musig2Store.sharedWallets[0]) {
  navigateTo(`/people/shared-wallets/${wallet.id}`)
}

// Handle signer actions
function handleViewSignerDetails(signer: StoreSigner) {
  selectedSigner.value = signer
  showSignerDetail.value = true
}

function handleAddSignerToWallet(signer: StoreSigner) {
  // Open create modal with signer pre-selected
  navigateTo({
    path: '/people/shared-wallets',
    query: { action: 'create', signerId: signer.id },
  })
  showCreateModal.value = true
}

async function handleSaveSignerAsContact(signer: StoreSigner) {
  try {
    await contactsStore.addContact({
      name: signer.nickname || `Signer ${signer.peerId.slice(0, 8)}`,
      address: signer.walletAddress,
      publicKey: signer.publicKey,
      peerId: signer.peerId,
    })
    toast.add({
      title: 'Contact Saved',
      description: `${signer.nickname || 'Signer'} has been added to your contacts`,
      color: 'success',
    })
    showSignerDetail.value = false
  } catch (err) {
    toast.add({
      title: 'Failed to Save Contact',
      description: err instanceof Error ? err.message : 'Unknown error',
      color: 'error',
    })
  }
}

// Handle request actions
async function handleAcceptRequest(request: WalletSigningSession) {
  try {
    await musig2Store.acceptRequest(request.id)
    toast.add({
      title: 'Request Accepted',
      description: 'You have accepted the signing request',
      color: 'success',
    })
  } catch (err) {
    toast.add({
      title: 'Accept Failed',
      description: err instanceof Error ? err.message : 'Failed to accept request',
      color: 'error',
    })
  }
}

async function handleRejectRequest(request: WalletSigningSession) {
  try {
    await musig2Store.rejectRequest(request.id)
    toast.add({
      title: 'Request Rejected',
      description: 'You have declined the signing request',
      color: 'warning',
    })
  } catch (err) {
    toast.add({
      title: 'Reject Failed',
      description: err instanceof Error ? err.message : 'Failed to reject request',
      color: 'error',
    })
  }
}

async function handleCancelRequest(request: WalletSigningSession) {
  try {
    await musig2Store.cancelRequest(request.id)
    toast.add({
      title: 'Request Cancelled',
      description: 'Your signing request has been cancelled',
      color: 'warning',
    })
  } catch (err) {
    toast.add({
      title: 'Cancel Failed',
      description: err instanceof Error ? err.message : 'Failed to cancel request',
      color: 'error',
    })
  }
}

/**
 * Phase 10: Improved initialization
 * Wait for DHT ready before initializing MuSig2 and start signer subscription
 */
onMounted(async () => {
  console.log('[Shared Wallets] Mounted, checking initialization state')

  // Check for action query param
  if (route.query.action === 'create') {
    showCreateModal.value = true
  }

  // Only initialize if DHT is ready (not just P2P connected)
  if (p2pStore.dhtReady && !musig2Store.initialized) {
    console.log('[Shared Wallets] DHT ready, initializing MuSig2...')
    try {
      await musig2Store.initialize()
      await musig2Store.startSignerSubscription()
      await musig2Store.refreshSigners()
      console.log('[Shared Wallets] MuSig2 initialized and subscription started')
    } catch (e) {
      console.warn('[Shared Wallets] MuSig2 initialization deferred:', e)
    }
  } else if (musig2Store.initialized) {
    // Already initialized, ensure subscription is running
    if (!musig2Store.signerSubscriptionId) {
      try {
        await musig2Store.startSignerSubscription()
        await musig2Store.refreshSigners()
      } catch (e) {
        console.warn('[Shared Wallets] Failed to start signer subscription:', e)
      }
    }
  }
})

/**
 * Watch for DHT becoming ready
 */
watch(
  () => p2pStore.dhtReady,
  async (ready, wasReady) => {
    if (ready && !wasReady) {
      console.log('[Shared Wallets] DHT became ready')

      if (!musig2Store.initialized) {
        try {
          await musig2Store.initialize()
          await musig2Store.startSignerSubscription()
          await musig2Store.refreshSigners()
          console.log('[Shared Wallets] MuSig2 initialized after DHT ready')
        } catch (e) {
          console.warn('[Shared Wallets] Failed to initialize MuSig2:', e)
        }
      }
    }
  },
)

/**
 * Watch for MuSig2 initialization
 */
watch(
  () => musig2Store.initialized,
  async (initialized) => {
    if (initialized && p2pStore.dhtReady && !musig2Store.signerSubscriptionId) {
      console.log('[Shared Wallets] MuSig2 initialized, starting subscription')
      try {
        await musig2Store.startSignerSubscription()
        await musig2Store.refreshSigners()
      } catch (e) {
        console.warn('[Shared Wallets] Failed to start subscription:', e)
      }
    }
  },
)
</script>

<template>
  <div class="space-y-6">
    <!-- Hero Card -->
    <UiAppHeroCard icon="i-lucide-shield" title="Shared Wallets"
      subtitle="Multi-signature wallets for collaborative spending">
      <template #action>
        <UButton color="primary" icon="i-lucide-plus" @click="showCreateModal = true">
          New Wallet
        </UButton>
      </template>
    </UiAppHeroCard>

    <!-- Network Status Bar -->
    <CommonNetworkStatus variant="inline" show-actions @connect="handleConnect" @disconnect="handleDisconnect"
      @manage="handleManageNetwork" />

    <!-- Tabbed Content -->
    <UTabs v-model="selectedTab" :items="tabs" class="w-full">
      <!-- My Wallets Tab -->
      <template #wallets>
        <div class="space-y-6 pt-4">
          <!-- Wallet List -->
          <Musig2SharedWalletList :wallets="musig2Store.sharedWallets" :loading="loading || musig2Store.loading"
            @create="showCreateModal = true" @fund="handleFund" @spend="handleSpend"
            @view-details="handleViewWalletDetails" @refresh="refreshWallets" />

          <!-- Quick Stats -->
          <div v-if="musig2Store.sharedWallets.length > 0" class="grid grid-cols-2 gap-4">
            <UiAppStatCard label="Total Wallets" :value="musig2Store.sharedWallets.length.toString()"
              icon="i-lucide-shield" />
            <UiAppStatCard label="Active Sessions" :value="musig2Store.inProgressSessions.length.toString()"
              icon="i-lucide-activity" />
          </div>
        </div>
      </template>

      <!-- Available Signers Tab -->
      <template #signers>
        <div class="space-y-6 pt-4">
          <SharedWalletsAvailableSigners :loading="musig2Store.loading" @add-to-wallet="handleAddSignerToWallet"
            @save-contact="handleSaveSignerAsContact" @view-details="handleViewSignerDetails"
            @refresh="refreshSigners" />
        </div>
      </template>

      <!-- Pending Requests Tab -->
      <template #requests>
        <div class="space-y-6 pt-4">
          <SharedWalletsPendingRequests @accept="handleAcceptRequest" @reject="handleRejectRequest"
            @cancel="handleCancelRequest" />
        </div>
      </template>
    </UTabs>

    <!-- Signer Mode Panel (Collapsible) -->
    <SharedWalletsSignerModePanel />

    <!-- Create Modal -->
    <Musig2CreateSharedWalletModal v-model:open="showCreateModal" @created="showCreateModal = false" />

    <!-- Fund Modal -->
    <Musig2FundWalletModal v-if="selectedWallet" v-model:open="showFundModal" :wallet="selectedWallet"
      @funded="showFundModal = false" />

    <!-- Spend Modal -->
    <Musig2ProposeSpendModal v-if="selectedWallet" v-model:open="showSpendModal" :wallet="selectedWallet"
      @proposed="showSpendModal = false" />

    <!-- Signer Detail Modal -->
    <CommonSignerDetailModal :open="showSignerDetail" :signer="selectedSigner ? {
      id: selectedSigner.id,
      peerId: selectedSigner.peerId,
      publicKey: selectedSigner.publicKey,
      nickname: selectedSigner.nickname,
      isOnline: selectedSigner.isOnline,
      capabilities: selectedSigner.capabilities,
      walletAddress: selectedSigner.walletAddress,
      lastSeen: selectedSigner.lastSeen,
    } : null" @update:open="showSignerDetail = $event" @save-contact="handleSaveSignerAsContact(selectedSigner!)">
      <template #primary-action>
        <UButton color="primary" icon="i-lucide-plus" @click="handleAddSignerToWallet(selectedSigner!)">
          Add to Wallet
        </UButton>
        <UButton color="primary" variant="outline" icon="i-lucide-wallet"
          @click="navigateTo({ path: '/people/shared-wallets', query: { action: 'create', signerId: selectedSigner?.id } }); showSignerDetail = false">
          Create New Wallet
        </UButton>
      </template>
    </CommonSignerDetailModal>
  </div>
</template>
