# Phase 4: P2P Core Integration

## Overview

This phase implements the P2P networking UI, including the P2P page structure, signer discovery and display, presence management, and activity feed. It builds on the foundation established in Phase 2.

**Priority**: P0 (Critical Path)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 2 (P2P/MuSig2 Foundation)

---

## Source Phases

| Source Plan           | Phase | Component            |
| --------------------- | ----- | -------------------- |
| unified-p2p-musig2-ui | 2     | P2P Core Integration |

---

## Tasks

### 4.1 P2P Page Structure

**Effort**: 1 day

#### Tab Navigation

- [ ] Add tab navigation to `pages/people/p2p.vue`

  ```vue
  <script setup lang="ts">
  const tabs = [
    { label: 'Overview', slot: 'overview', icon: 'i-heroicons-home' },
    { label: 'Signers', slot: 'signers', icon: 'i-heroicons-users' },
    { label: 'Sessions', slot: 'sessions', icon: 'i-heroicons-document-text' },
    { label: 'Requests', slot: 'requests', icon: 'i-heroicons-inbox' },
  ]

  const route = useRoute()
  const router = useRouter()
  const selectedTab = ref((route.query.tab as string) || 'overview')

  watch(selectedTab, tab => {
    router.replace({ query: { tab } })
  })
  </script>
  ```

#### Tab Content Integration

- [ ] Overview tab: HeroCard + QuickActions + ActivityFeed
- [ ] Signers tab: SignerList with SignerCards
- [ ] Sessions tab: SessionList with active sessions
- [ ] Requests tab: RequestList with incoming/outgoing requests

#### Event Handlers

- [ ] Wire up signer selection → SignerDetailModal
- [ ] Wire up session selection → SessionDetailModal
- [ ] Wire up request actions (accept/reject/cancel)
- [ ] Wire up "Save as Contact" action

#### Modal Integration

- [ ] Add modal components to template
  ```vue
  <template>
    <!-- Tab content... -->

    <SignerDetailModal
      v-model="showSignerDetail"
      :signer="selectedSigner"
      @save-contact="handleSaveAsContact"
      @request-signature="handleRequestSignature"
    />

    <SessionDetailModal
      v-model="showSessionDetail"
      :session="selectedSession"
      @abort="handleAbortSession"
    />
  </template>
  ```

---

### 4.2 New Components

**Effort**: 1 day

#### SignerDetailModal

- [ ] Create `components/p2p/SignerDetailModal.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    modelValue: boolean
    signer: DiscoveredSigner | null
  }

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'save-contact': [signer: DiscoveredSigner]
    'request-signature': [signer: DiscoveredSigner]
  }>()
  </script>
  ```

  Features:

  - Signer public key (truncated with copy)
  - Peer ID
  - Online status with last seen
  - Capabilities list
  - "Save as Contact" button
  - "Request Signature" button
  - "Create Shared Wallet" button

#### SessionDetailModal

- [ ] Create `components/p2p/SessionDetailModal.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    modelValue: boolean
    session: SigningSession | null
  }
  </script>
  ```

  Features:

  - Session ID and status
  - Participant list with status
  - Transaction preview (using shared component)
  - Progress indicator
  - Timeout countdown
  - Abort button (if session owner)

#### PresenceToggle

- [ ] Create `components/p2p/PresenceToggle.vue`

  ```vue
  <script setup lang="ts">
  const p2pStore = useP2PStore()
  const musig2Store = useMusig2Store()

  const isAdvertising = computed(() => musig2Store.isAdvertising)

  async function togglePresence() {
    if (isAdvertising.value) {
      await musig2Store.stopAdvertising()
    } else {
      await musig2Store.startAdvertising()
    }
  }
  </script>
  ```

  Features:

  - Toggle switch for presence advertising
  - Status indicator (advertising/not advertising)
  - Tooltip explaining what presence does

---

### 4.3 Component Updates

**Effort**: 0.5 days

#### ActivityFeed Enhancement

- [ ] Update `components/p2p/ActivityFeed.vue` with event types

  ```typescript
  type P2PEventType =
    | 'peer_connected'
    | 'peer_disconnected'
    | 'signer_discovered'
    | 'signing_request_received'
    | 'signing_request_sent'
    | 'session_started'
    | 'session_completed'
    | 'session_failed'

  interface P2PEvent {
    id: string
    type: P2PEventType
    timestamp: Date
    data: Record<string, unknown>
  }
  ```

- [ ] Add event type icons and colors
  ```typescript
  const eventConfig: Record<P2PEventType, { icon: string; color: string }> = {
    peer_connected: { icon: 'i-heroicons-link', color: 'green' },
    peer_disconnected: { icon: 'i-heroicons-link-slash', color: 'gray' },
    signer_discovered: { icon: 'i-heroicons-user-plus', color: 'blue' },
    signing_request_received: {
      icon: 'i-heroicons-inbox-arrow-down',
      color: 'yellow',
    },
    signing_request_sent: { icon: 'i-heroicons-paper-airplane', color: 'blue' },
    session_started: { icon: 'i-heroicons-play', color: 'green' },
    session_completed: { icon: 'i-heroicons-check-circle', color: 'green' },
    session_failed: { icon: 'i-heroicons-x-circle', color: 'red' },
  }
  ```

---

### 4.4 Store Verification

**Effort**: 0.5 days

#### P2P Store

- [ ] Verify `p2pStore.connected` getter returns boolean
- [ ] Verify `p2pStore.connectedPeers` returns peer array
- [ ] Verify `p2pStore.activityEvents` returns event array
- [ ] Verify connection/disconnection updates state

#### MuSig2 Store

- [ ] Verify `musig2Store.discoveredSigners` returns signer array
- [ ] Verify `musig2Store.activeSessions` returns session array
- [ ] Verify `musig2Store.incomingRequests` returns request array
- [ ] Verify `musig2Store.isAdvertising` returns boolean

#### Integration Test

- [ ] Test P2P connection flow end-to-end
- [ ] Test signer discovery updates UI
- [ ] Test activity events appear in feed

---

## File Changes Summary

### New Files

| File                                    | Purpose                     |
| --------------------------------------- | --------------------------- |
| `components/p2p/SignerDetailModal.vue`  | Signer detail view          |
| `components/p2p/SessionDetailModal.vue` | Session detail view         |
| `components/p2p/PresenceToggle.vue`     | Presence advertising toggle |

### Modified Files

| File                              | Changes                        |
| --------------------------------- | ------------------------------ |
| `pages/people/p2p.vue`            | Tab navigation, event handlers |
| `components/p2p/ActivityFeed.vue` | Event types, icons, colors     |
| `components/p2p/SignerList.vue`   | Selection handler              |
| `components/p2p/SessionList.vue`  | Selection handler              |
| `components/p2p/RequestList.vue`  | Action handlers                |

---

## UI Specifications

### P2P Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to People                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  P2P Network                                                         │   │
│  │  ──────────────────────────────────────────────────────────────────  │   │
│  │  🟢 Connected to 5 peers                    [Toggle Presence: ON]    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────┬──────────┬──────────┬──────────┐                             │
│  │ Overview │ Signers  │ Sessions │ Requests │                             │
│  └──────────┴──────────┴──────────┴──────────┘                             │
│                                                                             │
│  [Tab Content Area]                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### SignerDetailModal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Signer Details                                                      [X]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  👤                                                                  │   │
│  │  Public Key: 02a1b2c3...d4e5f6                              [Copy]  │   │
│  │  Peer ID: 12D3KooW...                                       [Copy]  │   │
│  │                                                                      │   │
│  │  🟢 Online (last seen: just now)                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CAPABILITIES                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ MuSig2 Signing                                                  │   │
│  │  ✅ 2-of-3 Threshold                                                │   │
│  │  ✅ 3-of-5 Threshold                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│  │ Save as Contact │ │Request Signature│ │Create Shared    │              │
│  │                 │ │                 │ │Wallet           │              │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

### P2P Page

- [ ] All tabs render correctly
- [ ] Tab selection persists in URL query param
- [ ] Tab content loads appropriate components
- [ ] Back navigation works

### Components

- [ ] SignerDetailModal shows all signer info
- [ ] SessionDetailModal shows session progress
- [ ] PresenceToggle updates advertising state
- [ ] ActivityFeed shows events with correct icons

### Store Integration

- [ ] UI updates when peers connect/disconnect
- [ ] UI updates when signers are discovered
- [ ] UI updates when sessions change state
- [ ] UI updates when requests are received

### Event Handlers

- [ ] "Save as Contact" opens contact form
- [ ] "Request Signature" initiates request flow
- [ ] Session abort works correctly
- [ ] Request accept/reject works correctly

---

## Notes

- P2P page uses tab navigation for organization
- All modals follow existing modal patterns
- Activity feed provides real-time feedback
- Store verification ensures data flows correctly

---

## Next Phase

After completing Phase 4, proceed to:

- **Phase 5**: MuSig2 Core and Session Monitor

---

_Source: unified-p2p-musig2-ui/02_P2P_CORE.md_
