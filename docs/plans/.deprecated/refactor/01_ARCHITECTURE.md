# 01: Architecture & Folder Structure

## Overview

This document defines the target architecture for the refactored lotus-web-wallet. The goal is a clean separation of concerns that makes the codebase maintainable and extensible.

---

## Current Problems

### 1. Monolithic Stores

- `wallet.ts` is 53KB with 1500+ lines
- Mixes SDK interaction, state management, and business logic
- Hard to test, hard to understand

### 2. Inconsistent Component Organization

- Some components in root `components/`
- Some in feature folders (`components/p2p/`, `components/social/`)
- No clear pattern for when to use which

### 3. Composables Do Too Much

- `useUtils.ts` is 18KB with unrelated utilities
- `useMuSig2.ts` is 28KB mixing UI state and SDK calls
- No clear boundaries

### 4. Pages Are Too Large

- `send.vue` is 32KB
- `p2p.vue` is 27KB
- Should be composed of smaller components

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Vue Pages                                   │
│  Thin orchestration layer - compose components, connect to stores        │
├─────────────────────────────────────────────────────────────────────────┤
│                           Vue Components                                 │
│  Reusable UI components - props in, events out, minimal logic            │
├─────────────────────────────────────────────────────────────────────────┤
│                            Composables                                   │
│  Reusable logic - formatting, validation, API calls                      │
├─────────────────────────────────────────────────────────────────────────┤
│                           Pinia Stores                                   │
│  Global state - wallet, network, contacts, p2p                           │
├─────────────────────────────────────────────────────────────────────────┤
│                             Services                                     │
│  SDK wrappers - Chronik, P2P, MuSig2 (stateless)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                            lotus-sdk                                     │
│  Core functionality - Bitcore, P2P, Crypto                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## New Folder Structure

```
lotus-web-wallet/
├── app.vue                    # Root app component
├── nuxt.config.ts             # Nuxt configuration
├── app.config.ts              # App configuration
│
├── assets/
│   └── css/
│       └── main.css           # Global styles, Tailwind imports
│
├── components/
│   ├── ui/                    # Design system primitives
│   │   ├── AppCard.vue        # Standardized card wrapper
│   │   ├── AppEmptyState.vue  # Empty state with illustration
│   │   ├── AppLoadingState.vue # Loading state variants
│   │   ├── AppErrorState.vue  # Error state with retry
│   │   ├── AppHeroCard.vue    # Hero card for page headers
│   │   ├── AppStatCard.vue    # Stat display card
│   │   └── AppActionCard.vue  # Quick action card
│   │
│   ├── wallet/                # Wallet-specific components
│   │   ├── BalanceDisplay.vue # Balance with fiat conversion
│   │   ├── BalanceChart.vue   # Mini balance history chart
│   │   ├── QuickActions.vue   # Send/Receive/Scan buttons
│   │   ├── NetworkStatus.vue  # Connection status indicator
│   │   └── ActivityFeed.vue   # Recent transactions
│   │
│   ├── send/                  # Send flow components
│   │   ├── RecipientInput.vue # Address input with QR scan
│   │   ├── AmountInput.vue    # Amount with max button
│   │   ├── FeeSelector.vue    # Fee selection
│   │   ├── CoinControl.vue    # UTXO selection
│   │   ├── TxPreview.vue      # Transaction preview
│   │   ├── TxConfirmation.vue # Confirmation modal
│   │   └── TxSuccess.vue      # Success state
│   │
│   ├── receive/               # Receive flow components
│   │   ├── AddressDisplay.vue # Address with copy
│   │   ├── QRCode.vue         # QR code display
│   │   ├── AmountRequest.vue  # Optional amount input
│   │   └── PaymentWaiting.vue # Waiting for payment
│   │
│   ├── history/               # History components
│   │   ├── TxFilters.vue      # Filter chips
│   │   ├── TxSearch.vue       # Search input
│   │   ├── TxItem.vue         # Transaction list item
│   │   └── TxDetail.vue       # Transaction detail modal
│   │
│   ├── contacts/              # Contact components
│   │   ├── ContactCard.vue    # Contact display card
│   │   ├── ContactForm.vue    # Add/edit contact form
│   │   ├── ContactSearch.vue  # Search contacts
│   │   ├── ContactGroups.vue  # Group management
│   │   └── ContactActivity.vue # Per-contact activity
│   │
│   ├── explorer/              # Explorer components
│   │   ├── SearchBar.vue      # Universal search
│   │   ├── BlockItem.vue      # Block list item
│   │   ├── BlockDetail.vue    # Block detail view
│   │   ├── TxItem.vue         # Transaction list item
│   │   ├── TxDetail.vue       # Transaction detail view
│   │   ├── AddressDisplay.vue # Address with contact info
│   │   └── AddressDetail.vue  # Address detail view
│   │
│   ├── social/                # Social/RANK components
│   │   ├── ProfileCard.vue    # Profile display card
│   │   ├── ProfileSearch.vue  # Search profiles
│   │   ├── VoteButton.vue     # Inline vote button
│   │   ├── VoteModal.vue      # Vote amount modal
│   │   ├── ActivityItem.vue   # Vote activity item
│   │   └── TrendingList.vue   # Trending profiles
│   │
│   ├── p2p/                   # P2P components
│   │   ├── ConnectionStatus.vue # P2P connection state
│   │   ├── PeerGrid.vue       # Online peers display
│   │   ├── ActivityFeed.vue   # P2P activity feed
│   │   ├── PresenceToggle.vue # Online/offline toggle
│   │   └── OnboardingCard.vue # P2P explanation
│   │
│   ├── musig2/                # MuSig2 components
│   │   ├── SignerCard.vue     # Signer display
│   │   ├── SignerList.vue     # Available signers
│   │   ├── SignerFilters.vue  # Filter by tx type
│   │   ├── SigningRequest.vue # Request signature modal
│   │   ├── IncomingRequest.vue # Incoming request card
│   │   ├── SessionProgress.vue # Signing progress
│   │   ├── SharedWalletCard.vue # Shared wallet display
│   │   └── CreateSharedWallet.vue # Create shared wallet
│   │
│   ├── settings/              # Settings components
│   │   ├── SettingsSection.vue # Settings group
│   │   ├── SettingsItem.vue   # Settings row item
│   │   ├── BackupWarning.vue  # Backup reminder
│   │   └── NetworkSelector.vue # Network switch
│   │
│   └── common/                # Shared components
│       ├── AddressFingerprint.vue # Truncated address
│       ├── Avatar.vue         # User/contact avatar
│       ├── CopyButton.vue     # Copy to clipboard
│       ├── TimeAgo.vue        # Relative time
│       ├── AmountDisplay.vue  # XPI amount formatting
│       └── Badge.vue          # Status badges
│
├── composables/
│   ├── useWallet.ts           # Wallet utilities (formatting, validation)
│   ├── useAddress.ts          # Address parsing, formatting
│   ├── useTransaction.ts      # Transaction utilities
│   ├── useChronik.ts          # Chronik API wrapper
│   ├── useP2P.ts              # P2P utilities
│   ├── useMuSig2.ts           # MuSig2 utilities
│   ├── useRank.ts             # RANK API wrapper
│   ├── useClipboard.ts        # Clipboard operations
│   ├── useQRCode.ts           # QR code generation/scanning
│   └── useNotifications.ts    # Toast/notification helpers
│
├── stores/
│   ├── wallet.ts              # Wallet state (balance, UTXOs, history)
│   ├── draft.ts               # Draft transaction state (split from wallet)
│   ├── network.ts             # Network configuration
│   ├── contacts.ts            # Contacts state
│   ├── p2p.ts                 # P2P connection state
│   ├── musig2.ts              # MuSig2 state (split from p2p)
│   ├── ui.ts                  # UI state (modals, sidebars, etc.)
│   └── onboarding.ts          # Onboarding progress
│
├── services/
│   ├── chronik.ts             # Chronik client wrapper
│   ├── p2p.ts                 # P2P coordinator wrapper
│   ├── musig2.ts              # MuSig2 coordinator wrapper
│   └── storage.ts             # LocalStorage/IndexedDB wrapper
│
├── pages/
│   ├── index.vue              # Wallet home
│   ├── send.vue               # Send flow
│   ├── receive.vue            # Receive flow
│   ├── history.vue            # Transaction history
│   ├── contacts.vue           # Contacts
│   ├── p2p.vue                # P2P hub
│   ├── explorer/
│   │   ├── index.vue          # Explorer home
│   │   ├── blocks.vue         # Block list
│   │   ├── block/
│   │   │   └── [hashOrHeight].vue
│   │   ├── tx/
│   │   │   └── [txid].vue
│   │   └── address/
│   │       └── [address].vue
│   ├── social/
│   │   ├── index.vue          # Social home
│   │   └── [platform]/
│   │       └── [profileId].vue
│   └── settings/
│       ├── index.vue          # Settings home
│       ├── backup.vue         # Backup seed
│       ├── restore.vue        # Restore wallet
│       ├── network.vue        # Network settings
│       ├── p2p.vue            # P2P settings
│       └── advertise.vue      # Signer advertisement
│
├── layouts/
│   └── default.vue            # Main layout with sidebar
│
├── plugins/
│   └── bitcore.client.ts      # SDK initialization
│
├── types/
│   ├── wallet.ts              # Wallet types
│   ├── transaction.ts         # Transaction types
│   ├── contact.ts             # Contact types
│   ├── p2p.ts                 # P2P types
│   ├── musig2.ts              # MuSig2 types
│   └── ui.ts                  # UI types
│
└── utils/
    ├── constants.ts           # App constants
    ├── formatting.ts          # Number/string formatting
    ├── validation.ts          # Input validation
    └── helpers.ts             # Misc helpers
```

---

## Data Flow Patterns

### Pattern 1: Page → Store → Service → SDK

```typescript
// pages/send.vue
const draftStore = useDraftStore()
await draftStore.send()

// stores/draft.ts
async send() {
  const tx = await walletService.buildTransaction(this.draftTx)
  const result = await walletService.broadcast(tx)
  return result
}

// services/wallet.ts
async buildTransaction(draft: DraftTransaction): Promise<Transaction> {
  const { Transaction } = getBitcoreSDK()
  // Build transaction using SDK
}
```

### Pattern 2: Component → Composable → Store

```typescript
// components/wallet/BalanceDisplay.vue
const { formatXPI, formatFiat } = useWallet()
const walletStore = useWalletStore()

const displayBalance = computed(() => formatXPI(walletStore.balance))
```

### Pattern 3: Real-time Updates via Store Subscriptions

```typescript
// stores/wallet.ts
async initializeChronik() {
  chronikService.onTransaction((tx) => {
    this.handleNewTransaction(tx)
  })
}

// pages/index.vue
const walletStore = useWalletStore()
// Reactive - updates automatically when store changes
const balance = computed(() => walletStore.balance)
```

---

## Store Responsibilities

### `wallet.ts` - Core Wallet State

- Balance (confirmed, unconfirmed, total)
- UTXOs
- Transaction history
- Wallet initialization
- Chronik connection

### `draft.ts` - Draft Transaction State (NEW)

- Current draft transaction
- Recipients
- Amounts
- Fee calculation
- Coin control selection
- Validation state

### `network.ts` - Network Configuration

- Current network (mainnet/testnet)
- Chronik endpoint
- Network switching

### `contacts.ts` - Contacts State

- Contact list
- Contact groups
- Favorites
- Search/filter

### `p2p.ts` - P2P Connection State

- Connection status
- Connected peers
- DHT status
- Presence configuration
- Activity events

### `musig2.ts` - MuSig2 State (NEW - split from p2p)

- Discovered signers
- Active sessions
- Incoming requests
- Shared wallets
- Signer configuration

### `ui.ts` - UI State (NEW)

- Active modals
- Sidebar state
- Toast queue
- Loading states

### `onboarding.ts` - Onboarding State (NEW)

- First-time user flag
- Completed steps
- Dismissed hints

---

## Service Responsibilities

### `chronik.ts` - Chronik Client

- Initialize Chronik connection
- Subscribe to address updates
- Fetch transactions
- Fetch UTXOs
- Broadcast transactions

### `p2p.ts` - P2P Coordinator

- Initialize P2P connection
- Manage peer connections
- DHT operations
- Presence advertisement

### `musig2.ts` - MuSig2 Coordinator

- Signer advertisement
- Signer discovery
- Session management
- Signing operations

### `storage.ts` - Persistence

- Save/load wallet state
- Save/load contacts
- Save/load settings
- IndexedDB for large data

---

## Component Guidelines

### 1. Props In, Events Out

```vue
<script setup lang="ts">
// Props define what the component displays
const props = defineProps<{
  transaction: Transaction
  compact?: boolean
}>()

// Events define what the component can trigger
const emit = defineEmits<{
  click: [tx: Transaction]
  copy: [txid: string]
}>()
</script>
```

### 2. No Direct Store Access in Leaf Components

```vue
<!-- BAD: Leaf component accessing store -->
<script setup>
const walletStore = useWalletStore()
const balance = walletStore.balance
</script>

<!-- GOOD: Receive data via props -->
<script setup>
const props = defineProps<{ balance: bigint }>()
</script>
```

### 3. Container/Presenter Pattern for Complex Features

```vue
<!-- pages/send.vue (Container) -->
<template>
  <SendFlow
    :draft="draftStore.draftTx"
    :contacts="contactStore.contacts"
    @update-recipient="draftStore.updateRecipient"
    @send="handleSend"
  />
</template>

<!-- components/send/SendFlow.vue (Presenter) -->
<template>
  <RecipientInput :value="draft.recipient" @update="emit('update-recipient')" />
  <AmountInput :value="draft.amount" @update="emit('update-amount')" />
  <!-- ... -->
</template>
```

---

## Migration Strategy

### Step 1: Create New Structure

- Create new folders
- Create type definitions
- Create service wrappers

### Step 2: Split Stores

- Extract `draft.ts` from `wallet.ts`
- Extract `musig2.ts` from `p2p.ts`
- Create `ui.ts` and `onboarding.ts`

### Step 3: Create Design System Components

- Build `ui/` components
- Document patterns

### Step 4: Migrate Pages One by One

- Start with simplest (receive.vue)
- End with most complex (send.vue, p2p.vue)

### Step 5: Remove Old Code

- Delete unused components
- Clean up old patterns

---

## File Size Guidelines

| File Type  | Max Lines | Action if Exceeded              |
| ---------- | --------- | ------------------------------- |
| Page       | 300       | Split into components           |
| Component  | 200       | Split into smaller components   |
| Store      | 400       | Split into multiple stores      |
| Composable | 200       | Split into multiple composables |
| Service    | 300       | Split into multiple services    |

---

_Next: [02_DESIGN_SYSTEM.md](./02_DESIGN_SYSTEM.md)_
