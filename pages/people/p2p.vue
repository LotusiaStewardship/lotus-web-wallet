<script setup lang="ts">
/**
 * P2P Network Page
 *
 * Connect with peers for multi-signature transactions.
 * Features tab navigation for Overview, Signers, Sessions, and Requests.
 *
 * Phase 7 Enhancements:
 * - 7.1.1: Auto-refresh signers on page load
 * - 7.1.2: Watch for P2P ready and trigger discovery
 * - 7.1.3: Add onMounted hook to start subscription
 */
import { onMounted, onUnmounted, watch } from 'vue'
import { useP2PStore, P2PConnectionState } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useContactsStore } from '~/stores/contacts'
import type { DiscoveredSigner } from '~/types/musig2'
import type { WalletSigningSession } from '~/plugins/05.musig2.client'

definePageMeta({
  title: 'P2P Network',
})

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const contactsStore = useContactsStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

// Tab navigation
const tabs = [
  { label: 'Overview', slot: 'overview', icon: 'i-lucide-home' },
  { label: 'Signers', slot: 'signers', icon: 'i-lucide-users' },
  { label: 'Sessions', slot: 'sessions', icon: 'i-lucide-layers' },
  { label: 'Requests', slot: 'requests', icon: 'i-lucide-inbox' },
]

const selectedTab = ref((route.query.tab as string) || 'overview')

watch(selectedTab, tab => {
  router.replace({ query: { tab } })
})

// Modal state
const showSignerDetail = ref(false)
const showSessionDetail = ref(false)
const showSigningRequestModal = ref(false)
const selectedSigner = ref<DiscoveredSigner | null>(null)
const selectedSession = ref<WalletSigningSession | null>(null)
const signerForRequest = ref<typeof mappedSigners.value[0] | null>(null)

// Connection state for hero card
const connectionState = computed(() => {
  switch (p2pStore.connectionState) {
    case P2PConnectionState.DISCONNECTED:
      return 'disconnected'
    case P2PConnectionState.CONNECTING:
    case P2PConnectionState.RECONNECTING:
      return 'connecting'
    case P2PConnectionState.CONNECTED:
    case P2PConnectionState.DHT_INITIALIZING:
      return 'connected'
    case P2PConnectionState.DHT_READY:
      return 'dht_ready'
    case P2PConnectionState.FULLY_OPERATIONAL:
      return 'fully_operational'
    case P2PConnectionState.ERROR:
      return 'error'
    default:
      return 'disconnected'
  }
})

// Computed data for tabs - map WalletSigningSession to component-expected format
const incomingRequests = computed(() => {
  // Map from store sessions that are pending and we're not the initiator
  return musig2Store.pendingSessions
    .filter(s => !s.isInitiator)
    .map(s => ({
      id: s.id,
      fromPeerId: s.coordinatorPeerId,
      fromNickname: undefined,
      amount: '0',
      transactionType: 'spend',
      timestamp: s.createdAt,
    }))
})

const outgoingRequests = computed(() => {
  // Map from store sessions that are pending and we are the initiator
  return musig2Store.pendingSessions
    .filter(s => s.isInitiator)
    .map(s => ({
      id: s.id,
      toPeerId: s.participants[0]?.peerId || '',
      toNickname: undefined,
      amount: '0',
      transactionType: 'spend',
      status: 'pending' as const,
      timestamp: s.createdAt,
    }))
})

// Map signers for SignerList component (adapts DiscoveredSigner to expected format)
const mappedSigners = computed(() => {
  return musig2Store.discoveredSigners.map(s => ({
    id: s.id,
    peerId: s.peerId,
    multiaddrs: [] as string[],
    publicKeyHex: s.publicKey,
    nickname: s.nickname,
    reputation: s.reputation ?? 0,
    transactionTypes: Object.entries(s.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type),
    fee: undefined as number | undefined,
    responseTime: s.responseTime,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000, // 1 hour default
  }))
})

// Map sessions for SessionList component (adapts WalletSigningSession to expected format)
const mappedSessions = computed(() => {
  return musig2Store.activeSessions.map(s => ({
    id: s.id,
    type: 'MuSig2',
    participants: s.participants.map(p => ({
      peerId: p.peerId,
      nickname: undefined,
    })),
    status: _mapSessionStateToStatus(s.state),
    createdAt: s.createdAt,
    amount: undefined,
  }))
})

// Helper to map session state to status
function _mapSessionStateToStatus(state: string): 'pending' | 'in_progress' | 'completed' | 'failed' {
  switch (state) {
    case 'created':
    case 'key_aggregation':
    case 'keys_aggregated':
      return 'pending'
    case 'nonce_exchange':
    case 'nonces_exchanged':
    case 'signing':
      return 'in_progress'
    case 'completed':
      return 'completed'
    case 'failed':
    case 'cancelled':
      return 'failed'
    default:
      return 'pending'
  }
}

// Connect/disconnect handlers
async function handleConnect() {
  try {
    await p2pStore.initialize()
    await p2pStore.connect()
  } catch (err) {
    console.error('Failed to connect:', err)
    toast.add({
      title: 'Connection Failed',
      description: err instanceof Error ? err.message : 'Failed to connect to P2P network',
      color: 'error',
    })
  }
}

async function handleDisconnect() {
  try {
    await p2pStore.disconnect()
  } catch (err) {
    console.error('Failed to disconnect:', err)
  }
}

// Signer handlers
function handleViewSignerDetails(signer: DiscoveredSigner) {
  selectedSigner.value = signer
  showSignerDetail.value = true
}

async function handleSaveAsContact(signer: DiscoveredSigner) {
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

function handleRequestSignature(signer: DiscoveredSigner) {
  // Open the signing request modal with this signer
  const mapped = mappedSigners.value.find(s => s.id === signer.id)
  if (mapped) {
    signerForRequest.value = mapped
    showSigningRequestModal.value = true
  }
  showSignerDetail.value = false
}

function handleSigningRequestSubmit(request: { signerId: string; transactionType: string; amount: number; purpose?: string }) {
  // Request was sent via the modal, refresh sessions
  showSigningRequestModal.value = false
  signerForRequest.value = null
  selectedTab.value = 'sessions'
}

// Session handlers
function handleViewSession(session: WalletSigningSession) {
  selectedSession.value = session
  showSessionDetail.value = true
}

async function handleAbortSession(sessionId: string) {
  try {
    await musig2Store.abortSession(sessionId, 'User cancelled')
    toast.add({
      title: 'Session Aborted',
      description: 'The signing session has been cancelled',
      color: 'warning',
    })
    showSessionDetail.value = false
  } catch (err) {
    toast.add({
      title: 'Failed to Abort Session',
      description: err instanceof Error ? err.message : 'Unknown error',
      color: 'error',
    })
  }
}

// Request handlers
async function handleAcceptRequest(request: { id: string }) {
  try {
    await musig2Store.acceptRequest(request.id)
    toast.add({
      title: 'Request Accepted',
      description: 'You have accepted the signing request',
      color: 'success',
    })
  } catch (err) {
    console.error('Failed to accept request:', err)
    toast.add({
      title: 'Accept Failed',
      description: err instanceof Error ? err.message : 'Failed to accept request',
      color: 'error',
    })
  }
}

async function handleRejectRequest(request: { id: string }) {
  try {
    await musig2Store.rejectRequest(request.id)
    toast.add({
      title: 'Request Rejected',
      description: 'You have declined the signing request',
      color: 'warning',
    })
  } catch (err) {
    console.error('Failed to reject request:', err)
    toast.add({
      title: 'Reject Failed',
      description: err instanceof Error ? err.message : 'Failed to reject request',
      color: 'error',
    })
  }
}

async function handleCancelRequest(request: { id: string }) {
  try {
    await musig2Store.cancelRequest(request.id)
    toast.add({
      title: 'Request Cancelled',
      description: 'Your signing request has been cancelled',
      color: 'warning',
    })
  } catch (err) {
    console.error('Failed to cancel request:', err)
    toast.add({
      title: 'Cancel Failed',
      description: err instanceof Error ? err.message : 'Failed to cancel request',
      color: 'error',
    })
  }
}

// View request details
function handleViewRequestDetails(request: { id: string }) {
  // Navigate to requests tab with the request selected
  selectedTab.value = 'requests'
  // Could also open a modal here
}

// Refresh signers
async function handleRefreshSigners() {
  await musig2Store.refreshSigners()
}

// Quick action handlers
function handleBecomeSigner() {
  navigateTo('/settings/advertise?from=/people/p2p')
}

function handleCreateSharedWallet() {
  navigateTo('/people/shared-wallets?action=create')
}

function handleJoinCoinjoin() {
  // TODO: Implement CoinJoin flow
  toast.add({
    title: 'Coming Soon',
    description: 'CoinJoin functionality is under development',
    color: 'info',
  })
}

// ============================================================================
// Phase 7: Lifecycle Hooks and Watchers
// ============================================================================

/**
 * Phase 7.1.1 & 7.1.3: Auto-refresh signers on page load
 * When the page mounts, check if P2P and MuSig2 are ready and trigger discovery
 */
onMounted(async () => {
  console.log('[P2P Page] Mounted, checking initialization state')

  if (p2pStore.initialized && p2pStore.dhtReady) {
    // P2P is ready, ensure MuSig2 is initialized and refresh
    if (!musig2Store.initialized) {
      console.log('[P2P Page] Initializing MuSig2...')
      try {
        await musig2Store.initialize()
      } catch (err) {
        console.error('[P2P Page] Failed to initialize MuSig2:', err)
      }
    }

    if (musig2Store.initialized) {
      // Start subscription for real-time updates
      try {
        await musig2Store.startSignerSubscription()
        console.log('[P2P Page] Signer subscription started')
      } catch (err) {
        console.warn('[P2P Page] Failed to start signer subscription:', err)
      }

      // Refresh signers from cache
      try {
        await musig2Store.refreshSigners()
        console.log('[P2P Page] Initial signer refresh complete')
      } catch (err) {
        console.warn('[P2P Page] Failed to refresh signers:', err)
      }
    }
  }
})

/**
 * Phase 7.1.3: Cleanup on unmount
 */
onUnmounted(() => {
  console.log('[P2P Page] Unmounted')
  // Note: We keep the subscription running for background updates
  // The subscription is managed by the store and persists across page navigations
})

/**
 * Phase 7.1.2: Watch for P2P becoming ready and trigger discovery
 * This handles the case where P2P becomes ready after the page loads
 */
watch(
  () => p2pStore.dhtReady,
  async (ready, wasReady) => {
    if (ready && !wasReady) {
      console.log('[P2P Page] DHT became ready, triggering discovery')

      // Ensure MuSig2 is initialized
      if (!musig2Store.initialized) {
        try {
          await musig2Store.initialize()
        } catch (err) {
          console.error('[P2P Page] Failed to initialize MuSig2:', err)
          return
        }
      }

      // Start subscription and refresh
      try {
        await musig2Store.startSignerSubscription()
        await musig2Store.refreshSigners()
        console.log('[P2P Page] Discovery triggered after DHT ready')
      } catch (err) {
        console.warn('[P2P Page] Failed to trigger discovery:', err)
      }
    }
  },
)

/**
 * Phase 7.1.2: Watch for MuSig2 initialization
 * This handles the case where MuSig2 initializes after the page loads
 */
watch(
  () => musig2Store.initialized,
  async initialized => {
    if (initialized && p2pStore.dhtReady) {
      console.log('[P2P Page] MuSig2 initialized, starting subscription')
      try {
        await musig2Store.startSignerSubscription()
        await musig2Store.refreshSigners()
      } catch (err) {
        console.warn('[P2P Page] Failed to start subscription after MuSig2 init:', err)
      }
    }
  },
)
</script>

<template>
  <div class="space-y-6">
    <!-- Hero Card with Connection Status and Presence Toggle -->
    <div class="flex items-start gap-4">
      <div class="flex-1">
        <P2pHeroCard :connection-state="connectionState" :peer-count="p2pStore.peerCount" :dht-ready="p2pStore.dhtReady"
          @connect="handleConnect" @disconnect="handleDisconnect" />
      </div>
      <P2pPresenceToggle v-if="p2pStore.connected" class="flex-shrink-0" />
    </div>

    <!-- Onboarding Card (when not connected) -->
    <P2pOnboardingCard v-if="!p2pStore.connected" />

    <!-- Connected State Content with Tabs -->
    <template v-if="p2pStore.connected">
      <UTabs v-model="selectedTab" :items="tabs" class="w-full">
        <!-- Overview Tab -->
        <template #overview>
          <div class="space-y-6 pt-4">
            <!-- Phase 7.2.2: Network Status -->
            <CommonNetworkStatus variant="detailed" :show-debug="false" />

            <!-- Quick Actions -->
            <P2pQuickActions @become-signer="handleBecomeSigner" @create-shared-wallet="handleCreateSharedWallet"
              @join-coinjoin="handleJoinCoinjoin" />

            <!-- Connected Peers -->
            <UiAppCard title="Connected Peers" icon="i-lucide-users">
              <template #header-badge>
                <UBadge v-if="p2pStore.connectedPeers.length" color="success" variant="subtle" size="sm">
                  {{ p2pStore.connectedPeers.length }}
                </UBadge>
              </template>
              <template v-if="p2pStore.connectedPeers.length > 0">
                <P2pPeerGrid :peers="p2pStore.connectedPeers" />
              </template>
              <UiAppEmptyState v-else icon="i-lucide-users" title="No peers connected"
                description="Waiting for peers to connect..." />
            </UiAppCard>

            <!-- Activity Feed -->
            <UiAppCard title="Activity" icon="i-lucide-activity">
              <template v-if="p2pStore.recentActivity.length > 0">
                <CommonActivityFeed :events="p2pStore.recentActivity" />
              </template>
              <UiAppEmptyState v-else icon="i-lucide-activity" title="No activity yet"
                description="P2P events will appear here" />
            </UiAppCard>
          </div>
        </template>

        <!-- Signers Tab -->
        <template #signers>
          <div class="pt-4">
            <P2pSignerList :signers="mappedSigners" :loading="musig2Store.loading"
              @view-details="handleViewSignerDetails" @save-contact="handleSaveAsContact"
              @request-sign="handleRequestSignature" @refresh="handleRefreshSigners" />
          </div>
        </template>

        <!-- Sessions Tab -->
        <template #sessions>
          <div class="pt-4">
            <P2pSessionList :sessions="mappedSessions" @view="handleViewSession" @abort="handleAbortSession" />
          </div>
        </template>

        <!-- Requests Tab -->
        <template #requests>
          <div class="pt-4">
            <P2pRequestList :incoming="incomingRequests" :outgoing="outgoingRequests" @accept="handleAcceptRequest"
              @reject="handleRejectRequest" @cancel="handleCancelRequest" />
          </div>
        </template>
      </UTabs>
    </template>

    <!-- Disconnected State -->
    <UiAppCard v-else title="Get Started" icon="i-lucide-info">
      <div class="text-center py-4">
        <p class="text-muted mb-4">
          Connect to the P2P network to collaborate with other wallets for multi-signature transactions.
        </p>
        <UButton color="primary" icon="i-lucide-wifi" @click="handleConnect">
          Connect to Network
        </UButton>
      </div>
    </UiAppCard>

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
    } : null" @update:open="showSignerDetail = $event" @save-contact="handleSaveAsContact(selectedSigner!)">
      <template #primary-action>
        <UButton color="primary" variant="outline" icon="i-lucide-pen-tool"
          @click="handleRequestSignature(selectedSigner!)">
          Request Signature
        </UButton>
        <UButton color="primary" icon="i-lucide-wallet"
          @click="navigateTo({ path: '/people/shared-wallets', query: { action: 'create', signerId: selectedSigner?.id } }); showSignerDetail = false">
          Create Shared Wallet
        </UButton>
      </template>
    </CommonSignerDetailModal>

    <!-- Session Detail Modal -->
    <P2pSessionDetailModal v-model="showSessionDetail" :session="selectedSession" @abort="handleAbortSession" />

    <!-- Signing Request Modal -->
    <P2pSigningRequestModal v-if="signerForRequest" v-model:open="showSigningRequestModal" :signer="signerForRequest"
      @submit="handleSigningRequestSubmit" @cancel="showSigningRequestModal = false; signerForRequest = null" />
  </div>
</template>
