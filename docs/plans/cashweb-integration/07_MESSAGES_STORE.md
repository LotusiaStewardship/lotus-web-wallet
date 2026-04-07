# Phase 7: Messages Store

## Objective

Create a Pinia store for message state management, providing reactive message lists for UI components and synchronization with the service worker.

**Estimated Effort**: 2 days
**Priority**: P1 (High)

---

## Source Files

| Source | Purpose |
|--------|---------|
| `stamp/src/cashweb/relay/storage/storage.ts` | MessageStore interface |
| `lotus-web-wallet/stores/wallet.ts` | Reference store pattern |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MESSAGES FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  UI Component                                                                    │
│       │                                                                         │
│       ▼                                                                         │
│  stores/messages.ts  ←──→  composables/useMessages.ts                           │
│       │                                                                         │
│       ▼                                                                         │
│  service-worker/modules/relay-sync.ts                                           │
│       │                                                                         │
│       ▼                                                                         │
│  service-worker/modules/state-sync.ts (IndexedDB)                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Store File

Create `stores/messages.ts`:

```typescript
/**
 * Messages Store
 *
 * Manages message state for the application.
 * Syncs with service worker for background message receipt.
 */
import { defineStore } from 'pinia'

export interface MessageItem {
  type: 'text' | 'image' | 'stealth' | 'reply' | 'p2pkh'
  // Type-specific fields
  text?: string
  image?: ImageData
  amount?: number
  payloadDigest?: string
}

export interface MessageWrapper {
  id: string
  sourceAddress: string
  destinationAddress: string
  items: MessageItem[]
  timestamp: number
  outbound: boolean
  read: boolean
  payloadDigest: string
}

export const useMessagesStore = defineStore('messages', () => {
  // ============================================================================
  // State
  // ============================================================================
  const messages = ref<MessageWrapper[]>([])
  const loading = ref(false)
  const connected = ref(false)
  const lastSyncTime = ref(0)
  const unreadCount = ref(0)

  // ============================================================================
  // Getters
  // ============================================================================
  const sortedMessages = computed(() =>
    [...messages.value].sort((a, b) => b.timestamp - a.timestamp)
  )

  const conversations = computed(() => {
    const map = new Map<string, MessageWrapper[]>()
    for (const msg of messages.value) {
      const address = msg.outbound ? msg.destinationAddress : msg.sourceAddress
      const existing = map.get(address) || []
      existing.push(msg)
      map.set(address, existing)
    }
    return map
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Initialize store and sync with service worker
   */
  async function initialize() {
    const { getMessages } = useRelaySync()
    const storedMessages = await getMessages()
    messages.value = storedMessages
    updateUnreadCount()
  }

  /**
   * Add a message (from service worker or local send)
   */
  function addMessage(message: MessageWrapper) {
    // Check for duplicate
    if (messages.value.some(m => m.payloadDigest === message.payloadDigest)) {
      return
    }

    messages.value.push(message)
    if (!message.read && !message.outbound) {
      unreadCount.value++
    }
  }

  /**
   * Mark a message as read
   */
  async function markRead(payloadDigest: string) {
    const message = messages.value.find(m => m.payloadDigest === payloadDigest)
    if (message && !message.read) {
      message.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)

      // Sync with service worker
      const { markMessageRead } = useRelaySync()
      await markMessageRead(payloadDigest)
    }
  }

  /**
   * Send a message
   */
  async function sendMessage(
    destinationAddress: string,
    items: MessageItem[],
    stampAmount: number = 1000,
  ): Promise<string> {
    const relay = useRelayClient()
    const wallet = useWalletStore()

    loading.value = true

    try {
      const result = await relay.sendMessage(
        destinationAddress,
        items,
        stampAmount,
      )

      // Add to local store
      const message: MessageWrapper = {
        id: crypto.randomUUID(),
        sourceAddress: wallet.address,
        destinationAddress,
        items,
        timestamp: Date.now(),
        outbound: true,
        read: true,
        payloadDigest: result.payloadDigest,
      }

      addMessage(message)

      return result.payloadDigest
    } finally {
      loading.value = false
    }
  }

  /**
   * Get conversation with a specific address
   */
  function getConversation(address: string): MessageWrapper[] {
    return sortedMessages.value.filter(
      m => m.sourceAddress === address || m.destinationAddress === address
    )
  }

  /**
   * Set connection state (called by service worker listener)
   */
  function setConnected(value: boolean) {
    connected.value = value
  }

  /**
   * Update unread count
   */
  function updateUnreadCount() {
    unreadCount.value = messages.value.filter(m => !m.read && !m.outbound).length
  }

  return {
    // State
    messages,
    loading,
    connected,
    lastSyncTime,
    unreadCount,

    // Getters
    sortedMessages,
    conversations,

    // Actions
    initialize,
    addMessage,
    markRead,
    sendMessage,
    getConversation,
    setConnected,
    updateUnreadCount,
  }
})
```

### Step 2: Create Composable

Create `composables/useMessages.ts`:

```typescript
/**
 * Messages Composable
 *
 * Provides message operations for components.
 */
export function useMessages() {
  const messagesStore = useMessagesStore()
  const { $relay } = useNuxtApp()

  // Initialize on first use
  onMounted(() => {
    if (!messagesStore.lastSyncTime) {
      messagesStore.initialize()
    }
  })

  /**
   * Send a text message
   */
  async function sendTextMessage(
    destinationAddress: string,
    text: string,
    stampAmount?: number,
  ): Promise<string> {
    return messagesStore.sendMessage(
      destinationAddress,
      [{ type: 'text', text }],
      stampAmount,
    )
  }

  /**
   * Send a payment (stealth)
   */
  async function sendPayment(
    destinationAddress: string,
    amount: number,
    stampAmount?: number,
  ): Promise<string> {
    return messagesStore.sendMessage(
      destinationAddress,
      [{ type: 'stealth', amount }],
      stampAmount,
    )
  }

  /**
   * Get messages for a conversation
   */
  function getConversation(address: string) {
    return messagesStore.getConversation(address)
  }

  /**
   * Mark conversation as read
   */
  async function markConversationRead(address: string): Promise<void> {
    const conversation = messagesStore.getConversation(address)
    for (const message of conversation) {
      if (!message.read) {
        await messagesStore.markRead(message.payloadDigest)
      }
    }
  }

  return {
    // State
    messages: computed(() => messagesStore.sortedMessages),
    conversations: computed(() => messagesStore.conversations),
    loading: computed(() => messagesStore.loading),
    connected: computed(() => messagesStore.connected),
    unreadCount: computed(() => messagesStore.unreadCount),

    // Actions
    sendTextMessage,
    sendPayment,
    getConversation,
    markConversationRead,
    markRead: messagesStore.markRead,
  }
}
```

### Step 3: Create Profiles Store

Create `stores/profiles.ts`:

```typescript
/**
 * Profiles Store
 *
 * Manages profile metadata for contacts and message senders.
 */
import { defineStore } from 'pinia'

export interface Profile {
  address: string
  publicKey?: string
  displayName?: string
  avatar?: string
  bio?: string
  relayUrl?: string
  lastUpdated: number
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<Map<string, Profile>>(new Map())
  const loading = ref(new Set<string>())

  /**
   * Get a profile, fetching if not cached
   */
  async function getProfile(address: string): Promise<Profile | null> {
    // Check cache
    const cached = profiles.value.get(address)
    if (cached && !isStale(cached)) {
      return cached
    }

    // Avoid duplicate fetches
    if (loading.value.has(address)) {
      // Wait for existing fetch
      return new Promise(resolve => {
        const check = () => {
          const p = profiles.value.get(address)
          if (p) resolve(p)
          else setTimeout(check, 100)
        }
        check()
      })
    }

    loading.value.add(address)

    try {
      const registry = useRegistry()
      const metadata = await registry.fetchProfile(address)

      if (!metadata) {
        return null
      }

      const profile: Profile = {
        address,
        publicKey: metadata.publicKey,
        displayName: metadata.displayName,
        avatar: metadata.avatar,
        bio: metadata.bio,
        relayUrl: metadata.relayUrl,
        lastUpdated: Date.now(),
      }

      profiles.value.set(address, profile)
      return profile
    } finally {
      loading.value.delete(address)
    }
  }

  /**
   * Get display name for an address
   */
  function getDisplayName(address: string): string {
    const profile = profiles.value.get(address)
    return profile?.displayName || formatAddress(address)
  }

  /**
   * Get avatar URL for an address
   */
  function getAvatar(address: string): string | null {
    const profile = profiles.value.get(address)
    return profile?.avatar || null
  }

  /**
   * Update own profile
   */
  async function updateOwnProfile(updates: Partial<Profile>): Promise<void> {
    const wallet = useWalletStore()
    const registry = useRegistry()

    await registry.updateProfile({
      displayName: updates.displayName,
      avatar: updates.avatar,
      bio: updates.bio,
    })

    // Update local cache
    const existing = profiles.value.get(wallet.address)
    if (existing) {
      profiles.value.set(wallet.address, {
        ...existing,
        ...updates,
        lastUpdated: Date.now(),
      })
    }
  }

  return {
    profiles,
    getProfile,
    getDisplayName,
    getAvatar,
    updateOwnProfile,
  }
})
```

---

## Type Definitions

```typescript
// utils/types/messages.ts

export interface MessageFilterOptions {
  startTime?: number
  endTime?: number
  address?: string
  unreadOnly?: boolean
}

export interface ConversationSummary {
  address: string
  displayName: string
  avatar: string | null
  lastMessage: MessageWrapper
  unreadCount: number
}
```

---

## Integration Points

### Service Worker

The store syncs with service worker via `useRelaySync()` composable:

- Receives `MESSAGE_RECEIVED` events
- Sends `MARK_MESSAGE_READ` requests
- Fetches cached messages on initialization

### Contacts Store

The contacts store uses profiles store for:

- Display name resolution
- Avatar display

### UI Components

Components use the store via composables:

- `MessageList.vue` - Display messages
- `ConversationList.vue` - Display conversations
- `MessageInput.vue` - Send messages

---

## Verification

### Unit Tests

1. **Message Add**: Verify deduplication
2. **Conversation Grouping**: Verify messages grouped by address
3. **Unread Count**: Verify count updates correctly

### Integration Tests

1. **Send Message**: Full flow from UI to relay
2. **Background Receipt**: Message received while tab backgrounded
3. **Read Sync**: Mark read syncs to service worker

---

## Risks

| Risk | Mitigation |
|------|------------|
| Large message lists | Implement pagination, virtual scrolling |
| Profile fetch spam | Debounce, cache aggressively |
| Store sync conflicts | Service worker is source of truth |

---

## Completion Criteria

- [ ] Store created at `stores/messages.ts`
- [ ] Store created at `stores/profiles.ts`
- [ ] Composable created at `composables/useMessages.ts`
- [ ] Composable created at `composables/useProfiles.ts`
- [ ] Type definitions created
- [ ] Service worker sync implemented
- [ ] Unit tests pass
- [ ] Integration tests pass
