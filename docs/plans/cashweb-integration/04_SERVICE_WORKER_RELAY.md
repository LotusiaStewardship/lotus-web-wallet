# Phase 4: Service Worker Relay

## Objective

Implement WebSocket persistence and message storage in the service worker for real-time message delivery when the main thread is suspended.

**Estimated Effort**: 2-3 days
**Priority**: P1 (High)

---

## Source Files

| Source | Purpose |
|--------|---------|
| `stamp/src/cashweb/relay/index.ts` | RelayClient WebSocket methods |
| `stamp/src/cashweb/relay/storage/storage.ts` | MessageStore interface |
| `lotus-web-wallet/service-worker/modules/state-sync.ts` | Existing IndexedDB implementation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE WORKER LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │  Relay Sync Module  │  │  Message Store      │  │  Network Monitor    │      │
│  │  ─────────────────  │  │  ─────────────────  │  │  (existing)         │      │
│  │  • WebSocket conn   │  │  • IndexedDB store  │  │                     │      │
│  │  • Message polling  │  │  • Message CRUD     │  │                     │      │
│  │  • Reconnection     │  │  • Deduplication    │  │                     │      │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘      │
│           │                        │                                            │
│           ▼                        ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Message Broker                                   │   │
│  │  • Route messages between client tabs                                   │   │
│  │  • Broadcast new message notifications                                  │   │
│  │  • Handle client subscription requests                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  stores/messages.ts  ←──→  service-worker  ←──→  composables/useMessages.ts     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Relay Sync Module

Create `service-worker/modules/relay-sync.ts`:

```typescript
/**
 * Relay Sync Module for Service Worker
 *
 * Maintains persistent WebSocket connection to relay server
 * and handles message storage in IndexedDB.
 */

/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

export class RelaySync {
  private ws: WebSocket | null = null
  private relayUrl: string | null = null
  private address: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private messageStore: MessageStore | null = null
  private isPolling = false
  private pollInterval: number = 30000 // 30 seconds

  constructor() {
    this.messageStore = new MessageStore()
  }

  // WebSocket management
  connect(relayUrl: string, address: string, token?: string): void
  disconnect(): void
  reconnect(): void
  
  // Message handling
  onMessage(event: MessageEvent): void
  processIncomingMessage(message: Message): Promise<void>
  
  // Polling fallback
  startPolling(): void
  stopPolling(): void
  pollForMessages(): Promise<void>
  
  // State
  isConnected(): boolean
  getConnectionState(): ConnectionState
}

export const relaySync = new RelaySync()
```

### Step 2: Extend State Sync for Messages

Extend `service-worker/modules/state-sync.ts`:

```typescript
// Add to StateSync class

/**
 * Store a message
 */
async storeMessage(message: MessageWrapper): Promise<void> {
  await this.init()
  if (!this.db) return

  const tx = this.db.transaction('messages', 'readwrite')
  const store = tx.objectStore('messages')
  
  store.put({
    payloadDigest: message.payloadDigest,
    message: message,
    timestamp: Date.now(),
    read: false,
  })

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get messages with optional filtering
 */
async getMessages(options?: {
  startTime?: number
  endTime?: number
  unreadOnly?: boolean
}): Promise<MessageWrapper[]> {
  await this.init()
  if (!this.db) return []

  const tx = this.db.transaction('messages', 'readonly')
  const store = tx.objectStore('messages')
  const request = store.getAll()

  return new Promise(resolve => {
    request.onsuccess = () => {
      let messages = request.result as StoredMessage[]
      
      if (options?.startTime) {
        messages = messages.filter(m => m.timestamp >= options.startTime!)
      }
      if (options?.endTime) {
        messages = messages.filter(m => m.timestamp <= options.endTime!)
      }
      if (options?.unreadOnly) {
        messages = messages.filter(m => !m.read)
      }
      
      resolve(messages.map(m => m.message))
    }
    request.onerror = () => resolve([])
  })
}

/**
 * Mark message as read
 */
async markMessageRead(payloadDigest: string): Promise<void> {
  await this.init()
  if (!this.db) return

  const tx = this.db.transaction('messages', 'readwrite')
  const store = tx.objectStore('messages')
  const request = store.get(payloadDigest)

  request.onsuccess = () => {
    const message = request.result
    if (message) {
      message.read = true
      store.put(message)
    }
  }
}
```

### Step 3: Update Service Worker Message Handler

Update `service-worker/sw.ts`:

```typescript
import { relaySync } from './modules/relay-sync'

// Add to message handling switch
case 'CONNECT_RELAY':
  relaySync.connect(payload.relayUrl, payload.address, payload.token)
  break

case 'DISCONNECT_RELAY':
  relaySync.disconnect()
  break

case 'GET_MESSAGES':
  stateSync.getMessages(payload.options).then(messages => {
    ev.ports[0]?.postMessage({
      type: 'MESSAGES',
      payload: { messages },
    })
  })
  break

case 'MARK_MESSAGE_READ':
  stateSync.markMessageRead(payload.payloadDigest)
  break

case 'SEND_MESSAGE':
  // Delegate to relay plugin via client message
  relaySync.sendMessage(payload.message, payload.transactions)
  break

case 'RELAY_STATUS':
  ev.ports[0]?.postMessage({
    connected: relaySync.isConnected(),
    state: relaySync.getConnectionState(),
  })
  break
```

### Step 4: Create Message Store Type

Update `utils/types/sw.ts`:

```typescript
// Add to CashWebMessage types
export interface StoredMessage {
  payloadDigest: string
  message: MessageWrapper
  timestamp: number
  read: boolean
}

export interface MessageWrapper {
  sourceAddress: string
  destinationAddress: string
  payload: Payload
  payloadDigest: string
  timestamp: number
  outbound: boolean
}

// Add to service worker message types
export type ServiceWorkerMessageType =
  // Existing types...
  | 'CONNECT_RELAY'
  | 'DISCONNECT_RELAY'
  | 'GET_MESSAGES'
  | 'MARK_MESSAGE_READ'
  | 'SEND_MESSAGE'
  | 'RELAY_STATUS'
  | 'MESSAGE_RECEIVED'
  | 'RELAY_CONNECTED'
  | 'RELAY_DISCONNECTED'
```

### Step 5: Create Client-Side Sync Composable

Create `composables/useRelaySync.ts`:

```typescript
/**
 * Composable for syncing with relay service worker module
 */
export function useRelaySync() {
  const { $sw } = useNuxtApp()
  const messagesStore = useMessagesStore()
  
  // Listen for service worker messages
  onMounted(() => {
    navigator.serviceWorker.addEventListener('message', handleSwMessage)
  })
  
  onUnmounted(() => {
    navigator.serviceWorker.removeEventListener('message', handleSwMessage)
  })
  
  function handleSwMessage(event: MessageEvent) {
    const { type, payload } = event.data || {}
    
    switch (type) {
      case 'MESSAGE_RECEIVED':
        messagesStore.addMessage(payload.message)
        // Show notification if tab not focused
        if (document.hidden) {
          showNotification(payload.message)
        }
        break
        
      case 'RELAY_CONNECTED':
        messagesStore.setConnected(true)
        break
        
      case 'RELAY_DISCONNECTED':
        messagesStore.setConnected(false)
        break
    }
  }
  
  async function connect(address: string): Promise<void> {
    const relayUrl = await getRelayUrl(address)
    await $sw.postMessage({
      type: 'CONNECT_RELAY',
      payload: { relayUrl, address },
    })
  }
  
  async function getMessages(options?: MessageFilterOptions): Promise<MessageWrapper[]> {
    const response = await $sw.postMessageAndWait({
      type: 'GET_MESSAGES',
      payload: { options },
    })
    return response.payload.messages
  }
  
  return {
    connect,
    getMessages,
    isConnected: messagesStore.isConnected,
  }
}
```

---

## WebSocket Lifecycle

### Connection Flow

```
1. Client requests CONNECT_RELAY
2. Service worker opens WebSocket to relay URL
3. On open: broadcast RELAY_CONNECTED to all clients
4. Subscribe to address for message notifications
5. On message: store in IndexedDB, broadcast MESSAGE_RECEIVED
```

### Reconnection Flow

```
1. WebSocket closes (network change, relay restart)
2. Service worker starts reconnection timer
3. Exponential backoff: 1s, 2s, 4s, 8s... up to 30s
4. On reconnect: resubscribe to address
5. Poll for missed messages during disconnect
```

### Polling Fallback

When WebSocket unavailable:

```
1. Start polling timer (30s interval)
2. HTTP GET /v1/messages/{address}?since={last_message_time}
3. Store new messages in IndexedDB
4. Broadcast MESSAGE_RECEIVED for each new message
```

---

## IndexedDB Schema

Add to existing database:

```typescript
// In openDatabase() upgrade handler
if (!db.objectStoreNames.contains('messages')) {
  const messageStore = db.createObjectStore('messages', {
    keyPath: 'payloadDigest',
  })
  messageStore.createIndex('timestamp', 'timestamp', { unique: false })
  messageStore.createIndex('read', 'read', { unique: false })
  messageStore.createIndex('sourceAddress', 'message.sourceAddress', { unique: false })
}
```

---

## Verification

### Unit Tests

1. **WebSocket Connection**: Mock WebSocket, verify connection flow
2. **Message Storage**: Store and retrieve messages from IndexedDB
3. **Reconnection**: Simulate disconnect, verify reconnection attempts

### Integration Tests

1. **Background Message Receipt**: Send message while tab in background
2. **Cross-Tab Sync**: Same message delivered to multiple tabs
3. **Offline Recovery**: Poll for missed messages after reconnect

---

## Risks

| Risk | Mitigation |
|------|------------|
| WebSocket killed by browser | Use polling fallback, service worker keeps connection alive longer |
| IndexedDB quota exceeded | Implement message pruning, keep only last 1000 messages |
| Message deduplication | Use payloadDigest as primary key, ignore duplicates |

---

## Completion Criteria

- [ ] Relay sync module created at `service-worker/modules/relay-sync.ts`
- [ ] State sync extended with message storage methods
- [ ] Service worker message handler updated
- [ ] Type definitions extended in `utils/types/sw.ts`
- [ ] Client sync composable created at `composables/useRelaySync.ts`
- [ ] WebSocket connection persists when tab backgrounded
- [ ] Messages stored in IndexedDB
- [ ] Polling fallback works when WebSocket unavailable
