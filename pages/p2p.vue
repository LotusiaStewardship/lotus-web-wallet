<script setup lang="ts">
import { useP2PStore, type UISignerAdvertisement, type P2PActivityEvent } from '~/stores/p2p'
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'

// Transaction type constants (matching SDK's TransactionType enum values)
const TransactionType = {
  SPEND: 'spend',
  SWAP: 'swap',
  COINJOIN: 'coinjoin',
  CUSTODY: 'custody',
  ESCROW: 'escrow',
  CHANNEL: 'channel',
} as const

definePageMeta({
  title: 'P2P Network',
})

const p2pStore = useP2PStore()
const contactsStore = useContactsStore()
const walletStore = useWalletStore()
const toast = useToast()

// ============================================================================
// State
// ============================================================================

const selectedTxTypeFilter = ref<string>('all')
const searchQuery = ref('')
const connecting = ref(false)

// ============================================================================
// Computed
// ============================================================================

// Quick stats for the dashboard
const quickStats = computed(() => [
  { label: 'Connected Peers', value: p2pStore.peerCount, mono: true },
  { label: 'Available Signers', value: p2pStore.signerCount, mono: true },
  { label: 'Online Wallets', value: p2pStore.onlinePeerCount, mono: true },
  { label: 'DHT Size', value: p2pStore.routingTableSize, mono: true },
])

// Filtered signers based on search and transaction type
const filteredSigners = computed(() => {
  let signers = p2pStore.discoveredSigners

  // Filter by transaction type
  if (selectedTxTypeFilter.value !== 'all') {
    signers = signers.filter((s) =>
      s.transactionTypes.includes(selectedTxTypeFilter.value),
    )
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    signers = signers.filter(
      (s) =>
        s.nickname?.toLowerCase().includes(query) ||
        s.peerId.toLowerCase().includes(query) ||
        s.transactionTypes.some((t: string) => t.toLowerCase().includes(query)),
    )
  }

  // Sort by reputation (highest first)
  return signers.sort((a, b) => b.reputation - a.reputation)
})

// Transaction type filter options
const txTypeFilterOptions = computed(() => [
  { label: 'All Types', value: 'all' },
  ...Object.values(TransactionType).map((t) => ({
    label: t.charAt(0).toUpperCase() + t.slice(1),
    value: t,
  })),
])

// ============================================================================
// Actions
// ============================================================================

// Connect to P2P network
const connect = async () => {
  if (connecting.value || p2pStore.isOnline) return
  connecting.value = true

  try {
    await p2pStore.initialize()
    toast.add({
      title: 'Connected',
      description: 'Successfully connected to the P2P network',
      color: 'success',
      icon: 'i-lucide-wifi',
    })
  } catch (err) {
    toast.add({
      title: 'Connection Failed',
      description: err instanceof Error ? err.message : 'Failed to connect',
      color: 'error',
      icon: 'i-lucide-wifi-off',
    })
  } finally {
    connecting.value = false
  }
}

// Disconnect from P2P network
const disconnect = async () => {
  try {
    await p2pStore.stop()
    toast.add({
      title: 'Disconnected',
      description: 'Disconnected from the P2P network',
      color: 'neutral',
      icon: 'i-lucide-wifi-off',
    })
  } catch (err) {
    toast.add({
      title: 'Error',
      description: err instanceof Error ? err.message : 'Failed to disconnect',
      color: 'error',
    })
  }
}

// Save signer as contact
const saveAsContact = (signer: UISignerAdvertisement) => {
  // For now, just show a toast - full implementation would open a contact form
  toast.add({
    title: 'Coming Soon',
    description: 'Contact saving will be available in a future update',
    color: 'info',
    icon: 'i-lucide-user-plus',
  })
}

// Request signature from signer
const requestSignature = (signer: UISignerAdvertisement) => {
  // For now, just show a toast - full implementation would open signing request modal
  toast.add({
    title: 'Coming Soon',
    description: 'Signature requests will be available in a future update',
    color: 'info',
    icon: 'i-lucide-pen-tool',
  })
}

// Get icon for activity event type
const getActivityIcon = (type: P2PActivityEvent['type']) => {
  switch (type) {
    case 'peer_joined':
      return 'i-lucide-user-plus'
    case 'peer_left':
      return 'i-lucide-user-minus'
    case 'signer_available':
      return 'i-lucide-pen-tool'
    case 'signer_unavailable':
      return 'i-lucide-pen-tool'
    default:
      return 'i-lucide-activity'
  }
}

// Get color for activity event type
const getActivityColor = (type: P2PActivityEvent['type']) => {
  switch (type) {
    case 'peer_joined':
    case 'signer_available':
      return 'text-success-500'
    case 'peer_left':
    case 'signer_unavailable':
      return 'text-error-500'
    default:
      return 'text-muted'
  }
}

// Format relative time
const formatRelativeTime = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Copy to clipboard helper
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: 'Copied',
      description: 'Peer ID copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch {
    toast.add({
      title: 'Copy Failed',
      description: 'Could not copy to clipboard',
      color: 'error',
    })
  }
}

// Initialize on mount
onMounted(async () => {
  // Initialize contacts store
  contactsStore.initialize()

  // Auto-connect if not already connected
  if (!p2pStore.initialized) {
    try {
      await p2pStore.initialize()
    } catch {
      // Error handled by store
    }
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Hero Card -->
    <UCard class="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
      <div class="text-center py-6">
        <div class="relative inline-block mb-4">
          <UIcon name="i-lucide-globe" class="w-16 h-16 text-primary" />
          <span v-if="p2pStore.isOnline" class="absolute -top-1 -right-1 flex h-4 w-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-success-500"></span>
          </span>
        </div>
        <h1 class="text-3xl font-bold mb-2">P2P Network</h1>
        <p class="text-muted">
          <template v-if="p2pStore.isOnline">
            <template v-if="p2pStore.peerCount > 0">
              Connected with {{ p2pStore.peerCount }} peer{{ p2pStore.peerCount !== 1 ? 's' : '' }}
            </template>
            <template v-else-if="p2pStore.dhtReady">
              Network ready, searching for peers...
            </template>
            <template v-else>
              Initializing DHT...
            </template>
          </template>
          <template v-else>
            Connect to start discovering
          </template>
        </p>

        <div class="mt-4 flex justify-center gap-2">
          <UButton v-if="!p2pStore.isOnline" color="primary" size="lg" icon="i-lucide-wifi" :loading="connecting"
            @click="connect">
            Connect to Network
          </UButton>
          <template v-else>
            <UButton color="neutral" variant="outline" icon="i-lucide-wifi-off" @click="disconnect">
              Disconnect
            </UButton>
            <UButton color="primary" icon="i-lucide-pen-tool" to="/settings/advertise">
              Become a Signer
            </UButton>
          </template>
        </div>
      </div>
    </UCard>

    <!-- Quick Stats -->
    <div v-if="p2pStore.isOnline" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UCard v-for="stat in quickStats" :key="stat.label" class="text-center">
        <p class="text-2xl font-bold" :class="stat.mono ? 'font-mono' : ''">
          {{ stat.value }}
        </p>
        <p class="text-sm text-muted">{{ stat.label }}</p>
      </UCard>
    </div>

    <!-- Main Content Grid -->
    <div v-if="p2pStore.isOnline" class="grid md:grid-cols-3 gap-6">
      <!-- Left Column: Activity & Signers -->
      <div class="md:col-span-2 space-y-6">
        <!-- Live Activity Feed -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <span class="relative flex h-3 w-3">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
              </span>
              <span class="font-semibold">Live Activity</span>
            </div>
          </template>

          <div class="space-y-2 max-h-48 overflow-y-auto">
            <template v-if="p2pStore.recentActivity.length">
              <TransitionGroup name="list">
                <div v-for="event in p2pStore.recentActivity" :key="event.id"
                  class="flex items-center gap-3 py-2 text-sm">
                  <UIcon :name="getActivityIcon(event.type)" :class="getActivityColor(event.type)"
                    class="w-4 h-4 flex-shrink-0" />
                  <span class="flex-1 truncate">{{ event.message }}</span>
                  <span class="text-xs text-muted whitespace-nowrap">
                    {{ formatRelativeTime(event.timestamp) }}
                  </span>
                </div>
              </TransitionGroup>
            </template>
            <p v-else class="text-sm text-muted text-center py-4">
              No recent activity
            </p>
          </div>
        </UCard>

        <!-- Available Signers -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-pen-tool" class="w-5 h-5" />
                <span class="font-semibold">Available Signers</span>
                <UBadge color="success" variant="subtle" size="md">
                  {{ filteredSigners.length }}
                </UBadge>
              </div>

              <USelectMenu v-model="selectedTxTypeFilter" :items="txTypeFilterOptions" value-key="value" class="w-32" />
            </div>
          </template>

          <!-- Search -->
          <div class="mb-4">
            <UInput v-model="searchQuery" placeholder="Search signers..." icon="i-lucide-search" />
          </div>

          <!-- Signer List -->
          <div class="divide-y divide-default -mx-4 sm:-mx-6">
            <template v-if="filteredSigners.length">
              <div v-for="signer in filteredSigners" :key="signer.id"
                class="px-4 sm:px-6 py-4 hover:bg-muted/50 transition-colors">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-start gap-3 min-w-0">
                    <!-- Avatar placeholder -->
                    <div
                      class="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-user" class="w-5 h-5 text-success-500" />
                    </div>

                    <div class="min-w-0">
                      <p class="font-semibold truncate">
                        {{ signer.nickname || 'Anonymous' }}
                      </p>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <UBadge v-for="txType in signer.transactionTypes" :key="txType" color="success" variant="subtle"
                          size="md">
                          {{ txType }}
                        </UBadge>
                      </div>
                      <p class="text-xs text-muted mt-1">
                        Fee:
                        {{
                          signer.fee
                            ? `${signer.fee} XPI`
                            : 'Free'
                        }}
                        <span v-if="signer.reputation > 0">
                          • ⭐ {{ signer.reputation }}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div class="flex gap-1 flex-shrink-0">
                    <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-user-plus"
                      @click="saveAsContact(signer)" />
                    <UButton color="success" size="xs" icon="i-lucide-pen-tool" @click="requestSignature(signer)">
                      Request
                    </UButton>
                  </div>
                </div>
              </div>
            </template>
            <p v-else class="px-4 sm:px-6 py-8 text-sm text-muted text-center">
              No signers found matching your criteria
            </p>
          </div>
        </UCard>
      </div>

      <!-- Right Column: Peers & Actions -->
      <div class="space-y-6">
        <!-- Online Peers -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="w-5 h-5" />
              <span class="font-semibold">Online Peers</span>
              <UBadge color="neutral" variant="subtle" size="md">
                {{ p2pStore.onlinePeerCount }}
              </UBadge>
            </div>
          </template>

          <div v-if="p2pStore.onlinePeers.length" class="flex flex-wrap gap-2">
            <UPopover v-for="peer in p2pStore.onlinePeers.slice(0, 12)" :key="peer.peerId" mode="hover">
              <div
                class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center ring-2 ring-success-500 cursor-pointer hover:ring-primary-500 transition-all">
                <UIcon name="i-lucide-user" class="w-5 h-5 text-primary-500" />
              </div>
              <template #content>
                <div class="p-3 space-y-2 min-w-[200px]">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                      <UIcon name="i-lucide-user" class="w-4 h-4 text-primary-500" />
                    </div>
                    <div>
                      <p class="font-semibold text-sm">
                        {{ peer.nickname || 'Anonymous' }}
                      </p>
                      <p class="text-xs text-muted">Online</p>
                    </div>
                  </div>
                  <div class="pt-2 border-t border-default space-y-1">
                    <div class="flex items-center gap-2 text-xs">
                      <UIcon name="i-lucide-fingerprint" class="w-3 h-3 text-muted" />
                      <code class="truncate flex-1">{{ peer.peerId.slice(0, 16) }}...</code>
                    </div>
                    <div v-if="peer.multiaddrs?.length" class="flex items-center gap-2 text-xs">
                      <UIcon name="i-lucide-network" class="w-3 h-3 text-muted" />
                      <span class="text-muted">{{ peer.multiaddrs.length }} address(es)</span>
                    </div>
                  </div>
                  <div class="pt-2 border-t border-default flex gap-1">
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-copy"
                      @click.stop="copyToClipboard(peer.peerId)">
                      Copy ID
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>

            <UButton v-if="p2pStore.onlinePeers.length > 12" color="neutral" variant="ghost" size="sm">
              +{{ p2pStore.onlinePeers.length - 12 }} more
            </UButton>
          </div>
          <!-- Show connected peers if no online presence peers but we have direct connections -->
          <div v-else-if="p2pStore.connectedPeers.length" class="flex flex-wrap gap-2">
            <UPopover v-for="peer in p2pStore.connectedPeers.slice(0, 12)" :key="peer.peerId" mode="hover">
              <div
                class="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900/20 flex items-center justify-center ring-2 ring-neutral-400 cursor-pointer hover:ring-primary-500 transition-all">
                <UIcon name="i-lucide-user" class="w-5 h-5 text-neutral-500" />
              </div>
              <template #content>
                <div class="p-3 space-y-2 min-w-[200px]">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900/20 flex items-center justify-center">
                      <UIcon name="i-lucide-user" class="w-4 h-4 text-neutral-500" />
                    </div>
                    <div>
                      <p class="font-semibold text-sm">Connected Peer</p>
                      <p class="text-xs text-muted">Direct connection</p>
                    </div>
                  </div>
                  <div class="pt-2 border-t border-default space-y-1">
                    <div class="flex items-center gap-2 text-xs">
                      <UIcon name="i-lucide-fingerprint" class="w-3 h-3 text-muted" />
                      <code class="truncate flex-1">{{ peer.peerId.slice(0, 16) }}...</code>
                    </div>
                    <div v-if="peer.multiaddrs?.length" class="flex items-center gap-2 text-xs">
                      <UIcon name="i-lucide-network" class="w-3 h-3 text-muted" />
                      <span class="text-muted truncate">{{ peer.multiaddrs[0] }}</span>
                    </div>
                  </div>
                  <div class="pt-2 border-t border-default flex gap-1">
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-copy"
                      @click.stop="copyToClipboard(peer.peerId)">
                      Copy ID
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>

            <UButton v-if="p2pStore.connectedPeers.length > 12" color="neutral" variant="ghost" size="sm">
              +{{ p2pStore.connectedPeers.length - 12 }} more
            </UButton>
          </div>
          <p v-else class="text-sm text-muted text-center py-4">
            No peers connected yet. DHT is {{ p2pStore.dhtReady ? 'ready' : 'initializing' }}...
          </p>
        </UCard>

        <!-- Quick Actions -->
        <UCard>
          <template #header>
            <span class="font-semibold">Quick Actions</span>
          </template>
          <div class="space-y-2">
            <UButton block color="primary" variant="outline" icon="i-lucide-pen-tool" to="/settings/advertise">
              Become a Signer
            </UButton>
            <UButton block color="neutral" variant="outline" icon="i-lucide-settings" to="/settings/network">
              Network Settings
            </UButton>
            <UButton block color="neutral" variant="outline" icon="i-lucide-sliders" to="/settings/p2p">
              P2P Settings
            </UButton>
          </div>
        </UCard>

        <!-- My Status -->
        <UCard>
          <template #header>
            <span class="font-semibold">My Status</span>
          </template>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm">Wallet Presence</span>
              <UBadge :color="p2pStore.isAdvertisingPresence ? 'success' : 'neutral'" variant="subtle" size="md">
                {{ p2pStore.isAdvertisingPresence ? 'Online' : 'Offline' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">MuSig2 Signer</span>
              <UBadge :color="p2pStore.isAdvertisingSigner ? 'success' : 'neutral'" variant="subtle" size="md">
                {{ p2pStore.isAdvertisingSigner ? 'Active' : 'Inactive' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Peer ID</span>
              <code class="text-xs text-muted">
            {{ p2pStore.peerId ? p2pStore.peerId.slice(0, 12) + '...' : '-' }}
          </code>
            </div>
          </div>
        </UCard>

        <!-- Network Info -->
        <UCard>
          <template #header>
            <span class="font-semibold">Network Info</span>
          </template>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted">DHT Status</span>
              <UBadge :color="p2pStore.dhtReady ? 'success' : 'warning'" variant="subtle" size="md">
                {{ p2pStore.dhtReady ? 'Ready' : 'Initializing' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">Routing Table</span>
              <span class="font-mono">{{ p2pStore.routingTableSize }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">Subscriptions</span>
              <span class="font-mono">{{ p2pStore.activeSubscriptions.size }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Offline State -->
    <UCard v-if="!p2pStore.isOnline && !connecting" class="text-center py-8">
      <UIcon name="i-lucide-wifi-off" class="w-12 h-12 text-muted mx-auto mb-4" />
      <h2 class="text-xl font-semibold mb-2">Not Connected</h2>
      <p class="text-muted mb-4">
        Connect to the P2P network to discover signers and interact with other users.
      </p>
      <UButton color="primary" icon="i-lucide-wifi" @click="connect">
        Connect Now
      </UButton>
    </UCard>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
