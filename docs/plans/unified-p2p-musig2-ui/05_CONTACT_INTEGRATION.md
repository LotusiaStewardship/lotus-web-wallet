# Phase 5: Contact & Social Integration

## Overview

This phase bridges P2P signers with the contacts system and adds social features that enhance the collaborative experience. Users can save signers as contacts, see contacts' online status, and initiate P2P actions from contact details.

**Priority**: P1 (High)
**Estimated Effort**: 2 days
**Dependencies**: Phase 4 Signing Flow

---

## Objectives

1. Implement "Save as Contact" for P2P signers
2. Add P2P status display to contact cards and details
3. Enable signature requests from contact detail view
4. Show shared wallets associated with contacts
5. Update contact form with public key field

---

## Task 5.1: Save Signer as Contact

Implement the full flow for saving a discovered signer as a contact.

### Implementation in P2P Page

```typescript
// In pages/people/p2p.vue - handleSaveSignerAsContact

async function handleSaveSignerAsContact(signer: DiscoveredSigner) {
  const contactStore = useContactStore()
  const { publicKeyToAddress } = useAddress()
  const { success, error } = useNotifications()

  try {
    // Check if already exists
    const existing = contactStore.findByPeerId(signer.peerId)
    if (existing) {
      error('Already Exists', `${existing.name} is already in your contacts`)
      return
    }

    // Derive address from public key if available
    let address = ''
    if (signer.publicKeyHex) {
      try {
        address = publicKeyToAddress(signer.publicKeyHex) || ''
      } catch {
        // Address derivation failed, continue without address
      }
    }

    // Create contact with P2P fields
    await contactStore.addContact({
      name: signer.nickname || `Signer ${signer.peerId.slice(0, 8)}`,
      address,
      tags: ['signer'],
      isFavorite: false,
      peerId: signer.peerId,
      publicKey: signer.publicKeyHex,
      signerCapabilities: {
        transactionTypes: signer.transactionTypes || [],
        amountRange: signer.amountRange,
        fee: signer.fee,
        responseTime: signer.responseTime,
        reputation: signer.reputation,
      },
      lastSeenOnline: Date.now(),
    })

    success('Contact Saved', `${signer.nickname || 'Signer'} added to contacts`)

    // Close the signer detail modal if open
    showSignerDetailModal.value = false
  } catch (err) {
    error(
      'Save Failed',
      err instanceof Error ? err.message : 'Failed to save contact',
    )
  }
}
```

---

## Task 5.2: Contact Detail P2P Section

Add P2P information and actions to the contact detail view.

### File: `components/contacts/ContactDetailSlideover.vue` (additions)

```vue
<script setup lang="ts">
// Add to existing script
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const { timeAgo } = useTime()
const { formatXPI } = useAmount()

// Check if contact is online
const isOnline = computed(() => {
  if (!props.contact?.peerId) return false
  return p2pStore.isPeerOnline?.(props.contact.peerId) ?? false
})

// Shared wallets with this contact
const sharedWalletsWithContact = computed(() => {
  if (!props.contact?.publicKey) return []
  return (
    musig2Store.sharedWallets?.filter(wallet =>
      wallet.participants.some(
        p => p.publicKeyHex === props.contact?.publicKey,
      ),
    ) || []
  )
})

// Can request signature?
const canRequestSignature = computed(() => {
  return (
    props.contact?.publicKey &&
    props.contact?.signerCapabilities &&
    isOnline.value
  )
})

// Request signature from contact
function handleRequestSignature() {
  if (!props.contact?.peerId) return
  navigateTo({
    path: '/people/p2p',
    query: {
      tab: 'signers',
      requestFrom: props.contact.peerId,
    },
  })
}

// Create shared wallet with contact
function handleCreateSharedWallet() {
  if (!props.contact?.id) return
  navigateTo({
    path: '/people/shared-wallets',
    query: { createWith: props.contact.id },
  })
}

// View shared wallet
function viewSharedWallet(walletId: string) {
  navigateTo(`/people/shared-wallets/${walletId}`)
}
</script>

<template>
  <!-- Add this section after existing contact info -->

  <!-- P2P & MuSig2 Section -->
  <div v-if="contact.publicKey || contact.peerId" class="border-t pt-4 mt-4">
    <h4 class="text-sm font-medium flex items-center gap-2 mb-4">
      <UIcon name="i-lucide-radio" class="w-4 h-4 text-primary" />
      P2P & Multi-Signature
    </h4>

    <!-- Online Status -->
    <div v-if="contact.peerId" class="flex items-center gap-2 mb-4">
      <span
        class="w-2.5 h-2.5 rounded-full"
        :class="isOnline ? 'bg-green-500' : 'bg-gray-400'"
      />
      <span class="text-sm">{{ isOnline ? 'Online' : 'Offline' }}</span>
      <span
        v-if="contact.lastSeenOnline && !isOnline"
        class="text-xs text-muted-foreground"
      >
        • Last seen {{ timeAgo(contact.lastSeenOnline) }}
      </span>
    </div>

    <!-- Public Key -->
    <div v-if="contact.publicKey" class="mb-4">
      <p class="text-xs text-muted-foreground mb-1">Public Key</p>
      <div class="flex items-center gap-2">
        <code class="flex-1 p-2 bg-muted/30 rounded text-xs font-mono truncate">
          {{ contact.publicKey }}
        </code>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-copy"
          @click="copyPublicKey"
        />
      </div>
      <UBadge color="primary" variant="subtle" size="xs" class="mt-2">
        <UIcon name="i-lucide-shield" class="w-3 h-3 mr-1" />
        MuSig2 Ready
      </UBadge>
    </div>

    <!-- Signer Capabilities -->
    <div v-if="contact.signerCapabilities" class="mb-4">
      <p class="text-xs text-muted-foreground mb-2">Signer Capabilities</p>
      <div class="flex flex-wrap gap-1 mb-2">
        <UBadge
          v-for="type in contact.signerCapabilities.transactionTypes"
          :key="type"
          color="neutral"
          variant="subtle"
          size="xs"
        >
          {{ type }}
        </UBadge>
      </div>
      <div class="text-sm text-muted-foreground space-y-1">
        <p v-if="contact.signerCapabilities.fee">
          Fee: {{ formatXPI(BigInt(contact.signerCapabilities.fee)) }}
        </p>
        <p v-if="contact.signerCapabilities.reputation">
          Reputation: ⭐ {{ contact.signerCapabilities.reputation }}
        </p>
      </div>
    </div>

    <!-- Shared Wallets -->
    <div v-if="sharedWalletsWithContact.length > 0" class="mb-4">
      <p class="text-xs text-muted-foreground mb-2">Shared Wallets</p>
      <div class="space-y-2">
        <button
          v-for="wallet in sharedWalletsWithContact"
          :key="wallet.id"
          class="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          @click="viewSharedWallet(wallet.id)"
        >
          <UIcon name="i-lucide-shield" class="w-4 h-4 text-primary" />
          <span class="flex-1 text-sm truncate">{{ wallet.name }}</span>
          <UIcon
            name="i-lucide-chevron-right"
            class="w-4 h-4 text-muted-foreground"
          />
        </button>
      </div>
    </div>

    <!-- P2P Actions -->
    <div class="flex flex-wrap gap-2">
      <UButton
        v-if="canRequestSignature"
        color="primary"
        size="sm"
        @click="handleRequestSignature"
      >
        <UIcon name="i-lucide-pen-tool" class="w-4 h-4 mr-2" />
        Request Signature
      </UButton>

      <UButton
        v-if="contact.publicKey && sharedWalletsWithContact.length === 0"
        variant="outline"
        size="sm"
        @click="handleCreateSharedWallet"
      >
        <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
        Create Shared Wallet
      </UButton>
    </div>

    <!-- No public key prompt -->
    <div
      v-if="!contact.publicKey && contact.peerId"
      class="p-3 bg-muted/30 rounded-lg"
    >
      <p class="text-sm text-muted-foreground mb-2">
        This contact doesn't have a public key. Add one to enable shared
        wallets.
      </p>
      <UButton size="sm" variant="outline" @click="editContact">
        Add Public Key
      </UButton>
    </div>
  </div>
</template>
```

---

## Task 5.3: Contact Form Public Key Field

Add public key input to the contact form.

### File: `components/contacts/ContactFormSlideover.vue` (additions)

```vue
<script setup lang="ts">
// Add to form state
const publicKey = ref(props.contact?.publicKey || '')

// Public key validation
const publicKeyError = computed(() => {
  if (!publicKey.value) return null
  if (!/^0[23][0-9a-fA-F]{64}$/.test(publicKey.value)) {
    return 'Invalid format (must be 66 hex characters starting with 02 or 03)'
  }
  return null
})

// Add to form submission
async function handleSubmit() {
  // ... existing validation ...

  const contactData = {
    // ... existing fields ...
    publicKey: publicKey.value || undefined,
  }

  // ... rest of submission ...
}
</script>

<template>
  <!-- Add after existing form fields -->

  <!-- Public Key (for MuSig2) -->
  <UFormField
    label="Public Key"
    hint="Required for shared wallets (MuSig2)"
    :error="publicKeyError"
  >
    <UInput
      v-model="publicKey"
      placeholder="02... or 03..."
      :error="!!publicKeyError"
      font-mono
    />
    <template #help>
      <p class="text-xs text-muted-foreground">
        A compressed public key (66 hex characters) enables this contact to
        participate in shared wallets.
      </p>
    </template>
  </UFormField>

  <!-- Info alert if no public key -->
  <UAlert
    v-if="!publicKey && form.address"
    color="primary"
    icon="i-lucide-info"
    class="mt-2"
  >
    <template #description>
      Public keys cannot be derived from addresses. Ask your contact to share
      their public key, or add them from P2P discovery.
    </template>
  </UAlert>
</template>
```

---

## Task 5.4: Contact List Item P2P Status

Add online status indicator to contact list items.

### File: `components/contacts/ContactListItem.vue` (update)

```vue
<script setup lang="ts">
// Add to existing script
const p2pStore = useP2PStore()

// Check if contact is online
const isOnline = computed(() => {
  if (!props.contact?.peerId) return false
  return p2pStore.isPeerOnline?.(props.contact.peerId) ?? false
})

// Is MuSig2 ready?
const isMuSig2Ready = computed(() => {
  return !!props.contact?.publicKey
})
</script>

<template>
  <div
    class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
  >
    <!-- Avatar with online indicator -->
    <div class="relative">
      <ContactsContactAvatar :contact="contact" size="md" />
      <span
        v-if="contact.peerId"
        class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
        :class="isOnline ? 'bg-green-500' : 'bg-gray-400'"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-medium truncate">{{ contact.name }}</span>
        <UIcon
          v-if="contact.isFavorite"
          name="i-lucide-star"
          class="w-4 h-4 text-yellow-500 flex-shrink-0"
        />
        <UBadge
          v-if="isMuSig2Ready"
          color="primary"
          variant="subtle"
          size="xs"
          class="flex-shrink-0"
        >
          <UIcon name="i-lucide-shield" class="w-3 h-3" />
        </UBadge>
      </div>
      <p class="text-sm text-muted-foreground truncate">
        {{ contact.address ? toFingerprint(contact.address) : 'No address' }}
      </p>
    </div>

    <!-- Actions slot -->
    <slot name="actions" />
  </div>
</template>
```

---

## Task 5.5: Contact Store P2P Methods

Ensure the contact store has all required P2P methods.

### File: `stores/contacts.ts` (additions)

```typescript
// Add to getters
getters: {
  // Find contact by peer ID
  findByPeerId: (state) => (peerId: string): Contact | undefined => {
    return state.contacts.find(c => c.peerId === peerId)
  },

  // Find contact by public key
  findByPublicKey: (state) => (publicKey: string): Contact | undefined => {
    return state.contacts.find(c => c.publicKey === publicKey)
  },

  // Contacts with public keys (MuSig2-eligible)
  contactsWithPublicKeys: (state): Contact[] => {
    return state.contacts.filter(c =>
      c.publicKey && /^0[23][0-9a-fA-F]{64}$/.test(c.publicKey)
    )
  },

  // Contacts that are signers
  signerContacts: (state): Contact[] => {
    return state.contacts.filter(c => c.signerCapabilities)
  },

  // Online contacts
  onlineContacts(state): Contact[] {
    const p2pStore = useP2PStore()
    return state.contacts.filter(c =>
      c.peerId && p2pStore.isPeerOnline?.(c.peerId)
    )
  },
},

// Add to actions
actions: {
  // Update contact's last seen time
  updateLastSeen(peerId: string) {
    const contact = this.contacts.find(c => c.peerId === peerId)
    if (contact) {
      contact.lastSeenOnline = Date.now()
      this._saveContacts()
    }
  },

  // Update contact's signer capabilities
  updateSignerCapabilities(contactId: string, capabilities: SignerCapabilities) {
    const contact = this.contacts.find(c => c.id === contactId)
    if (contact) {
      contact.signerCapabilities = capabilities
      contact.updatedAt = Date.now()
      this._saveContacts()
    }
  },

  // Validate public key on add/update
  _validatePublicKey(publicKey: string | undefined, excludeId?: string): void {
    if (!publicKey) return

    // Format validation
    if (!/^0[23][0-9a-fA-F]{64}$/.test(publicKey)) {
      throw new Error('Invalid public key format')
    }

    // Duplicate check
    const existing = this.contacts.find(c =>
      c.id !== excludeId && c.publicKey === publicKey
    )
    if (existing) {
      throw new Error(`A contact with this public key already exists: ${existing.name}`)
    }
  },
}
```

---

## Task 5.6: P2P Store Online Status Helper

Add helper method to check if a peer is online.

### File: `stores/p2p.ts` (additions)

```typescript
// Add to getters
getters: {
  // Check if a specific peer is online
  isPeerOnline: (state) => (peerId: string): boolean => {
    return state.connectedPeers?.some(p => p.peerId === peerId) ?? false
  },

  // Get online peer IDs
  onlinePeerIds: (state): Set<string> => {
    return new Set(state.connectedPeers?.map(p => p.peerId) || [])
  },
}
```

---

## Task 5.7: Auto-Update Contact Last Seen

Update contact's last seen time when peer activity is detected.

### File: `stores/p2p.ts` (event handler)

```typescript
// In the P2P event handlers
function handlePeerConnected(peerId: string) {
  // ... existing logic ...

  // Update contact's last seen
  const contactStore = useContactStore()
  contactStore.updateLastSeen(peerId)
}

function handlePeerDisconnected(peerId: string) {
  // ... existing logic ...

  // Update contact's last seen
  const contactStore = useContactStore()
  contactStore.updateLastSeen(peerId)
}
```

---

## Implementation Checklist

### Contact Detail

- [ ] Add P2P section to `ContactDetailSlideover.vue`
- [ ] Show online status
- [ ] Show public key with copy
- [ ] Show signer capabilities
- [ ] Show shared wallets with contact
- [ ] Add "Request Signature" action
- [ ] Add "Create Shared Wallet" action

### Contact Form

- [ ] Add public key input field
- [ ] Add public key validation
- [ ] Add info alert about public keys

### Contact List

- [ ] Add online status indicator to list items
- [ ] Add MuSig2-ready badge

### Store Updates

- [ ] Add `findByPeerId` getter
- [ ] Add `findByPublicKey` getter
- [ ] Add `contactsWithPublicKeys` getter
- [ ] Add `signerContacts` getter
- [ ] Add `onlineContacts` getter
- [ ] Add `updateLastSeen` action
- [ ] Add `updateSignerCapabilities` action
- [ ] Add `_validatePublicKey` helper
- [ ] Add `isPeerOnline` getter to P2P store

### P2P Integration

- [ ] Implement `handleSaveSignerAsContact` in P2P page
- [ ] Auto-update contact last seen on peer events

### Testing

- [ ] Can save signer as contact
- [ ] Contact shows online status
- [ ] Contact shows public key
- [ ] Can copy public key
- [ ] Can request signature from contact
- [ ] Can create shared wallet from contact
- [ ] Shared wallets with contact are listed
- [ ] Last seen updates on peer events

---

## Files to Create/Modify

| File                                             | Action | Description                      |
| ------------------------------------------------ | ------ | -------------------------------- |
| `components/contacts/ContactDetailSlideover.vue` | Modify | Add P2P section                  |
| `components/contacts/ContactFormSlideover.vue`   | Modify | Add public key field             |
| `components/contacts/ContactListItem.vue`        | Modify | Add online indicator             |
| `stores/contacts.ts`                             | Modify | Add P2P getters/actions          |
| `stores/p2p.ts`                                  | Modify | Add isPeerOnline, event handlers |
| `pages/people/p2p.vue`                           | Modify | Implement save as contact        |

---

_Previous: [04_SIGNING_FLOW.md](./04_SIGNING_FLOW.md)_
_Next: [06_POLISH.md](./06_POLISH.md)_
