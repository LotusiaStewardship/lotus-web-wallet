# Phase 5: Presence & Discovery

## Overview

This phase enhances presence controls and peer discovery, making it easy for users to manage their online status and discover other wallets on the network.

**Priority**: P1 (High)
**Estimated Effort**: 1-2 days
**Dependencies**: Phase 1 Page Structure

---

## Current State

### What Exists

- Presence advertising via P2P service
- `SettingsPanel.vue` with presence toggle
- `PeerGrid.vue` for displaying peers
- `ActivityFeed.vue` for P2P events

### What's Missing

- Quick presence toggle in P2P hub header
- Status options (Online, Away, DND, Invisible)
- Meaningful activity feed events
- Peer discovery refresh
- Signer advertisements in feed

---

## Target Design

### Presence Control in Header

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌐 P2P Network                    [🟢 Online ▼] [⚙️]               │
│  Connected with 12 peers • DHT ready                                │
└─────────────────────────────────────────────────────────────────────┘

Dropdown:
┌─────────────────────────────────────────────────────────────────────┐
│  🟢 Online         Visible to others                                │
│  🟡 Away           Show as away                                     │
│  🔴 Do Not Disturb Block signing requests                          │
│  ⚫ Invisible      Hidden from discovery                            │
│  ─────────────────────────────────────────────────────────────────  │
│  ✏️ Set custom status...                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Enhanced Activity Feed

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Live Activity                                    [Filter ▼]     │
├─────────────────────────────────────────────────────────────────────┤
│  ✍️ Alice is now available for CoinJoin signing      2 sec ago      │
│  🔐 Bob started a 3-of-5 signing session             1 min ago      │
│  ✅ Carol and Dave completed a swap                  5 min ago      │
│  🟢 Eve connected                                    10 min ago     │
│  🔴 Frank went offline                               15 min ago     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Task 5.1: Create Presence Toggle Component

**File**: `components/p2p/PresenceToggle.vue`

```vue
<script setup lang="ts">
import { useP2PStore } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'

const p2pStore = useP2PStore()
const walletStore = useWalletStore()

// Presence status options
const statusOptions = [
  {
    value: 'online',
    label: 'Online',
    icon: '🟢',
    description: 'Visible to others',
    color: 'success',
  },
  {
    value: 'away',
    label: 'Away',
    icon: '🟡',
    description: 'Show as away',
    color: 'warning',
  },
  {
    value: 'dnd',
    label: 'Do Not Disturb',
    icon: '🔴',
    description: 'Block signing requests',
    color: 'error',
  },
  {
    value: 'invisible',
    label: 'Invisible',
    icon: '⚫',
    description: 'Hidden from discovery',
    color: 'neutral',
  },
]

// Current status
const currentStatus = ref<string>(
  p2pStore.presenceEnabled ? 'online' : 'invisible',
)

// Custom status message
const customStatus = ref('')
const showCustomStatusInput = ref(false)

// Current status display
const currentStatusOption = computed(
  () =>
    statusOptions.find(s => s.value === currentStatus.value) ||
    statusOptions[0],
)

// Change status
async function setStatus(status: string) {
  currentStatus.value = status

  if (status === 'invisible') {
    await p2pStore.disablePresence()
  } else {
    await p2pStore.enablePresence({
      walletAddress: walletStore.address,
      nickname: walletStore.nickname || 'Wallet User',
      status,
      customStatus: customStatus.value || undefined,
    })
  }
}

// Set custom status
async function setCustomStatus() {
  showCustomStatusInput.value = false
  if (currentStatus.value !== 'invisible') {
    await p2pStore.enablePresence({
      walletAddress: walletStore.address,
      nickname: walletStore.nickname || 'Wallet User',
      status: currentStatus.value,
      customStatus: customStatus.value || undefined,
    })
  }
}
</script>

<template>
  <UDropdownMenu>
    <UDropdownMenuTrigger as-child>
      <UButton color="neutral" variant="soft" size="sm">
        <span class="mr-2">{{ currentStatusOption.icon }}</span>
        {{ currentStatusOption.label }}
        <UIcon name="i-lucide-chevron-down" class="w-4 h-4 ml-1" />
      </UButton>
    </UDropdownMenuTrigger>

    <UDropdownMenuContent align="end" class="w-64">
      <!-- Status Options -->
      <UDropdownMenuItem
        v-for="option in statusOptions"
        :key="option.value"
        @click="setStatus(option.value)"
      >
        <div class="flex items-center gap-3 w-full">
          <span>{{ option.icon }}</span>
          <div class="flex-1">
            <p class="font-medium">{{ option.label }}</p>
            <p class="text-xs text-muted">{{ option.description }}</p>
          </div>
          <UIcon
            v-if="currentStatus === option.value"
            name="i-lucide-check"
            class="w-4 h-4 text-primary"
          />
        </div>
      </UDropdownMenuItem>

      <UDropdownMenuSeparator />

      <!-- Custom Status -->
      <UDropdownMenuItem @click="showCustomStatusInput = true">
        <div class="flex items-center gap-3">
          <span>✏️</span>
          <span>Set custom status...</span>
        </div>
      </UDropdownMenuItem>

      <!-- Current Custom Status -->
      <div v-if="customStatus" class="px-3 py-2 text-sm text-muted">
        Current: "{{ customStatus }}"
      </div>
    </UDropdownMenuContent>
  </UDropdownMenu>

  <!-- Custom Status Modal -->
  <UModal v-model:open="showCustomStatusInput">
    <template #header>
      <h3 class="font-semibold">Set Custom Status</h3>
    </template>

    <div class="p-4">
      <UInput
        v-model="customStatus"
        placeholder="What are you up to?"
        maxlength="50"
      />
      <p class="text-xs text-muted mt-2">
        {{ customStatus.length }}/50 characters
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="showCustomStatusInput = false"
        >
          Cancel
        </UButton>
        <UButton color="primary" @click="setCustomStatus"> Save </UButton>
      </div>
    </template>
  </UModal>
</template>
```

### Task 5.2: Update Hero Card with Presence Toggle

**File**: `components/p2p/HeroCard.vue` (update)

```vue
<script setup lang="ts">
// ... existing props and emits

const props = defineProps<{
  connectionState: string
  peerCount: number
  dhtReady: boolean
  presenceEnabled?: boolean
}>()
</script>

<template>
  <UiAppHeroCard
    icon="i-lucide-globe"
    title="P2P Network"
    :subtitle="statusText"
    gradient
  >
    <template #icon>
      <!-- ... existing icon template -->
    </template>

    <template #header-action>
      <!-- Presence Toggle (when connected) -->
      <P2pPresenceToggle v-if="isConnected" />
    </template>

    <template #actions>
      <div class="flex justify-center gap-3 mt-4">
        <!-- ... existing connect/disconnect buttons -->
      </div>
    </template>
  </UiAppHeroCard>
</template>
```

### Task 5.3: Enhance Activity Feed

**File**: `components/p2p/ActivityFeed.vue` (update)

```vue
<script setup lang="ts">
import type { P2PActivityEvent } from '~/types/p2p'

const props = defineProps<{
  events: P2PActivityEvent[]
  maxEvents?: number
}>()

// Filter options
const filterOptions = [
  { value: 'all', label: 'All Activity' },
  { value: 'signers', label: 'Signers Only' },
  { value: 'sessions', label: 'Sessions Only' },
  { value: 'peers', label: 'Peers Only' },
]

const activeFilter = ref('all')

// Filtered events
const filteredEvents = computed(() => {
  const max = props.maxEvents || 20
  let events = props.events

  if (activeFilter.value !== 'all') {
    events = events.filter(e => {
      switch (activeFilter.value) {
        case 'signers':
          return (
            e.type === 'signer_available' || e.type === 'signer_unavailable'
          )
        case 'sessions':
          return (
            e.type === 'session_started' ||
            e.type === 'session_completed' ||
            e.type === 'session_aborted'
          )
        case 'peers':
          return e.type === 'peer_joined' || e.type === 'peer_left'
        default:
          return true
      }
    })
  }

  return events.slice(0, max)
})

// Event display config
const eventConfig: Record<string, { icon: string; color: string }> = {
  peer_joined: { icon: '🟢', color: 'text-success' },
  peer_left: { icon: '🔴', color: 'text-error' },
  signer_available: { icon: '✍️', color: 'text-primary' },
  signer_unavailable: { icon: '✍️', color: 'text-muted' },
  session_started: { icon: '🔐', color: 'text-primary' },
  session_completed: { icon: '✅', color: 'text-success' },
  session_aborted: { icon: '❌', color: 'text-error' },
  request_received: { icon: '📥', color: 'text-warning' },
  request_sent: { icon: '📤', color: 'text-primary' },
  info: { icon: 'ℹ️', color: 'text-muted' },
  error: { icon: '⚠️', color: 'text-error' },
}

// Time ago
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Get event config
function getEventConfig(type: string) {
  return eventConfig[type] || { icon: '•', color: 'text-muted' }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Filter -->
    <div class="flex justify-end">
      <USelectMenu
        v-model="activeFilter"
        :items="filterOptions"
        value-key="value"
        size="xs"
      />
    </div>

    <!-- Events -->
    <div v-if="filteredEvents.length > 0" class="space-y-2">
      <div
        v-for="event in filteredEvents"
        :key="event.id"
        class="flex items-start gap-3 py-2"
      >
        <span class="text-lg">{{ getEventConfig(event.type).icon }}</span>
        <div class="flex-1 min-w-0">
          <p :class="['text-sm', getEventConfig(event.type).color]">
            {{ event.message }}
          </p>
          <p v-if="event.nickname" class="text-xs text-muted">
            {{ event.nickname }}
          </p>
        </div>
        <span class="text-xs text-muted whitespace-nowrap">
          {{ timeAgo(event.timestamp) }}
        </span>
      </div>
    </div>

    <UiAppEmptyState
      v-else
      icon="i-lucide-activity"
      title="No activity"
      description="P2P events will appear here"
    />
  </div>
</template>
```

### Task 5.4: Add Activity Event Types

**File**: `types/p2p.ts` (update)

```typescript
// Add new activity event types
export type P2PActivityEventType =
  | 'peer_joined'
  | 'peer_left'
  | 'signer_available'
  | 'signer_unavailable'
  | 'session_started'
  | 'session_completed'
  | 'session_aborted'
  | 'request_received'
  | 'request_sent'
  | 'info'
  | 'error'

export interface P2PActivityEvent {
  id: string
  type: P2PActivityEventType
  peerId: string
  nickname?: string
  protocol?: string
  timestamp: number
  message: string
  metadata?: Record<string, unknown>
}
```

### Task 5.5: Update P2P Store for Rich Activity

**File**: `stores/p2p.ts` (update)

```typescript
actions: {
  // Add activity event with rich data
  _addActivityEvent(event: Omit<P2PActivityEvent, 'id' | 'timestamp'>) {
    const fullEvent: P2PActivityEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    }

    this.activityEvents.unshift(fullEvent)

    if (this.activityEvents.length > MAX_ACTIVITY_EVENTS) {
      this.activityEvents = this.activityEvents.slice(0, MAX_ACTIVITY_EVENTS)
    }
  },

  // Add signer activity
  _handleSignerDiscovered(signer: DiscoveredSigner) {
    this._addActivityEvent({
      type: 'signer_available',
      peerId: signer.peerId,
      nickname: signer.nickname,
      message: `${signer.nickname || 'A signer'} is now available for ${signer.transactionTypes.join(', ')}`,
      metadata: { transactionTypes: signer.transactionTypes },
    })
  },

  // Add session activity
  _handleSessionStarted(session: WalletSigningSession) {
    this._addActivityEvent({
      type: 'session_started',
      peerId: session.initiatorPeerId,
      nickname: session.initiatorNickname,
      message: `${session.initiatorNickname || 'Someone'} started a ${session.totalSigners}-of-${session.threshold} signing session`,
      metadata: { sessionId: session.id },
    })
  },

  _handleSessionCompleted(session: WalletSigningSession) {
    this._addActivityEvent({
      type: 'session_completed',
      peerId: session.initiatorPeerId,
      nickname: session.initiatorNickname,
      message: `Signing session completed successfully`,
      metadata: { sessionId: session.id },
    })
  },
}
```

### Task 5.6: Add Peer Discovery Refresh

**File**: Update `pages/people/p2p.vue`

```typescript
// Add refresh functionality
const isRefreshing = ref(false)

async function handleRefreshPeers() {
  isRefreshing.value = true
  try {
    // Refresh presence discovery
    const peers = discoverPeers()

    // Update online peers in store
    for (const peer of peers) {
      p2pStore._handlePresenceDiscovered(peer)
    }

    success('Refreshed', `Found ${peers.length} online peers`)
  } catch (err) {
    error(
      'Refresh Failed',
      err instanceof Error ? err.message : 'Failed to refresh',
    )
  } finally {
    isRefreshing.value = false
  }
}
```

```vue
<!-- Add refresh button to PeerGrid section -->
<UiAppCard title="Connected Peers" icon="i-lucide-users">
  <template #action>
    <UButton 
      color="neutral" 
      variant="ghost" 
      size="sm"
      icon="i-lucide-refresh-cw"
      :loading="isRefreshing"
      @click="handleRefreshPeers"
    />
  </template>
  <!-- ... rest of content -->
</UiAppCard>
```

---

## Checklist

### Components

- [ ] Create `PresenceToggle.vue`
- [ ] Update `HeroCard.vue` with presence toggle
- [ ] Update `ActivityFeed.vue` with filters and rich events
- [ ] Update `SettingsPanel.vue` if needed

### Types

- [ ] Add new activity event types
- [ ] Update `P2PActivityEvent` interface

### Store Updates

- [ ] Add rich activity event methods
- [ ] Add signer discovery activity
- [ ] Add session activity events
- [ ] Update presence config to include status

### Page Integration

- [ ] Add presence toggle to hero card
- [ ] Add refresh button to peer grid
- [ ] Wire up activity feed filters

### Testing

- [ ] Presence toggle changes status
- [ ] Status persists across page navigation
- [ ] Activity feed shows rich events
- [ ] Activity filter works correctly
- [ ] Peer refresh works
- [ ] Custom status can be set

---

_Previous: [04_CONTACT_INTEGRATION.md](./04_CONTACT_INTEGRATION.md)_
_Next: [06_POLISH_ACCESSIBILITY.md](./06_POLISH_ACCESSIBILITY.md)_
