<script setup lang="ts">
/**
 * Shared Wallet Detail Page
 *
 * Phase 5: Enhanced with offline viewing and n-of-n participant status.
 * - Wallet details viewable without P2P connection
 * - Spending requires all n participants to be online (n-of-n)
 * - Multi-signal online status detection for participants
 */
import { useMuSig2Store, type SharedWalletParticipant } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'

definePageMeta({
  title: 'Shared Wallet',
})

const route = useRoute()
const router = useRouter()
const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()
const contactsStore = useContactsStore()
const identityStore = useIdentityStore()

// Constants for online status detection
const RECENTLY_ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

// Get wallet ID from route
const walletId = computed(() => route.params.id as string)

// Find the wallet
const wallet = computed(() =>
  musig2Store.sharedWallets.find(w => w.id === walletId.value)
)

const toast = useToast()

// Tab navigation
const tabs = [
  { label: 'Overview', slot: 'overview', icon: 'i-lucide-home' },
  { label: 'Activity', slot: 'activity', icon: 'i-lucide-activity' },
  { label: 'Participants', slot: 'participants', icon: 'i-lucide-users' },
  { label: 'Settings', slot: 'settings', icon: 'i-lucide-settings' },
]

const selectedTab = ref((route.query.tab as string) || 'overview')

watch(selectedTab, tab => {
  router.replace({ query: { ...route.query, tab } })
})

// Modal state
const showFundModal = ref(false)
const showSpendModal = ref(false)
const showDeleteConfirm = ref(false)

// Loading state
const loading = ref(false)

// ============================================================================
// Participant Status (Phase 5 - Multi-signal detection)
// ============================================================================

type ParticipantStatus = 'online' | 'recently_online' | 'offline'

/**
 * Get detailed online status for a participant using multiple signals
 */
function getParticipantStatus(participant: SharedWalletParticipant): ParticipantStatus {
  // Self is always online
  if (participant.isMe) return 'online'

  // Signal 1: Direct P2P connection
  if (participant.peerId) {
    if (p2pStore.connectedPeers.some(p => p.peerId === participant.peerId)) {
      return 'online'
    }
  }

  // Signal 2: Identity presence
  const identity = identityStore.get(participant.publicKeyHex)
  if (identity?.isOnline) {
    return 'online'
  }

  // Signal 3: Contact lastSeenOnline
  const contact = contactsStore.findByPublicKey(participant.publicKeyHex)
  if (contact) {
    const contactIdentity = contact.identityId
      ? identityStore.get(contact.identityId)
      : null

    if (contactIdentity?.lastSeenAt) {
      const timeSinceLastSeen = Date.now() - contactIdentity.lastSeenAt
      if (timeSinceLastSeen < RECENTLY_ONLINE_THRESHOLD) {
        return 'recently_online'
      }
    }
  }

  return 'offline'
}

/**
 * Get status color class for a participant
 */
function getStatusColor(status: ParticipantStatus): string {
  switch (status) {
    case 'online':
      return 'bg-success-500'
    case 'recently_online':
      return 'bg-amber-500'
    case 'offline':
      return 'bg-gray-400'
  }
}

/**
 * Get status label for a participant
 */
function getStatusLabel(status: ParticipantStatus): string {
  switch (status) {
    case 'online':
      return 'Online'
    case 'recently_online':
      return 'Recently Online'
    case 'offline':
      return 'Offline'
  }
}

/**
 * Get display name for participant (contact name or fallback)
 */
function getDisplayName(participant: SharedWalletParticipant): string {
  if (participant.isMe) return 'You'
  if (participant.nickname) return participant.nickname

  const contact = contactsStore.findByPublicKey(participant.publicKeyHex)
  if (contact) return contact.name

  return `Signer ${participant.publicKeyHex.slice(0, 8)}`
}

// ============================================================================
// Offline Viewing & Spend Permissions (Phase 5)
// ============================================================================

/**
 * Can always view wallet details (offline viewing enabled)
 */
const canView = computed(() => true)

/**
 * For n-of-n MuSig2, all participants must be online to spend
 */
const canSpend = computed(() => {
  if (!wallet.value) return false
  if (BigInt(wallet.value.balanceSats || '0') === 0n) return false
  if (!p2pStore.connected) return false
  if (!p2pStore.dhtReady) return false

  // All participants must be online for n-of-n
  const allOnline = wallet.value.participants.every(
    p => p.isMe || getParticipantStatus(p) === 'online'
  )
  return allOnline
})

/**
 * Reason why spending is disabled
 */
const spendDisabledReason = computed(() => {
  if (!wallet.value) return null
  if (BigInt(wallet.value.balanceSats || '0') === 0n) return 'No funds to spend'
  if (!p2pStore.connected) return 'Connect to P2P network to spend'
  if (!p2pStore.dhtReady) return 'Waiting for DHT to initialize...'

  // Check if all n participants are online (n-of-n requirement)
  const offlineParticipants = wallet.value.participants.filter(
    p => !p.isMe && getParticipantStatus(p) !== 'online'
  )

  if (offlineParticipants.length > 0) {
    const names = offlineParticipants.map(p => getDisplayName(p)).join(', ')
    return `Waiting for all participants: ${names} offline`
  }

  return null
})

// Session refresh interval
const sessionRefreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

/**
 * Phase 10 R10.2.3: Sessions for this wallet using store getter
 */
const walletSessions = computed(() => musig2Store.sessionsForWallet(walletId.value))

/**
 * Incoming requests for this wallet
 */
const incomingRequestsForWallet = computed(() =>
  musig2Store.pendingSessions.filter(
    s => !s.isInitiator && s.metadata?.walletId === walletId.value
  )
)

/**
 * Check if any session is in progress
 */
const hasActiveSession = computed(() =>
  walletSessions.value.some(s =>
    s.state === 'nonce_exchange' || s.state === 'signing'
  )
)

// Refresh wallet balance
async function refreshBalance() {
  loading.value = true
  try {
    await musig2Store.refreshSharedWalletBalances()
  } finally {
    loading.value = false
  }
}

// Handle spend proposal
async function handleProposeSpend(proposal: {
  recipient: string
  amount: bigint
  purpose?: string
}) {
  if (!wallet.value) return

  try {
    const { sessionId } = await musig2Store.proposeSpend({
      walletId: wallet.value.id,
      recipient: proposal.recipient,
      amount: proposal.amount,
      fee: 1000n, // Default fee
      purpose: proposal.purpose,
    })

    toast.add({
      title: 'Proposal Submitted',
      description: 'Waiting for other participants to approve',
      color: 'success',
    })

    // Keep modal open to show progress, or close it
    // showSpendModal.value = false
  } catch (err) {
    toast.add({
      title: 'Proposal Failed',
      description: err instanceof Error ? err.message : 'Failed to propose spend',
      color: 'error',
    })
  }
}

// Handle fund completion
function handleFunded() {
  showFundModal.value = false
  refreshBalance()
}

// Delete wallet
async function deleteWallet() {
  if (!wallet.value) return
  musig2Store.deleteSharedWallet(wallet.value.id)
  router.push('/people/shared-wallets')
}

// Redirect if wallet not found
watch(wallet, (w) => {
  if (!w && musig2Store.initialized) {
    router.push('/people/shared-wallets')
  }
}, { immediate: true })

/**
 * Phase 9.4.1: Watch for session state changes
 * Refresh balance when a session completes
 */
watch(
  () => musig2Store.activeSessions,
  (sessions, oldSessions) => {
    // Check if any session for this wallet just completed
    const walletSessionIds = new Set(
      sessions
        .filter(s => s.metadata?.walletId === walletId.value)
        .map(s => s.id)
    )

    for (const session of sessions) {
      if (session.metadata?.walletId !== walletId.value) continue

      // Find the old state of this session
      const oldSession = oldSessions?.find(s => s.id === session.id)

      // If session just completed, refresh balance
      if (session.state === 'completed' && oldSession?.state !== 'completed') {
        console.log('[Wallet Detail] Session completed, refreshing balance')
        refreshBalance()

        toast.add({
          title: 'Transaction Complete',
          description: 'The signing session has completed successfully',
          color: 'success',
        })
      }
    }
  },
  { deep: true }
)

/**
 * Phase 9.4.1: Start session monitoring on mount
 */
onMounted(() => {
  console.log('[Wallet Detail] Mounted, starting session monitoring')

  // Sync sessions periodically while on this page
  if (hasActiveSession.value) {
    sessionRefreshInterval.value = setInterval(() => {
      musig2Store._syncSessionsFromService()
    }, 2000)
  }
})

/**
 * Phase 9.4.1: Cleanup on unmount
 */
onUnmounted(() => {
  if (sessionRefreshInterval.value) {
    clearInterval(sessionRefreshInterval.value)
    sessionRefreshInterval.value = null
  }
})

/**
 * Phase 9.4.1: Start/stop polling based on active sessions
 */
watch(hasActiveSession, (active) => {
  if (active && !sessionRefreshInterval.value) {
    sessionRefreshInterval.value = setInterval(() => {
      musig2Store._syncSessionsFromService()
    }, 2000)
  } else if (!active && sessionRefreshInterval.value) {
    clearInterval(sessionRefreshInterval.value)
    sessionRefreshInterval.value = null
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back Navigation -->
    <div class="flex items-center gap-2">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/people/shared-wallets">
        Back to Wallets
      </UButton>
    </div>

    <!-- Loading State -->
    <UiAppLoadingState v-if="!wallet && !musig2Store.initialized" message="Loading wallet..." />

    <!-- Not Found State -->
    <UiAppEmptyState v-else-if="!wallet" icon="i-lucide-shield-off" title="Wallet Not Found"
      description="This shared wallet doesn't exist or has been removed."
      :action="{ label: 'View All Wallets', to: '/people/shared-wallets' }" />

    <!-- Wallet Detail -->
    <template v-else>
      <!-- Header Card -->
      <UiAppCard>
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-shield" class="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 class="text-xl font-bold">{{ wallet.name }}</h1>
              <p v-if="wallet.description" class="text-sm text-muted">
                {{ wallet.description }}
              </p>
            </div>
          </div>
          <UDropdownMenu :items="[
            [
              { label: 'Refresh Balance', icon: 'i-lucide-refresh-cw', click: refreshBalance },
            ],
            [
              { label: 'Delete Wallet', icon: 'i-lucide-trash-2', click: () => showDeleteConfirm = true },
            ],
          ]">
            <UButton color="neutral" variant="ghost" icon="i-lucide-more-vertical" />
          </UDropdownMenu>
        </div>
      </UiAppCard>

      <!-- Balance Card -->
      <UiAppCard title="Balance" icon="i-lucide-wallet">
        <template #header-action>
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="loading"
            @click="refreshBalance" />
        </template>
        <div class="text-center py-6">
          <CommonAmountDisplay :sats="wallet.balanceSats" show-symbol size="xl" mono />
        </div>
        <div class="flex gap-3">
          <UButton class="flex-1" color="primary" variant="soft" icon="i-lucide-plus" @click="showFundModal = true">
            Fund
          </UButton>
          <UButton
            class="flex-1"
            color="primary"
            icon="i-lucide-send"
            :disabled="!canSpend"
            :title="spendDisabledReason || undefined"
            @click="showSpendModal = true"
          >
            Spend
          </UButton>
        </div>

        <!-- P2P Required Notice for Spending -->
        <UAlert
          v-if="!canSpend && spendDisabledReason"
          color="warning"
          variant="subtle"
          class="mt-4"
          icon="i-lucide-info"
        >
          <template #description>
            {{ spendDisabledReason }}
          </template>
        </UAlert>
      </UiAppCard>

      <!-- Tabbed Content -->
      <UTabs v-model="selectedTab" :items="tabs" class="w-full">
        <!-- Overview Tab -->
        <template #overview>
          <div class="space-y-6 pt-4">
            <!-- Address Card -->
            <UiAppCard title="Shared Address" icon="i-lucide-qr-code">
              <div class="space-y-3">
                <div class="p-3 bg-muted/50 rounded-lg font-mono text-sm break-all">
                  {{ wallet.sharedAddress || 'Address pending...' }}
                </div>
                <div class="flex gap-2">
                  <UButton v-if="wallet.sharedAddress" color="neutral" variant="soft" size="sm" icon="i-lucide-copy"
                    @click="useClipboard().copy(wallet.sharedAddress)">
                    Copy
                  </UButton>
                </div>
              </div>
            </UiAppCard>

            <!-- Quick Participants Preview -->
            <UiAppCard title="Participants" icon="i-lucide-users">
              <template #header-badge>
                <UBadge color="primary" variant="subtle" size="sm">
                  {{ wallet.participants.length }}
                </UBadge>
              </template>
              <template #header-action>
                <UButton color="neutral" variant="ghost" size="xs" @click="selectedTab = 'participants'">
                  View All
                </UButton>
              </template>
              <div class="flex -space-x-2">
                <CommonAvatar v-for="participant in wallet.participants.slice(0, 5)" :key="participant.peerId"
                  :name="participant.nickname || participant.peerId" size="sm"
                  class="ring-2 ring-white dark:ring-gray-800" />
                <div v-if="wallet.participants.length > 5"
                  class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-800">
                  +{{ wallet.participants.length - 5 }}
                </div>
              </div>
            </UiAppCard>

            <!-- Active Sessions Preview -->
            <UiAppCard v-if="walletSessions.length > 0" title="Active Sessions" icon="i-lucide-activity">
              <template #header-action>
                <UButton color="neutral" variant="ghost" size="xs" @click="selectedTab = 'activity'">
                  View All
                </UButton>
              </template>
              <div class="space-y-2">
                <div v-for="session in walletSessions.slice(0, 2)" :key="session.id"
                  class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm">
                  <span class="font-medium">{{ session.state }}</span>
                  <span class="text-muted ml-2">{{ session.participants.length }} participants</span>
                </div>
              </div>
            </UiAppCard>
          </div>
        </template>

        <!-- Activity Tab -->
        <template #activity>
          <div class="pt-4">
            <SharedWalletsWalletActivityFeed :wallet-id="walletId"
              @abort-session="(id) => musig2Store.abortSession(id, 'User cancelled')" />
          </div>
        </template>

        <!-- Participants Tab -->
        <template #participants>
          <div class="pt-4">
            <SharedWalletsParticipantList :participants="wallet.participants" @add-to-contacts="(p) => contactsStore.addContact({
              name: p.nickname || `Participant ${p.peerId.slice(0, 8)}`,
              address: '',
              publicKey: p.publicKeyHex,
              peerId: p.peerId,
            })" />
          </div>
        </template>

        <!-- Settings Tab -->
        <template #settings>
          <div class="space-y-6 pt-4">
            <UiAppCard title="Wallet Settings" icon="i-lucide-settings">
              <div class="space-y-4">
                <div class="flex items-center justify-between py-2">
                  <div>
                    <p class="font-medium">Wallet Name</p>
                    <p class="text-sm text-muted">{{ wallet.name }}</p>
                  </div>
                </div>
                <div v-if="wallet.description" class="flex items-center justify-between py-2">
                  <div>
                    <p class="font-medium">Description</p>
                    <p class="text-sm text-muted">{{ wallet.description }}</p>
                  </div>
                </div>
                <div class="flex items-center justify-between py-2">
                  <div>
                    <p class="font-medium">Created</p>
                    <p class="text-sm text-muted">{{ new Date(wallet.createdAt).toLocaleDateString() }}</p>
                  </div>
                </div>
              </div>
            </UiAppCard>

            <UiAppCard title="Danger Zone" icon="i-lucide-alert-triangle">
              <div class="space-y-4">
                <p class="text-sm text-muted">
                  Deleting this wallet will remove it from your device. Make sure all funds have been withdrawn first.
                </p>
                <UButton color="error" variant="soft" icon="i-lucide-trash-2" @click="showDeleteConfirm = true">
                  Delete Wallet
                </UButton>
              </div>
            </UiAppCard>
          </div>
        </template>
      </UTabs>

      <!-- Fund Modal -->
      <Musig2FundWalletModal v-model:open="showFundModal" :wallet="wallet" @funded="handleFunded" />

      <!-- Spend Modal -->
      <Musig2ProposeSpendModal v-model:open="showSpendModal" :wallet="wallet" @propose="handleProposeSpend" />

      <!-- Delete Confirmation -->
      <UiAppConfirmModal v-model:open="showDeleteConfirm" title="Delete Shared Wallet"
        message="Are you sure you want to remove this shared wallet? This action cannot be undone. Make sure all funds have been withdrawn first."
        confirm-label="Delete" confirm-color="error" @confirm="deleteWallet" />
    </template>
  </div>
</template>
