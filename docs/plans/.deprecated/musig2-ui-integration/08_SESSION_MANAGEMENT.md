# 08: Session Management

## Overview

This document details the management of active signing sessions. Users need visibility into ongoing sessions, their progress, and the ability to manage them.

---

## Session States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SIGNING SESSION STATES                                │
└─────────────────────────────────────────────────────────────────────────────┘

created ──► nonce_exchange ──► signing ──► completed
    │              │              │
    │              │              │
    ▼              ▼              ▼
 aborted        aborted        aborted
    │              │              │
    └──────────────┴──────────────┘
                   │
                   ▼
                failed
```

### State Descriptions

| State            | Description                                 | User Action      |
| ---------------- | ------------------------------------------- | ---------------- |
| `created`        | Session announced, waiting for participants | Wait or cancel   |
| `nonce_exchange` | Exchanging nonces with participants         | Wait             |
| `signing`        | Exchanging partial signatures               | Wait             |
| `completed`      | Transaction broadcast successfully          | View result      |
| `aborted`        | Session cancelled by a participant          | View reason      |
| `failed`         | Session failed (timeout, error)             | Retry or dismiss |

---

## Sessions List UI

### Active Sessions Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⏳ Active Signing Sessions (2)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔄 Family Treasury → Bob                                             │   │
│  │    1,000.00 XPI • Nonce exchange (1/2)                              │   │
│  │    Started 2 min ago • Expires in 4:32                              │   │
│  │                                                                      │   │
│  │    [View Progress]  [Cancel]                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔄 Business Fund → Carol                                             │   │
│  │    5,000.00 XPI • Waiting for participants (2/3)                    │   │
│  │    Started 5 min ago • Expires in 1:45                              │   │
│  │                                                                      │   │
│  │    [View Progress]  [Cancel]                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Session History

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📜 Recent Sessions                                              [View All]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ Family Treasury → Alice • 500 XPI              Completed • Dec 10       │
│  ❌ Business Fund → Dave • 2,000 XPI               Rejected • Dec 9         │
│  ✅ Family Treasury → Bob • 1,000 XPI              Completed • Dec 8        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Implementation

### File: `components/musig2/SessionList.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  sessions: WalletSigningSession[]
  showHistory?: boolean
}>()

const emit = defineEmits<{
  viewSession: [session: WalletSigningSession]
  cancelSession: [session: WalletSigningSession]
}>()

// Separate active and completed sessions
const activeSessions = computed(() =>
  props.sessions.filter(
    s => !['completed', 'failed', 'aborted'].includes(s.state),
  ),
)

const completedSessions = computed(
  () =>
    props.sessions
      .filter(s => ['completed', 'failed', 'aborted'].includes(s.state))
      .slice(0, 5), // Show last 5
)
</script>

<template>
  <div class="space-y-6">
    <!-- Active Sessions -->
    <UCard v-if="activeSessions.length > 0">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-loader-2"
            class="w-5 h-5 text-primary animate-spin"
          />
          <span class="font-semibold">Active Signing Sessions</span>
          <UBadge color="primary">{{ activeSessions.length }}</UBadge>
        </div>
      </template>

      <div class="space-y-3">
        <Musig2SessionCard
          v-for="session in activeSessions"
          :key="session.id"
          :session="session"
          @view="emit('viewSession', session)"
          @cancel="emit('cancelSession', session)"
        />
      </div>
    </UCard>

    <!-- Empty state for active -->
    <UCard v-else-if="!showHistory">
      <div class="text-center py-6">
        <UIcon
          name="i-lucide-check-circle"
          class="w-12 h-12 text-muted mx-auto mb-2"
        />
        <p class="text-muted">No active signing sessions</p>
      </div>
    </UCard>

    <!-- Session History -->
    <UCard v-if="showHistory && completedSessions.length > 0">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-history" class="w-5 h-5 text-muted" />
            <span class="font-semibold">Recent Sessions</span>
          </div>
          <UButton variant="ghost" size="xs">View All</UButton>
        </div>
      </template>

      <div class="space-y-2">
        <Musig2SessionHistoryItem
          v-for="session in completedSessions"
          :key="session.id"
          :session="session"
          @click="emit('viewSession', session)"
        />
      </div>
    </UCard>
  </div>
</template>
```

### File: `components/musig2/SessionCard.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  session: WalletSigningSession
}>()

const emit = defineEmits<{
  view: []
  cancel: []
}>()

const musig2Store = useMuSig2Store()
const contactStore = useContactStore()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

// Get wallet for this session
const wallet = computed(() => {
  // Find by session metadata or participants
  return musig2Store.sharedWallets[0] // Simplified
})

// Session progress
const progressText = computed(() => {
  switch (props.session.state) {
    case 'created':
      const joined = props.session.participants.filter(p => p.hasNonce).length
      return `Waiting for participants (${joined}/${props.session.participants.length})`
    case 'nonce_exchange':
      const nonces = props.session.participants.filter(p => p.hasNonce).length
      return `Nonce exchange (${nonces}/${props.session.participants.length})`
    case 'signing':
      const sigs = props.session.participants.filter(
        p => p.hasPartialSig,
      ).length
      return `Collecting signatures (${sigs}/${props.session.participants.length})`
    default:
      return props.session.state
  }
})

// Time remaining
const expiresIn = computed(() => {
  const remaining = props.session.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isExpiringSoon = computed(() => {
  const remaining = props.session.expiresAt - Date.now()
  return remaining > 0 && remaining < 60000 // Less than 1 minute
})
</script>

<template>
  <div
    class="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
  >
    <div class="flex items-start gap-4">
      <!-- Status icon -->
      <div
        class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="w-5 h-5 text-primary animate-spin"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium">
            {{ wallet?.name || 'Shared Wallet' }}
          </p>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-muted" />
          <span class="text-muted">Recipient</span>
        </div>

        <p class="text-lg font-bold mb-1">
          {{ formatXPI(BigInt(session.messageHex?.length || 0)) }}
        </p>

        <p class="text-sm text-muted">
          {{ progressText }}
        </p>

        <div class="flex items-center gap-3 mt-2 text-xs text-muted">
          <span>Started {{ timeAgo(session.createdAt) }}</span>
          <span>•</span>
          <span :class="isExpiringSoon && 'text-warning'">
            Expires in {{ expiresIn }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2 flex-shrink-0">
        <UButton size="sm" variant="ghost" @click="emit('view')">
          View Progress
        </UButton>
        <UButton
          size="sm"
          variant="outline"
          color="red"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="mt-4">
      <div class="h-1 bg-muted rounded-full overflow-hidden">
        <div
          class="h-full bg-primary transition-all duration-500"
          :style="{
            width:
              session.state === 'created'
                ? '25%'
                : session.state === 'nonce_exchange'
                ? '50%'
                : session.state === 'signing'
                ? '75%'
                : '100%',
          }"
        />
      </div>
    </div>
  </div>
</template>
```

### File: `components/musig2/SessionHistoryItem.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  session: WalletSigningSession
}>()

const { formatXPI } = useAmount()
const { formatDate } = useTime()

const statusIcon = computed(() => {
  switch (props.session.state) {
    case 'completed':
      return { name: 'i-lucide-check-circle', class: 'text-green-500' }
    case 'aborted':
      return { name: 'i-lucide-x-circle', class: 'text-red-500' }
    case 'failed':
      return { name: 'i-lucide-alert-circle', class: 'text-red-500' }
    default:
      return { name: 'i-lucide-circle', class: 'text-muted' }
  }
})

const statusText = computed(() => {
  switch (props.session.state) {
    case 'completed':
      return 'Completed'
    case 'aborted':
      return 'Cancelled'
    case 'failed':
      return 'Failed'
    default:
      return props.session.state
  }
})
</script>

<template>
  <div
    class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
  >
    <UIcon :name="statusIcon.name" :class="['w-5 h-5', statusIcon.class]" />

    <div class="flex-1 min-w-0">
      <p class="text-sm truncate">Shared Wallet → Recipient</p>
    </div>

    <div class="text-right text-sm">
      <p class="font-medium">{{ formatXPI(BigInt(0)) }}</p>
      <p class="text-xs text-muted">
        {{ statusText }} • {{ formatDate(session.updatedAt) }}
      </p>
    </div>
  </div>
</template>
```

---

## Session Detail Modal

### File: `components/musig2/SessionDetailModal.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  session: WalletSigningSession | null
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  cancel: []
}>()

const musig2Store = useMuSig2Store()
const contactStore = useContactStore()
const p2pStore = useP2PStore()
const { formatXPI } = useAmount()
const { formatDate, timeAgo } = useTime()

// Wallet
const wallet = computed(() => {
  if (!props.session) return null
  return musig2Store.sharedWallets[0] // Simplified
})

// Participants with status
const participants = computed(() => {
  if (!props.session) return []
  return props.session.participants.map(p => ({
    ...p,
    isMe: p.peerId === p2pStore.peerId,
    isOnline: p2pStore.isPeerOnline(p.peerId),
    contact: contactStore.contactList.find(c => c.publicKey === p.publicKeyHex),
  }))
})

// Progress steps
const steps = computed(() => {
  if (!props.session) return []

  const state = props.session.state
  const participants = props.session.participants

  return [
    {
      label: 'Session created',
      status: 'complete',
    },
    {
      label: `Participants joined (${participants.length}/${participants.length})`,
      status: state === 'created' ? 'current' : 'complete',
    },
    {
      label: `Nonces shared (${participants.filter(p => p.hasNonce).length}/${
        participants.length
      })`,
      status:
        state === 'nonce_exchange'
          ? 'current'
          : ['signing', 'completed'].includes(state)
          ? 'complete'
          : 'pending',
    },
    {
      label: `Signatures collected (${
        participants.filter(p => p.hasPartialSig).length
      }/${participants.length})`,
      status:
        state === 'signing'
          ? 'current'
          : state === 'completed'
          ? 'complete'
          : 'pending',
    },
    {
      label: 'Transaction broadcast',
      status: state === 'completed' ? 'complete' : 'pending',
    },
  ]
})

// Expiration
const expiresIn = computed(() => {
  if (!props.session) return ''
  const remaining = props.session.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isActive = computed(() => {
  if (!props.session) return false
  return !['completed', 'failed', 'aborted'].includes(props.session.state)
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #content>
      <UCard v-if="session">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              :name="
                session.state === 'completed'
                  ? 'i-lucide-check-circle'
                  : 'i-lucide-loader-2'
              "
              :class="[
                'w-5 h-5',
                session.state === 'completed'
                  ? 'text-green-500'
                  : 'text-primary animate-spin',
              ]"
            />
            <span class="font-semibold">
              {{
                session.state === 'completed'
                  ? 'Session Complete'
                  : 'Signing Session'
              }}
            </span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Transaction summary -->
          <div class="p-4 bg-muted/50 rounded-lg text-center">
            <p class="text-2xl font-bold">{{ formatXPI(BigInt(0)) }}</p>
            <p class="text-sm text-muted">
              {{ wallet?.name || 'Shared Wallet' }} → Recipient
            </p>
          </div>

          <!-- Progress -->
          <div class="space-y-2">
            <p class="text-sm font-medium">Progress</p>
            <div class="space-y-2">
              <div
                v-for="step in steps"
                :key="step.label"
                class="flex items-center gap-3"
              >
                <UIcon
                  v-if="step.status === 'complete'"
                  name="i-lucide-check-circle"
                  class="w-5 h-5 text-green-500"
                />
                <UIcon
                  v-else-if="step.status === 'current'"
                  name="i-lucide-loader-2"
                  class="w-5 h-5 text-primary animate-spin"
                />
                <UIcon
                  v-else
                  name="i-lucide-circle"
                  class="w-5 h-5 text-muted"
                />
                <span
                  :class="[
                    step.status === 'complete' &&
                      'text-green-600 dark:text-green-400',
                    step.status === 'current' && 'font-medium',
                    step.status === 'pending' && 'text-muted',
                  ]"
                >
                  {{ step.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Participants -->
          <div class="space-y-2">
            <p class="text-sm font-medium">Participants</p>
            <div class="space-y-2">
              <div
                v-for="p in participants"
                :key="p.peerId"
                class="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div class="flex items-center gap-2">
                  <span>{{
                    p.isMe ? 'You' : p.contact?.name || 'Unknown'
                  }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    v-if="p.hasPartialSig"
                    color="green"
                    variant="subtle"
                    size="xs"
                  >
                    Signed
                  </UBadge>
                  <UBadge
                    v-else-if="p.hasNonce"
                    color="primary"
                    variant="subtle"
                    size="xs"
                  >
                    Nonce shared
                  </UBadge>
                  <UBadge v-else color="neutral" variant="subtle" size="xs">
                    Waiting
                  </UBadge>
                </div>
              </div>
            </div>
          </div>

          <!-- Timing -->
          <div class="flex justify-between text-sm text-muted">
            <span>Started {{ timeAgo(session.createdAt) }}</span>
            <span v-if="isActive">Expires in {{ expiresIn }}</span>
            <span v-else>{{ formatDate(session.updatedAt) }}</span>
          </div>

          <!-- Transaction ID (if completed) -->
          <div
            v-if="session.state === 'completed'"
            class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
          >
            <p
              class="text-sm font-medium text-green-700 dark:text-green-300 mb-1"
            >
              Transaction Broadcast
            </p>
            <code class="text-xs break-all">
              {{ session.txid || 'Transaction ID' }}
            </code>
          </div>
        </div>

        <template #footer>
          <div class="flex gap-3">
            <UButton
              v-if="isActive"
              class="flex-1"
              variant="outline"
              color="red"
              @click="emit('cancel')"
            >
              Cancel Session
            </UButton>
            <UButton class="flex-1" color="primary" @click="open = false">
              {{ isActive ? 'Close' : 'Done' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## Implementation Checklist

### Components

- [ ] `SessionList.vue` - List active and historical sessions
- [ ] `SessionCard.vue` - Active session card with progress
- [ ] `SessionHistoryItem.vue` - Completed session item
- [ ] `SessionDetailModal.vue` - Full session details

### Features

- [ ] Show active sessions with progress
- [ ] Show session history
- [ ] Cancel active sessions
- [ ] View session details
- [ ] Expiration countdown

### Integration

- [ ] Add to P2P page
- [ ] Add to shared wallet detail page
- [ ] Update on session state changes

---

## Files to Create/Modify

| File                                       | Action | Description            |
| ------------------------------------------ | ------ | ---------------------- |
| `components/musig2/SessionList.vue`        | Create | Session list container |
| `components/musig2/SessionCard.vue`        | Create | Active session card    |
| `components/musig2/SessionHistoryItem.vue` | Create | History item           |
| `components/musig2/SessionDetailModal.vue` | Create | Detail modal           |

---

_Next: [09_CONTACT_INTEGRATION.md](./09_CONTACT_INTEGRATION.md)_
