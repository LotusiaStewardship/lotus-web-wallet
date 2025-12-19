# Phase 9: P2P Network

## Overview

The P2P network pages need proper onboarding, incoming signing request handling, and session management. This phase makes P2P a comprehensible feature for users.

**Priority**: P2 (Medium)
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 8 (Social), existing P2P components

---

## Goals

1. P2P hub with clear explanation of what P2P is for
2. Incoming signing requests prominently displayed
3. Complete signing request flow (accept/reject)
4. Peer discovery and connection
5. Session management UI
6. P2P activity feed

---

## 1. P2P Hub Page

### File: `pages/people/p2p.vue`

```vue
<script setup lang="ts">
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'

definePageMeta({
  title: 'P2P Network',
})

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

// Tabs
const activeTab = ref('overview')

// Incoming requests
const incomingRequests = computed(() => musig2Store.pendingRequests)

// Connected peers
const connectedPeers = computed(() => p2pStore.connectedPeers)

// P2P status
const isConnected = computed(() => p2pStore.isConnected)
const isConnecting = computed(() => p2pStore.isConnecting)

// Connect/disconnect
async function toggleConnection() {
  if (isConnected.value) {
    await p2pStore.disconnect()
  } else {
    await p2pStore.connect()
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Incoming Requests Banner -->
    <UAlert
      v-if="incomingRequests.length > 0"
      color="warning"
      icon="i-lucide-bell-ring"
    >
      <template #title>
        {{ incomingRequests.length }} Pending Signing Request{{
          incomingRequests.length > 1 ? 's' : ''
        }}
      </template>
      <template #description>
        <p class="mb-2">Someone wants you to co-sign a transaction.</p>
        <UButton color="warning" size="sm" @click="activeTab = 'requests'">
          View Requests
        </UButton>
      </template>
    </UAlert>

    <!-- Header -->
    <AppHeroCard
      icon="i-lucide-globe"
      title="P2P Network"
      subtitle="Connect with other wallets for multi-signature transactions"
    >
      <template #action>
        <UButton
          :color="isConnected ? 'error' : 'primary'"
          :loading="isConnecting"
          @click="toggleConnection"
        >
          <UIcon
            :name="isConnected ? 'i-lucide-wifi-off' : 'i-lucide-wifi'"
            class="w-4 h-4 mr-2"
          />
          {{ isConnected ? 'Disconnect' : 'Connect' }}
        </UButton>
      </template>
    </AppHeroCard>

    <!-- Connection Status -->
    <AppCard v-if="!isConnected && !isConnecting">
      <div class="text-center py-8">
        <div
          class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4"
        >
          <UIcon name="i-lucide-wifi-off" class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Not Connected</h3>
        <p class="text-gray-500 mb-4 max-w-md mx-auto">
          Connect to the P2P network to discover other wallets and participate
          in multi-signature transactions.
        </p>
        <UButton color="primary" @click="toggleConnection">
          Connect to Network
        </UButton>
      </div>
    </AppCard>

    <!-- Tabs (when connected) -->
    <template v-if="isConnected">
      <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          v-for="tab in ['overview', 'requests', 'peers', 'sessions']"
          :key="tab"
          class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors capitalize"
          :class="
            activeTab === tab
              ? 'bg-white dark:bg-gray-700 shadow'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="activeTab = tab"
        >
          {{ tab }}
          <UBadge
            v-if="tab === 'requests' && incomingRequests.length > 0"
            color="warning"
            variant="solid"
            size="xs"
            class="ml-2"
          >
            {{ incomingRequests.length }}
          </UBadge>
        </button>
      </div>

      <!-- Overview Tab -->
      <P2POverview v-if="activeTab === 'overview'" />

      <!-- Requests Tab -->
      <P2PRequests v-else-if="activeTab === 'requests'" />

      <!-- Peers Tab -->
      <P2PPeers v-else-if="activeTab === 'peers'" />

      <!-- Sessions Tab -->
      <P2PSessions v-else-if="activeTab === 'sessions'" />
    </template>

    <!-- What is P2P? -->
    <AppCard
      title="What is P2P?"
      icon="i-lucide-help-circle"
      v-if="!isConnected"
    >
      <div class="space-y-4 text-gray-600 dark:text-gray-400">
        <p>
          The P2P (peer-to-peer) network allows your wallet to connect directly
          with other Lotus wallets for advanced features like multi-signature
          transactions.
        </p>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <UIcon name="i-lucide-users" class="w-8 h-8 text-primary mb-2" />
            <h4 class="font-semibold mb-1">Multi-Signature</h4>
            <p class="text-sm">
              Create transactions that require multiple people to sign before
              they can be sent.
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <UIcon name="i-lucide-shield" class="w-8 h-8 text-primary mb-2" />
            <h4 class="font-semibold mb-1">Enhanced Security</h4>
            <p class="text-sm">
              No single person can spend funds without approval from other
              signers.
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <UIcon name="i-lucide-lock" class="w-8 h-8 text-primary mb-2" />
            <h4 class="font-semibold mb-1">Privacy</h4>
            <p class="text-sm">
              Direct connections between wallets without going through a central
              server.
            </p>
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
```

---

## 2. P2P Overview Component

### File: `components/p2p/P2POverview.vue`

```vue
<script setup lang="ts">
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

// Stats
const stats = computed(() => ({
  peers: p2pStore.connectedPeers.length,
  sessions: musig2Store.activeSessions.length,
  pendingRequests: musig2Store.pendingRequests.length,
}))

// Recent activity
const recentActivity = computed(() => p2pStore.recentActivity.slice(0, 5))
</script>

<template>
  <div class="space-y-6">
    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-3">
      <AppStatCard
        label="Connected Peers"
        :value="stats.peers.toString()"
        icon="i-lucide-users"
      />
      <AppStatCard
        label="Active Sessions"
        :value="stats.sessions.toString()"
        icon="i-lucide-key"
      />
      <AppStatCard
        label="Pending Requests"
        :value="stats.pendingRequests.toString()"
        icon="i-lucide-bell"
        :trend="stats.pendingRequests > 0 ? 'warning' : undefined"
      />
    </div>

    <!-- Quick Actions -->
    <AppCard title="Quick Actions" icon="i-lucide-zap">
      <div class="grid gap-3 md:grid-cols-2">
        <UButton
          color="primary"
          variant="soft"
          block
          to="/people/p2p?tab=peers"
        >
          <UIcon name="i-lucide-user-plus" class="w-4 h-4 mr-2" />
          Find Peers
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          block
          to="/people/p2p?tab=sessions"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
          New Session
        </UButton>
      </div>
    </AppCard>

    <!-- Recent Activity -->
    <AppCard title="Recent Activity" icon="i-lucide-activity">
      <div v-if="recentActivity.length > 0" class="space-y-3">
        <P2PActivityItem
          v-for="activity in recentActivity"
          :key="activity.id"
          :activity="activity"
        />
      </div>
      <AppEmptyState
        v-else
        icon="i-lucide-inbox"
        title="No recent activity"
        description="P2P activity will appear here"
      />
    </AppCard>
  </div>
</template>
```

---

## 3. P2P Requests Component

### File: `components/p2p/P2PRequests.vue`

```vue
<script setup lang="ts">
import { useMuSig2Store } from '~/stores/musig2'

const musig2Store = useMuSig2Store()

// Pending requests
const pendingRequests = computed(() => musig2Store.pendingRequests)

// Selected request for detail view
const selectedRequest = ref(null)
const showDetailModal = ref(false)

// Handle request
async function handleRequest(request: any, action: 'accept' | 'reject') {
  if (action === 'accept') {
    await musig2Store.acceptRequest(request.id)
  } else {
    await musig2Store.rejectRequest(request.id)
  }
}

// View request details
function viewRequest(request: any) {
  selectedRequest.value = request
  showDetailModal.value = true
}
</script>

<template>
  <div class="space-y-6">
    <AppCard title="Pending Requests" icon="i-lucide-bell">
      <div v-if="pendingRequests.length > 0" class="space-y-4">
        <div
          v-for="request in pendingRequests"
          :key="request.id"
          class="p-4 border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20 rounded-lg"
        >
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div
              class="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-lucide-pen-tool"
                class="w-6 h-6 text-warning-600"
              />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold">Signing Request</h3>
              <p class="text-sm text-gray-500 mt-1">
                From: {{ request.fromPeer?.slice(0, 12) }}...
              </p>
              <p class="text-sm text-gray-500">
                Amount: {{ (request.amount / 1e6).toFixed(6) }} XPI
              </p>
              <p class="text-xs text-gray-400 mt-2">
                Received {{ new Date(request.timestamp).toLocaleString() }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2">
              <UButton
                color="success"
                size="sm"
                @click="handleRequest(request, 'accept')"
              >
                Accept
              </UButton>
              <UButton
                color="error"
                variant="soft"
                size="sm"
                @click="handleRequest(request, 'reject')"
              >
                Reject
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                @click="viewRequest(request)"
              >
                Details
              </UButton>
            </div>
          </div>

          <!-- Transaction Preview -->
          <div class="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
            <h4 class="text-sm font-medium mb-2">Transaction Preview</h4>
            <div class="text-sm text-gray-500 space-y-1">
              <div class="flex justify-between">
                <span>To:</span>
                <span class="font-mono"
                  >{{ request.toAddress?.slice(0, 20) }}...</span
                >
              </div>
              <div class="flex justify-between">
                <span>Amount:</span>
                <span class="font-mono"
                  >{{ (request.amount / 1e6).toFixed(6) }} XPI</span
                >
              </div>
              <div class="flex justify-between">
                <span>Fee:</span>
                <span class="font-mono"
                  >{{ (request.fee / 1e6).toFixed(6) }} XPI</span
                >
              </div>
            </div>
          </div>

          <!-- Warning -->
          <UAlert
            color="warning"
            icon="i-lucide-alert-triangle"
            class="mt-4"
            variant="subtle"
          >
            <template #description>
              Only accept signing requests from people you trust. By signing,
              you authorize this transaction.
            </template>
          </UAlert>
        </div>
      </div>

      <AppEmptyState
        v-else
        icon="i-lucide-inbox"
        title="No pending requests"
        description="Signing requests from other wallets will appear here"
      />
    </AppCard>

    <!-- Request Detail Modal -->
    <SigningRequestDetailModal
      v-model:open="showDetailModal"
      :request="selectedRequest"
      @accept="handleRequest(selectedRequest, 'accept')"
      @reject="handleRequest(selectedRequest, 'reject')"
    />
  </div>
</template>
```

---

## 4. P2P Peers Component

### File: `components/p2p/P2PPeers.vue`

```vue
<script setup lang="ts">
import { useP2PStore } from '~/stores/p2p'

const p2pStore = useP2PStore()

// Peers
const connectedPeers = computed(() => p2pStore.connectedPeers)
const discoveredPeers = computed(() => p2pStore.discoveredPeers)

// Search
const searchQuery = ref('')

// Filtered peers
const filteredDiscovered = computed(() => {
  if (!searchQuery.value) return discoveredPeers.value
  const query = searchQuery.value.toLowerCase()
  return discoveredPeers.value.filter(
    peer =>
      peer.id.toLowerCase().includes(query) ||
      peer.name?.toLowerCase().includes(query),
  )
})

// Connect to peer
async function connectToPeer(peerId: string) {
  await p2pStore.connectToPeer(peerId)
}

// Disconnect from peer
async function disconnectFromPeer(peerId: string) {
  await p2pStore.disconnectFromPeer(peerId)
}

// Refresh discovery
async function refreshDiscovery() {
  await p2pStore.discoverPeers()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Connected Peers -->
    <AppCard title="Connected Peers" icon="i-lucide-users">
      <div v-if="connectedPeers.length > 0" class="space-y-3">
        <div
          v-for="peer in connectedPeers"
          :key="peer.id"
          class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <div
            class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
          >
            <UIcon name="i-lucide-user" class="w-5 h-5 text-green-600" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ peer.name || 'Anonymous Peer' }}
            </div>
            <div class="text-sm text-gray-500 font-mono truncate">
              {{ peer.id }}
            </div>
          </div>
          <UBadge color="success" variant="soft">Connected</UBadge>
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-x"
            @click="disconnectFromPeer(peer.id)"
          />
        </div>
      </div>
      <AppEmptyState
        v-else
        icon="i-lucide-users"
        title="No connected peers"
        description="Connect to peers from the discovery list below"
      />
    </AppCard>

    <!-- Discover Peers -->
    <AppCard title="Discover Peers" icon="i-lucide-radar">
      <template #action>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          @click="refreshDiscovery"
        >
          <UIcon name="i-lucide-refresh-cw" class="w-4 h-4" />
        </UButton>
      </template>

      <!-- Search -->
      <div class="mb-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search peers..."
          class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      <div v-if="filteredDiscovered.length > 0" class="space-y-3">
        <div
          v-for="peer in filteredDiscovered"
          :key="peer.id"
          class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div
            class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
          >
            <UIcon name="i-lucide-user" class="w-5 h-5 text-gray-500" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ peer.name || 'Anonymous Peer' }}
            </div>
            <div class="text-sm text-gray-500 font-mono truncate">
              {{ peer.id }}
            </div>
          </div>
          <UButton color="primary" size="sm" @click="connectToPeer(peer.id)">
            Connect
          </UButton>
        </div>
      </div>
      <AppEmptyState
        v-else
        icon="i-lucide-radar"
        title="No peers discovered"
        description="Make sure you're connected to the P2P network"
      />
    </AppCard>
  </div>
</template>
```

---

## 5. P2P Sessions Component

### File: `components/p2p/P2PSessions.vue`

```vue
<script setup lang="ts">
import { useMuSig2Store } from '~/stores/musig2'

const musig2Store = useMuSig2Store()

// Sessions
const activeSessions = computed(() => musig2Store.activeSessions)

// Create new session modal
const showCreateModal = ref(false)

// Session detail
const selectedSession = ref(null)
const showDetailModal = ref(false)

// View session
function viewSession(session: any) {
  selectedSession.value = session
  showDetailModal.value = true
}
</script>

<template>
  <div class="space-y-6">
    <AppCard title="Active Sessions" icon="i-lucide-key">
      <template #action>
        <UButton color="primary" size="sm" @click="showCreateModal = true">
          <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
          New Session
        </UButton>
      </template>

      <div v-if="activeSessions.length > 0" class="space-y-3">
        <div
          v-for="session in activeSessions"
          :key="session.id"
          class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          @click="viewSession(session)"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-key" class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold">
                  {{ session.name || 'Unnamed Session' }}
                </h3>
                <UBadge
                  :color="session.status === 'active' ? 'success' : 'warning'"
                  variant="soft"
                  size="xs"
                >
                  {{ session.status }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500 mt-1">
                {{ session.signers?.length || 0 }} signers •
                {{ session.threshold }}-of-{{
                  session.signers?.length || 0
                }}
                required
              </p>
              <p class="text-xs text-gray-400 mt-1">
                Created {{ new Date(session.createdAt).toLocaleDateString() }}
              </p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="w-5 h-5 text-gray-400"
            />
          </div>
        </div>
      </div>

      <AppEmptyState
        v-else
        icon="i-lucide-key"
        title="No active sessions"
        description="Create a multi-signature session to get started"
      >
        <template #action>
          <UButton color="primary" @click="showCreateModal = true">
            Create Session
          </UButton>
        </template>
      </AppEmptyState>
    </AppCard>

    <!-- Create Session Modal -->
    <CreateSessionModal v-model:open="showCreateModal" />

    <!-- Session Detail Modal -->
    <SessionDetailModal
      v-model:open="showDetailModal"
      :session="selectedSession"
    />
  </div>
</template>
```

---

## 6. Implementation Checklist

### Pages

- [ ] Create `pages/people/p2p.vue`

### Components

- [ ] Create `components/p2p/P2POverview.vue`
- [ ] Create `components/p2p/P2PRequests.vue`
- [ ] Create `components/p2p/P2PPeers.vue`
- [ ] Create `components/p2p/P2PSessions.vue`
- [ ] Create `components/p2p/P2PActivityItem.vue`
- [ ] Create `components/p2p/SigningRequestDetailModal.vue`
- [ ] Create `components/p2p/CreateSessionModal.vue`
- [ ] Create `components/p2p/SessionDetailModal.vue`

### Store Updates

- [ ] Add `pendingRequests` to musig2 store
- [ ] Add `acceptRequest`, `rejectRequest` methods
- [ ] Add `recentActivity` to p2p store
- [ ] Add `discoveredPeers` to p2p store

### Features

- [ ] P2P connection status
- [ ] Incoming signing requests display
- [ ] Accept/reject signing requests
- [ ] Transaction preview in requests
- [ ] Peer discovery
- [ ] Peer connection management
- [ ] Session creation
- [ ] Session management

### Testing

- [ ] Test P2P connection
- [ ] Test signing request flow
- [ ] Test peer discovery
- [ ] Test session creation

---

## Next Phase

Once this phase is complete, proceed to [10_SETTINGS_SECURITY.md](./10_SETTINGS_SECURITY.md) to implement the settings and security pages.
