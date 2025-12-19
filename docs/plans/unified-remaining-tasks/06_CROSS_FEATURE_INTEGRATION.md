# Phase 6: Cross-Feature Integration

## Overview

This phase focuses on creating a unified, fluid user experience by integrating features across the application. The goal is to eliminate silos between Wallet, Contacts, Explorer, Social, and P2P features.

**Priority**: P1 (High)
**Estimated Effort**: 2-3 days
**Dependencies**: Phases 1-4, unified-p2p-musig2-ui complete

---

## Goals

1. Unified home page with cross-feature status
2. Contact-centric transaction history
3. Seamless navigation between related features
4. Consistent "Add to Contacts" prompts
5. Shared wallet visibility on home page
6. Unified activity feed

---

## 1. Home Page Integration

### 1.1 P2P Status on Home

Show P2P network status on wallet home page:

- [ ] Add P2P connection indicator (online/offline)
- [ ] Show pending signing requests count with badge
- [ ] Show online contacts count
- [ ] Quick link to P2P page

### 1.2 Shared Wallet Balances

Display shared wallet balances on home:

- [ ] Add "Shared Wallets" section below personal balance
- [ ] Show each shared wallet with balance
- [ ] Show participant online status
- [ ] Quick actions: Fund, Spend, View

### 1.3 Unified Quick Actions

Expand quick actions based on context:

- [ ] Show "Sign Request" if pending requests exist
- [ ] Show "Vote" if RANK feature is enabled
- [ ] Show "Create Shared Wallet" if P2P connected
- [ ] Personalize based on user activity

---

## 2. Contact-Centric Features

### 2.1 Transaction History per Contact

Show transaction history with each contact:

```typescript
interface ContactTransactionStats {
  totalSent: bigint
  totalReceived: bigint
  transactionCount: number
  lastTransactionAt: number
  transactions: TransactionHistoryItem[]
}
```

- [ ] Add `getTransactionsWithContact(contactId)` to wallet store
- [ ] Add "View History" action on contact card
- [ ] Show last transaction date on contact list item
- [ ] Display total sent/received in contact detail

### 2.2 Contact Quick Actions

Add contextual actions based on contact capabilities:

- [ ] "Send" - always available
- [ ] "Request Signature" - if contact has publicKey
- [ ] "Create Shared Wallet" - if contact has publicKey
- [ ] "Vote" - if contact is linked to social profile
- [ ] "View in Explorer" - link to address page

### 2.3 Contact Online Status

Show P2P online status for contacts:

- [ ] Add online indicator to contact list items
- [ ] Show "Last seen" timestamp
- [ ] Filter contacts by online status
- [ ] Sort online contacts first

---

## 3. Explorer Integration

### 3.1 Contact Resolution in Explorer

When viewing addresses in explorer:

- [ ] Check if address matches any contact
- [ ] Show contact name instead of truncated address
- [ ] Show contact avatar
- [ ] Add "Send to Contact" quick action

### 3.2 Own Transaction Highlighting

Highlight user's own transactions:

- [ ] Add "Your Transaction" badge
- [ ] Different styling for own transactions
- [ ] Link to wallet history entry
- [ ] Show in/out direction

### 3.3 Add to Contacts Flow

Prompt to add unknown addresses:

- [ ] Show "Add to Contacts" button for unknown addresses
- [ ] Pre-fill address in contact form
- [ ] Return to explorer after adding

---

## 4. Social/RANK Integration

### 4.1 Profile-Contact Linking

Link social profiles to contacts:

- [ ] If profile address matches contact, show contact name
- [ ] Add "Link to Contact" action on profile
- [ ] Show linked profile badge on contact card
- [ ] Sync profile avatar to contact

### 4.2 Vote Visibility

Show votes in relevant contexts:

- [ ] Show user's votes in wallet activity
- [ ] Show vote transactions in history with profile context
- [ ] Add vote icon/badge to transactions

### 4.3 Social Quick Actions

Add social actions where relevant:

- [ ] "Vote" button on contact card (if linked to profile)
- [ ] "View Profile" link from contact detail
- [ ] Social stats in contact detail

---

## 5. Unified Activity Feed

### 5.1 Activity Types

Define unified activity types:

```typescript
type ActivityType =
  | 'transaction_sent'
  | 'transaction_received'
  | 'signing_request_received'
  | 'signing_request_sent'
  | 'signing_session_completed'
  | 'vote_cast'
  | 'shared_wallet_funded'
  | 'shared_wallet_spent'
  | 'contact_added'
  | 'peer_connected'
```

### 5.2 Activity Store

Create unified activity store:

- [ ] Create `stores/activity.ts`
- [ ] Aggregate from wallet, P2P, MuSig2, contacts stores
- [ ] Support filtering by type
- [ ] Support date range filtering
- [ ] Persist recent activity

### 5.3 Activity Feed Component

Create unified activity feed:

- [ ] Create `components/common/ActivityFeed.vue`
- [ ] Show icon, description, timestamp for each activity
- [ ] Support click to navigate to detail
- [ ] Support filtering chips
- [ ] Lazy load older activity

---

## 6. Navigation Enhancements

### 6.1 Contextual Navigation

Add contextual links between features:

- [ ] Transaction → Contact (if known)
- [ ] Transaction → Explorer
- [ ] Contact → Transactions with contact
- [ ] Contact → Shared wallets with contact
- [ ] Profile → Contact (if linked)
- [ ] Shared Wallet → Participants (contacts)

### 6.2 Breadcrumb Enhancement

Improve breadcrumb context:

- [ ] Show contact name in transaction detail breadcrumb
- [ ] Show shared wallet name in signing session breadcrumb
- [ ] Show profile name in vote detail breadcrumb

### 6.3 Command Palette Integration

Add cross-feature search to command palette:

- [ ] Search contacts by name
- [ ] Search transactions by amount or txid
- [ ] Search shared wallets by name
- [ ] Search profiles by handle
- [ ] Recent items from all features

---

## 7. Implementation Checklist

### Home Page Integration

- [ ] Add P2P status indicator to home
- [ ] Add shared wallets section to home
- [ ] Add pending requests badge
- [ ] Add contextual quick actions

### Contact Integration

- [ ] Add `getTransactionsWithContact` to wallet store
- [ ] Add transaction stats to contact detail
- [ ] Add online status to contact list
- [ ] Add contextual actions based on capabilities

### Explorer Integration

- [ ] Resolve contact names in address display
- [ ] Highlight own transactions
- [ ] Add "Add to Contacts" prompts

### Social Integration

- [ ] Link profiles to contacts
- [ ] Show votes in activity feed
- [ ] Add social actions to contacts

### Activity Feed

- [ ] Create activity store
- [ ] Create ActivityFeed component
- [ ] Integrate on home page
- [ ] Add filtering

### Navigation

- [ ] Add contextual links
- [ ] Enhance breadcrumbs
- [ ] Update command palette

---

## 8. Data Flow

### Cross-Store Communication

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Wallet Store   │────▶│  Activity Store │◀────│   P2P Store     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      ▲                       │
         │                      │                       │
         ▼                      │                       ▼
┌─────────────────┐             │              ┌─────────────────┐
│ Contacts Store  │─────────────┴──────────────│  MuSig2 Store   │
└─────────────────┘                            └─────────────────┘
```

### Event-Driven Updates

- Wallet store emits `transaction:sent`, `transaction:received`
- P2P store emits `peer:connected`, `request:received`
- MuSig2 store emits `session:completed`, `wallet:funded`
- Activity store listens and aggregates

---

## 9. Testing

### Integration Testing

- [ ] Navigate from transaction to contact
- [ ] Navigate from contact to shared wallet
- [ ] Navigate from explorer to contact
- [ ] Navigate from profile to contact
- [ ] Activity feed shows all event types
- [ ] Command palette finds items from all features

### Edge Cases

- [ ] Contact with no transactions
- [ ] Transaction with unknown address
- [ ] Profile not linked to contact
- [ ] Shared wallet with offline participants
- [ ] Activity feed with many items (performance)

---

_End of Phase 6_
