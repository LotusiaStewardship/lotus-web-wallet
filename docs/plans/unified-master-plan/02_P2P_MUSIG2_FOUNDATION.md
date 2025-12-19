# Phase 2: P2P & MuSig2 Foundation

## Overview

This phase establishes the foundational UI infrastructure for P2P networking and MuSig2 multi-signature features. It creates the navigation structure, shared components, and routes that all subsequent P2P/MuSig2 work depends on.

**Priority**: P0 (Critical Path)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1 (Infrastructure Foundation)

---

## Source Phases

| Source Plan           | Phase | Component                          |
| --------------------- | ----- | ---------------------------------- |
| unified-p2p-musig2-ui | 1     | Foundation & Shared Infrastructure |

---

## Tasks

### 2.1 Route & Page Setup

**Effort**: 0.5 days

#### New Pages

- [ ] Create `pages/people/shared-wallets/index.vue`

  - List of all shared wallets
  - Create new wallet button
  - Empty state with guidance

- [ ] Create `pages/people/shared-wallets/[id].vue`
  - Dynamic route for wallet detail
  - Uses route param for wallet ID
  - Shows wallet detail component

#### Page Updates

- [ ] Update `pages/people/index.vue` with hub design
  - Quick stats: contacts count, shared wallets count, P2P status
  - Quick actions grid: Contacts, Shared Wallets, P2P Network
  - Recent activity preview

---

### 2.2 Shared Components

**Effort**: 1 day

#### TransactionPreview Component

- [ ] Create `components/shared/TransactionPreview.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    inputs: Array<{ address: string; amount: number }>
    outputs: Array<{ address: string; amount: number }>
    fee: number
    showRaw?: boolean
  }
  </script>
  ```

  Features:

  - Input/output lists with contact-aware addresses
  - Fee display
  - Total amounts
  - Collapsible raw hex view
  - Copy transaction hex button

#### SigningProgress Component

- [ ] Create `components/shared/SigningProgress.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    participants: Array<{
      publicKey: string
      name?: string
      status: 'pending' | 'committed' | 'signed' | 'failed'
    }>
    currentStep: 'waiting' | 'committing' | 'signing' | 'complete' | 'failed'
    timeoutAt?: Date
  }
  </script>
  ```

  Features:

  - Participant list with status indicators
  - Progress bar or step indicator
  - Timeout countdown
  - Current step description

#### ParticipantSelector Component

- [ ] Create `components/shared/ParticipantSelector.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    modelValue: string[] // Selected public keys
    minParticipants?: number
    maxParticipants?: number
    includeOnlineOnly?: boolean
  }
  </script>
  ```

  Features:

  - Contact list with public keys
  - Online status indicators
  - Multi-select with checkboxes
  - Search/filter
  - Validation for min/max participants

---

### 2.3 Contact Model Extension

**Effort**: 0.5 days

#### Type Updates

- [ ] Update `types/contact.ts` with P2P fields
  ```typescript
  export interface Contact {
    // Existing fields...
    id: string
    name: string
    address: string
    avatar?: string
    notes?: string

    // New P2P fields
    publicKey?: string // MuSig2 public key
    peerId?: string // libp2p peer ID
    signerCapabilities?: {
      musig2: boolean
      threshold?: number
    }
    lastSeenOnline?: Date
  }
  ```

#### Store Updates

- [ ] Add getters to `stores/contacts.ts`

  ```typescript
  // Contacts that have public keys (MuSig2-capable)
  contactsWithPublicKeys: state => state.contacts.filter(c => c.publicKey)

  // Find contact by peer ID
  findByPeerId: state => (peerId: string) =>
    state.contacts.find(c => c.peerId === peerId)

  // Find contact by public key
  findByPublicKey: state => (publicKey: string) =>
    state.contacts.find(c => c.publicKey === publicKey)
  ```

- [ ] Add actions to `stores/contacts.ts`
  ```typescript
  // Update contact's P2P info
  updateP2PInfo(id: string, info: {
    publicKey?: string
    peerId?: string
    signerCapabilities?: SignerCapabilities
    lastSeenOnline?: Date
  })
  ```

---

### 2.4 Navigation Updates

**Effort**: 0.5 days

#### Badge Integration

- [ ] Add pending requests badge to People nav item

  ```vue
  <!-- In navigation component -->
  <UBadge v-if="pendingRequestsCount > 0" color="red" size="xs">
    {{ pendingRequestsCount }}
  </UBadge>
  ```

- [ ] Create computed for pending requests count
  ```typescript
  const pendingRequestsCount = computed(() => {
    const musig2Store = useMusig2Store()
    return musig2Store.incomingRequests.filter(r => r.status === 'pending')
      .length
  })
  ```

#### Navigation Verification

- [ ] Verify navigation works between all People sub-pages:
  - `/people` → `/people/contacts`
  - `/people` → `/people/shared-wallets`
  - `/people` → `/people/p2p`
  - `/people/shared-wallets` → `/people/shared-wallets/[id]`
  - Back navigation from all detail pages

---

## File Changes Summary

### New Files

| File                                        | Purpose                     |
| ------------------------------------------- | --------------------------- |
| `pages/people/shared-wallets/index.vue`     | Shared wallets list page    |
| `pages/people/shared-wallets/[id].vue`      | Shared wallet detail page   |
| `components/shared/TransactionPreview.vue`  | Unified transaction preview |
| `components/shared/SigningProgress.vue`     | Unified signing progress    |
| `components/shared/ParticipantSelector.vue` | Contact/signer selection    |

### Modified Files

| File                     | Changes                           |
| ------------------------ | --------------------------------- |
| `pages/people/index.vue` | Hub design with stats and actions |
| `types/contact.ts`       | Add P2P fields                    |
| `stores/contacts.ts`     | Add P2P getters and actions       |
| Navigation component     | Add pending requests badge        |

---

## Component Specifications

### TransactionPreview.vue

```
┌─────────────────────────────────────────────────────────────┐
│  Transaction Preview                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUTS (2)                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟢 Alice (Lk9W·oSb8)              1,000.00 XPI      │   │
│  │ 🟢 Bob (Lm3X·pQr9)                  500.00 XPI      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  OUTPUTS (2)                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📍 Charlie (Ln7Y·sT0a)           1,400.00 XPI      │   │
│  │ 📍 Change (Lk9W·oSb8)               99.50 XPI      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Fee: 0.50 XPI                                              │
│                                                             │
│  [▼ Show Raw Hex]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### SigningProgress.vue

```
┌─────────────────────────────────────────────────────────────┐
│  Signing Progress                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 2 of 3: Collecting Commitments                        │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  67%         │
│                                                             │
│  PARTICIPANTS                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ You                              Committed       │   │
│  │ ✅ Alice                            Committed       │   │
│  │ ⏳ Bob                              Waiting...      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⏱️ Session expires in 4:32                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ParticipantSelector.vue

```
┌─────────────────────────────────────────────────────────────┐
│  Select Participants                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 Search contacts...                                      │
│                                                             │
│  ☑️ Show online only                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] 🟢 Alice          Has public key    Online      │   │
│  │ [✓] 🟢 Bob            Has public key    Online      │   │
│  │ [ ] ⚫ Charlie        Has public key    Offline     │   │
│  │ [ ] ⚪ Dave           No public key     —           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Selected: 2 of 2-5 participants                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

### Routes

- [ ] `/people/shared-wallets` loads without error
- [ ] `/people/shared-wallets/test-id` loads without error
- [ ] Navigation between People pages works
- [ ] Back navigation works from all pages

### Shared Components

- [ ] TransactionPreview renders with mock data
- [ ] SigningProgress shows all states correctly
- [ ] ParticipantSelector allows multi-select
- [ ] All components are TypeScript-clean

### Contact Model

- [ ] New fields don't break existing contacts
- [ ] Getters return correct results
- [ ] P2P info can be updated

### Navigation

- [ ] Badge shows when pending requests exist
- [ ] Badge hides when no pending requests
- [ ] Badge count updates reactively

---

## Notes

- Shared components will be used by both P2P and MuSig2 features
- Contact model extension is backward-compatible (new fields optional)
- Navigation badges provide at-a-glance status
- All components follow existing design system patterns

---

## Next Phase

After completing Phase 2, proceed to:

- **Phase 3**: Network and Wallet Integration (network monitor, wallet notifications)
- **Phase 4**: P2P Core Integration (can start in parallel if resources allow)

---

_Source: unified-p2p-musig2-ui/01_FOUNDATION.md_
