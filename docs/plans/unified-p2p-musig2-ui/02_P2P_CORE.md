# Phase 2: P2P Core Integration

## Overview

This phase implements the core P2P page functionality, including tab navigation, signer discovery, presence management, and activity feed enhancements. The P2P page becomes the central hub for peer-to-peer collaboration.

**Priority**: P0 (Critical)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1 Foundation

---

## Objectives

1. Restructure P2P page with tab navigation
2. Integrate signer discovery and display
3. Implement presence toggle and status
4. Enhance activity feed with meaningful events
5. Add signer detail modal

---

## Task 2.1: P2P Page Tab Structure

Restructure `pages/people/p2p.vue` with proper tab navigation.

### Target Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌐 P2P Network                              [Online ▼] [⚙️]         │
│  Connected with 12 peers • DHT ready                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  🔔 INCOMING REQUEST (if any)                                       │
│  Alice wants you to co-sign a transaction                           │
│                                    [View Details]  [Accept]  [Decline]│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  [Overview] [Signers (3)] [Sessions (1)] [Requests (2)] [Settings]  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Tab Content Area                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation: `pages/people/p2p.vue`

```vue
<script setup lang="ts">
definePageMeta({
  title: 'P2P Network',
})

const route = useRoute()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const walletStore = useWalletStore()
const { success, error } = useNotifications()

// Active tab (from query or default)
const activeTab = ref((route.query.tab as string) || 'overview')

// Watch for query changes
watch(
  () => route.query.tab,
  newTab => {
    if (newTab) activeTab.value = newTab as string
  },
)

// Tab definitions with badges
const tabs = computed(() => [
  {
    value: 'overview',
    label: 'Overview',
    icon: 'i-lucide-layout-dashboard',
  },
  {
    value: 'signers',
    label: 'Signers',
    icon: 'i-lucide-pen-tool',
    badge: musig2Store.discoveredSigners?.length || undefined,
  },
  {
    value: 'sessions',
    label: 'Sessions',
    icon: 'i-lucide-layers',
    badge: musig2Store.activeSessions?.size || undefined,
  },
  {
    value: 'requests',
    label: 'Requests',
    icon: 'i-lucide-bell',
    badge: incomingRequestCount.value || undefined,
    badgeColor: 'warning',
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: 'i-lucide-settings',
  },
])

// Counts
const incomingRequestCount = computed(
  () => musig2Store.incomingRequests?.length || 0,
)

// Connection state
const isConnected = computed(() => p2pStore.connected)
const isConnecting = computed(() => p2pStore.connecting)
const peerCount = computed(() => p2pStore.connectedPeers?.length || 0)
const dhtReady = computed(() => p2pStore.dhtReady)

// Connect/disconnect handlers
async function handleConnect() {
  try {
    await p2pStore.initialize()
    await p2pStore.connect()
    success('Connected', 'Successfully connected to P2P network')
  } catch (err) {
    error(
      'Connection Failed',
      err instanceof Error ? err.message : 'Failed to connect',
    )
  }
}

async function handleDisconnect() {
  try {
    await p2pStore.disconnect()
    success('Disconnected', 'Disconnected from P2P network')
  } catch (err) {
    error(
      'Disconnect Failed',
      err instanceof Error ? err.message : 'Failed to disconnect',
    )
  }
}

// Signer operations
const signersLoading = ref(false)
const selectedSigner = ref<any>(null)
const showSignerDetailModal = ref(false)
const showSigningRequestModal = ref(false)

async function handleRefreshSigners() {
  signersLoading.value = true
  try {
    await musig2Store.discoverSigners()
  } finally {
    signersLoading.value = false
  }
}

function handleViewSignerDetails(signer: any) {
  selectedSigner.value = signer
  showSignerDetailModal.value = true
}

function handleRequestSign(signer: any) {
  selectedSigner.value = signer
  showSigningRequestModal.value = true
}

async function handleSaveSignerAsContact(signer: any) {
  // Implemented in Phase 5
  console.log('Save signer as contact:', signer)
}

// Session operations
const selectedSession = ref<any>(null)
const showSessionDetailModal = ref(false)

function handleViewSession(session: any) {
  selectedSession.value = session
  showSessionDetailModal.value = true
}

async function handleAbortSession(sessionId: string) {
  try {
    await musig2Store.abortSession(sessionId)
    success('Session Aborted', 'The signing session has been aborted')
  } catch (err) {
    error(
      'Abort Failed',
      err instanceof Error ? err.message : 'Failed to abort session',
    )
  }
}

// Request operations
const selectedRequest = ref<any>(null)
const showRequestDetailModal = ref(false)

function handleViewRequestDetails(request: any) {
  selectedRequest.value = request
  showRequestDetailModal.value = true
}

async function handleAcceptRequest(request: any) {
  try {
    await musig2Store.acceptRequest(request.id)
    success('Request Accepted', 'You have joined the signing session')
    activeTab.value = 'sessions'
  } catch (err) {
    error(
      'Accept Failed',
      err instanceof Error ? err.message : 'Failed to accept request',
    )
  }
}

async function handleRejectRequest(request: any) {
  try {
    await musig2Store.rejectRequest(request.id)
    success('Request Rejected', 'The signing request has been declined')
  } catch (err) {
    error(
      'Reject Failed',
      err instanceof Error ? err.message : 'Failed to reject request',
    )
  }
}

async function handleCancelRequest(request: any) {
  try {
    await musig2Store.cancelRequest(request.id)
    success('Request Cancelled', 'Your signing request has been cancelled')
  } catch (err) {
    error(
      'Cancel Failed',
      err instanceof Error ? err.message : 'Failed to cancel request',
    )
  }
}

// Presence operations
async function handleTogglePresence(enabled: boolean) {
  try {
    if (enabled) {
      await p2pStore.enablePresence({
        walletAddress: walletStore.address,
        nickname: 'Wallet User', // TODO: Get from settings
      })
      success('Presence Enabled', 'You are now visible to other peers')
    } else {
      await p2pStore.disablePresence()
      success('Presence Disabled', 'You are now hidden from other peers')
    }
  } catch (err) {
    error(
      'Presence Error',
      err instanceof Error ? err.message : 'Failed to update presence',
    )
  }
}

function handleConfigureSigner() {
  navigateTo('/settings/advertise?from=/people/p2p')
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 p-4">
    <!-- Hero Card with Connection Status -->
    <P2pHeroCard
      :connected="isConnected"
      :connecting="isConnecting"
      :peer-count="peerCount"
      :dht-ready="dhtReady"
      @connect="handleConnect"
      @disconnect="handleDisconnect"
    />

    <!-- Incoming Requests Banner (prominent when connected and has requests) -->
    <P2pIncomingRequests
      v-if="isConnected && incomingRequestCount > 0"
      :requests="musig2Store.incomingRequests"
      @accept="handleAcceptRequest"
      @reject="handleRejectRequest"
      @view-details="handleViewRequestDetails"
    />

    <!-- Onboarding Card (when not connected) -->
    <P2pOnboardingCard
      v-if="!isConnected && !isConnecting"
      @connect="handleConnect"
    />

    <!-- Connected State Content -->
    <template v-if="isConnected">
      <!-- Tab Navigation -->
      <div class="flex rounded-lg bg-muted/50 p-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          :class="
            activeTab === tab.value
              ? 'bg-background shadow text-primary'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="activeTab = tab.value"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
          <UBadge
            v-if="tab.badge"
            :color="tab.badgeColor || 'primary'"
            variant="solid"
            size="xs"
          >
            {{ tab.badge }}
          </UBadge>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="min-h-[400px]">
        <!-- Overview Tab -->
        <template v-if="activeTab === 'overview'">
          <div class="space-y-6">
            <P2pQuickActions />

            <AppCard title="Connected Peers" icon="i-lucide-users">
              <template v-if="p2pStore.connectedPeers?.length > 0">
                <P2pPeerGrid :peers="p2pStore.connectedPeers" />
              </template>
              <AppEmptyState
                v-else
                icon="i-lucide-users"
                title="No peers connected"
                description="Waiting for peers to connect..."
              />
            </AppCard>

            <AppCard title="Activity" icon="i-lucide-activity">
              <template v-if="p2pStore.activityEvents?.length > 0">
                <P2pActivityFeed
                  :events="p2pStore.activityEvents"
                  :limit="10"
                />
              </template>
              <AppEmptyState
                v-else
                icon="i-lucide-activity"
                title="No activity yet"
                description="P2P events will appear here"
              />
            </AppCard>
          </div>
        </template>

        <!-- Signers Tab -->
        <template v-else-if="activeTab === 'signers'">
          <P2pSignerList
            :signers="musig2Store.discoveredSigners || []"
            :loading="signersLoading"
            @request-sign="handleRequestSign"
            @save-contact="handleSaveSignerAsContact"
            @view-details="handleViewSignerDetails"
            @refresh="handleRefreshSigners"
          />
        </template>

        <!-- Sessions Tab -->
        <template v-else-if="activeTab === 'sessions'">
          <P2pSessionList
            :sessions="Array.from(musig2Store.activeSessions?.values() || [])"
            @view="handleViewSession"
            @abort="handleAbortSession"
          />
        </template>

        <!-- Requests Tab -->
        <template v-else-if="activeTab === 'requests'">
          <P2pRequestList
            :incoming="musig2Store.incomingRequests || []"
            :outgoing="musig2Store.outgoingRequests || []"
            @accept="handleAcceptRequest"
            @reject="handleRejectRequest"
            @cancel="handleCancelRequest"
            @view-details="handleViewRequestDetails"
          />
        </template>

        <!-- Settings Tab -->
        <template v-else-if="activeTab === 'settings'">
          <P2pSettingsPanel
            :presence-enabled="p2pStore.presenceEnabled"
            :signer-enabled="musig2Store.signerEnabled"
            :signer-config="musig2Store.signerConfig"
            @toggle-presence="handleTogglePresence"
            @configure-signer="handleConfigureSigner"
          />
        </template>
      </div>
    </template>

    <!-- Disconnected State -->
    <AppCard v-else-if="!isConnecting" title="Get Started" icon="i-lucide-info">
      <div class="text-center py-4">
        <p class="text-muted-foreground mb-4">
          Connect to the P2P network to collaborate with other wallets for
          multi-signature transactions.
        </p>
        <UButton color="primary" icon="i-lucide-wifi" @click="handleConnect">
          Connect to Network
        </UButton>
      </div>
    </AppCard>

    <!-- Modals -->
    <P2pSignerDetailModal
      v-model:open="showSignerDetailModal"
      :signer="selectedSigner"
      @request-sign="handleRequestSign"
      @save-contact="handleSaveSignerAsContact"
    />

    <P2pSigningRequestModal
      v-model:open="showSigningRequestModal"
      :signer="selectedSigner"
      @submit="handleSubmitSigningRequest"
    />

    <P2pSessionDetailModal
      v-model:open="showSessionDetailModal"
      :session="selectedSession"
      @abort="handleAbortSession"
    />

    <P2pRequestDetailModal
      v-model:open="showRequestDetailModal"
      :request="selectedRequest"
      @accept="handleAcceptRequest"
      @reject="handleRejectRequest"
    />
  </div>
</template>
```

---

## Task 2.2: Signer Detail Modal

Create a detailed view for discovered signers.

### File: `components/p2p/SignerDetailModal.vue`

```vue
<script setup lang="ts">
import type { DiscoveredSigner } from '~/types/musig2'

const props = defineProps<{
  signer: DiscoveredSigner | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  requestSign: [signer: DiscoveredSigner]
  saveContact: [signer: DiscoveredSigner]
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()
const contactStore = useContactStore()

// Check if already a contact
const isContact = computed(() => {
  if (!props.signer?.peerId) return false
  return contactStore.findByPeerId(props.signer.peerId) !== undefined
})

// Transaction type labels
const txTypeLabels: Record<string, string> = {
  spend: 'Spend',
  coinjoin: 'CoinJoin',
  escrow: 'Escrow',
  swap: 'Swap',
  custody: 'Custody',
  channel: 'Channel',
}

// Format amount range
const amountRange = computed(() => {
  if (!props.signer?.amountRange) return null
  const { min, max } = props.signer.amountRange
  return `${formatXPI(BigInt(min))} - ${formatXPI(BigInt(max))}`
})

function handleRequestSign() {
  if (props.signer) {
    emit('requestSign', props.signer)
    open.value = false
  }
}

function handleSaveContact() {
  if (props.signer) {
    emit('saveContact', props.signer)
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center gap-4">
        <div class="relative">
          <ContactsContactAvatar :name="signer?.nickname" size="lg" />
          <span
            class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
            :class="signer?.isOnline ? 'bg-green-500' : 'bg-gray-400'"
          />
        </div>
        <div>
          <h3 class="text-lg font-semibold">
            {{ signer?.nickname || 'Anonymous Signer' }}
          </h3>
          <div class="flex items-center gap-2 mt-1">
            <UBadge
              v-if="signer?.reputation"
              color="warning"
              variant="subtle"
              size="sm"
            >
              ⭐ {{ signer.reputation }} reputation
            </UBadge>
            <UBadge
              :color="signer?.isOnline ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            >
              {{ signer?.isOnline ? '🟢 Online' : '⚫ Offline' }}
            </UBadge>
          </div>
        </div>
      </div>
    </template>

    <div v-if="signer" class="space-y-6 p-4">
      <!-- Capabilities -->
      <div>
        <h4 class="text-sm font-medium text-muted-foreground mb-2">
          Capabilities
        </h4>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="type in signer.transactionTypes"
            :key="type"
            color="primary"
            variant="subtle"
          >
            {{ txTypeLabels[type] || type }}
          </UBadge>
        </div>
      </div>

      <!-- Fee Structure -->
      <div>
        <h4 class="text-sm font-medium text-muted-foreground mb-2">
          Fee Structure
        </h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="p-3 bg-muted/30 rounded-lg">
            <span class="text-muted-foreground">Base Fee</span>
            <p class="font-semibold">
              {{ signer.fee ? formatXPI(BigInt(signer.fee)) : 'Free' }}
            </p>
          </div>
          <div class="p-3 bg-muted/30 rounded-lg">
            <span class="text-muted-foreground">Response Time</span>
            <p class="font-semibold">
              {{ signer.responseTime ? `${signer.responseTime}s` : 'Unknown' }}
            </p>
          </div>
          <div v-if="amountRange" class="p-3 bg-muted/30 rounded-lg col-span-2">
            <span class="text-muted-foreground">Amount Range</span>
            <p class="font-semibold">{{ amountRange }}</p>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div v-if="signer.stats">
        <h4 class="text-sm font-medium text-muted-foreground mb-2">
          Statistics
        </h4>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div class="text-center p-3 bg-muted/30 rounded-lg">
            <p class="text-2xl font-bold text-primary">
              {{ signer.stats.completedSessions || 0 }}
            </p>
            <span class="text-muted-foreground">Completed</span>
          </div>
          <div class="text-center p-3 bg-muted/30 rounded-lg">
            <p class="text-2xl font-bold">
              {{ signer.stats.successRate || 0 }}%
            </p>
            <span class="text-muted-foreground">Success Rate</span>
          </div>
          <div class="text-center p-3 bg-muted/30 rounded-lg">
            <p class="text-sm font-bold text-muted-foreground">
              {{ signer.lastSeen ? timeAgo(signer.lastSeen) : 'Unknown' }}
            </p>
            <span class="text-muted-foreground">Last Seen</span>
          </div>
        </div>
      </div>

      <!-- Peer ID -->
      <div class="p-3 bg-muted/30 rounded-lg">
        <span class="text-xs text-muted-foreground">Peer ID</span>
        <p class="font-mono text-sm truncate">{{ signer.peerId }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <UButton
          v-if="!isContact"
          color="neutral"
          variant="soft"
          @click="handleSaveContact"
        >
          <UIcon name="i-lucide-user-plus" class="w-4 h-4 mr-2" />
          Save as Contact
        </UButton>
        <UBadge v-else color="success" variant="subtle"> ✓ In Contacts </UBadge>

        <UButton
          color="primary"
          :disabled="!signer?.isOnline"
          @click="handleRequestSign"
        >
          <UIcon name="i-lucide-pen-tool" class="w-4 h-4 mr-2" />
          Request Signature
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

---

## Task 2.3: Presence Toggle Component

Create a presence toggle for the P2P settings.

### File: `components/p2p/PresenceToggle.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  enabled: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  toggle: [enabled: boolean]
}>()

const presenceStatus = computed({
  get: () => props.enabled,
  set: value => emit('toggle', value),
})
</script>

<template>
  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center"
        :class="enabled ? 'bg-green-500/10' : 'bg-muted'"
      >
        <UIcon
          :name="enabled ? 'i-lucide-eye' : 'i-lucide-eye-off'"
          class="w-5 h-5"
          :class="enabled ? 'text-green-500' : 'text-muted-foreground'"
        />
      </div>
      <div>
        <p class="font-medium">Presence</p>
        <p class="text-sm text-muted-foreground">
          {{ enabled ? 'Visible to other peers' : 'Hidden from other peers' }}
        </p>
      </div>
    </div>
    <USwitch v-model="presenceStatus" :loading="loading" color="primary" />
  </div>
</template>
```

---

## Task 2.4: Enhanced Activity Feed

Update the activity feed to show more meaningful events.

### File: `components/p2p/ActivityFeed.vue` (update)

```vue
<script setup lang="ts">
interface ActivityEvent {
  id: string
  type:
    | 'peer_connected'
    | 'peer_disconnected'
    | 'signer_discovered'
    | 'request_received'
    | 'session_started'
    | 'session_completed'
    | 'session_failed'
  timestamp: number
  data?: {
    peerId?: string
    nickname?: string
    sessionId?: string
    amount?: bigint
  }
}

const props = defineProps<{
  events: ActivityEvent[]
  limit?: number
}>()

const { timeAgo } = useTime()
const { formatXPI } = useAmount()

const displayEvents = computed(() => {
  const sorted = [...props.events].sort((a, b) => b.timestamp - a.timestamp)
  return props.limit ? sorted.slice(0, props.limit) : sorted
})

// Event configuration
const eventConfig: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  peer_connected: {
    icon: 'i-lucide-user-plus',
    color: 'text-green-500',
    label: 'Peer connected',
  },
  peer_disconnected: {
    icon: 'i-lucide-user-minus',
    color: 'text-gray-500',
    label: 'Peer disconnected',
  },
  signer_discovered: {
    icon: 'i-lucide-search',
    color: 'text-primary',
    label: 'Signer discovered',
  },
  request_received: {
    icon: 'i-lucide-bell',
    color: 'text-warning',
    label: 'Request received',
  },
  session_started: {
    icon: 'i-lucide-play',
    color: 'text-primary',
    label: 'Session started',
  },
  session_completed: {
    icon: 'i-lucide-check-circle',
    color: 'text-green-500',
    label: 'Session completed',
  },
  session_failed: {
    icon: 'i-lucide-x-circle',
    color: 'text-red-500',
    label: 'Session failed',
  },
}

function getEventConfig(type: string) {
  return (
    eventConfig[type] || {
      icon: 'i-lucide-activity',
      color: 'text-muted-foreground',
      label: type,
    }
  )
}

function getEventDescription(event: ActivityEvent): string {
  const config = getEventConfig(event.type)
  const name =
    event.data?.nickname || event.data?.peerId?.slice(0, 8) || 'Unknown'

  switch (event.type) {
    case 'peer_connected':
      return `${name} connected`
    case 'peer_disconnected':
      return `${name} disconnected`
    case 'signer_discovered':
      return `Found signer: ${name}`
    case 'request_received':
      return `${name} sent a signing request`
    case 'session_started':
      return `Signing session started`
    case 'session_completed':
      return event.data?.amount
        ? `Transaction signed: ${formatXPI(event.data.amount)}`
        : 'Transaction signed successfully'
    case 'session_failed':
      return 'Signing session failed'
    default:
      return config.label
  }
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="event in displayEvents"
      :key="event.id"
      class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
    >
      <UIcon
        :name="getEventConfig(event.type).icon"
        class="w-4 h-4 flex-shrink-0"
        :class="getEventConfig(event.type).color"
      />
      <span class="flex-1 text-sm truncate">{{
        getEventDescription(event)
      }}</span>
      <span class="text-xs text-muted-foreground flex-shrink-0">
        {{ timeAgo(event.timestamp) }}
      </span>
    </div>

    <p
      v-if="displayEvents.length === 0"
      class="text-sm text-muted-foreground text-center py-4"
    >
      No activity yet
    </p>
  </div>
</template>
```

---

## Task 2.5: Session Detail Modal

Create a modal for viewing session details.

### File: `components/p2p/SessionDetailModal.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  session: WalletSigningSession | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  abort: [sessionId: string]
}>()

const { formatXPI } = useAmount()
const { formatDateTime } = useTime()
const contactStore = useContactStore()
const p2pStore = useP2PStore()

// Get participant info
const participants = computed(() => {
  if (!props.session) return []
  return props.session.participants.map(p => ({
    ...p,
    contact: contactStore.findByPublicKey(p.publicKeyHex),
    isOnline: p2pStore.isPeerOnline?.(p.peerId) ?? false,
    isMe: p.peerId === p2pStore.peerId,
  }))
})

// Can abort?
const canAbort = computed(() => {
  if (!props.session) return false
  return !['completed', 'failed', 'aborted'].includes(props.session.state)
})

function handleAbort() {
  if (props.session) {
    emit('abort', props.session.id)
    open.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-layers" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">Signing Session</h3>
          <p class="text-sm text-muted-foreground">
            {{ session?.id?.slice(0, 16) }}...
          </p>
        </div>
      </div>
    </template>

    <div v-if="session" class="space-y-6 p-4">
      <!-- Progress -->
      <SharedSigningProgress
        :state="session.state"
        :participants="
          participants.map(p => ({
            id: p.peerId,
            name: p.contact?.name || (p.isMe ? 'You' : 'Unknown'),
            isMe: p.isMe,
            hasNonce: p.hasNonce,
            hasSignature: p.hasSignature,
            isOnline: p.isOnline,
          }))
        "
        :can-abort="canAbort"
        @abort="handleAbort"
      />

      <!-- Session Info -->
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Created</span>
          <span>{{ formatDateTime(session.createdAt) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Expires</span>
          <span>{{ formatDateTime(session.expiresAt) }}</span>
        </div>
        <div v-if="session.isInitiator" class="flex justify-between">
          <span class="text-muted-foreground">Role</span>
          <UBadge color="primary" variant="subtle" size="xs">Initiator</UBadge>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton variant="ghost" @click="open = false">Close</UButton>
        <UButton
          v-if="canAbort"
          color="error"
          variant="soft"
          @click="handleAbort"
        >
          Abort Session
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

---

## Implementation Checklist

### P2P Page

- [ ] Add tab navigation to `pages/people/p2p.vue`
- [ ] Integrate all tab content components
- [ ] Add query param support for tab selection
- [ ] Wire up all event handlers
- [ ] Add modal components to template

### Components

- [ ] Create `SignerDetailModal.vue`
- [ ] Create `SessionDetailModal.vue`
- [ ] Create `PresenceToggle.vue`
- [ ] Update `ActivityFeed.vue` with event types

### Store Verification

- [ ] Verify `p2pStore.connected` getter
- [ ] Verify `p2pStore.connectedPeers` state
- [ ] Verify `p2pStore.activityEvents` state
- [ ] Verify `musig2Store.discoveredSigners` state
- [ ] Verify `musig2Store.activeSessions` state
- [ ] Verify `musig2Store.incomingRequests` state

### Testing

- [ ] Tab navigation works correctly
- [ ] Badge counts update reactively
- [ ] All tabs render their content
- [ ] Connection/disconnection works
- [ ] Signer detail modal opens and displays data
- [ ] Session detail modal opens and displays data
- [ ] Presence toggle works
- [ ] Activity feed shows events

---

## Files to Create/Modify

| File                                    | Action | Description                    |
| --------------------------------------- | ------ | ------------------------------ |
| `pages/people/p2p.vue`                  | Modify | Complete restructure with tabs |
| `components/p2p/SignerDetailModal.vue`  | Create | Signer detail view             |
| `components/p2p/SessionDetailModal.vue` | Create | Session detail view            |
| `components/p2p/PresenceToggle.vue`     | Create | Presence toggle                |
| `components/p2p/ActivityFeed.vue`       | Modify | Enhanced event types           |

---

_Previous: [01_FOUNDATION.md](./01_FOUNDATION.md)_
_Next: [03_MUSIG2_CORE.md](./03_MUSIG2_CORE.md)_
