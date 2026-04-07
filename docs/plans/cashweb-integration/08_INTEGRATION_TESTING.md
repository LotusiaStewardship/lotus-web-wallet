# Phase 8: Integration Testing

## Objective

Validate end-to-end CashWeb integration across all components, ensuring message send/receive works correctly across tab states.

**Estimated Effort**: 1-2 days
**Priority**: P0 (Blocking)

---

## Test Scenarios

### 1. Protobuf Serialization

**File**: `tests/utils/cashweb/serialization.spec.ts`

```typescript
describe('Protobuf Serialization', () => {
  it('should serialize and deserialize Message', () => {
    const message: Message = {
      sourceAddress: 'lotus_1abc...',
      destinationAddress: 'lotus_1def...',
      payloadDigest: Buffer.from('abcd', 'hex'),
      payloadSignature: Buffer.from('signature', 'hex'),
      stampAmount: 1000n,
      stampImages: [],
    }

    const serialized = serializeMessage(message)
    const deserialized = deserializeMessage(serialized)

    expect(deserialized.sourceAddress).toBe(message.sourceAddress)
    expect(deserialized.stampAmount).toBe(message.stampAmount)
  })

  it('should serialize and deserialize Payload with all entry types', () => {
    const payload: Payload = {
      entries: [
        { kind: 'text-utf8', body: 'Hello' },
        { kind: 'stealth-payment', body: stealthPaymentBuffer },
        { kind: 'image', body: imageBuffer },
        { kind: 'reply', body: replyDigestBuffer },
      ],
      timestamp: Date.now(),
    }

    const serialized = serializePayload(payload)
    const deserialized = deserializePayload(serialized)

    expect(deserialized.entries).toHaveLength(4)
  })
})
```

### 2. Crypto Worker Operations

**File**: `tests/workers/crypto-cashweb.spec.ts`

```typescript
describe('CashWeb Crypto Operations', () => {
  it('should derive matching stamp keys for sender and receiver', async () => {
    const senderPrivKey = generatePrivateKey()
    const receiverPubKey = generatePrivateKey().toPublicKey()
    const payloadDigest = Buffer.from('digest', 'hex')

    const senderKeys = await cryptoWorker.deriveStampKeys(
      senderPrivKey,
      receiverPubKey,
      payloadDigest,
    )

    // Receiver derives same address
    const receiverSharedKey = deriveSharedKey(receiverPrivKey, senderPubKey)
    const receiverStampAddress = deriveStampAddress(receiverSharedKey, payloadDigest)

    expect(senderKeys.stampAddress).toBe(receiverStampAddress)
  })

  it('should encrypt and decrypt payload', async () => {
    const data = Buffer.from('secret message')
    const key = Buffer.from('32-byte-shared-key-1234567890ab')

    const { data: encrypted, iv, hmac } = await cryptoWorker.encryptPayload(data, key)
    const decrypted = await cryptoWorker.decryptPayload(encrypted, key, iv)

    expect(decrypted.toString()).toBe('secret message')
  })

  it('should derive stealth public key', async () => {
    const ephemeralPrivKey = generatePrivateKey()
    const destPubKey = generatePrivateKey().toPublicKey()

    const { stealthPublicKey, digest } = await cryptoWorker.deriveStealthPublicKey(
      ephemeralPrivKey,
      destPubKey,
    )

    // Verify receiver can derive same key
    const receiverStealthPrivKey = deriveStealthPrivateKey(destPrivKey, ephemeralPubKey)
    expect(receiverStealthPrivKey.toPublicKey().equals(stealthPublicKey)).toBe(true)
  })
})
```

### 3. Relay Plugin Integration

**File**: `tests/plugins/relay.spec.ts`

```typescript
describe('Relay Plugin', () => {
  it('should fetch profile from relay', async () => {
    const profile = await relay.getProfile('lotus_1abc...')
    
    expect(profile.publicKey).toBeDefined()
    expect(profile.relayUrl).toBeDefined()
  })

  it('should send text message', async () => {
    const result = await relay.sendMessage(
      'lotus_1def...',
      [{ type: 'text', text: 'Hello' }],
      1000,
    )

    expect(result.payloadDigest).toBeDefined()
    expect(result.transactions).toHaveLength(1)
  })

  it('should handle relay unavailability with retry', async () => {
    mockRelayUnavailable()
    
    await expect(relay.getProfile('lotus_1abc...')).resolves.toBeDefined()
    
    expect(mockRetryCount).toBeGreaterThan(0)
  })
})
```

### 4. Service Worker Relay

**File**: `tests/service-worker/relay-sync.spec.ts`

```typescript
describe('Service Worker Relay Sync', () => {
  it('should maintain WebSocket connection in background', async () => {
    // Connect
    await serviceWorker.send('CONNECT_RELAY', { relayUrl, address })
    
    // Simulate tab going to background
    await serviceWorker.send('TAB_BACKGROUNDED')
    
    // Wait for potential disconnection
    await sleep(5000)
    
    // Check connection state
    const status = await serviceWorker.send('RELAY_STATUS')
    expect(status.connected).toBe(true)
  })

  it('should store received message in IndexedDB', async () => {
    // Simulate incoming message
    await serviceWorker.simulateMessage({
      sourceAddress: 'lotus_1abc...',
      payload: { entries: [{ kind: 'text-utf8', body: 'Hello' }] },
    })
    
    // Retrieve from IndexedDB
    const messages = await serviceWorker.send('GET_MESSAGES')
    
    expect(messages).toHaveLength(1)
    expect(messages[0].items[0].text).toBe('Hello')
  })

  it('should poll for messages when WebSocket unavailable', async () => {
    mockWebSocketUnavailable()
    
    await serviceWorker.send('CONNECT_RELAY', { relayUrl, address })
    
    // Wait for polling
    await sleep(35000) // > poll interval
    
    expect(mockPollCount).toBeGreaterThan(0)
  })
})
```

### 5. Messages Store

**File**: `tests/stores/messages.spec.ts`

```typescript
describe('Messages Store', () => {
  it('should add message without duplicate', () => {
    const store = useMessagesStore()
    
    store.addMessage(mockMessage)
    store.addMessage(mockMessage) // Duplicate
    
    expect(store.messages).toHaveLength(1)
  })

  it('should group messages into conversations', () => {
    const store = useMessagesStore()
    
    store.addMessage({ ...mockMessage, sourceAddress: 'A', destinationAddress: 'B' })
    store.addMessage({ ...mockMessage, sourceAddress: 'B', destinationAddress: 'A' })
    store.addMessage({ ...mockMessage, sourceAddress: 'C', destinationAddress: 'A' })
    
    expect(store.conversations.size).toBe(2) // B and C
  })

  it('should update unread count correctly', () => {
    const store = useMessagesStore()
    
    store.addMessage({ ...mockMessage, outbound: false, read: false })
    store.addMessage({ ...mockMessage, outbound: false, read: false })
    store.addMessage({ ...mockMessage, outbound: true, read: false })
    
    expect(store.unreadCount).toBe(2)
    
    store.markRead(mockMessage.payloadDigest)
    
    expect(store.unreadCount).toBe(1)
  })
})
```

### 6. End-to-End Message Flow

**File**: `tests/e2e/messaging.spec.ts`

```typescript
describe('End-to-End Messaging', () => {
  it('should send and receive message between two wallets', async () => {
    // Setup two wallets
    const walletA = await setupWallet('wallet-a')
    const walletB = await setupWallet('wallet-b')
    
    // Wallet A sends message to Wallet B
    const { sendTextMessage } = useMessages()
    const digest = await sendTextMessage(walletB.address, 'Hello B!')
    
    // Wait for Wallet B to receive
    await sleep(2000)
    
    // Check Wallet B received message
    const messagesB = await walletB.getMessages()
    expect(messagesB).toContainEqual(
      expect.objectContaining({
        sourceAddress: walletA.address,
        items: expect.arrayContaining([
          expect.objectContaining({ type: 'text', text: 'Hello B!' }),
        ]),
      })
    )
  })

  it('should receive message while tab in background', async () => {
    const wallet = await setupWallet('wallet')
    
    // Connect relay
    const { connect } = useRelaySync()
    await connect(wallet.address)
    
    // Background the tab
    await simulateBackground()
    
    // Send message from another wallet
    const sender = await setupWallet('sender')
    await sender.sendMessage(wallet.address, [{ type: 'text', text: 'Background test' }])
    
    // Wait for delivery
    await sleep(3000)
    
    // Foreground the tab
    await simulateForeground()
    
    // Check message received
    const { messages } = useMessages()
    expect(messages.value).toContainEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ text: 'Background test' }),
        ]),
      })
    )
  })

  it('should handle stealth payment message', async () => {
    const walletA = await setupWallet('wallet-a', { balance: 1000000 })
    const walletB = await setupWallet('wallet-b')
    
    // Send stealth payment
    const { sendPayment } = useMessages()
    await sendPayment(walletB.address, 500000) // 0.5 XPI
    
    // Wait for confirmation
    await sleep(10000)
    
    // Check Wallet B balance increased
    await walletB.refresh()
    expect(walletB.balance.total).toBeGreaterThan(0)
  })
})
```

---

## Test Infrastructure

### Mock Services

```typescript
// tests/mocks/relay-server.ts

export function createMockRelayServer() {
  return {
    start: (port: number) => { /* ... */ },
    stop: () => { /* ... */ },
    simulateMessage: (message: Message) => { /* ... */ },
    simulateDisconnect: () => { /* ... */ },
  }
}

// tests/mocks/registry-server.ts

export function createMockRegistryServer() {
  return {
    start: (port: number) => { /* ... */ },
    stop: () => { /* ... */ },
    setMetadata: (address: string, metadata: ProfileMetadata) => { /* ... */ },
    requirePayment: (address: string, amount: number) => { /* ... */ },
  }
}
```

### Test Utilities

```typescript
// tests/utils/wallet-helpers.ts

export async function setupWallet(
  id: string,
  options?: { balance?: number },
): Promise<TestWallet> {
  const mnemonic = generateMnemonic()
  const wallet = await importWallet(mnemonic)
  
  if (options?.balance) {
    await fundWallet(wallet.address, options.balance)
  }
  
  return {
    id,
    address: wallet.address,
    getMessages: () => wallet.getMessages(),
    sendMessage: (to: string, items: MessageItem[]) => wallet.sendMessage(to, items),
    refresh: () => wallet.refresh(),
    balance: wallet.balance,
  }
}

export async function fundWallet(address: string, amount: number): Promise<void> {
  // Use test faucet or mock Chronik
}
```

---

## Verification Checklist

### Functional Tests

- [ ] Protobuf serialization/deserialization
- [ ] Stamp key derivation matches between sender/receiver
- [ ] Stealth key derivation matches between sender/receiver
- [ ] Encryption/decryption round-trip
- [ ] Profile fetch from relay
- [ ] Message send to relay
- [ ] Message receive via WebSocket
- [ ] Message receive via polling fallback
- [ ] Message storage in IndexedDB
- [ ] Cross-tab message synchronization
- [ ] Background message receipt
- [ ] Stealth payment receipt

### Performance Tests

- [ ] Encryption of 1KB payload < 50ms
- [ ] Message list render with 100 messages < 100ms
- [ ] IndexedDB query for 1000 messages < 100ms

### Error Handling Tests

- [ ] Relay unavailable → retry
- [ ] WebSocket disconnect → reconnect
- [ ] WebSocket unavailable → polling fallback
- [ ] Payment required → handle via PoP
- [ ] Insufficient balance → show error

---

## Completion Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All e2e tests pass
- [ ] Performance benchmarks met
- [ ] Error handling verified
- [ ] Documentation updated with test results
