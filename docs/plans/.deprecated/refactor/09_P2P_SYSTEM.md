# 09: P2P System

## Overview

This document details the refactoring of the P2P system. The current implementation lacks a clear mental model, has incomplete signing flows, and doesn't show incoming requests.

---

## Current Problems (from P2P_UX_COMPREHENSIVE_ANALYSIS.md)

1. **No mental model** - Users don't understand what P2P is for
2. **Signers without context** - No explanation of why you'd need a signer
3. **No communication** - Can't message peers
4. **Incomplete signing flow** - Just logs to console
5. **Incoming requests not shown** - Component exists but never rendered
6. **No session management** - Can't see active sessions

---

## Target Design

### P2P Hub

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌐 P2P Network                                    [Online ▼] [⚙️]   │
│  Connected with 12 peers • DHT ready                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  🔔 INCOMING REQUEST                                                 │
│  Alice wants you to co-sign a transaction                           │
│  Amount: 1,000 XPI • Type: Spend                                    │
│                                    [View Details]  [Accept]  [Decline]│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  [Discover] [My Sessions] [Requests] [Settings]                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📡 What would you like to do?                                       │
│  ─────────────────────────────────────────────────────────────────  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │
│  │ 🔐 Create   │ │ 🔀 Join     │ │ 🤝 Become   │                    │
│  │ Shared      │ │ CoinJoin    │ │ a Signer    │                    │
│  │ Wallet      │ │             │ │             │                    │
│  └─────────────┘ └─────────────┘ └─────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ✍️ Available Signers (3)                          [Filter ▼]        │
│  ─────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 👤 Alice                              ⭐ 95 rep • Online     │   │
│  │ Spend • CoinJoin • Escrow                                   │   │
│  │ Fee: 0.1 XPI • Avg response: 2s                             │   │
│  │                    [Save Contact]  [Message]  [Request Sign] │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  👥 Online Peers (12)                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  [👤] [👤] [👤] [👤] [👤] [👤] +6 more                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📊 Live Activity                                                    │
│  ─────────────────────────────────────────────────────────────────  │
│  🟢 Alice is now available for signing          2 sec ago           │
│  🟢 Bob connected                               1 min ago           │
│  🔴 Carol went offline                          5 min ago           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Page: p2p.vue

```vue
<!-- pages/p2p.vue -->
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Hero Card -->
    <P2PHeroCard
      :connection-state="p2pStore.connectionState"
      :peer-count="p2pStore.connectedPeers.length"
      :dht-ready="p2pStore.dhtReady"
      @connect="connect"
      @disconnect="disconnect"
    />

    <!-- Incoming Requests (Prominent) -->
    <P2PIncomingRequests
      v-if="musig2Store.incomingRequests.length"
      :requests="musig2Store.incomingRequests"
      @accept="acceptRequest"
      @reject="rejectRequest"
      @view-details="openRequestDetail"
    />

    <!-- First Time Onboarding -->
    <P2POnboardingCard v-if="showOnboarding" @dismiss="dismissOnboarding" />

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabs" />

    <!-- Discover Tab -->
    <template v-if="activeTab === 'discover'">
      <!-- Quick Actions -->
      <P2PQuickActions
        @create-shared-wallet="openCreateSharedWallet"
        @join-coinjoin="openJoinCoinJoin"
        @become-signer="navigateTo('/settings/advertise?from=/p2p')"
      />

      <!-- Available Signers -->
      <P2PSignerList
        :signers="musig2Store.discoveredSigners"
        :loading="signersLoading"
        @request-sign="openSigningRequest"
        @save-contact="saveAsContact"
        @view-details="openSignerDetail"
        @refresh="refreshSigners"
      />

      <!-- Online Peers -->
      <P2PPeerGrid
        :peers="p2pStore.onlinePeers"
        :max-display="8"
        @view-all="openAllPeers"
      />

      <!-- Activity Feed -->
      <P2PActivityFeed :events="p2pStore.activityEvents" :max-events="10" />
    </template>

    <!-- Sessions Tab -->
    <template v-else-if="activeTab === 'sessions'">
      <P2PSessionList
        :sessions="musig2Store.activeSessions"
        @view="openSessionDetail"
        @abort="abortSession"
      />
    </template>

    <!-- Requests Tab -->
    <template v-else-if="activeTab === 'requests'">
      <P2PRequestList
        :incoming="musig2Store.incomingRequests"
        :outgoing="musig2Store.outgoingRequests"
        @accept="acceptRequest"
        @reject="rejectRequest"
        @cancel="cancelRequest"
      />
    </template>

    <!-- Settings Tab -->
    <template v-else-if="activeTab === 'settings'">
      <P2PSettingsPanel
        :presence-enabled="p2pStore.presenceEnabled"
        :signer-enabled="musig2Store.signerEnabled"
        :signer-config="musig2Store.signerConfig"
        @toggle-presence="togglePresence"
        @configure-signer="navigateTo('/settings/advertise?from=/p2p')"
      />
    </template>

    <!-- Modals -->
    <P2PSigningRequestModal
      v-model:open="signingRequestOpen"
      :signer="selectedSigner"
      @submit="submitSigningRequest"
    />

    <P2PSignerDetailModal
      v-model:open="signerDetailOpen"
      :signer="selectedSigner"
      @request-sign="openSigningRequest"
      @save-contact="saveAsContact"
    />

    <P2PSessionDetailModal
      v-model:open="sessionDetailOpen"
      :session="selectedSession"
      @abort="abortSession"
    />

    <P2PCreateSharedWalletModal
      v-model:open="createSharedWalletOpen"
      @create="createSharedWallet"
    />
  </div>
</template>

<script setup lang="ts">
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const contactStore = useContactStore()
const onboardingStore = useOnboardingStore()
const { success, error } = useNotifications()

// State
const activeTab = ref('discover')
const signersLoading = ref(false)

// Modals
const signingRequestOpen = ref(false)
const signerDetailOpen = ref(false)
const sessionDetailOpen = ref(false)
const createSharedWalletOpen = ref(false)
const selectedSigner = ref<SignerAdvertisement | null>(null)
const selectedSession = ref<SigningSession | null>(null)

const tabs = computed(() => [
  { label: 'Discover', value: 'discover', icon: 'i-lucide-search' },
  {
    label: 'Sessions',
    value: 'sessions',
    icon: 'i-lucide-layers',
    badge: musig2Store.activeSessions.size || undefined,
  },
  {
    label: 'Requests',
    value: 'requests',
    icon: 'i-lucide-bell',
    badge: musig2Store.incomingRequests.length || undefined,
  },
  { label: 'Settings', value: 'settings', icon: 'i-lucide-settings' },
])

const showOnboarding = computed(
  () =>
    !onboardingStore.dismissedHints.has('p2p-intro') &&
    p2pStore.connectionState === 'connected',
)

// Connection
async function connect() {
  try {
    await p2pStore.connect()
    await musig2Store.initialize()
    success('Connected', 'You are now connected to the P2P network')
  } catch (e) {
    error('Connection Failed', e.message)
  }
}

async function disconnect() {
  await musig2Store.cleanup()
  await p2pStore.disconnect()
}

// Signers
async function refreshSigners() {
  signersLoading.value = true
  try {
    await musig2Store.refreshSigners()
  } finally {
    signersLoading.value = false
  }
}

function openSigningRequest(signer: SignerAdvertisement) {
  selectedSigner.value = signer
  signingRequestOpen.value = true
}

function openSignerDetail(signer: SignerAdvertisement) {
  selectedSigner.value = signer
  signerDetailOpen.value = true
}

async function submitSigningRequest(request: SigningRequestData) {
  try {
    await musig2Store.sendSigningRequest(selectedSigner.value!.peerId, request)
    success(
      'Request Sent',
      `Signing request sent to ${selectedSigner.value!.nickname || 'signer'}`,
    )
    signingRequestOpen.value = false
  } catch (e) {
    error('Request Failed', e.message)
  }
}

// Contacts
function saveAsContact(signer: SignerAdvertisement) {
  const { publicKeyToAddress } = useAddress()
  const address = publicKeyToAddress(signer.publicKeyHex)

  if (!address) {
    error('Error', 'Could not derive address from public key')
    return
  }

  contactStore.addContact({
    name: signer.nickname || 'Anonymous Signer',
    address,
    publicKey: signer.publicKeyHex,
    peerId: signer.peerId,
    signerCapabilities: {
      transactionTypes: signer.transactionTypes,
      amountRange: signer.amountRange,
      fee: signer.fee,
    },
    tags: ['signer'],
    isFavorite: false,
  })

  success('Contact Saved', `${signer.nickname || 'Signer'} added to contacts`)
}

// Requests
async function acceptRequest(request: IncomingSigningRequest) {
  try {
    await musig2Store.acceptRequest(request.id)
    success('Request Accepted', 'You have joined the signing session')
  } catch (e) {
    error('Accept Failed', e.message)
  }
}

async function rejectRequest(request: IncomingSigningRequest) {
  try {
    await musig2Store.rejectRequest(request.id)
  } catch (e) {
    error('Reject Failed', e.message)
  }
}

// Sessions
function openSessionDetail(session: SigningSession) {
  selectedSession.value = session
  sessionDetailOpen.value = true
}

async function abortSession(sessionId: string) {
  try {
    await musig2Store.abortSession(sessionId, 'User cancelled')
  } catch (e) {
    error('Abort Failed', e.message)
  }
}

// Presence
async function togglePresence(enabled: boolean) {
  if (enabled) {
    await p2pStore.enablePresence({
      nickname: 'Wallet User', // TODO: Get from settings
    })
  } else {
    await p2pStore.disablePresence()
  }
}

// Onboarding
function dismissOnboarding() {
  onboardingStore.dismissHint('p2p-intro')
}

// Shared Wallet
function openCreateSharedWallet() {
  createSharedWalletOpen.value = true
}

async function createSharedWallet(config: CreateSharedWalletConfig) {
  try {
    const wallet = await musig2Store.createSharedWallet(config)
    success('Shared Wallet Created', `${config.name} is ready to use`)
    createSharedWalletOpen.value = false
  } catch (e) {
    error('Creation Failed', e.message)
  }
}

// Initialize on mount if already connected
onMounted(async () => {
  if (p2pStore.connectionState === 'connected' && !musig2Store.initialized) {
    await musig2Store.initialize()
  }
})
</script>
```

---

## Component: P2PHeroCard.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  connectionState: P2PConnectionState
  peerCount: number
  dhtReady: boolean
}>()

const emit = defineEmits<{
  connect: []
  disconnect: []
}>()

const isConnected = computed(() =>
  ['connected', 'dht_ready', 'fully_operational'].includes(
    props.connectionState,
  ),
)

const isConnecting = computed(() => props.connectionState === 'connecting')

const statusText = computed(() => {
  if (isConnecting.value) return 'Connecting...'
  if (!isConnected.value) return 'Disconnected'
  if (!props.dhtReady) return 'Initializing DHT...'
  return `Connected with ${props.peerCount} peers`
})

const statusColor = computed(() => {
  if (isConnecting.value) return 'warning'
  if (!isConnected.value) return 'neutral'
  return 'success'
})
</script>

<template>
  <AppHeroCard
    icon="i-lucide-globe"
    title="P2P Network"
    :subtitle="statusText"
    gradient
  >
    <template #icon>
      <div class="relative">
        <div
          class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
        >
          <UIcon name="i-lucide-globe" class="w-8 h-8 text-primary" />
        </div>
        <span
          v-if="isConnected"
          class="absolute -bottom-1 -right-1 flex h-4 w-4"
        >
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"
          ></span>
          <span
            class="relative inline-flex rounded-full h-4 w-4 bg-success-500"
          ></span>
        </span>
      </div>
    </template>

    <template #actions>
      <div class="flex justify-center gap-3 mt-4">
        <UButton
          v-if="!isConnected"
          color="primary"
          icon="i-lucide-wifi"
          :loading="isConnecting"
          @click="emit('connect')"
        >
          Connect
        </UButton>
        <template v-else>
          <UBadge :color="statusColor" variant="subtle" size="lg">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-current"></span>
              Online
            </span>
          </UBadge>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-wifi-off"
            @click="emit('disconnect')"
          >
            Disconnect
          </UButton>
        </template>
      </div>
    </template>
  </AppHeroCard>
</template>
```

---

## Component: P2PIncomingRequests.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  requests: IncomingSigningRequest[]
}>()

const emit = defineEmits<{
  accept: [request: IncomingSigningRequest]
  reject: [request: IncomingSigningRequest]
  viewDetails: [request: IncomingSigningRequest]
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()
</script>

<template>
  <div class="space-y-3">
    <UCard
      v-for="request in requests"
      :key="request.id"
      class="border-2 border-warning-500"
    >
      <div class="flex items-start gap-4">
        <!-- Icon -->
        <div
          class="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center flex-shrink-0"
        >
          <UIcon name="i-lucide-bell" class="w-6 h-6 text-warning" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-semibold">Incoming Signing Request</p>
            <UBadge color="warning" variant="subtle" size="xs">
              {{ timeAgo(request.timestamp) }}
            </UBadge>
          </div>

          <p class="text-sm text-muted mb-2">
            <span class="font-medium">{{
              request.fromNickname || 'Anonymous'
            }}</span>
            wants you to co-sign a transaction
          </p>

          <div class="flex items-center gap-4 text-sm">
            <span>
              <strong>Amount:</strong> {{ formatXPI(request.amount) }}
            </span>
            <span> <strong>Type:</strong> {{ request.transactionType }} </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2 flex-shrink-0">
          <UButton color="success" size="sm" @click="emit('accept', request)">
            Accept
          </UButton>
          <UButton
            color="error"
            variant="outline"
            size="sm"
            @click="emit('reject', request)"
          >
            Decline
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="emit('viewDetails', request)"
          >
            Details
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
```

---

## Component: P2POnboardingCard.vue

```vue
<script setup lang="ts">
const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <UCard
    class="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
  >
    <div class="flex items-start gap-4">
      <div
        class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
      >
        <UIcon name="i-lucide-info" class="w-6 h-6 text-primary" />
      </div>

      <div class="flex-1">
        <h3 class="font-semibold mb-2">Welcome to P2P Network</h3>
        <p class="text-sm text-muted mb-4">
          The P2P network lets you connect with other Lotus wallets for:
        </p>

        <ul class="text-sm space-y-2 mb-4">
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="w-4 h-4 text-primary" />
            <span
              ><strong>Shared Wallets</strong> - Create multi-signature wallets
              with friends</span
            >
          </li>
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-shuffle" class="w-4 h-4 text-primary" />
            <span
              ><strong>CoinJoin</strong> - Enhance privacy by mixing
              transactions</span
            >
          </li>
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-lock" class="w-4 h-4 text-primary" />
            <span
              ><strong>Escrow</strong> - Secure transactions with trusted
              signers</span
            >
          </li>
        </ul>

        <div class="flex gap-2">
          <UButton color="primary" size="sm" to="/docs/p2p">
            Learn More
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emit('dismiss')"
          >
            Got it
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
```

---

## Component: P2PSignerList.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  signers: SignerAdvertisement[]
  loading: boolean
}>()

const emit = defineEmits<{
  requestSign: [signer: SignerAdvertisement]
  saveContact: [signer: SignerAdvertisement]
  viewDetails: [signer: SignerAdvertisement]
  refresh: []
}>()

// Filters
const selectedTxType = ref<TransactionType | null>(null)

const filteredSigners = computed(() => {
  if (!selectedTxType.value) return props.signers
  return props.signers.filter(s =>
    s.transactionTypes.includes(selectedTxType.value!),
  )
})

const txTypeOptions = [
  { label: 'All Types', value: null },
  { label: 'Spend', value: TransactionType.SPEND },
  { label: 'CoinJoin', value: TransactionType.COINJOIN },
  { label: 'Escrow', value: TransactionType.ESCROW },
  { label: 'Swap', value: TransactionType.SWAP },
]
</script>

<template>
  <AppCard title="Available Signers" icon="i-lucide-pen-tool">
    <template #header-badge>
      <UBadge color="success" variant="subtle" size="sm">
        {{ filteredSigners.length }}
      </UBadge>
    </template>

    <template #header-action>
      <div class="flex items-center gap-2">
        <USelectMenu
          v-model="selectedTxType"
          :items="txTypeOptions"
          value-key="value"
          size="xs"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="emit('refresh')"
        />
      </div>
    </template>

    <div v-if="filteredSigners.length" class="divide-y divide-default -mx-4">
      <P2PSignerCard
        v-for="signer in filteredSigners"
        :key="signer.id"
        :signer="signer"
        @request-sign="emit('requestSign', signer)"
        @save-contact="emit('saveContact', signer)"
        @view-details="emit('viewDetails', signer)"
      />
    </div>

    <AppLoadingState v-else-if="loading" message="Discovering signers..." />

    <AppEmptyState
      v-else
      icon="i-lucide-users"
      title="No signers found"
      description="No signers are currently available. Try again later or become a signer yourself!"
      :action="{
        label: 'Become a Signer',
        to: '/settings/advertise?from=/p2p',
      }"
    />
  </AppCard>
</template>
```

---

## Component: P2PSignerCard.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  signer: SignerAdvertisement
}>()

const emit = defineEmits<{
  requestSign: []
  saveContact: []
  viewDetails: []
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()
const contactStore = useContactStore()

const isContact = computed(
  () => contactStore.findByPeerId(props.signer.peerId) !== undefined,
)

const txTypeLabels = computed(() =>
  props.signer.transactionTypes.map(t => {
    const labels: Record<TransactionType, string> = {
      [TransactionType.SPEND]: 'Spend',
      [TransactionType.SWAP]: 'Swap',
      [TransactionType.COINJOIN]: 'CoinJoin',
      [TransactionType.CUSTODY]: 'Custody',
      [TransactionType.ESCROW]: 'Escrow',
      [TransactionType.CHANNEL]: 'Channel',
    }
    return labels[t]
  }),
)
</script>

<template>
  <div class="px-4 py-4 hover:bg-muted/50 transition-colors">
    <div class="flex items-start gap-3">
      <!-- Avatar -->
      <ContactAvatar
        :name="signer.nickname"
        size="md"
        class="ring-2 ring-success-500"
      />

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium">{{ signer.nickname || 'Anonymous' }}</p>
          <UBadge
            v-if="signer.reputation"
            color="warning"
            variant="subtle"
            size="xs"
          >
            ⭐ {{ signer.reputation }}
          </UBadge>
          <UBadge color="success" variant="subtle" size="xs"> Online </UBadge>
        </div>

        <div class="flex flex-wrap gap-1 mb-2">
          <UBadge
            v-for="type in txTypeLabels"
            :key="type"
            color="neutral"
            variant="outline"
            size="xs"
          >
            {{ type }}
          </UBadge>
        </div>

        <p class="text-sm text-muted">
          Fee: {{ signer.fee ? formatXPI(signer.fee) : 'Free' }}
          <span v-if="signer.responseTime">
            • Avg response: {{ signer.responseTime }}s
          </span>
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <UButton
          v-if="!isContact"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-user-plus"
          @click="emit('saveContact')"
        />
        <UButton
          color="primary"
          size="sm"
          icon="i-lucide-pen-tool"
          @click="emit('requestSign')"
        >
          Request
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-chevron-right"
          @click="emit('viewDetails')"
        />
      </div>
    </div>
  </div>
</template>
```

---

_Next: [10_MUSIG2_SYSTEM.md](./10_MUSIG2_SYSTEM.md)_
