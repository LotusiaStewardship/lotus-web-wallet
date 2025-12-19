# Phase 3: Session Management

## Overview

This phase implements full signing session lifecycle management, allowing users to track active sessions, view progress, and manage session state.

**Priority**: P1 (High)
**Estimated Effort**: 2 days
**Dependencies**: Phase 2 Signing Request Flow

---

## Current State

### What Exists

- `SessionList.vue` - List of active sessions
- `SigningSessionProgress.vue` - Progress indicator for sessions
- MuSig2 store with `activeSessions` Map

### What's Missing

- Session detail modal
- Session history persistence
- Session notifications
- Session abort/cancel functionality
- Progress updates from service events

---

## Target Design

### Sessions Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  Active Sessions (2)                                    [+ New]     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔐 CoinJoin Session                           [In Progress]  │   │
│  │ 3 of 5 signers • Started 5 min ago                          │   │
│  │ ████████████░░░░░░░░ 60%                                    │   │
│  │                                          [View] [Abort]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 💰 Spend Transaction                      [Waiting for Bob]  │   │
│  │ 2 of 2 signers • Started 2 min ago                          │   │
│  │ ████████░░░░░░░░░░░░ 40%                                    │   │
│  │                                          [View] [Abort]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Recent Sessions                                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ✅ Escrow Release • Completed 1 hour ago                          │
│  ❌ CoinJoin • Aborted 3 hours ago                                 │
│  ✅ Spend • Completed yesterday                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Session Detail Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  CoinJoin Session                                              [X]  │
├─────────────────────────────────────────────────────────────────────┤
│  Status: In Progress                                                │
│  Progress: ████████████░░░░░░░░ 60%                                │
│                                                                     │
│  Participants (3/5)                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✅ You (Initiator)              Signed                       │   │
│  │ ✅ Alice                        Signed                       │   │
│  │ ✅ Bob                          Signed                       │   │
│  │ ⏳ Carol                        Waiting...                   │   │
│  │ ⏳ Dave                         Waiting...                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Transaction                                                        │
│  Amount: 5,000 XPI                                                 │
│  Fee: 0.5 XPI                                                      │
│  Created: Dec 10, 2024 9:30 PM                                     │
│                                                                     │
│                                    [Copy Session ID] [Abort]        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Task 3.1: Create Session Detail Modal

**File**: `components/p2p/SessionDetailModal.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/types/musig2'

const props = defineProps<{
  session: WalletSigningSession | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  abort: [sessionId: string]
}>()

const { formatXPI } = useAmount()
const { copy } = useClipboard()
const { success } = useNotifications()

// Session progress percentage
const progressPercent = computed(() => {
  if (!props.session) return 0
  const { signedCount, totalSigners } = props.session
  return Math.round((signedCount / totalSigners) * 100)
})

// Session status color
const statusColor = computed(() => {
  if (!props.session) return 'neutral'
  switch (props.session.status) {
    case 'active':
    case 'signing':
      return 'primary'
    case 'completed':
      return 'success'
    case 'aborted':
    case 'failed':
      return 'error'
    default:
      return 'warning'
  }
})

// Participant status
function getParticipantStatus(participant: any) {
  if (participant.signed)
    return { icon: 'i-lucide-check', color: 'text-success', label: 'Signed' }
  if (participant.rejected)
    return { icon: 'i-lucide-x', color: 'text-error', label: 'Rejected' }
  return { icon: 'i-lucide-clock', color: 'text-warning', label: 'Waiting...' }
}

// Copy session ID
function copySessionId() {
  if (props.session) {
    copy(props.session.id)
    success('Copied', 'Session ID copied to clipboard')
  }
}

// Abort session
function handleAbort() {
  if (props.session) {
    emit('abort', props.session.id)
    open.value = false
  }
}

// Format timestamp
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <UModal v-model:open="open" size="lg">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-key" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">
            {{ session?.name || 'Signing Session' }}
          </h3>
          <p class="text-sm text-muted">
            {{ session?.type || 'Multi-signature' }}
          </p>
        </div>
      </div>
    </template>

    <div v-if="session" class="space-y-6 p-4">
      <!-- Status & Progress -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Status</span>
          <UBadge :color="statusColor" variant="subtle">
            {{ session.status }}
          </UBadge>
        </div>
        <div class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="text-muted">Progress</span>
            <span
              >{{ session.signedCount }}/{{ session.totalSigners }} signed</span
            >
          </div>
          <UProgress :value="progressPercent" :color="statusColor" />
        </div>
      </div>

      <!-- Participants -->
      <div>
        <h4 class="text-sm font-medium mb-3">Participants</h4>
        <div class="space-y-2">
          <div
            v-for="participant in session.participants"
            :key="participant.peerId"
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <ContactAvatar :name="participant.nickname" size="sm" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{
                  participant.nickname || 'Anonymous'
                }}</span>
                <UBadge
                  v-if="participant.isInitiator"
                  color="primary"
                  variant="subtle"
                  size="xs"
                >
                  Initiator
                </UBadge>
                <UBadge
                  v-if="participant.isMe"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  You
                </UBadge>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UIcon
                :name="getParticipantStatus(participant).icon"
                :class="['w-4 h-4', getParticipantStatus(participant).color]"
              />
              <span class="text-sm text-muted">
                {{ getParticipantStatus(participant).label }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction Details -->
      <div>
        <h4 class="text-sm font-medium mb-3">Transaction</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Amount</span>
            <span class="font-semibold">{{ formatXPI(session.amount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Fee</span>
            <span>{{ formatXPI(session.fee) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Created</span>
            <span>{{ formatTime(session.createdAt) }}</span>
          </div>
          <div v-if="session.completedAt" class="flex justify-between">
            <span class="text-muted">Completed</span>
            <span>{{ formatTime(session.completedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Session ID -->
      <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs text-muted">Session ID</span>
            <p class="font-mono text-sm truncate">{{ session.id }}</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-copy"
            @click="copySessionId"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <UButton
          v-if="session?.status === 'active' || session?.status === 'signing'"
          color="error"
          variant="soft"
          @click="handleAbort"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4 mr-2" />
          Abort Session
        </UButton>
        <div v-else></div>
        <UButton color="neutral" @click="open = false"> Close </UButton>
      </div>
    </template>
  </UModal>
</template>
```

### Task 3.2: Update Session List Component

**File**: `components/p2p/SessionList.vue` (update)

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/types/musig2'

const props = defineProps<{
  sessions: WalletSigningSession[]
}>()

const emit = defineEmits<{
  view: [session: WalletSigningSession]
  abort: [sessionId: string]
}>()

// Separate active and completed sessions
const activeSessions = computed(() =>
  props.sessions.filter(s => s.status === 'active' || s.status === 'signing'),
)

const completedSessions = computed(() =>
  props.sessions.filter(
    s =>
      s.status === 'completed' ||
      s.status === 'aborted' ||
      s.status === 'failed',
  ),
)

// Progress percentage
function getProgress(session: WalletSigningSession): number {
  return Math.round((session.signedCount / session.totalSigners) * 100)
}

// Status display
function getStatusDisplay(session: WalletSigningSession) {
  switch (session.status) {
    case 'active':
      return { label: 'In Progress', color: 'primary' }
    case 'signing':
      return { label: 'Signing...', color: 'warning' }
    case 'completed':
      return { label: 'Completed', color: 'success', icon: 'i-lucide-check' }
    case 'aborted':
      return { label: 'Aborted', color: 'error', icon: 'i-lucide-x' }
    case 'failed':
      return {
        label: 'Failed',
        color: 'error',
        icon: 'i-lucide-alert-triangle',
      }
    default:
      return { label: session.status, color: 'neutral' }
  }
}

// Time ago
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Active Sessions -->
    <UiAppCard title="Active Sessions" icon="i-lucide-key">
      <template #action>
        <UBadge v-if="activeSessions.length" color="primary" variant="subtle">
          {{ activeSessions.length }}
        </UBadge>
      </template>

      <div v-if="activeSessions.length > 0" class="space-y-4">
        <div
          v-for="session in activeSessions"
          :key="session.id"
          class="p-4 border border-primary/20 bg-primary/5 rounded-lg"
        >
          <div class="flex items-start gap-4">
            <div
              class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-key" class="w-5 h-5 text-primary" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold">{{
                  session.name || session.type
                }}</span>
                <UBadge
                  :color="getStatusDisplay(session).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ getStatusDisplay(session).label }}
                </UBadge>
              </div>

              <p class="text-sm text-muted mb-2">
                {{ session.signedCount }}/{{ session.totalSigners }} signers •
                Started {{ timeAgo(session.createdAt) }}
              </p>

              <UProgress
                :value="getProgress(session)"
                color="primary"
                size="sm"
              />
            </div>

            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                @click="emit('view', session)"
              >
                View
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                @click="emit('abort', session.id)"
              >
                Abort
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <UiAppEmptyState
        v-else
        icon="i-lucide-key"
        title="No active sessions"
        description="Active signing sessions will appear here"
      />
    </UiAppCard>

    <!-- Completed Sessions -->
    <UiAppCard
      v-if="completedSessions.length > 0"
      title="Recent Sessions"
      icon="i-lucide-history"
    >
      <div class="divide-y">
        <div
          v-for="session in completedSessions.slice(0, 5)"
          :key="session.id"
          class="py-3 first:pt-0 last:pb-0 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 transition-colors"
          @click="emit('view', session)"
        >
          <UIcon
            :name="getStatusDisplay(session).icon || 'i-lucide-circle'"
            :class="['w-5 h-5', `text-${getStatusDisplay(session).color}`]"
          />
          <div class="flex-1 min-w-0">
            <span class="font-medium">{{ session.name || session.type }}</span>
          </div>
          <span class="text-sm text-muted">
            {{ timeAgo(session.completedAt || session.createdAt) }}
          </span>
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
        </div>
      </div>
    </UiAppCard>
  </div>
</template>
```

### Task 3.3: Add Session History Persistence

Update the MuSig2 store to persist completed sessions:

```typescript
// In stores/musig2.ts

import { getItem, setItem, STORAGE_KEYS } from '~/services/storage'

// Add to state
state: () => ({
  // ... existing state
  sessionHistory: [] as WalletSigningSession[],
}),

actions: {
  // Load session history on init
  _loadSessionHistory() {
    const saved = getItem<WalletSigningSession[]>(STORAGE_KEYS.MUSIG2_SESSION_HISTORY, [])
    this.sessionHistory = saved
  },

  // Save session to history
  _saveToHistory(session: WalletSigningSession) {
    // Add to beginning
    this.sessionHistory.unshift(session)

    // Keep only last 50
    if (this.sessionHistory.length > 50) {
      this.sessionHistory = this.sessionHistory.slice(0, 50)
    }

    // Persist
    setItem(STORAGE_KEYS.MUSIG2_SESSION_HISTORY, this.sessionHistory)
  },

  // Handle session completion (called by service event)
  _handleSessionCompleted(session: WalletSigningSession) {
    // Remove from active
    this.activeSessions.delete(session.id)

    // Add to history
    this._saveToHistory({
      ...session,
      status: 'completed',
      completedAt: Date.now(),
    })
  },

  // Handle session abort
  async abortSession(sessionId: string, reason?: string) {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    await serviceAbortSession(sessionId, reason)

    // Remove from active
    this.activeSessions.delete(sessionId)

    // Add to history
    this._saveToHistory({
      ...session,
      status: 'aborted',
      completedAt: Date.now(),
      abortReason: reason,
    })
  },
}
```

### Task 3.4: Add Session Notifications

Add toast notifications for session events:

```typescript
// In stores/musig2.ts or a composable

// Session event handlers
function setupSessionNotifications() {
  const { success, warning, error } = useNotifications()

  // Listen for session events from service
  subscribeToMuSig2Events({
    onSessionCreated: session => {
      success('Session Created', `${session.name || 'Signing session'} started`)
    },

    onSessionProgress: session => {
      // Could show progress toast or update UI
    },

    onSessionCompleted: session => {
      success(
        'Session Complete',
        `${session.name || 'Signing session'} completed successfully`,
      )
    },

    onSessionAborted: session => {
      warning(
        'Session Aborted',
        `${session.name || 'Signing session'} was aborted`,
      )
    },

    onSessionFailed: (session, error) => {
      error('Session Failed', error.message || 'Signing session failed')
    },
  })
}
```

---

## Checklist

### Components

- [ ] Create `SessionDetailModal.vue`
- [ ] Update `SessionList.vue` with active/completed sections
- [ ] Update `SigningSessionProgress.vue` if needed

### Store Updates

- [ ] Add `sessionHistory` state
- [ ] Add `_loadSessionHistory` action
- [ ] Add `_saveToHistory` action
- [ ] Add `_handleSessionCompleted` handler
- [ ] Update `abortSession` to save to history

### Storage

- [ ] Add `MUSIG2_SESSION_HISTORY` to storage keys
- [ ] Implement history persistence

### Notifications

- [ ] Add session created notification
- [ ] Add session completed notification
- [ ] Add session aborted notification
- [ ] Add session failed notification

### Page Integration

- [ ] Add session detail modal to page
- [ ] Wire up `handleViewSession` handler
- [ ] Wire up `handleAbortSession` handler

### Testing

- [ ] Sessions display correctly
- [ ] Progress updates in real-time
- [ ] Can view session details
- [ ] Can abort active session
- [ ] Completed sessions appear in history
- [ ] History persists across page reloads

---

_Previous: [02_SIGNING_REQUEST_FLOW.md](./02_SIGNING_REQUEST_FLOW.md)_
_Next: [04_CONTACT_INTEGRATION.md](./04_CONTACT_INTEGRATION.md)_
