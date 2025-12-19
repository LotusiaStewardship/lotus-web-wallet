# MuSig2 UI Gap Analysis: Complete Protocol Flow Implementation

## Executive Summary

This document analyzes the lotus-web-wallet MuSig2 UI against the expected protocol flow as defined by [Blockchain Commons MuSig2 Sequence Diagrams](https://developer.blockchaincommons.com/musig/sequence/). The analysis identifies critical gaps in the UI that prevent users from completing the full MuSig2 workflow.

**Core Finding**: The current UI focuses almost exclusively on **Phase 3 (Signing Sessions)** while completely missing **Phase 1 (Key Aggregation)** and **Phase 2 (Address Funding)**. This is like building a car without a steering wheel or ignition—the engine works, but you can't drive it.

---

## MuSig2 Protocol Overview

### The Three Phases of MuSig2

According to the Blockchain Commons specification and BIP327, MuSig2 has three distinct phases:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MuSig2 COMPLETE WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: KEY AGGREGATION (Setup - happens ONCE per group)                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. Collect public keys from all n participants                             │
│  2. Sort keys lexicographically (deterministic ordering)                    │
│  3. Compute aggregated public key Q = Σ(aᵢ · Pᵢ)                           │
│  4. Derive shared address from Q                                            │
│  5. Store group configuration for future signing                            │
│                                                                             │
│  PHASE 2: FUNDING (Deposit - happens as needed)                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. Any participant can send funds to the aggregated address                │
│  2. Track balance of the shared address                                     │
│  3. All participants can view the shared balance                            │
│                                                                             │
│  PHASE 3: SIGNING (Spend - happens when group decides to spend)             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Round 1: Nonce Exchange                                                    │
│    - Each signer generates nonces (k₁, k₂)                                  │
│    - Share public nonces with all participants                              │
│    - Aggregate nonces: R = R₁ + b·R₂                                        │
│                                                                             │
│  Round 2: Partial Signature Exchange                                        │
│    - Each signer creates partial signature sᵢ                               │
│    - Share partial signatures                                               │
│    - Aggregate into final signature: s = Σ(sᵢ)                              │
│                                                                             │
│  Broadcast: Submit signed transaction to network                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current UI Coverage

| Phase   | Description     | UI Status      | SDK Support        |
| ------- | --------------- | -------------- | ------------------ |
| Phase 1 | Key Aggregation | ❌ **MISSING** | ✅ `musigKeyAgg()` |
| Phase 2 | Address Funding | ❌ **MISSING** | ✅ Standard send   |
| Phase 3 | Signing Session | ⚠️ **PARTIAL** | ✅ Full support    |

---

## Part 1: Phase 1 Gap Analysis - Key Aggregation

### 1.1 No Aggregated Key Generation UI

**Problem**: There is no UI to create a MuSig2 aggregated public key (shared address).

**Current State**:

- Users can discover signers via P2P
- Users can save signers as contacts (broken - shows "Coming Soon")
- **No way to combine public keys into an aggregated key**
- **No way to generate a shared address**

**What Should Exist**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Create Shared Wallet                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Add participants to create a multi-signature wallet.                       │
│  All participants must sign to spend funds.                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 You (Alice)                                          ✓ Added     │   │
│  │    lotus_16PSJ...abc123                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Bob (from contacts)                                  ✓ Added     │   │
│  │    lotus_16PSJ...def456                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ + Add participant from contacts                                      │   │
│  │ + Add participant by public key                                      │   │
│  │ + Invite via P2P                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Wallet Configuration:                                                      │
│  • Type: 2-of-2 MuSig2 (all participants must sign)                        │
│  • Name: [Family Savings                    ]                               │
│  • Purpose: [Emergency fund for family      ]                               │
│                                                                             │
│                                    [Cancel]  [Create Shared Wallet]         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**SDK Functions Available**:

```typescript
// From lotus-sdk/lib/bitcore/crypto/musig2.ts
import { musigKeyAgg } from 'lotus-sdk'

// Aggregate public keys (sorted automatically)
const ctx = musigKeyAgg([alicePubKey, bobPubKey])
const sharedAddress = ctx.aggregatedPubKey.toAddress()
```

**Required UI Components**:

1. `CreateSharedWalletModal.vue` - Main wizard for creating shared wallets
2. `ParticipantSelector.vue` - Select from contacts or enter public key
3. `SharedWalletCard.vue` - Display shared wallet in wallet list
4. `SharedWalletStore.ts` - Persist shared wallet configurations

---

### 1.2 No Contact Public Key Storage

**Problem**: Contacts store addresses, not public keys. MuSig2 requires public keys.

**Current Contact Interface** (`stores/contacts.ts`):

```typescript
export interface Contact {
  id: string
  name: string
  address: string // ❌ Address only
  addresses?: ContactAddresses
  notes?: string
  peerId?: string
  serviceType?: string
  // ... no public key field!
}
```

**Required Contact Interface**:

```typescript
export interface Contact {
  id: string
  name: string
  address: string
  addresses?: ContactAddresses
  publicKey?: string // ✅ Add public key for MuSig2
  publicKeys?: {
    // ✅ Network-specific public keys
    livenet?: string
    testnet?: string
  }
  peerId?: string
  signerCapabilities?: {
    // ✅ MuSig2 signer info
    transactionTypes: string[]
    amountRange?: { min?: number; max?: number }
    fee?: number
  }
  // ...
}
```

**Gap**: When a user adds a signer from P2P discovery to contacts, the public key (`UISignerAdvertisement.publicKeyHex`) is not saved.

**Remediation**:

1. Update `Contact` interface to include `publicKey` field
2. Update `ContactForm.vue` to optionally accept/display public key
3. Update `saveAsContact` in `p2p.vue` to save public key from signer
4. Add public key validation

---

### 1.3 No Contact Groups for Multi-Signature

**Problem**: Contacts are flat list. MuSig2 requires grouping participants.

**Current State**:

- Tags exist but are just labels
- No group management
- No way to define "these 3 contacts form a 3-of-3 multisig"

**User Question**: "I want to create a family treasury with my spouse and child. How do I group them?"

**Required Feature**: Contact Groups with MuSig2 Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👥 Contact Groups                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👨‍👩‍👧 Family Treasury                                    3 members    │   │
│  │ Type: 3-of-3 MuSig2                                                 │   │
│  │ Shared Address: lotus_16PSJ...xyz789                                │   │
│  │ Balance: 10,000 XPI                                                 │   │
│  │                                                                     │   │
│  │ Members: Alice (you), Bob, Carol                                    │   │
│  │                                                                     │   │
│  │ [View Details]  [Fund]  [Spend]                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏢 Business Partners                                    2 members    │   │
│  │ Type: 2-of-2 MuSig2                                                 │   │
│  │ Shared Address: lotus_16PSJ...abc123                                │   │
│  │ Balance: 50,000 XPI                                                 │   │
│  │                                                                     │   │
│  │ Members: Alice (you), Dave                                          │   │
│  │                                                                     │   │
│  │ [View Details]  [Fund]  [Spend]                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                              [+ Create New Group]           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Model**:

```typescript
export interface ContactGroup {
  id: string
  name: string
  description?: string
  type: 'musig2' // Future: 'frost', 'standard'
  members: string[] // Contact IDs

  // MuSig2-specific
  aggregatedPublicKey?: string
  sharedAddress?: string
  keyAggContext?: {
    pubkeys: string[] // Sorted public keys
    coefficients: Record<number, string> // Key aggregation coefficients
  }

  createdAt: number
  updatedAt: number
}
```

---

### 1.4 No Automatic Key Aggregation on Contact Add

**User Question**: "When I add a signer to contacts, does it automatically create a shared address?"

**Answer**: No. And it shouldn't be automatic—but the option should exist.

**Proposed Flow**:

```
User discovers signer "Bob" on P2P
    ↓
User clicks "Add to Contacts"
    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  Add Bob to Contacts                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  👤 Bob                                                                     │
│  Public Key: 02abc123...                                                    │
│  Peer ID: 12D3KooW...                                                       │
│  Services: Spend, CoinJoin, Escrow                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ☐ Create 2-of-2 shared wallet with Bob                                    │
│    This will generate a shared address that requires both                   │
│    you and Bob to sign any transactions.                                    │
│                                                                             │
│                                    [Cancel]  [Add Contact]                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.5 No Support for n-of-n Groups (n > 2)

**User Question**: "Can I create a 5-of-5 MuSig2 group?"

**Answer**: The SDK supports it, but the UI doesn't.

**Current Limitation**:

- `SigningRequestModal.vue` only targets a single signer
- No UI for selecting multiple signers
- No group creation workflow

**SDK Capability**:

```typescript
// SDK supports any number of signers
const ctx = musigKeyAgg([
  alicePubKey,
  bobPubKey,
  carolPubKey,
  davePubKey,
  evePubKey,
]) // 5-of-5 MuSig2
```

**Required UI**:

- Multi-select for participants
- Clear indication of n-of-n requirement
- Warning about coordination complexity for large groups

---

## Part 2: Phase 2 Gap Analysis - Address Funding

### 2.1 No Shared Wallet Balance Display

**Problem**: Users can't see the balance of their shared addresses.

**Current State**:

- Wallet page shows only personal wallet balance
- No concept of "shared wallets" or "multi-sig addresses"
- No way to track funds in aggregated addresses

**Required Feature**: Shared Wallet Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 Your Wallets                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Personal Wallet                                                   │   │
│  │ Balance: 5,000.00 XPI                                               │   │
│  │ Address: lotus_16PSJ...abc123                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👥 Family Treasury (2-of-2 with Bob)                                │   │
│  │ Balance: 10,000.00 XPI                                              │   │
│  │ Shared Address: lotus_16PSJ...xyz789                                │   │
│  │ Status: Ready to spend (both online)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👥 Business Fund (3-of-3 with Bob, Carol)                           │   │
│  │ Balance: 50,000.00 XPI                                              │   │
│  │ Shared Address: lotus_16PSJ...def456                                │   │
│  │ Status: 1 of 3 online (waiting for Carol)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Total Balance: 65,000.00 XPI                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 No "Fund Shared Wallet" Flow

**Problem**: No dedicated flow for funding a shared address.

**Current State**:

- Standard send page doesn't know about shared wallets
- No "Fund" action on shared wallet cards
- No tracking of who contributed what

**Required Feature**: Fund Shared Wallet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 Fund Family Treasury                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Current Balance: 10,000.00 XPI                                            │
│  Shared Address: lotus_16PSJ...xyz789                                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Amount to deposit:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [1,000.00                                              ] XPI        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Your personal balance: 5,000.00 XPI                                       │
│  After deposit: 4,000.00 XPI                                               │
│                                                                             │
│  Note (optional):                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Monthly contribution                                  ]            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Contribution History:                                                      │
│  • You: 5,000 XPI (50%)                                                    │
│  • Bob: 5,000 XPI (50%)                                                    │
│                                                                             │
│                                    [Cancel]  [Deposit to Treasury]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 No Shared Wallet Transaction History

**Problem**: Can't see transaction history for shared addresses.

**Current State**:

- History page shows only personal wallet transactions
- No filtering by shared wallet
- No indication of which wallet a transaction belongs to

**Required Feature**: Per-Wallet Transaction History

---

## Part 3: Phase 3 Gap Analysis - Signing Sessions

### 3.1 Current Implementation Status

The signing session UI is the most developed part, but still has gaps:

| Feature             | Status       | Notes                                      |
| ------------------- | ------------ | ------------------------------------------ |
| Session creation    | ⚠️ Partial   | Creates session but no transaction context |
| Nonce exchange      | ✅ Working   | Handled by SDK                             |
| Partial signature   | ✅ Working   | Handled by SDK                             |
| Session progress    | ✅ Working   | `SigningSessionProgress.vue`               |
| Incoming requests   | ❌ Not shown | Component exists, never rendered           |
| Session list        | ❌ Missing   | No "My Sessions" view                      |
| Transaction preview | ❌ Missing   | Users sign blind                           |

---

### 3.2 No Transaction Context in Signing

**Problem**: Users don't know what they're signing.

**Current State** (`SigningRequestModal.vue`):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Request Signature                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Transaction Type: [Spend ▼]                                               │
│  Amount: [1000.00] XPI                                                     │
│  Purpose: [Optional description]                                           │
│                                                                             │
│                                    [Cancel]  [Send Request]                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What's Missing**:

- No actual transaction being signed
- No recipient address
- No fee breakdown
- No UTXO selection
- No change address

**What Should Exist**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Propose Spend from Family Treasury                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  From: Family Treasury (2-of-2)                                            │
│  Balance: 10,000.00 XPI                                                    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Transaction Details:                                                       │
│                                                                             │
│  To: Carol (lotus_16PSJ...abc123)                                          │
│  Amount: 1,000.00 XPI                                                      │
│  Network Fee: 0.001 XPI                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Total: 1,000.001 XPI                                                      │
│                                                                             │
│  Remaining Balance: 8,999.999 XPI                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Purpose: [Birthday gift for Carol                        ]                │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Required Signatures:                                                       │
│  ☑ You (Alice)                                                             │
│  ☐ Bob (will be notified)                                                  │
│                                                                             │
│                                    [Cancel]  [Propose Transaction]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Incoming Requests Not Displayed

**Problem**: `IncomingSigningRequest.vue` exists but is never rendered.

**Current State** (`useMuSig2.ts`):

```typescript
// Incoming requests are stored...
const incomingRequests = ref<UIIncomingSigningRequest[]>([])

// ...and populated from events...
musig2Coordinator.on('musig2:session-discovered', data => {
  // Creates UIIncomingSigningRequest and adds to array
})

// ...but NEVER SHOWN IN UI
```

**Required Fix**: Add incoming requests to P2P page

```vue
<!-- In pages/p2p.vue -->
<template>
  <!-- Add this section -->
  <UCard v-if="musig2.incomingRequests.value.length > 0">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-bell" class="w-5 h-5 text-warning-500" />
        <span class="font-semibold">Incoming Signing Requests</span>
        <UBadge color="warning">{{
          musig2.incomingRequests.value.length
        }}</UBadge>
      </div>
    </template>

    <div class="space-y-3">
      <IncomingSigningRequest
        v-for="request in musig2.incomingRequests.value"
        :key="request.id"
        :request="request"
        @accept="handleAcceptRequest"
        @reject="handleRejectRequest"
      />
    </div>
  </UCard>
</template>
```

---

### 3.4 No Active Sessions Display

**Problem**: `SigningSessionProgress.vue` exists but is never used.

**Current State**:

- Sessions are tracked in `activeSessions` Map
- No UI shows active sessions
- Users can't see signing progress

**Required Fix**: Add active sessions section

```vue
<!-- In pages/p2p.vue -->
<template>
  <!-- Add this section -->
  <UCard v-if="musig2.activeSessionsList.value.length > 0">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-loader" class="w-5 h-5 animate-spin" />
        <span class="font-semibold">Active Signing Sessions</span>
        <UBadge color="primary">{{ musig2.activeSessionCount.value }}</UBadge>
      </div>
    </template>

    <div class="space-y-3">
      <SigningSessionProgress
        v-for="session in musig2.activeSessionsList.value"
        :key="session.id"
        :session="session"
        @cancel="handleCancelSession"
      />
    </div>
  </UCard>
</template>
```

---

### 3.5 No "Spend from Shared Wallet" Flow

**Problem**: No integrated flow to spend from a shared wallet.

**Current State**:

- Must manually create signing session
- No connection to actual transaction
- No UTXO selection from shared address

**Required Flow**:

```
User clicks "Spend" on shared wallet
    ↓
Enter recipient and amount
    ↓
Build unsigned transaction (using shared wallet UTXOs)
    ↓
Create MuSig2 signing session with transaction hash
    ↓
Notify other participants
    ↓
Collect nonces (Round 1)
    ↓
Collect partial signatures (Round 2)
    ↓
Aggregate signature
    ↓
Broadcast transaction
```

---

## Part 4: Recommended UI Architecture

### 4.1 New Pages Required

| Page                  | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `/wallets`            | List all wallets (personal + shared)             |
| `/wallets/create`     | Create new shared wallet wizard                  |
| `/wallets/[id]`       | Shared wallet detail (balance, history, members) |
| `/wallets/[id]/fund`  | Fund shared wallet                               |
| `/wallets/[id]/spend` | Spend from shared wallet                         |
| `/p2p/sessions`       | All signing sessions (active + history)          |
| `/p2p/sessions/[id]`  | Session detail view                              |

### 4.2 New Components Required

| Component                      | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `SharedWalletCard.vue`         | Display shared wallet in list          |
| `SharedWalletDetail.vue`       | Full shared wallet view                |
| `CreateSharedWalletWizard.vue` | Multi-step wallet creation             |
| `ParticipantSelector.vue`      | Select contacts for shared wallet      |
| `SpendFromSharedWallet.vue`    | Transaction builder for shared wallets |
| `SigningSessionList.vue`       | List of all sessions                   |
| `TransactionPreview.vue`       | Show what user is signing              |

### 4.3 Store Updates Required

```typescript
// New store: stores/sharedWallets.ts
export interface SharedWallet {
  id: string
  name: string
  description?: string

  // Participants
  participants: {
    contactId?: string
    publicKey: string
    name: string
    isMe: boolean
  }[]

  // MuSig2 context
  aggregatedPublicKey: string
  sharedAddress: string
  keyAggContext: SerializedKeyAggContext

  // Balance tracking
  balance?: number
  lastBalanceUpdate?: number

  // Metadata
  createdAt: number
  updatedAt: number
}

export const useSharedWalletsStore = defineStore('sharedWallets', {
  state: () => ({
    wallets: [] as SharedWallet[],
    initialized: false,
  }),

  actions: {
    createWallet(participants: PublicKey[], name: string): SharedWallet,
    getWalletBalance(walletId: string): Promise<number>,
    getWalletHistory(walletId: string): Promise<Transaction[]>,
    // ...
  }
})
```

---

## Part 5: Priority Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)

**Goal**: Make existing UI functional

1. **Show incoming signing requests**

   - Render `IncomingSigningRequest` in P2P page
   - Add notification badge
   - Wire up accept/reject handlers

2. **Show active sessions**

   - Render `SigningSessionProgress` in P2P page
   - Add cancel handler
   - Show session completion

3. **Fix contact saving from P2P**
   - Implement `saveAsContact` function
   - Add `publicKey` field to Contact interface
   - Save signer capabilities

### Phase 2: Key Aggregation (Week 2-3)

**Goal**: Enable shared wallet creation

4. **Add Contact Groups**

   - Create `ContactGroup` interface
   - Add group management UI
   - Support MuSig2 group type

5. **Create Shared Wallet Wizard**

   - Multi-step creation flow
   - Participant selection
   - Key aggregation
   - Address generation

6. **Shared Wallet Dashboard**
   - List all shared wallets
   - Show balances
   - Show participant status

### Phase 3: Funding & Spending (Week 3-4)

**Goal**: Complete transaction flows

7. **Fund Shared Wallet**

   - Dedicated funding flow
   - Track contributions
   - Update balance

8. **Spend from Shared Wallet**

   - Transaction builder
   - UTXO selection
   - Signing session creation
   - Transaction preview

9. **Transaction History**
   - Per-wallet history
   - Filter by wallet
   - Export functionality

### Phase 4: Polish (Week 4-5)

**Goal**: Intuitive user experience

10. **Onboarding**

    - Explain MuSig2 concept
    - Guide through first shared wallet
    - Show use cases

11. **Notifications**

    - Push notifications for signing requests
    - Session status updates
    - Transaction confirmations

12. **Error Handling**
    - Timeout handling
    - Retry logic
    - Clear error messages

---

## Part 6: User Flow Diagrams

### 6.1 Create Shared Wallet Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CREATE SHARED WALLET FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Create Shared Wallet"
         │
         ▼
┌─────────────────────┐
│ Step 1: Name Wallet │
│ • Enter name        │
│ • Enter description │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 2: Add Members │
│ • Your key (auto)   │
│ • Select contacts   │
│ • Or enter pub keys │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 3: Review      │
│ • Show all members  │
│ • Show n-of-n type  │
│ • Explain MuSig2    │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 4: Generate    │
│ • Aggregate keys    │
│ • Generate address  │
│ • Save to store     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 5: Success     │
│ • Show address      │
│ • QR code           │
│ • Share with members│
│ • Fund now option   │
└─────────────────────┘
```

### 6.2 Spend from Shared Wallet Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SPEND FROM SHARED WALLET FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Spend" on shared wallet
         │
         ▼
┌─────────────────────┐
│ Step 1: Build Tx    │
│ • Enter recipient   │
│ • Enter amount      │
│ • Select UTXOs      │
│ • Calculate fee     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 2: Preview     │
│ • Show full tx      │
│ • Show all signers  │
│ • Confirm details   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 3: Create      │
│ Session             │
│ • Generate tx hash  │
│ • Create session    │
│ • Announce to peers │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 4: Round 1     │
│ Nonce Exchange      │
│ • Generate nonces   │
│ • Share with peers  │
│ • Collect nonces    │
│ • Show progress     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 5: Round 2     │
│ Signature Exchange  │
│ • Create partial    │
│ • Share with peers  │
│ • Collect partials  │
│ • Show progress     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 6: Finalize    │
│ • Aggregate sigs    │
│ • Build final tx    │
│ • Broadcast         │
│ • Show success      │
└─────────────────────┘
```

---

## Conclusion

The current lotus-web-wallet MuSig2 UI is fundamentally incomplete. While the SDK provides full MuSig2 support, the UI only exposes a fraction of the functionality—and that fraction (signing sessions) is disconnected from the prerequisite steps (key aggregation, address funding).

**To make MuSig2 usable, the wallet needs**:

1. **Key Aggregation UI** - Create shared wallets from multiple public keys
2. **Shared Wallet Management** - View, fund, and track shared addresses
3. **Transaction Builder** - Build actual transactions to sign
4. **Complete Signing Flow** - Show incoming requests, active sessions, transaction preview

Without these components, users cannot complete the MuSig2 workflow, regardless of how well the SDK implements the cryptographic protocol.

---

## Appendix A: SDK Function Reference

### Key Aggregation

```typescript
import { musigKeyAgg } from 'lotus-sdk'

const ctx = musigKeyAgg([pubkey1, pubkey2, pubkey3])
// Returns: { pubkeys, keyAggCoeff, aggregatedPubKey }
```

### Nonce Generation

```typescript
import { musigNonceGen } from 'lotus-sdk'

const nonce = musigNonceGen(privateKey, aggregatedPubKey, message, extraRandom)
// Returns: { secretNonces, publicNonces }
```

### Nonce Aggregation

```typescript
import { musigNonceAgg } from 'lotus-sdk'

const aggNonce = musigNonceAgg([nonce1.publicNonces, nonce2.publicNonces])
// Returns: { R1, R2 }
```

### Partial Signing

```typescript
import { musigPartialSign } from 'lotus-sdk'

const partialSig = musigPartialSign(
  nonce,
  privateKey,
  keyAggContext,
  signerIndex,
  aggregatedNonce,
  message,
)
// Returns: BN (partial signature)
```

### Signature Aggregation

```typescript
import { musigSigAgg } from 'lotus-sdk'

const signature = musigSigAgg(
  [partialSig1, partialSig2],
  aggregatedNonce,
  message,
  aggregatedPubKey,
)
// Returns: Signature (64-byte Schnorr)
```

---

## Appendix B: Related Documentation

- [Blockchain Commons MuSig2 Sequence Diagrams](https://developer.blockchaincommons.com/musig/sequence/)
- [BIP327: MuSig2 for BIP340-compatible Multi-Signatures](https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki)
- [lotus-sdk MuSig2 Implementation](/Users/matthew/Documents/Code/lotus-sdk/lib/bitcore/crypto/musig2.ts)
- [P2P UX Comprehensive Analysis](./P2P_UX_COMPREHENSIVE_ANALYSIS.md)
- [Complete UX Gap Analysis](./COMPLETE_UX_GAP_ANALYSIS.md)
