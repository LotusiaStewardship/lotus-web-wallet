# Relationship Layers

**Version**: 1.0.0  
**Date**: December 2024  
**Status**: Active

---

## Overview

The contact-centric architecture organizes functionality into **relationship layers**. Each layer represents a different level of interaction capability between contacts, from basic value transfer to complex multi-signature coordination.

---

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RELATIONSHIP LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 3: COLLABORATIVE (MuSig2)                                │
│  ════════════════════════════════                                │
│  • Shared wallets                                                │
│  • Coordinated signing                                           │
│  • Multi-party transactions                                      │
│  Requires: Public key + P2P + Trust                              │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  LAYER 2: CONNECTED (P2P)                                        │
│  ════════════════════════                                        │
│  • Real-time presence                                            │
│  • Signer discovery                                              │
│  • Direct communication                                          │
│  Requires: Public key + P2P connectivity                         │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  LAYER 1: ADDRESSABLE (Blockchain)                               │
│  ═════════════════════════════════                               │
│  • Send/receive transactions                                     │
│  • View transaction history                                      │
│  • Address verification                                          │
│  Requires: Address (or public key)                               │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  LAYER 0: KNOWN (Contact)                                        │
│  ════════════════════════                                        │
│  • Named relationship                                            │
│  • Notes and organization                                        │
│  • Activity tracking                                             │
│  Requires: User creates contact                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 0: Known (Contact Layer)

The foundation layer—a named relationship exists.

### Capabilities

| Capability            | Description                              |
| --------------------- | ---------------------------------------- |
| **Naming**            | Assign a human-readable name             |
| **Notes**             | Store personal notes about the contact   |
| **Organization**      | Groups, tags, favorites                  |
| **Activity Tracking** | Transaction count, totals, last activity |

### Requirements

- User explicitly creates a contact
- Minimum: a name

### Data Model

```typescript
// Minimal contact (Layer 0 only)
const minimalContact: Contact = {
  id: 'contact-123',
  name: 'Someone',
  address: '', // May be empty initially
  tags: [],
  isFavorite: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
```

### UI Indicators

```
┌─────────────────────────────────────────┐
│  👤 Someone                             │
│  📇 Contact only (no address)           │
│  [Add Address]                          │
└─────────────────────────────────────────┘
```

---

## Layer 1: Addressable (Blockchain Layer)

The contact has a blockchain address—value can be exchanged.

### Capabilities

| Capability  | Description                                |
| ----------- | ------------------------------------------ |
| **Send**    | Send Lotus to this contact                 |
| **Receive** | Generate payment requests for this contact |
| **History** | View transaction history with this contact |
| **Verify**  | Verify address ownership via QR exchange   |

### Requirements

- Valid Lotus address
- OR public key (address derived)

### Data Model

```typescript
// Addressable contact (Layer 1)
const addressableContact: Contact = {
  id: 'contact-123',
  name: 'Alice',
  address: 'lotus_16PSJKLz...', // Required for Layer 1
  // ... other fields
}
```

### UI Indicators

```
┌─────────────────────────────────────────┐
│  👤 Alice                               │
│  💰 lotus_16PSJ...abc123                │
│  [Send] [Request Payment]               │
└─────────────────────────────────────────┘
```

### Integration Points

```typescript
// Send flow integration
function sendToContact(contact: Contact) {
  if (!contact.address) {
    showError('This contact has no address')
    return
  }
  navigateTo(`/transact/send?to=${contact.address}`)
}

// Transaction history integration
const contactTransactions = computed(() => {
  return walletStore.transactions.filter(
    tx =>
      tx.toAddress === contact.address || tx.fromAddress === contact.address,
  )
})
```

---

## Layer 2: Connected (P2P Layer)

The contact is reachable via P2P network—real-time interaction is possible.

### Capabilities

| Capability       | Description                         |
| ---------------- | ----------------------------------- |
| **Presence**     | See when contact is online          |
| **Discovery**    | Find contact on P2P network         |
| **Capabilities** | View advertised signer capabilities |
| **Reachability** | Direct P2P connection possible      |

### Requirements

- Public key (for identity)
- P2P connectivity (peerId, multiaddrs)
- Contact has P2P enabled

### Data Model

```typescript
// Connected contact (Layer 2)
// Contact links to Identity with P2P info
const identity: Identity = {
  publicKeyHex: '02abc...def',
  address: 'lotus_16PSJ...',
  peerId: '12D3KooW...', // P2P identity
  multiaddrs: ['/ip4/...'], // Connection addresses
  isOnline: true, // Current presence
  lastSeenAt: Date.now(),
  // ...
}

const connectedContact: Contact = {
  id: 'contact-123',
  name: 'Alice',
  identityId: '02abc...def', // Links to identity
  address: 'lotus_16PSJ...',
  // ...
}
```

### UI Indicators

```
┌─────────────────────────────────────────┐
│  👤 Alice                        🟢     │
│  💰 lotus_16PSJ...abc123                │
│  🌐 Online now                          │
│  [Send] [Message] [View Profile]        │
└─────────────────────────────────────────┘

Legend:
🟢 Online    🟡 Recently online    🔴 Offline
```

### Presence States

```typescript
type PresenceState =
  | 'online' // Currently connected
  | 'recently_online' // Seen within 5 minutes
  | 'offline' // Not seen recently
  | 'unknown' // No P2P info

function getPresenceState(identity: Identity): PresenceState {
  if (identity.isOnline) return 'online'

  if (identity.lastSeenAt) {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    if (identity.lastSeenAt > fiveMinutesAgo) {
      return 'recently_online'
    }
  }

  if (identity.peerId) return 'offline'

  return 'unknown'
}
```

### Integration Points

```typescript
// Presence display
const presenceState = computed(() => {
  if (!contact.identityId) return 'unknown'
  const identity = identityStore.get(contact.identityId)
  return identity ? getPresenceState(identity) : 'unknown'
})

// Online contacts filter
const onlineContacts = computed(() => {
  return contactStore.contactList.filter(c => {
    if (!c.identityId) return false
    const identity = identityStore.get(c.identityId)
    return identity?.isOnline
  })
})
```

---

## Layer 3: Collaborative (MuSig2 Layer)

The contact can participate in multi-signature operations—trust-based collaboration.

### Capabilities

| Capability             | Description                     |
| ---------------------- | ------------------------------- |
| **Shared Wallets**     | Create N-of-N multi-sig wallets |
| **Signing Sessions**   | Coordinate transaction signing  |
| **Signature Requests** | Request signatures from contact |
| **Co-signing**         | Sign transactions together      |

### Requirements

- Public key (required for key aggregation)
- P2P connectivity (for coordination)
- Signer capabilities advertised (optional but recommended)

### Data Model

```typescript
// Collaborative contact (Layer 3)
const identity: Identity = {
  publicKeyHex: '02abc...def',
  address: 'lotus_16PSJ...',
  peerId: '12D3KooW...',
  isOnline: true,
  signerCapabilities: {
    // MuSig2 capabilities
    transactionTypes: ['standard', 'token'],
    amountRange: { min: 1000, max: 1000000000 },
    fee: 100,
    available: true,
    expiresAt: Date.now() + 3600000,
  },
  // ...
}
```

### UI Indicators

```
┌─────────────────────────────────────────┐
│  👤 Alice                    🟢 🔐      │
│  💰 lotus_16PSJ...abc123                │
│  🔐 MuSig2 Signer • Available           │
│  📝 Supports: standard, token           │
│  [Send] [Request Signature] [Shared Wallet] │
└─────────────────────────────────────────┘

Legend:
🔐 MuSig2 eligible (has public key)
```

### Shared Wallet Integration

```typescript
// Shared wallets with this contact
const sharedWalletsWithContact = computed(() => {
  return musig2Store.sharedWallets.filter(wallet =>
    wallet.participants.some(
      p =>
        p.publicKeyHex === contact.identityId ||
        p.publicKeyHex === contact.publicKey,
    ),
  )
})

// Create shared wallet with contact
function createSharedWalletWith(contact: Contact) {
  if (!canParticipateInMuSig2(contact)) {
    showError('Contact needs a public key for shared wallets')
    return
  }

  navigateTo({
    path: '/people/shared-wallets',
    query: {
      tab: 'create',
      participants: contact.identityId || contact.publicKey,
    },
  })
}
```

### Signing Request Flow

```typescript
// Request signature from contact
async function requestSignature(contact: Contact, transaction: Transaction) {
  const identity = contact.identityId
    ? identityStore.get(contact.identityId)
    : null

  if (!identity?.isOnline) {
    showError('Contact must be online to request signature')
    return
  }

  if (!identity.signerCapabilities?.available) {
    showError('Contact is not accepting signing requests')
    return
  }

  // Initiate signing session
  await musig2Store.createSigningSession({
    participants: [myPublicKey, identity.publicKeyHex],
    transaction,
  })
}
```

---

## Layer Progression

Contacts can progress through layers as more information becomes available:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER PROGRESSION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  START: User creates contact                                     │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  LAYER 0    │  "I know this person"                          │
│  │  (Known)    │  Name only                                     │
│  └──────┬──────┘                                                │
│         │ User adds address                                      │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  LAYER 1    │  "I can transact with them"                    │
│  │(Addressable)│  Address known                                 │
│  └──────┬──────┘                                                │
│         │ User adds public key OR                                │
│         │ Contact discovered via P2P                             │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  LAYER 2    │  "I can see when they're online"               │
│  │ (Connected) │  Public key + P2P                              │
│  └──────┬──────┘                                                │
│         │ Contact advertises signer capabilities                 │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  LAYER 3    │  "We can collaborate on transactions"          │
│  │(Collaborative)│  Full MuSig2 support                         │
│  └─────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Upgrade Prompts

The UI should prompt users to upgrade contact capabilities:

```typescript
// Suggest adding public key for Layer 1 → Layer 2
const canUpgradeToConnected = computed(() => {
  return contact.address && !contact.identityId && !contact.publicKey
})

// Suggest enabling P2P for Layer 2 contacts
const canUpgradeToCollaborative = computed(() => {
  if (!contact.identityId) return false
  const identity = identityStore.get(contact.identityId)
  return identity && !identity.signerCapabilities
})
```

```
┌─────────────────────────────────────────────────────────────────┐
│  💡 Upgrade Contact                                              │
│  ─────────────────                                               │
│  Add Alice's public key to:                                      │
│  • See when she's online                                         │
│  • Create shared wallets together                                │
│  • Request signatures                                            │
│                                                                  │
│  [Add Public Key]  [Ask Alice to Share]                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cross-Layer Features

Some features span multiple layers:

### Transaction History (Layers 0-3)

```typescript
// Transaction history is available at all layers
// but enriched with more context at higher layers

interface EnrichedTransaction {
  // Base transaction data
  ...transaction,

  // Layer 0: Contact name
  contactName?: string,

  // Layer 1: Address verification
  isVerifiedAddress?: boolean,

  // Layer 2: Presence at time of tx
  wasOnlineAtTx?: boolean,

  // Layer 3: Signing session info
  signingSession?: SigningSession,
}
```

### Contact Card (Adaptive)

The contact card adapts to show layer-appropriate information:

```typescript
// Contact card shows different actions per layer
const availableActions = computed(() => {
  const actions = []

  // Layer 1+: Send
  if (contact.address) {
    actions.push({ label: 'Send', action: 'send' })
  }

  // Layer 2+: View presence
  if (contact.identityId) {
    actions.push({ label: 'View Profile', action: 'profile' })
  }

  // Layer 3: MuSig2 actions
  if (canParticipateInMuSig2(contact)) {
    actions.push({ label: 'Request Signature', action: 'sign' })
    actions.push({ label: 'Shared Wallet', action: 'wallet' })
  }

  return actions
})
```

---

## Summary

The relationship layers provide:

1. **Progressive Capability**: More features unlock as relationships deepen
2. **Clear Requirements**: Each layer has explicit prerequisites
3. **Graceful Degradation**: Lower layers always work
4. **Upgrade Path**: Users can enhance contacts over time
5. **Contextual UI**: Interface adapts to available capabilities

---

_Next: [04_UI_PATTERNS.md](./04_UI_PATTERNS.md)_
