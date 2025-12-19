# Phase 5: MuSig2 Core and Session Monitor

## Overview

This phase implements the MuSig2 shared wallet UI and the service worker session monitor. Users will be able to create, view, and fund shared wallets. The session monitor ensures MuSig2 sessions are tracked even when the tab is backgrounded.

**Priority**: P0 (Critical Path)
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 4 (P2P Core Integration)

---

## Source Phases

| Source Plan               | Phase | Component               |
| ------------------------- | ----- | ----------------------- |
| unified-p2p-musig2-ui     | 3     | MuSig2 Core Integration |
| background-service-worker | 3     | Session Monitor         |

---

## Tasks

### 5.1 Shared Wallet Components

**Source**: unified-p2p-musig2-ui/03_MUSIG2_CORE.md
**Effort**: 2 days

#### SharedWalletList Update

- [ ] Update `components/musig2/SharedWalletList.vue`

  ```vue
  <script setup lang="ts">
  const musig2Store = useMusig2Store()
  const { sharedWallets, isLoading } = storeToRefs(musig2Store)

  async function refresh() {
    await musig2Store.refreshSharedWalletBalances()
  }
  </script>

  <template>
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Shared Wallets</h2>
        <UButton
          icon="i-heroicons-arrow-path"
          variant="ghost"
          @click="refresh"
        />
      </div>

      <div v-if="sharedWallets.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-wallet" class="w-12 h-12 text-gray-400" />
        <p class="mt-2 text-gray-500">No shared wallets yet</p>
        <UButton class="mt-4" @click="$emit('create')">
          Create Shared Wallet
        </UButton>
      </div>

      <div v-else class="divide-y divide-default">
        <SharedWalletCard
          v-for="wallet in sharedWallets"
          :key="wallet.id"
          :wallet="wallet"
          @click="$emit('select', wallet)"
        />
      </div>
    </div>
  </template>
  ```

#### SharedWalletCard Update

- [ ] Update `components/musig2/SharedWalletCard.vue`
  - Show wallet name and balance
  - Show participant count and names (if contacts)
  - Show threshold (e.g., "2 of 3")
  - Show pending actions badge
  - Click navigates to detail

#### CreateSharedWalletModal Update

- [ ] Update `components/musig2/CreateSharedWalletModal.vue` with wizard flow

  **Step 1: Name & Description**

  - Wallet name input
  - Optional description

  **Step 2: Select Participants**

  - Use ParticipantSelector component
  - Show online status
  - Minimum 2 participants (including self)

  **Step 3: Configure Threshold**

  - Threshold selector (M of N)
  - Explanation of threshold meaning

  **Step 4: Review & Create**

  - Summary of all settings
  - Participant list with public keys
  - Create button

#### SharedWalletDetail Update

- [ ] Update `components/musig2/SharedWalletDetail.vue`
  ```vue
  <template>
    <div class="space-y-6">
      <!-- Balance Hero -->
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500">Shared Balance</p>
          <AmountDisplay :sats="wallet.balance" size="xl" />
          <p class="text-xs text-gray-400 mt-1">
            {{ wallet.threshold }} of {{ wallet.participants.length }} required
          </p>
        </div>
      </UCard>

      <!-- Actions -->
      <div class="grid grid-cols-2 gap-4">
        <UButton block @click="showFundModal = true">
          <UIcon name="i-heroicons-arrow-down-tray" />
          Fund
        </UButton>
        <UButton block color="primary" @click="showSpendModal = true">
          <UIcon name="i-heroicons-arrow-up-tray" />
          Spend
        </UButton>
      </div>

      <!-- Participants -->
      <UCard>
        <template #header>Participants</template>
        <div class="divide-y divide-default">
          <div v-for="p in wallet.participants" :key="p.publicKey">
            <!-- Participant row -->
          </div>
        </div>
      </UCard>

      <!-- Transaction History -->
      <UCard>
        <template #header>Recent Activity</template>
        <!-- Transaction list -->
      </UCard>
    </div>
  </template>
  ```

#### FundWalletModal Update

- [ ] Update `components/musig2/FundWalletModal.vue`
  - Show shared wallet address with QR code
  - Option to fund from personal wallet
  - Amount input with balance check
  - Fee estimation
  - Confirmation step

---

### 5.2 Session Monitor (Service Worker)

**Source**: background-service-worker/03_SESSION_MONITOR.md
**Effort**: 1 day

#### Session Monitor Module

- [ ] Create `service-worker/modules/session-monitor.ts`

  ```typescript
  interface SessionInfo {
    id: string
    type: 'musig2' | 'p2p_presence'
    expiresAt: number
    warningAt: number // When to send warning (e.g., 1 min before expiry)
    data: Record<string, unknown>
  }

  class SessionMonitor {
    private sessions: Map<string, SessionInfo> = new Map()
    private checkInterval: number | null = null

    addSession(session: SessionInfo) {
      this.sessions.set(session.id, session)
      this.ensureMonitoring()
    }

    removeSession(id: string) {
      this.sessions.delete(id)
      if (this.sessions.size === 0) {
        this.stopMonitoring()
      }
    }

    private checkSessions() {
      const now = Date.now()

      for (const [id, session] of this.sessions) {
        // Check for expiry warning
        if (now >= session.warningAt && !session.warningSent) {
          this.sendWarning(session)
          session.warningSent = true
        }

        // Check for expiry
        if (now >= session.expiresAt) {
          this.sendExpiry(session)
          this.sessions.delete(id)
        }
      }
    }

    private sendWarning(session: SessionInfo) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SESSION_EXPIRING',
            payload: {
              sessionId: session.id,
              sessionType: session.type,
              expiresIn: session.expiresAt - Date.now(),
            },
          })
        })
      })
    }
  }
  ```

#### Signing Request Tracking

- [ ] Add signing request tracking

  ```typescript
  interface SigningRequest {
    id: string
    fromPeerId: string
    receivedAt: number
    expiresAt: number
    status: 'pending' | 'accepted' | 'rejected'
  }

  // Track incoming requests
  addSigningRequest(request: SigningRequest) {
    // Store request
    // Set up expiry monitoring
    // Send notification to clients
  }
  ```

#### Presence Refresh Signaling

- [ ] Add presence refresh signaling
  ```typescript
  // Signal client to refresh P2P presence
  private schedulePresenceRefresh(intervalMs: number) {
    setInterval(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'REFRESH_PRESENCE',
            payload: { timestamp: Date.now() }
          })
        })
      })
    }, intervalMs)
  }
  ```

#### Service Worker Integration

- [ ] Update `service-worker/sw.ts` to include session monitor

  ```typescript
  import { SessionMonitor } from './modules/session-monitor'

  const sessionMonitor = new SessionMonitor()

  self.addEventListener('message', async event => {
    switch (event.data?.type) {
      case 'REGISTER_SESSION':
        sessionMonitor.addSession(event.data.payload)
        break
      case 'UNREGISTER_SESSION':
        sessionMonitor.removeSession(event.data.payload.id)
        break
      case 'REGISTER_SIGNING_REQUEST':
        sessionMonitor.addSigningRequest(event.data.payload)
        break
    }
  })
  ```

---

### 5.3 Store Integration

**Effort**: 0.5 days

#### MuSig2 Store Updates

- [ ] Verify `createSharedWallet` action works

  ```typescript
  async createSharedWallet(config: SharedWalletConfig) {
    // Create wallet via service
    const wallet = await musig2Service.createSharedWallet(config)

    // Add to state
    this.sharedWallets.push(wallet)

    // Persist
    await this.persistWallets()

    return wallet
  }
  ```

- [ ] Verify `deleteSharedWallet` action works
- [ ] Verify `refreshSharedWalletBalances` action works
- [ ] Verify `sharedWallets` state persists across refresh

#### Session Registration with SW

- [ ] Register sessions with service worker

  ```typescript
  // In musig2 store or service
  async startSigningSession(sessionId: string, expiresAt: Date) {
    const { postMessage } = useServiceWorker()

    postMessage({
      type: 'REGISTER_SESSION',
      payload: {
        id: sessionId,
        type: 'musig2',
        expiresAt: expiresAt.getTime(),
        warningAt: expiresAt.getTime() - 60_000, // 1 min warning
      }
    })
  }
  ```

- [ ] Handle session expiry messages
  ```typescript
  // In app.vue or plugin
  onMessage(event => {
    if (event.data?.type === 'SESSION_EXPIRING') {
      const musig2Store = useMusig2Store()
      musig2Store.handleSessionExpiring(event.data.payload)
    }
  })
  ```

---

### 5.4 Page Integration

**Effort**: 0.5 days

#### Shared Wallets Index Page

- [ ] Verify `pages/people/shared-wallets/index.vue` works

  ```vue
  <script setup lang="ts">
  const musig2Store = useMusig2Store()
  const showCreateModal = ref(false)

  function handleWalletSelect(wallet: SharedWallet) {
    navigateTo(`/people/shared-wallets/${wallet.id}`)
  }
  </script>

  <template>
    <div class="max-w-3xl mx-auto p-4 space-y-6">
      <SharedWalletList
        @select="handleWalletSelect"
        @create="showCreateModal = true"
      />

      <CreateSharedWalletModal v-model="showCreateModal" />
    </div>
  </template>
  ```

#### Shared Wallet Detail Page

- [ ] Verify `pages/people/shared-wallets/[id].vue` works

  ```vue
  <script setup lang="ts">
  const route = useRoute()
  const musig2Store = useMusig2Store()

  const wallet = computed(() =>
    musig2Store.sharedWallets.find(w => w.id === route.params.id),
  )
  </script>

  <template>
    <div class="max-w-3xl mx-auto p-4">
      <SharedWalletDetail v-if="wallet" :wallet="wallet" />
      <div v-else class="text-center py-8">Wallet not found</div>
    </div>
  </template>
  ```

---

## File Changes Summary

### New Files

| File                                        | Purpose                |
| ------------------------------------------- | ---------------------- |
| `service-worker/modules/session-monitor.ts` | Session tracking in SW |

### Modified Files

| File                                            | Changes                   |
| ----------------------------------------------- | ------------------------- |
| `service-worker/sw.ts`                          | Import session monitor    |
| `components/musig2/SharedWalletList.vue`        | Refresh, empty state      |
| `components/musig2/SharedWalletCard.vue`        | Participant info, actions |
| `components/musig2/CreateSharedWalletModal.vue` | Wizard flow               |
| `components/musig2/SharedWalletDetail.vue`      | Full detail view          |
| `components/musig2/FundWalletModal.vue`         | Funding options           |
| `stores/musig2.ts`                              | SW integration            |
| `pages/people/shared-wallets/index.vue`         | List page                 |
| `pages/people/shared-wallets/[id].vue`          | Detail page               |

---

## UI Specifications

### Shared Wallet Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Family Savings                                           2 of 3        │
│  ──────────────────────────────────────────────────────────────────────────│
│  Balance: 5,000.00 XPI                                                     │
│  Participants: You, Alice, Bob                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔔 1 pending spend proposal                                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Create Shared Wallet Wizard

```
Step 1: Name                    Step 2: Participants
┌─────────────────────────┐    ┌─────────────────────────┐
│ Wallet Name             │    │ Select Participants     │
│ [Family Savings      ]  │    │                         │
│                         │    │ [✓] You (required)      │
│ Description (optional)  │    │ [✓] Alice    🟢 Online  │
│ [Joint savings account] │    │ [✓] Bob      🟢 Online  │
│                         │    │ [ ] Charlie  ⚫ Offline │
│ [Next →]                │    │                         │
└─────────────────────────┘    │ [← Back] [Next →]       │
                               └─────────────────────────┘

Step 3: Threshold               Step 4: Review
┌─────────────────────────┐    ┌─────────────────────────┐
│ Required Signatures     │    │ Review & Create         │
│                         │    │                         │
│ [2] of 3 participants   │    │ Name: Family Savings    │
│                         │    │ Threshold: 2 of 3       │
│ ℹ️ 2 participants must  │    │ Participants:           │
│ approve each spend      │    │ • You (02a1b2...)       │
│                         │    │ • Alice (03c4d5...)     │
│ [← Back] [Next →]       │    │ • Bob (02e6f7...)       │
└─────────────────────────┘    │                         │
                               │ [← Back] [Create]       │
                               └─────────────────────────┘
```

---

## Verification Checklist

### Shared Wallet Components

- [ ] SharedWalletList shows all wallets
- [ ] SharedWalletCard displays correct info
- [ ] CreateSharedWalletModal wizard works
- [ ] SharedWalletDetail shows all sections
- [ ] FundWalletModal works correctly

### Session Monitor (SW)

- [ ] Sessions are registered with SW
- [ ] Warning sent 1 minute before expiry
- [ ] Expiry notification sent at timeout
- [ ] Sessions removed after expiry

### Store Integration

- [ ] Wallet creation persists
- [ ] Wallet deletion works
- [ ] Balance refresh works
- [ ] SW messages handled correctly

### Page Navigation

- [ ] List page shows all wallets
- [ ] Clicking wallet navigates to detail
- [ ] Detail page shows correct wallet
- [ ] Back navigation works

---

## Notes

- Session monitor runs in service worker for background operation
- Shared wallet data persists in IndexedDB via store
- Wizard flow provides progressive disclosure
- All components follow existing design patterns

---

## Next Phase

After completing Phase 5, proceed to:

- **Phase 6**: Signing Flow and Notifications

---

_Source: unified-p2p-musig2-ui/03_MUSIG2_CORE.md, background-service-worker/03_SESSION_MONITOR.md_
