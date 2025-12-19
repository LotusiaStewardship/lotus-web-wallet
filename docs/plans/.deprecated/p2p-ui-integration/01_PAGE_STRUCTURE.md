# Phase 1: Core P2P Page Structure

## Overview

This phase restructures the P2P page with proper tab navigation and integrates existing scaffolded components. The goal is to create a cohesive P2P hub that surfaces all P2P functionality in an organized manner.

**Priority**: P0 (Critical)
**Estimated Effort**: 1-2 days
**Dependencies**: Phase 33 P2P Services Integration (complete)

---

## Current State

### `pages/people/p2p.vue`

The current page has:

- ✅ HeroCard with connection status
- ✅ OnboardingCard for disconnected state
- ✅ QuickActions when connected
- ✅ PeerGrid for connected peers
- ✅ ActivityFeed for P2P events

Missing:

- ❌ Tab navigation
- ❌ IncomingRequests component (exists but not rendered)
- ❌ SignerList component (exists but not rendered)
- ❌ SessionList component (exists but not rendered)
- ❌ SettingsPanel component (exists but not rendered)
- ❌ Notification badges for pending items

---

## Target Design

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
│  - Overview: Quick actions, peers, activity                         │
│  - Signers: Available signers list                                  │
│  - Sessions: Active signing sessions                                │
│  - Requests: Incoming/outgoing requests                             │
│  - Settings: P2P configuration                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Task 1.1: Add Tab Navigation

Update `pages/people/p2p.vue` to include tab navigation:

```vue
<script setup lang="ts">
import { useP2PStore, P2PConnectionState } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'

definePageMeta({
  title: 'P2P Network',
})

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

// Active tab
const activeTab = ref('overview')

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
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: 'i-lucide-settings',
  },
])

// Incoming requests count
const incomingRequestCount = computed(
  () => musig2Store.incomingRequests?.length || 0,
)

// Connection state mapping
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

// Connect/disconnect handlers
async function handleConnect() {
  try {
    await p2pStore.initialize()
    await p2pStore.connect()
  } catch (err) {
    console.error('Failed to connect:', err)
  }
}

async function handleDisconnect() {
  try {
    await p2pStore.disconnect()
  } catch (err) {
    console.error('Failed to disconnect:', err)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Hero Card with Connection Status -->
    <P2pHeroCard
      :connection-state="connectionState"
      :peer-count="p2pStore.peerCount"
      :dht-ready="p2pStore.dhtReady"
      @connect="handleConnect"
      @disconnect="handleDisconnect"
    />

    <!-- Incoming Requests Banner (when connected and has requests) -->
    <P2pIncomingRequests
      v-if="p2pStore.connected && incomingRequestCount > 0"
      :requests="musig2Store.incomingRequests"
      @accept="handleAcceptRequest"
      @reject="handleRejectRequest"
      @view-details="handleViewRequestDetails"
    />

    <!-- Onboarding Card (when not connected) -->
    <P2pOnboardingCard v-if="!p2pStore.connected" />

    <!-- Connected State Content -->
    <template v-if="p2pStore.connected">
      <!-- Tab Navigation -->
      <div
        class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 overflow-x-auto"
      >
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          :class="
            activeTab === tab.value
              ? 'bg-white dark:bg-gray-700 shadow text-primary'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          "
          @click="activeTab = tab.value"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
          <UBadge
            v-if="tab.badge"
            :color="tab.value === 'requests' ? 'warning' : 'primary'"
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

            <UiAppCard title="Connected Peers" icon="i-lucide-users">
              <template v-if="p2pStore.connectedPeers.length > 0">
                <P2pPeerGrid :peers="p2pStore.connectedPeers" />
              </template>
              <UiAppEmptyState
                v-else
                icon="i-lucide-users"
                title="No peers connected"
                description="Waiting for peers to connect..."
              />
            </UiAppCard>

            <UiAppCard title="Activity" icon="i-lucide-activity">
              <template v-if="p2pStore.activityEvents.length > 0">
                <P2pActivityFeed :events="p2pStore.activityEvents" />
              </template>
              <UiAppEmptyState
                v-else
                icon="i-lucide-activity"
                title="No activity yet"
                description="P2P events will appear here"
              />
            </UiAppCard>
          </div>
        </template>

        <!-- Signers Tab -->
        <template v-else-if="activeTab === 'signers'">
          <P2pSignerList
            :signers="musig2Store.discoveredSigners || []"
            :loading="signersLoading"
            @request-sign="handleRequestSign"
            @save-contact="handleSaveContact"
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
    <UiAppCard v-else title="Get Started" icon="i-lucide-info">
      <div class="text-center py-4">
        <p class="text-muted mb-4">
          Connect to the P2P network to collaborate with other wallets for
          multi-signature transactions.
        </p>
        <UButton color="primary" icon="i-lucide-wifi" @click="handleConnect">
          Connect to Network
        </UButton>
      </div>
    </UiAppCard>
  </div>
</template>
```

### Task 1.2: Add Event Handlers

Add placeholder event handlers that will be implemented in Phase 2:

```typescript
// Signers
const signersLoading = ref(false)

async function handleRefreshSigners() {
  signersLoading.value = true
  try {
    await musig2Store.discoverSigners()
  } finally {
    signersLoading.value = false
  }
}

function handleRequestSign(signer: any) {
  // Phase 2: Open signing request modal
  console.log('Request sign from:', signer)
}

function handleSaveContact(signer: any) {
  // Phase 4: Save signer as contact
  console.log('Save contact:', signer)
}

function handleViewSignerDetails(signer: any) {
  // Phase 4: Open signer detail modal
  console.log('View signer details:', signer)
}

// Sessions
function handleViewSession(session: any) {
  // Phase 3: Open session detail modal
  console.log('View session:', session)
}

async function handleAbortSession(sessionId: string) {
  // Phase 3: Abort session
  await musig2Store.abortSession(sessionId)
}

// Requests
async function handleAcceptRequest(request: any) {
  // Phase 2: Accept signing request
  await musig2Store.acceptRequest(request.id)
}

async function handleRejectRequest(request: any) {
  // Phase 2: Reject signing request
  await musig2Store.rejectRequest(request.id)
}

async function handleCancelRequest(request: any) {
  // Phase 2: Cancel outgoing request
  await musig2Store.cancelRequest(request.id)
}

function handleViewRequestDetails(request: any) {
  // Phase 2: Open request detail modal
  console.log('View request details:', request)
}

// Settings
async function handleTogglePresence(enabled: boolean) {
  if (enabled) {
    await p2pStore.enablePresence({
      walletAddress: walletStore.address,
      nickname: 'Wallet User', // TODO: Get from settings
    })
  } else {
    await p2pStore.disablePresence()
  }
}

function handleConfigureSigner() {
  // Navigate to signer configuration
  navigateTo('/settings/advertise?from=/people/p2p')
}
```

### Task 1.3: Update Store Getters

Ensure the P2P and MuSig2 stores expose the required computed properties:

**`stores/p2p.ts`** - Verify these getters exist:

```typescript
getters: {
  peerCount: (state) => state.connectedPeers.length,
  presenceEnabled: (state) => state.myPresenceConfig !== null,
  recentActivity: (state) => state.activityEvents.slice(0, 10),
}
```

**`stores/musig2.ts`** - Verify these properties exist:

```typescript
state: {
  discoveredSigners: [],
  activeSessions: new Map(),
  incomingRequests: [],
  outgoingRequests: [],
  signerEnabled: false,
  signerConfig: null,
}
```

---

## Checklist

### Page Updates

- [ ] Add tab navigation to `pages/people/p2p.vue`
- [ ] Integrate `P2pIncomingRequests` component
- [ ] Integrate `P2pSignerList` component
- [ ] Integrate `P2pSessionList` component
- [ ] Integrate `P2pRequestList` component
- [ ] Integrate `P2pSettingsPanel` component
- [ ] Add notification badges to tabs

### Store Verification

- [ ] Verify `p2pStore.peerCount` getter
- [ ] Verify `p2pStore.presenceEnabled` getter
- [ ] Verify `musig2Store.discoveredSigners` state
- [ ] Verify `musig2Store.activeSessions` state
- [ ] Verify `musig2Store.incomingRequests` state
- [ ] Verify `musig2Store.outgoingRequests` state

### Event Handlers

- [ ] Add placeholder handlers for all component events
- [ ] Wire up `handleRefreshSigners` to store
- [ ] Wire up `handleTogglePresence` to store

### Testing

- [ ] Tab navigation works correctly
- [ ] Badge counts update reactively
- [ ] All tabs render their content
- [ ] Connection/disconnection still works
- [ ] No console errors

---

## Notes

- This phase focuses on structure only; full functionality comes in later phases
- Placeholder handlers log to console until implemented
- Component props may need adjustment based on actual store data shapes
- Some components may need minor fixes for type alignment

---

_Next: [02_SIGNING_REQUEST_FLOW.md](./02_SIGNING_REQUEST_FLOW.md)_
