# UI/UX Impact Analysis

Detailed analysis of how the responsibility consolidation affects user-facing features.

---

## Overview

The responsibility consolidation changes internal architecture but must maintain (and improve) the user experience. This document maps backend changes to their UI/UX impacts.

---

## Online Status Display

### Current State

Online status is displayed inconsistently across the app:

| Location                | Current Display       | Data Source                                           |
| ----------------------- | --------------------- | ----------------------------------------------------- |
| ContactCard             | Green dot + "Online"  | `p2pStore.connectedPeers` OR `contact.lastSeenOnline` |
| ContactDetailSlideover  | Green/gray dot + text | `p2pStore.isPeerOnline()`                             |
| SignerCard              | "Online" badge        | `signer.isOnline` from musig2 store                   |
| ParticipantList         | Green dot             | Multiple checks                                       |
| CreateSharedWalletModal | "Online" badge        | `contact.lastSeenOnline` timestamp check              |

**Problems**:

- Inconsistent visual treatment
- Different data sources give different answers
- "Recently online" state not shown
- No loading state for unknown status

### After Consolidation

Unified online status display:

| Status            | Visual                         | Color            | Icon                       |
| ----------------- | ------------------------------ | ---------------- | -------------------------- |
| `online`          | Filled dot + "Online"          | Green (success)  | `i-lucide-circle` (filled) |
| `recently_online` | Filled dot + "Recently Online" | Yellow (warning) | `i-lucide-circle` (filled) |
| `offline`         | Filled dot + "Offline"         | Gray (neutral)   | `i-lucide-circle` (filled) |
| `unknown`         | Help icon                      | Gray (neutral)   | `i-lucide-help-circle`     |

**Implementation**: New `OnlineStatusBadge.vue` component used everywhere.

### UI Changes Required

1. **ContactCard.vue**: Replace inline status with `<OnlineStatusBadge>`
2. **ContactDetailSlideover.vue**: Replace inline status with `<OnlineStatusBadge>`
3. **SignerCard.vue**: Replace inline status with `<OnlineStatusBadge>`
4. **SignerList.vue**: Replace inline status with `<OnlineStatusBadge>`
5. **ParticipantList.vue**: Replace inline status with `<OnlineStatusBadge>`
6. **CreateSharedWalletModal.vue**: Replace timestamp check with `<OnlineStatusBadge>`
7. **AvailableSigners.vue**: Replace inline status with `<OnlineStatusBadge>`

---

## Contact Display

### Current State

Contact information is displayed with varying levels of detail:

| Location               | Shows Name     | Shows Address | Shows Online | Shows MuSig2         |
| ---------------------- | -------------- | ------------- | ------------ | -------------------- |
| ContactCard            | ✓              | Truncated     | Sometimes    | Badge if publicKey   |
| ContactDetailSlideover | ✓              | Full + copy   | ✓            | Capabilities section |
| ContactPicker          | ✓              | Truncated     | ✗            | ✗                    |
| ParticipantList        | ✓ or "Unknown" | ✗             | ✓            | ✗                    |

**Problems**:

- "Unknown" shown when contact not found but identity exists
- Nickname from identity not used as fallback
- Inconsistent truncation

### After Consolidation

Contact display with identity fallback:

```
Display Name Priority:
1. contact.name (if contact exists)
2. identity.nickname (if identity exists)
3. Truncated address (fallback)
```

### UI Changes Required

1. **All contact displays**: Use helper function for name resolution

   ```typescript
   function getDisplayName(contact?: Contact, identity?: Identity): string {
     if (contact?.name) return contact.name
     if (identity?.nickname) return identity.nickname
     if (contact?.address) return truncateAddress(contact.address)
     if (identity?.address) return truncateAddress(identity.address)
     return 'Unknown'
   }
   ```

2. **ParticipantList.vue**: Show identity nickname when no contact
3. **SignerCard.vue**: Show identity nickname when no contact

---

## Shared Wallet Participant Display

### Current State

Participants in shared wallets are displayed by looking up contacts:

```typescript
// Current: Multiple lookups
const participantName = computed(() => {
  const contact = contactsStore.findByPublicKey(participant.publicKeyHex)
  if (contact) return contact.name
  return truncateAddress(participant.address)
})
```

**Problems**:

- No fallback to identity nickname
- Online status requires separate lookup
- "You" badge logic duplicated

### After Consolidation

Participants come pre-resolved from `useSharedWalletContext`:

```typescript
interface ParticipantWithContext {
  publicKeyHex: string
  identity: Identity | null
  contact: Contact | null
  onlineStatus: OnlineStatus
  isMe: boolean
}
```

### UI Changes Required

1. **ParticipantList.vue**: Use pre-resolved data

   ```vue
   <div v-for="p in participants" :key="p.publicKeyHex">
     <span>{{ p.contact?.name || p.identity?.nickname || 'Unknown' }}</span>
     <UBadge v-if="p.isMe" color="primary">You</UBadge>
     <OnlineStatusBadge :status="p.onlineStatus" />
   </div>
   ```

2. **ProposeSpendModal.vue**: Show participant readiness
   ```vue
   <div class="text-sm text-muted">
     {{ onlineParticipantCount }} of {{ participants.length }} participants online
   </div>
   <UAlert v-if="!canPropose" color="warning">
     All participants must be online to sign
   </UAlert>
   ```

---

## Signer Discovery Display

### Current State

Discovered signers are displayed from musig2 store:

```typescript
// Current: Signer data from store
const signers = computed(() => musig2Store.discoveredSigners)

// Each signer has:
// - publicKey, peerId, nickname
// - capabilities, reputation
// - isOnline (from discovery)
```

**Problems**:

- No link to existing contacts
- Online status may be stale
- Duplicate display if signer is also a contact

### After Consolidation

Signers come pre-resolved from `useSignerContext`:

```typescript
interface SignerWithContext {
  signer: StoreSigner
  identity: Identity | null
  contact: Contact | null
  onlineStatus: OnlineStatus
}
```

### UI Changes Required

1. **SignerList.vue**: Show contact name if exists

   ```vue
   <div
     v-for="{ signer, contact, identity, onlineStatus } in discoveredSigners"
   >
     <span>{{ contact?.name || identity?.nickname || signer.nickname }}</span>
     <UBadge v-if="contact" color="info" size="xs">Contact</UBadge>
     <OnlineStatusBadge :status="onlineStatus" />
   </div>
   ```

2. **AvailableSigners.vue**: Indicate if signer is already a contact
3. **SignerCard.vue**: Show "Add to Contacts" only if not already a contact

---

## Transaction History Display

### Current State

Transaction history shows counterparty address with contact lookup:

```typescript
// Current: Lookup contact by address
const counterpartyName = computed(() => {
  const contact = contactsStore.getContactByAddress(tx.address)
  return contact?.name || truncateAddress(tx.address)
})
```

**Problems**:

- No identity fallback
- Slow for large history (repeated lookups)

### After Consolidation

No major changes needed - contacts store still provides address lookup. Minor improvement:

```typescript
const counterpartyName = computed(() => {
  const contact = contactsStore.getContactByAddress(tx.address)
  if (contact?.name) return contact.name

  // Fallback to identity if we have one
  const identity = identityStore.findByAddress(tx.address)
  if (identity?.nickname) return identity.nickname

  return truncateAddress(tx.address)
})
```

### UI Changes Required

1. **TxItem.vue** (history): Add identity fallback for name
2. **TxItem.vue** (wallet): Add identity fallback for name
3. **TxItem.vue** (explorer): Add identity fallback for name

---

## Send Transaction Flow

### Current State

Send flow uses draft store which accesses wallet private properties.

**Problems**:

- Tight coupling to wallet internals
- No clear API boundary

### After Consolidation

Draft store uses wallet public API. **No UI changes required** - this is internal refactoring.

### Verification Required

- [ ] Send flow works identically
- [ ] Fee estimation unchanged
- [ ] Coin control unchanged
- [ ] OP_RETURN unchanged

---

## Contact Creation Flow

### Current State

Creating a contact with a public key:

1. User enters address and optionally public key
2. Contact created with publicKey field
3. No identity created

**Problems**:

- Identity not created until signer discovery
- Online status not tracked until P2P connection

### After Consolidation

Creating a contact with a public key:

1. User enters address and optionally public key
2. If public key provided, identity created/found
3. Contact created with `identityId` reference
4. Online status immediately available (starts as 'unknown')

### UI Changes Required

1. **ContactForm.vue**: Create identity when public key provided

   ```typescript
   async function saveContact() {
     let identityId: string | undefined

     if (publicKey.value) {
       const identityStore = useIdentityStore()
       const identity = identityStore.findOrCreate(publicKey.value, network)
       identityId = identity.publicKeyHex
     }

     await contactsStore.addContact({
       name: name.value,
       address: address.value,
       identityId,
       // Legacy fields for backwards compat
       publicKey: publicKey.value,
     })
   }
   ```

2. **ContactFormSlideover.vue**: Same changes as ContactForm

---

## Settings Pages

### Advertise Settings

**Current**: Uses multiple stores for signer configuration.

**After**: Uses `useSignerContext()` composable.

### UI Changes Required

1. **advertise.vue**: Replace store imports with composable
   ```typescript
   const { isAdvertising, myConfig, advertise, withdraw } = useSignerContext()
   ```

### P2P Settings

**Current**: Uses p2p store directly.

**After**: No changes needed - p2p store is still responsible for P2P settings.

---

## Error States

### Current State

Error handling is inconsistent:

- Some components show inline errors
- Some use toast notifications
- Some fail silently

### After Consolidation

Standardize error handling in facade composables:

```typescript
// Composables catch errors and provide error state
const { error, clearError } = useContactContext(contactId)

// Components display errors consistently
<UAlert v-if="error" color="error" @close="clearError">
  {{ error }}
</UAlert>
```

### UI Changes Required

1. Add `error` and `clearError` to facade composables
2. Add error display to components using composables

---

## Loading States

### Current State

Loading states are inconsistent:

- Some show spinners
- Some show skeleton loaders
- Some show nothing

### After Consolidation

Facade composables provide loading state:

```typescript
const { isLoading } = useContactContext(contactId)
const { isLoading } = useSharedWalletContext(walletId)
const { isLoading } = useSignerContext()
```

### UI Changes Required

1. Add `isLoading` to facade composables
2. Show consistent loading indicators

---

## Summary: UI Components to Update

### High Priority (Online Status)

| Component                     | Change                     |
| ----------------------------- | -------------------------- |
| `OnlineStatusBadge.vue`       | **NEW** - Create component |
| `ContactCard.vue`             | Use OnlineStatusBadge      |
| `ContactDetailSlideover.vue`  | Use OnlineStatusBadge      |
| `SignerCard.vue`              | Use OnlineStatusBadge      |
| `SignerList.vue`              | Use OnlineStatusBadge      |
| `ParticipantList.vue`         | Use OnlineStatusBadge      |
| `CreateSharedWalletModal.vue` | Use OnlineStatusBadge      |
| `AvailableSigners.vue`        | Use OnlineStatusBadge      |

### Medium Priority (Facade Composables)

| Component                         | Change                     |
| --------------------------------- | -------------------------- |
| `ContactDetailSlideover.vue`      | Use useContactContext      |
| `ProposeSpendModal.vue`           | Use useSharedWalletContext |
| `ParticipantList.vue`             | Use useSharedWalletContext |
| `SignerList.vue`                  | Use useSignerContext       |
| `AvailableSigners.vue`            | Use useSignerContext       |
| `/people/shared-wallets/[id].vue` | Use useSharedWalletContext |
| `/settings/advertise.vue`         | Use useSignerContext       |

### Low Priority (Name Resolution)

| Component            | Change                |
| -------------------- | --------------------- |
| `TxItem.vue` (all 3) | Add identity fallback |
| `ActivityItem.vue`   | Add identity fallback |

---

## Visual Consistency Checklist

After migration, verify visual consistency:

- [ ] Online status looks the same everywhere
- [ ] Contact names resolve the same way everywhere
- [ ] Participant lists look consistent
- [ ] Signer lists look consistent
- [ ] Error states look consistent
- [ ] Loading states look consistent
- [ ] Badge colors are consistent
- [ ] Icon usage is consistent
