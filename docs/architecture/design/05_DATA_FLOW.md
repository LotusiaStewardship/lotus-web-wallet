# Contact-Centric Data Flow

**Version**: 1.0.0  
**Date**: December 2024  
**Status**: Active

---

## Overview

This document describes how data flows through the contact-centric architecture, from external sources (P2P network, blockchain) through the service and store layers to the UI.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA FLOW ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    PRESENTATION LAYER                    │    │
│  │  Pages, Components, Composables                          │    │
│  │  • Contact-aware UI components                           │    │
│  │  • Reactive data binding                                 │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      STATE LAYER                         │    │
│  │  Pinia Stores                                            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ identity │ │ contacts │ │  musig2  │ │   p2p    │    │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │    │
│  └───────┼────────────┼────────────┼────────────┼──────────┘    │
│          │            │            │            │                │
│          ▼            ▼            ▼            ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     SERVICE LAYER                        │    │
│  │  Stateless API Wrappers                                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ chronik  │ │ storage  │ │  musig2  │ │   p2p    │    │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │    │
│  └───────┼────────────┼────────────┼────────────┼──────────┘    │
│          │            │            │            │                │
│          ▼            ▼            ▼            ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    EXTERNAL LAYER                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐     │    │
│  │  │ Chronik  │ │localStorage│ │     lotus-sdk        │     │    │
│  │  │   API    │ │ IndexedDB │ │ (P2P, MuSig2, Bitcore)│     │    │
│  │  └──────────┘ └──────────┘ └──────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Store Relationships

The contact-centric architecture introduces the **Identity Store** as a central hub:

```
┌─────────────────────────────────────────────────────────────────┐
│                    STORE RELATIONSHIPS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      ┌──────────────┐                            │
│                      │   IDENTITY   │                            │
│                      │    STORE     │                            │
│                      │  (canonical) │                            │
│                      └──────┬───────┘                            │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐                │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │  CONTACTS   │    │    P2P      │    │   MUSIG2    │          │
│  │   STORE     │    │   STORE     │    │    STORE    │          │
│  │ (names,     │    │ (presence,  │    │ (wallets,   │          │
│  │  groups)    │    │  discovery) │    │  sessions)  │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                            ▼                                     │
│                    ┌─────────────┐                               │
│                    │   WALLET    │                               │
│                    │    STORE    │                               │
│                    │ (balance,   │                               │
│                    │  history)   │                               │
│                    └─────────────┘                               │
│                                                                  │
│  DATA FLOW:                                                      │
│  • Identity Store: Source of truth for cryptographic identities  │
│  • Contacts Store: References identities, adds relationship data │
│  • P2P Store: Updates identity presence, discovers new identities│
│  • MuSig2 Store: Uses identities for wallet participants         │
│  • Wallet Store: Resolves addresses to contacts for display      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Data Flows

### 1. P2P Signer Discovery → Identity → Contact

When a signer is discovered via P2P:

```
┌─────────────────────────────────────────────────────────────────┐
│              SIGNER DISCOVERY DATA FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. GossipSub Message Received                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ { publicKeyHex, peerId, multiaddrs, capabilities, ... } │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  2. P2P Service Processes    │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ p2pService.handleSignerAdvertisement(ad)                │ │
│     │ • Verify signature                                       │ │
│     │ • Check expiry                                           │ │
│     │ • Emit 'signer:discovered' event                         │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  3. P2P Store Updates        │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ p2pStore._handleSignerDiscovered(signer)                │ │
│     │ • Add to discoveredSigners                               │ │
│     │ • Update identity store                                  │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  4. Identity Store Updated   │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ identityStore.updateFromSigner(signer)                  │ │
│     │ • Find or create identity by publicKeyHex               │ │
│     │ • Update peerId, multiaddrs                              │ │
│     │ • Set isOnline = true                                    │ │
│     │ • Update signerCapabilities                              │ │
│     │ • Derive address if new                                  │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  5. Contact Resolution       │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ // UI checks for existing contact                       │ │
│     │ const contact = contactStore.findByPublicKey(pubKeyHex) │ │
│     │ if (contact) {                                          │ │
│     │   // Show as "Alice (online)" in signer list            │ │
│     │ } else {                                                │ │
│     │   // Show as "Unknown Signer" with [Add to Contacts]    │ │
│     │ }                                                       │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Transaction → Contact Activity Update

When a transaction is received:

```
┌─────────────────────────────────────────────────────────────────┐
│              TRANSACTION DATA FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Chronik WebSocket Event                                      │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ { txid, inputs, outputs, timestamp, ... }               │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  2. Wallet Store Processes   │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ walletStore._handleTransaction(tx)                      │ │
│     │ • Parse inputs/outputs                                   │ │
│     │ • Determine type (send/receive)                          │ │
│     │ • Update balance                                         │ │
│     │ • Add to transaction history                             │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  3. Contact Activity Update  │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ // For each counterparty address                        │ │
│     │ const counterpartyAddress = tx.type === 'send'          │ │
│     │   ? tx.toAddress : tx.fromAddress                       │ │
│     │                                                         │ │
│     │ contactStore.recordTransaction(                         │ │
│     │   counterpartyAddress,                                  │ │
│     │   tx.amount,                                            │ │
│     │   tx.type === 'send',                                   │ │
│     │   tx.timestamp                                          │ │
│     │ )                                                       │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  4. Contact Store Updates    │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ // If contact exists for this address                   │ │
│     │ contact.lastTransactionAt = timestamp                   │ │
│     │ contact.transactionCount++                              │ │
│     │ contact.totalSent += (isSend ? amount : 0)              │ │
│     │ contact.totalReceived += (isSend ? 0 : amount)          │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  5. UI Reactively Updates    │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ // Transaction list shows contact name                  │ │
│     │ // Contact detail shows updated stats                   │ │
│     │ // "Recently Active" contacts list updates              │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Shared Wallet Creation → Participant Contacts

When creating a shared wallet:

```
┌─────────────────────────────────────────────────────────────────┐
│              SHARED WALLET CREATION DATA FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Selects Participants (Contacts)                         │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ selectedContacts = [alice, bob]                         │ │
│     │ // Each must have identityId or publicKey               │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  2. Resolve Public Keys      │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ const participantKeys = selectedContacts.map(c => {     │ │
│     │   if (c.identityId) {                                   │ │
│     │     return identityStore.get(c.identityId).publicKeyHex │ │
│     │   }                                                     │ │
│     │   return c.publicKey // Legacy                          │ │
│     │ })                                                      │ │
│     │ // Add user's own public key                            │ │
│     │ participantKeys.push(walletStore.publicKeyHex)          │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  3. MuSig2 Key Aggregation   │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ musig2Store.createSharedWallet({                        │ │
│     │   name: 'Family Fund',                                  │ │
│     │   participantPublicKeys: participantKeys,               │ │
│     │ })                                                      │ │
│     │                                                         │ │
│     │ // Inside createSharedWallet:                           │ │
│     │ const sortedKeys = [...participantKeys].sort()          │ │
│     │ const aggregatedKey = MuSig2.aggregatePublicKeys(...)   │ │
│     │ const sharedAddress = deriveAddress(aggregatedKey)      │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  4. Create SharedWallet      │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ const wallet: SharedWallet = {                          │ │
│     │   id: generateId('wallet'),                             │ │
│     │   name: 'Family Fund',                                  │ │
│     │   participants: sortedKeys.map(pubKey => ({             │ │
│     │     publicKeyHex: pubKey,                               │ │
│     │     isMe: pubKey === myPublicKey,                       │ │
│     │   })),                                                  │ │
│     │   aggregatedPublicKeyHex,                               │ │
│     │   sharedAddress,                                        │ │
│     │   balanceSats: '0',                                     │ │
│     │   createdAt: Date.now(),                                │ │
│     │ }                                                       │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  5. UI Shows Wallet with Contact Names                           │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ // Resolve participants to contacts for display         │ │
│     │ const participantsWithContacts = wallet.participants    │ │
│     │   .map(p => ({                                          │ │
│     │     ...p,                                               │ │
│     │     contact: contactStore.findByPublicKey(p.publicKeyHex)│ │
│     │   }))                                                   │ │
│     │                                                         │ │
│     │ // Display: "Family Fund (You, Alice, Bob)"             │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Address Display → Contact Resolution

When displaying any address in the UI:

```
┌─────────────────────────────────────────────────────────────────┐
│              ADDRESS DISPLAY DATA FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Component Receives Address                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ <AddressDisplay :address="tx.toAddress" />              │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  2. Contact Resolution       │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ // In AddressDisplay component                          │ │
│     │ const contact = computed(() =>                          │ │
│     │   contactStore.findByAddress(props.address)             │ │
│     │ )                                                       │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  3. Identity Resolution (if contact exists)                      │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ const identity = computed(() => {                       │ │
│     │   if (!contact.value?.identityId) return null           │ │
│     │   return identityStore.get(contact.value.identityId)    │ │
│     │ })                                                      │ │
│     │                                                         │ │
│     │ const isOnline = computed(() =>                         │ │
│     │   identity.value?.isOnline ?? false                     │ │
│     │ )                                                       │ │
│     └────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│  4. Render with Context      │                                   │
│                              ▼                                   │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ // If contact found:                                    │ │
│     │ <ContactAvatar :contact="contact" show-presence />      │ │
│     │ <span>{{ contact.name }}</span>                         │ │
│     │ <span class="text-muted">({{ fingerprint }})</span>     │ │
│     │                                                         │ │
│     │ // If no contact:                                       │ │
│     │ <code>{{ fingerprint }}</code>                          │ │
│     │ <button @click="addToContacts">Add to Contacts</button> │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Synchronization

### Cross-Store Updates

When one store updates, related stores may need to react:

```typescript
// Example: P2P presence update affects contact display

// In p2pStore
function updatePeerPresence(peerId: string, isOnline: boolean) {
  // Update identity store
  const identity = identityStore.findByPeerId(peerId)
  if (identity) {
    identityStore.updatePresence(identity.publicKeyHex, {
      isOnline,
      lastSeenAt: isOnline ? Date.now() : identity.lastSeenAt,
    })
  }

  // UI components watching contacts will automatically update
  // because they resolve contact → identity → presence
}
```

### Persistence Strategy

```typescript
// Each store manages its own persistence

// Identity Store
function saveIdentities() {
  const data = Array.from(identities.value.entries())
  localStorage.setItem('lotus:identities', JSON.stringify(data))
}

// Contacts Store
function saveContacts() {
  const data = {
    contacts: serializeContacts(contacts.value),
    groups: serializeGroups(groups.value),
  }
  localStorage.setItem('lotus:contacts', JSON.stringify(data))
}

// Load order matters - identities before contacts
async function initializeStores() {
  await identityStore.load() // Load identities first
  await contactStore.load() // Contacts reference identities
  await musig2Store.load() // Shared wallets reference identities
  await p2pStore.initialize() // P2P updates identities
}
```

---

## Event Flow

### Event-Driven Updates

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT FLOW DIAGRAM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  EXTERNAL EVENTS                                                 │
│  ───────────────                                                 │
│  Chronik WebSocket ──┬──▶ wallet:tx:received                     │
│                      └──▶ wallet:tx:confirmed                    │
│                                                                  │
│  P2P GossipSub ──────┬──▶ p2p:signer:discovered                  │
│                      ├──▶ p2p:signer:expired                     │
│                      └──▶ p2p:presence:changed                   │
│                                                                  │
│  MuSig2 Protocol ────┬──▶ musig2:session:created                 │
│                      ├──▶ musig2:session:joined                  │
│                      ├──▶ musig2:signature:received              │
│                      └──▶ musig2:session:completed               │
│                                                                  │
│  USER ACTIONS                                                    │
│  ────────────                                                    │
│  Add Contact ────────────▶ contact:created                       │
│  Update Contact ─────────▶ contact:updated                       │
│  Delete Contact ─────────▶ contact:deleted                       │
│  Create Shared Wallet ───▶ musig2:wallet:created                 │
│                                                                  │
│  CROSS-STORE REACTIONS                                           │
│  ─────────────────────                                           │
│  p2p:signer:discovered ──▶ identity:updated                      │
│  wallet:tx:received ─────▶ contact:activity:updated              │
│  musig2:wallet:created ──▶ contact:group:created (optional)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Event Handlers

```typescript
// Example event handler setup

// In app initialization
function setupEventHandlers() {
  // P2P events → Identity updates
  p2pService.on('signer:discovered', signer => {
    identityStore.updateFromSigner(signer)
  })

  p2pService.on('presence:changed', ({ peerId, isOnline }) => {
    const identity = identityStore.findByPeerId(peerId)
    if (identity) {
      identityStore.updatePresence(identity.publicKeyHex, { isOnline })
    }
  })

  // Wallet events → Contact activity
  walletStore.$onAction(({ name, args, after }) => {
    if (name === '_handleTransaction') {
      after(() => {
        const tx = args[0]
        const counterpartyAddress =
          tx.type === 'send' ? tx.toAddress : tx.fromAddress
        contactStore.recordTransaction(
          counterpartyAddress,
          tx.amount,
          tx.type === 'send',
          tx.timestamp,
        )
      })
    }
  })
}
```

---

## Computed Data Patterns

### Derived State

```typescript
// Contact with full resolved data
const contactWithIdentity = computed(() => {
  const contact = contactStore.contacts.get(contactId)
  if (!contact) return null

  const identity = contact.identityId
    ? identityStore.get(contact.identityId)
    : null

  const sharedWallets = musig2Store.sharedWallets.filter(w =>
    w.participants.some(
      p =>
        p.publicKeyHex === contact.identityId ||
        p.publicKeyHex === contact.publicKey,
    ),
  )

  const transactions = walletStore.transactions.filter(
    tx =>
      tx.toAddress === contact.address || tx.fromAddress === contact.address,
  )

  return {
    ...contact,
    identity,
    isOnline: identity?.isOnline ?? false,
    canMuSig2: !!identity?.publicKeyHex || !!contact.publicKey,
    sharedWallets,
    transactions,
    level: identity ? getIdentityLevel(identity) : IdentityLevel.ADDRESS_ONLY,
  }
})
```

### Aggregated Views

```typescript
// Dashboard: contacts grouped by status
const contactsByStatus = computed(() => ({
  online: contactStore.contactList.filter(c => {
    const identity = c.identityId ? identityStore.get(c.identityId) : null
    return identity?.isOnline
  }),

  recentlyActive: contactStore.contactList.filter(c => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return c.lastTransactionAt && c.lastTransactionAt > weekAgo
  }),

  signers: contactStore.contactList.filter(c => {
    const identity = c.identityId ? identityStore.get(c.identityId) : null
    return identity?.signerCapabilities?.available
  }),

  favorites: contactStore.favorites,
}))
```

---

## Summary

The contact-centric data flow ensures:

1. **Single Source of Truth**: Identity store is canonical for cryptographic data
2. **Reactive Updates**: Changes propagate automatically through computed properties
3. **Cross-Feature Integration**: All features resolve to contacts when possible
4. **Event-Driven Architecture**: External events trigger appropriate store updates
5. **Efficient Lookups**: Multiple lookup paths (address, publicKey, peerId)

---

_Next: [06_MIGRATION_GUIDE.md](./06_MIGRATION_GUIDE.md)_
