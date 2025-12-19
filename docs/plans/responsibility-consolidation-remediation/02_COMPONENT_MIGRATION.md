# Component Migration Guide

Detailed changes for each affected component and page.

---

## Migration Strategy

Components are migrated in priority order:

1. **Critical Path** - Core contact and signer display
2. **Shared Wallets** - Multi-signature wallet UI
3. **P2P Components** - Network and presence UI
4. **Remaining** - All other affected components

Each component migration follows this pattern:

1. Replace multi-store imports with facade composable
2. Update online status checks to use identity store
3. Update data access patterns
4. Test functionality

---

## Critical Path Components

### ContactCard.vue

**File**: `components/contacts/ContactCard.vue`

**Current Imports**:

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useIdentityStore } from '~/stores/identity'
```

**New Import**:

```typescript
import { useContactContext } from '~/composables/useContactContext'
```

**Current Logic**:

```typescript
const contactsStore = useContactsStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const identityStore = useIdentityStore()

// Complex online status detection
const isOnline = computed(() => {
  if (props.contact.peerId && p2pStore.connectedPeers.some(...)) return true
  const identity = identityStore.get(props.contact.publicKey)
  if (identity?.isOnline) return true
  return false
})

// Shared wallets lookup
const sharedWallets = computed(() =>
  musig2Store.sharedWallets.filter(w =>
    w.participants.some(p => p.publicKeyHex === props.contact.publicKey)
  )
)
```

**New Logic**:

```typescript
const { identity, onlineStatus, sharedWallets, canMuSig2, send, copyAddress } =
  useContactContext(() => props.contact.id)

// Template uses onlineStatus directly
// 'online' | 'recently_online' | 'offline' | 'unknown'
```

**Template Changes**:

```vue
<!-- Before -->
<span v-if="isOnline" class="text-success">Online</span>

<!-- After -->
<span
  :class="{
    'text-success': onlineStatus === 'online',
    'text-warning': onlineStatus === 'recently_online',
    'text-muted': onlineStatus === 'offline' || onlineStatus === 'unknown',
  }"
>
  {{ onlineStatus === 'online' ? 'Online' : 
     onlineStatus === 'recently_online' ? 'Recently Online' : 
     'Offline' }}
</span>
```

---

### ContactDetailSlideover.vue

**File**: `components/contacts/ContactDetailSlideover.vue`

**Current Imports** (4 stores):

```typescript
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
```

**New Import**:

```typescript
import { useContactContext } from '~/composables/useContactContext'
```

**Current Logic**:

```typescript
const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

const contactTransactions = computed(() => {
  if (!props.contact?.address) return []
  return walletStore.getTransactionsWithContact(props.contact.address)
})

const isOnline = computed(() => {
  if (!props.contact?.peerId) return false
  return p2pStore.isPeerOnline(props.contact.peerId)
})

const sharedWalletsWithContact = computed(() => {
  if (!props.contact?.publicKey) return []
  return musig2Store.sharedWallets.filter(...)
})
```

**New Logic**:

```typescript
const contactId = computed(() => props.contact?.id ?? '')
const {
  identity,
  onlineStatus,
  sharedWallets,
  transactionCount,
  canMuSig2,
  send,
  edit,
  remove,
  createSharedWallet,
  copyAddress,
  copyPublicKey,
} = useContactContext(contactId)
```

**Template Changes**:

```vue
<!-- Before: Multiple computed checks -->
<span v-if="isOnline" class="text-success">Online</span>
<span v-else class="text-muted">Offline</span>

<!-- After: Single source -->
<span :class="onlineStatusClass">{{ onlineStatusText }}</span>

<!-- Before: Direct store access -->
<div v-if="sharedWalletsWithContact.length > 0">

<!-- After: Composable data -->
<div v-if="sharedWallets.length > 0">
```

---

### SignerCard.vue

**File**: `components/common/SignerCard.vue`

**Current Imports**:

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
```

**New Import**:

```typescript
import { useIdentityStore } from '~/stores/identity'
```

**Current Logic**:

```typescript
// Uses signer.isOnline from musig2 store
const isOnline = computed(() => props.signer.isOnline)
```

**New Logic**:

```typescript
const identityStore = useIdentityStore()

const onlineStatus = computed(() =>
  identityStore.getOnlineStatus(props.signer.publicKey),
)
```

---

### SignerList.vue

**File**: `components/p2p/SignerList.vue`

**Current Imports**:

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import { useIdentityStore } from '~/stores/identity'
```

**New Import**:

```typescript
import { useSignerContext } from '~/composables/useSignerContext'
```

**New Logic**:

```typescript
const { discoveredSigners, isAdvertising, isInitialized, isLoading, refresh } =
  useSignerContext()

// Each signer now has identity and contact attached
// discoveredSigners[].onlineStatus is already computed
```

---

## Shared Wallet Components

### CreateSharedWalletModal.vue

**File**: `components/musig2/CreateSharedWalletModal.vue`

**Current Imports** (4 stores):

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
```

**New Imports**:

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
import { useMuSig2Store } from '~/stores/musig2'
import { useWalletStore } from '~/stores/wallet'
```

**Changes**:

- Remove `p2pStore` usage for online status
- Use `identityStore.getOnlineStatus()` for participant status
- Keep `musig2Store` for wallet creation

**Current Logic**:

```typescript
const eligibleContacts = computed(() =>
  contactsStore.contacts.filter(c => c.publicKey || c.identityId)
)

// Online status from contact.lastSeenOnline
<UBadge v-if="contact.lastSeenOnline && Date.now() - contact.lastSeenOnline < 300000">
```

**New Logic**:

```typescript
const identityStore = useIdentityStore()

const eligibleContacts = computed(() =>
  contactsStore.contacts.filter(c => c.publicKey || c.identityId),
)

function getContactOnlineStatus(contact: Contact): OnlineStatus {
  const pubKey = contact.identityId || contact.publicKey
  if (!pubKey) return 'unknown'
  return identityStore.getOnlineStatus(pubKey)
}
```

**Template Changes**:

```vue
<!-- Before -->
<UBadge
  v-if="contact.lastSeenOnline && Date.now() - contact.lastSeenOnline < 300000"
  color="success"
  variant="subtle"
  size="xs"
>
  Online
</UBadge>

<!-- After -->
<UBadge
  v-if="getContactOnlineStatus(contact) === 'online'"
  color="success"
  variant="subtle"
  size="xs"
>
  Online
</UBadge>
<UBadge
  v-else-if="getContactOnlineStatus(contact) === 'recently_online'"
  color="warning"
  variant="subtle"
  size="xs"
>
  Recently Online
</UBadge>
```

---

### ProposeSpendModal.vue

**File**: `components/musig2/ProposeSpendModal.vue`

**Current Imports** (4+ stores):

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
```

**New Import**:

```typescript
import { useSharedWalletContext } from '~/composables/useSharedWalletContext'
```

**New Logic**:

```typescript
const {
  wallet,
  participants,
  onlineParticipantCount,
  canPropose,
  proposeSpend,
} = useSharedWalletContext(() => props.walletId)

// participants already has identity, contact, and onlineStatus attached
```

---

### ParticipantList.vue

**File**: `components/shared-wallets/ParticipantList.vue`

**Current Imports** (4 stores):

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useIdentityStore } from '~/stores/identity'
```

**New Import**:

```typescript
import {
  useSharedWalletContext,
  type ParticipantWithContext,
} from '~/composables/useSharedWalletContext'
```

**New Logic**:

```typescript
const { participants, onlineParticipantCount } = useSharedWalletContext(
  () => props.walletId,
)

// Each participant has:
// - publicKeyHex
// - identity (Identity | null)
// - contact (Contact | null)
// - onlineStatus (OnlineStatus)
// - isMe (boolean)
```

**Template Changes**:

```vue
<!-- Before: Complex lookups -->
<div v-for="participant in wallet.participants" :key="participant.publicKeyHex">
  <span>{{ getParticipantName(participant) }}</span>
  <span v-if="isParticipantOnline(participant)">Online</span>
</div>

<!-- After: Pre-computed data -->
<div v-for="participant in participants" :key="participant.publicKeyHex">
  <span>{{ participant.contact?.name || participant.identity?.nickname || 'Unknown' }}</span>
  <UBadge v-if="participant.isMe" color="primary">You</UBadge>
  <OnlineStatusBadge :status="participant.onlineStatus" />
</div>
```

---

### AvailableSigners.vue

**File**: `components/shared-wallets/AvailableSigners.vue`

**Current Imports**:

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import { useIdentityStore } from '~/stores/identity'
```

**New Import**:

```typescript
import { useSignerContext } from '~/composables/useSignerContext'
```

**New Logic**:

```typescript
const { discoveredSigners, isLoading, refresh } = useSignerContext()

// Each signer has identity, contact, and onlineStatus attached
```

---

## P2P Components

### NetworkStatus.vue (p2p)

**File**: `components/p2p/NetworkStatus.vue`

**Current Imports**:

```typescript
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
```

**Changes**:

- Keep `p2pStore` for connection status (this is its responsibility)
- Remove identity/contact lookups for online counts
- Use `identityStore.onlineIdentities` for online count

**New Logic**:

```typescript
const p2pStore = useP2PStore()
const identityStore = useIdentityStore()

const onlineCount = computed(() => identityStore.onlineIdentities.length)
const connectedPeerCount = computed(() => p2pStore.connectedPeers.length)
```

---

### PresenceToggle.vue

**File**: `components/p2p/PresenceToggle.vue`

**Current Imports**:

```typescript
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
```

**Changes**:

- Keep `p2pStore` for presence toggle (this is its responsibility)
- Remove other store imports if not needed

---

### SigningSessionProgress.vue

**File**: `components/p2p/SigningSessionProgress.vue`

**Current Imports**:

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'
```

**Changes**:

- Use `identityStore` for participant name resolution
- Keep `musig2Store` for session data

---

## Remaining Components

### Common Components

| Component               | Current Stores     | After            |
| ----------------------- | ------------------ | ---------------- |
| `AddressDisplay.vue`    | contacts, identity | identity only    |
| `SignerDetailModal.vue` | contacts, identity | useSignerContext |

### Contact Components

| Component                  | Current Stores     | After                        |
| -------------------------- | ------------------ | ---------------------------- |
| `ContactForm.vue`          | contacts, identity | contacts, identity (minimal) |
| `ContactFormSlideover.vue` | contacts, identity | contacts, identity (minimal) |
| `ContactPicker.vue`        | contacts, identity | contacts, identity           |
| `ContactSearch.vue`        | contacts, identity | contacts only                |

### Explorer Components

| Component                | Current Stores     | After         |
| ------------------------ | ------------------ | ------------- |
| `AddToContactButton.vue` | contacts, identity | contacts only |
| `AddressDisplay.vue`     | contacts, identity | identity only |
| `TxItem.vue`             | contacts, wallet   | contacts only |

### History Components

| Component    | Current Stores   | After         |
| ------------ | ---------------- | ------------- |
| `TxItem.vue` | contacts, wallet | contacts only |

### Layout Components

| Component            | Current Stores   | After                 |
| -------------------- | ---------------- | --------------------- |
| `CommandPalette.vue` | contacts, wallet | contacts only         |
| `NavbarActions.vue`  | wallet, p2p      | wallet, p2p (minimal) |
| `SidebarFooter.vue`  | wallet, p2p      | wallet, p2p (minimal) |

### MuSig2 Components

| Component                 | Current Stores                  | After                  |
| ------------------------- | ------------------------------- | ---------------------- |
| `FundWalletModal.vue`     | wallet, musig2                  | useSharedWalletContext |
| `IncomingRequestCard.vue` | contacts, musig2, p2p, identity | useSignerContext       |
| `RequestDetailModal.vue`  | contacts, musig2, p2p, identity | useSignerContext       |
| `TransactionPreview.vue`  | wallet, musig2                  | musig2 only            |

### Send Components

| Component               | Current Stores   | After            |
| ----------------------- | ---------------- | ---------------- |
| `ConfirmationModal.vue` | wallet, contacts | wallet, contacts |
| `AdvancedOptions.vue`   | wallet, draft    | wallet, draft    |

### Social Components

| Component          | Current Stores   | After         |
| ------------------ | ---------------- | ------------- |
| `ActivityItem.vue` | contacts, wallet | contacts only |
| `VoteModal.vue`    | wallet, contacts | wallet only   |

### Wallet Components

| Component           | Current Stores                | After                 |
| ------------------- | ----------------------------- | --------------------- |
| `BalanceHero.vue`   | wallet                        | wallet (no change)    |
| `NetworkStatus.vue` | wallet, p2p, musig2, contacts | wallet, p2p, identity |
| `QuickActions.vue`  | wallet, contacts              | wallet only           |
| `TxItem.vue`        | wallet, contacts              | wallet, contacts      |

---

## Pages

### /people/contacts.vue

**Current Imports**:

```typescript
import { useContactsStore } from '~/stores/contacts'
```

**Changes**: Minimal - page mostly uses ContactCard component

---

### /people/p2p.vue

**Current Imports**:

```typescript
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
```

**New Imports**:

```typescript
import { useP2PStore } from '~/stores/p2p'
import { useSignerContext } from '~/composables/useSignerContext'
```

---

### /people/shared-wallets/index.vue

**Current Imports**:

```typescript
import { useMuSig2Store } from '~/stores/musig2'
import { useContactsStore } from '~/stores/contacts'
import { useP2PStore } from '~/stores/p2p'
import { useIdentityStore } from '~/stores/identity'
```

**New Imports**:

```typescript
import { useMuSig2Store } from '~/stores/musig2'
import { useIdentityStore } from '~/stores/identity'
```

---

### /people/shared-wallets/[id].vue

**Current Imports** (8 matches - most complex):

```typescript
import { useMuSig2Store } from '~/stores/musig2'
import { useContactsStore } from '~/stores/contacts'
import { useP2PStore } from '~/stores/p2p'
import { useIdentityStore } from '~/stores/identity'
import { useWalletStore } from '~/stores/wallet'
// ... more
```

**New Import**:

```typescript
import { useSharedWalletContext } from '~/composables/useSharedWalletContext'
```

---

### /settings/advertise.vue

**Current Imports**:

```typescript
import { useMuSig2Store } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'
import { useIdentityStore } from '~/stores/identity'
```

**New Import**:

```typescript
import { useSignerContext } from '~/composables/useSignerContext'
import { useWalletStore } from '~/stores/wallet'
```

---

## New Shared Component: OnlineStatusBadge.vue

Create a reusable component for displaying online status:

**File**: `components/common/OnlineStatusBadge.vue` (NEW)

```vue
<script setup lang="ts">
import type { OnlineStatus } from '~/stores/identity'

const props = defineProps<{
  status: OnlineStatus
  showLabel?: boolean
}>()

const config = computed(() => {
  switch (props.status) {
    case 'online':
      return { color: 'success', icon: 'i-lucide-circle', label: 'Online' }
    case 'recently_online':
      return {
        color: 'warning',
        icon: 'i-lucide-circle',
        label: 'Recently Online',
      }
    case 'offline':
      return { color: 'neutral', icon: 'i-lucide-circle', label: 'Offline' }
    default:
      return {
        color: 'neutral',
        icon: 'i-lucide-help-circle',
        label: 'Unknown',
      }
  }
})
</script>

<template>
  <UBadge
    v-if="status !== 'unknown'"
    :color="config.color"
    variant="subtle"
    size="xs"
  >
    <UIcon :name="config.icon" class="w-2 h-2 fill-current" />
    <span v-if="showLabel" class="ml-1">{{ config.label }}</span>
  </UBadge>
</template>
```

Use this component throughout the app for consistent online status display.
