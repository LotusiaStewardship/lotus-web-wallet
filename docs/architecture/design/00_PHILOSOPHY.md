# Contact-Centric Design Philosophy

**Version**: 1.1.0  
**Date**: December 2024  
**Status**: Active

---

## Critical Prerequisites

> ⚠️ **BEFORE IMPLEMENTING ANY FEATURE**, consult:
>
> - [07_HUMAN_CENTERED_UX.md](./07_HUMAN_CENTERED_UX.md) — Human-centered UX principles (REQUIRED)

Every implementation must satisfy the UX checklist and principles defined in the Human-Centered UX document. No feature ships without answering:

1. **"What can I do here?"** — Clear purpose and value proposition
2. **"How do I do it?"** — Obvious, intuitive actions
3. **"Did it work?"** — Clear feedback and confirmation
4. **"What went wrong?"** — Actionable error recovery

---

## Executive Summary

The Lotus Web Wallet is evolving from a **wallet-centric** application to a **contact-centric** application. This fundamental shift recognizes that the long-term goal is to be a **central hub for human-to-human communication** on the Lotus blockchain—enabling meaningful peer-to-peer interactions like multi-signature coordination, collaborative transactions, and trust-based relationships.

---

## The Paradigm Shift

### Previous Philosophy: Wallet-First

The original design treated the wallet as the primary entity:

```
┌─────────────────────────────────────────────────────────────────┐
│                     WALLET-CENTRIC MODEL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        ┌──────────┐                              │
│                        │  WALLET  │                              │
│                        └────┬─────┘                              │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐                │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│   ┌──────────┐       ┌──────────┐       ┌──────────┐            │
│   │ Contacts │       │   P2P    │       │  MuSig2  │            │
│   │ (names)  │       │ (peers)  │       │ (signers)│            │
│   └──────────┘       └──────────┘       └──────────┘            │
│                                                                  │
│   Problem: Three disconnected identity concepts                  │
│   - Contacts have addresses but no public keys                   │
│   - P2P peers have peerIds but no contact context                │
│   - MuSig2 signers have public keys but no relationship data     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### New Philosophy: Contact-First

The new design treats **contacts as the primary entity**, with wallets as a tightly-coupled but secondary concern:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTACT-CENTRIC MODEL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                       ┌───────────┐                              │
│                       │  CONTACT  │                              │
│                       │ (Identity)│                              │
│                       └─────┬─────┘                              │
│                             │                                    │
│    ┌────────────────────────┼────────────────────────┐           │
│    │                        │                        │           │
│    ▼                        ▼                        ▼           │
│ ┌──────────┐          ┌──────────┐          ┌──────────┐        │
│ │  Wallet  │          │   P2P    │          │  MuSig2  │        │
│ │(addresses)│         │(presence)│          │(signing) │        │
│ └──────────┘          └──────────┘          └──────────┘        │
│                                                                  │
│ Solution: Unified identity connects all capabilities             │
│ - One contact = one cryptographic identity                       │
│ - Address derived from public key                                │
│ - P2P presence linked to identity                                │
│ - MuSig2 capabilities are contact attributes                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Principles

### 1. Contacts Are People, Not Addresses

A contact represents a **human relationship**, not just a blockchain address. Every contact should answer:

- **Who is this person?** (name, avatar, notes)
- **How can I reach them?** (address, P2P presence)
- **What can we do together?** (MuSig2 capabilities, shared wallets)
- **What's our history?** (transactions, interactions)

### 2. Identity Unification

Every contact has a **unified cryptographic identity**:

```typescript
interface Identity {
  // Core cryptographic identity
  publicKeyHex: string // The source of truth

  // Derived properties
  address: string // Derived from publicKey

  // P2P connectivity
  peerId?: string // libp2p peer ID
  multiaddrs?: string[] // Connection addresses

  // Presence
  isOnline: boolean
  lastSeenAt?: number

  // Capabilities
  signerCapabilities?: SignerCapabilities
}
```

**Key insight**: The public key is the **canonical identifier**. Addresses are derived, not stored separately.

### 3. Wallets Serve Contacts

Wallets exist to facilitate interactions **between contacts**:

- **Personal Wallet**: Your identity on the network
- **Shared Wallets**: Collaborative relationships with contacts
- **Transactions**: Value exchange between contacts

### 4. P2P Enables Relationships

P2P networking is the **communication layer** for contact relationships:

- **Presence**: Know when contacts are online
- **Discovery**: Find new potential contacts
- **Coordination**: Enable multi-signature workflows

### 5. Progressive Relationship Depth

Contacts have varying levels of relationship depth:

```
Level 0: Address Only
├── Just an address (legacy contact)
├── Can send/receive
└── No advanced features

Level 1: Public Key Known
├── Address + Public Key
├── Can create shared wallets
└── Can participate in MuSig2

Level 2: P2P Connected
├── Public Key + PeerId
├── Real-time presence
├── Direct communication
└── Coordinated signing

Level 3: Trusted Signer
├── Full identity
├── Signer capabilities advertised
├── Part of shared wallets
└── Transaction history
```

---

## Design Implications

### Navigation Structure

The navigation should reflect contact-centricity:

```
┌─────────────────────────────────────────────────────────────────┐
│                      NAVIGATION HIERARCHY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏠 Home                                                         │
│     └── Dashboard with contact-aware activity                    │
│                                                                  │
│  👥 People (PRIMARY)                                             │
│     ├── Contacts (all relationships)                             │
│     ├── Shared Wallets (collaborative relationships)             │
│     └── Network (P2P discovery & presence)                       │
│                                                                  │
│  💸 Transact                                                     │
│     ├── Send (to contacts)                                       │
│     ├── Receive (share with contacts)                            │
│     └── History (contact-annotated)                              │
│                                                                  │
│  🔍 Explore                                                      │
│     ├── Explorer (blockchain data)                               │
│     └── Social (RANK profiles)                                   │
│                                                                  │
│  ⚙️ Settings                                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Feature Entry Points

Every feature should be accessible from the contact context:

| Action        | From Contact                   | From Feature                     |
| ------------- | ------------------------------ | -------------------------------- |
| Send          | Contact → Send                 | Send → Select Contact            |
| Receive       | Contact → Request Payment      | Receive → Share with Contact     |
| Shared Wallet | Contact → Create Shared Wallet | Shared Wallets → Select Contacts |
| Sign Request  | Contact → Request Signature    | MuSig2 → Select Signer           |
| View History  | Contact → Transaction History  | History → Filter by Contact      |

### UI Patterns

1. **Contact Context Everywhere**: When viewing an address, show contact info if known
2. **Relationship Indicators**: Show online status, MuSig2 eligibility, shared wallets
3. **Action Shortcuts**: Quick actions from contact cards (Send, Sign, View)
4. **Progressive Disclosure**: Show basic info first, advanced features on demand

---

## The Vision

The Lotus Web Wallet becomes a **relationship management platform** for the Lotus blockchain:

```
┌─────────────────────────────────────────────────────────────────┐
│                      THE LOTUS VISION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  "A central hub for humans to communicate in meaningful ways"    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    YOUR CONTACTS                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │  Alice  │  │   Bob   │  │  Carol  │  │   Dave  │    │    │
│  │  │ 🟢 Online│  │ 🔴 Offline│ │ 🟢 Online│  │ 🟡 Away │    │    │
│  │  │ 🔐 Signer│  │ 💰 Wallet│  │ 🔐 Signer│  │ 📇 Basic│    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  COLLABORATIVE ACTIONS                   │    │
│  │                                                          │    │
│  │  💸 Send Value      🔐 Co-Sign Transactions              │    │
│  │  📝 Create Shared   🤝 Coordinate Multi-Sig              │    │
│  │     Wallets            Spending                          │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Document Index

This design philosophy is implemented through the following specifications:

### Critical Prerequisites (Read First)

| Document                                             | Description                  | Priority     |
| ---------------------------------------------------- | ---------------------------- | ------------ |
| [07_HUMAN_CENTERED_UX.md](./07_HUMAN_CENTERED_UX.md) | Human-centered UX principles | **REQUIRED** |

### Architecture Specifications

| Document                                                 | Description                              |
| -------------------------------------------------------- | ---------------------------------------- |
| [01_IDENTITY_MODEL.md](./01_IDENTITY_MODEL.md)           | Unified identity architecture            |
| [02_CONTACT_SYSTEM.md](./02_CONTACT_SYSTEM.md)           | Contact management design                |
| [03_RELATIONSHIP_LAYERS.md](./03_RELATIONSHIP_LAYERS.md) | P2P, MuSig2, and wallet integration      |
| [04_UI_PATTERNS.md](./04_UI_PATTERNS.md)                 | Contact-centric UI/UX patterns           |
| [05_DATA_FLOW.md](./05_DATA_FLOW.md)                     | Data flow and state management           |
| [06_MIGRATION_GUIDE.md](./06_MIGRATION_GUIDE.md)         | Transitioning from wallet-centric design |

---

---

## Design Mandate

**Remember**: Lotus is energy is money is time. We don't waste people's precious time with confusing interfaces or incomplete features.

Every implementation must:

1. ✅ **Be understandable** to non-technical users
2. ✅ **Provide clear feedback** for all actions
3. ✅ **Offer recovery paths** for all errors
4. ✅ **Scale from simple to advanced** via progressive disclosure
5. ✅ **Maintain consistency** with established patterns
6. ✅ **Include contextual help** where users need it
7. ✅ **Respect user autonomy** with dismissible prompts ("Don't show again")

---

_This document establishes the foundational philosophy for the Lotus Web Wallet's evolution toward a contact-centric, human-first design._
