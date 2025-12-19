# 09: Contact Integration

## Overview

This document details the integration between the contact system and MuSig2 shared wallets. Contacts must store public keys to be eligible for shared wallet participation.

---

## Current Contact System

### Existing Contact Interface

```typescript
// types/contact.ts
export interface Contact {
  id: string
  name: string
  address: string
  addresses?: ContactAddresses
  notes?: string
  tags?: string[]
  avatar?: string
  peerId?: string
  serviceType?: string
  createdAt?: number
  updatedAt?: number
}
```

### Gap: No Public Key Storage

MuSig2 requires public keys, not addresses. The current contact system only stores addresses.

---

## Required Changes

### Updated Contact Interface

```typescript
// types/contact.ts - Updated
export interface Contact {
  id: string
  name: string
  address: string
  addresses?: ContactAddresses

  // MuSig2 Support
  publicKey?: string // Compressed public key (hex)
  publicKeys?: {
    // Network-specific keys
    livenet?: string
    testnet?: string
  }
  signerCapabilities?: {
    // From P2P discovery
    transactionTypes: string[]
    amountRange?: { min?: number; max?: number }
    fee?: number
    available?: boolean
  }

  // Existing fields
  notes?: string
  tags?: string[]
  avatar?: string
  peerId?: string
  serviceType?: string
  createdAt?: number
  updatedAt?: number
}
```

---

## Contact Form Updates

### Add Public Key Field

```vue
<!-- components/contacts/ContactForm.vue - Add public key field -->
<template>
  <div class="space-y-4">
    <!-- Existing fields... -->

    <!-- Public Key (for MuSig2) -->
    <UFormField label="Public Key" hint="Required for shared wallets (MuSig2)">
      <UInput
        v-model="form.publicKey"
        placeholder="02... or 03..."
        :error="publicKeyError"
      />
      <template #help>
        <p class="text-xs text-muted">
          A compressed public key (66 hex characters) enables this contact to
          participate in shared wallets.
        </p>
      </template>
    </UFormField>

    <!-- Derive from address option -->
    <div v-if="!form.publicKey && form.address" class="text-sm">
      <UAlert color="primary" icon="i-lucide-info">
        <template #description>
          Public keys cannot be derived from addresses. Ask your contact to
          share their public key, or add them from P2P discovery.
        </template>
      </UAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
// Validation
const publicKeyError = computed(() => {
  if (!form.value.publicKey) return null
  if (!/^0[23][0-9a-fA-F]{64}$/.test(form.value.publicKey)) {
    return 'Invalid public key format (must be 66 hex characters starting with 02 or 03)'
  }
  return null
})
</script>
```

---

## P2P Signer to Contact Flow

When adding a signer from P2P discovery, save their public key:

### Updated Save Flow

```typescript
// In P2P page or signer card
async function saveSignerAsContact(signer: DiscoveredSigner) {
  const contactStore = useContactStore()

  // Create contact with public key
  await contactStore.addContact({
    name: signer.nickname || `Signer ${signer.id.slice(0, 8)}`,
    address: '', // May not have address
    publicKey: signer.publicKeyHex, // Save public key!
    peerId: signer.peerId,
    signerCapabilities: {
      transactionTypes: signer.transactionTypes,
      amountRange: signer.amountRange,
      fee: signer.fee,
      available: signer.isOnline,
    },
    tags: ['signer'], // Auto-tag as signer
  })

  success(
    'Contact Added',
    `${signer.nickname || 'Signer'} has been added to your contacts`,
  )
}
```

---

## Eligible Contacts for Shared Wallets

### Computed Property

```typescript
// In stores/contacts.ts or composable
const eligibleForMuSig2 = computed(() => {
  return contactStore.contactList.filter(contact => {
    // Must have a public key
    if (!contact.publicKey) return false

    // Validate public key format
    if (!/^0[23][0-9a-fA-F]{64}$/.test(contact.publicKey)) return false

    return true
  })
})
```

### UI Indicator

```vue
<!-- In contact list/card -->
<template>
  <div class="flex items-center gap-2">
    <span>{{ contact.name }}</span>

    <!-- MuSig2 eligible badge -->
    <UTooltip v-if="contact.publicKey" text="Can participate in shared wallets">
      <UBadge color="primary" variant="subtle" size="xs">
        <UIcon name="i-lucide-shield" class="w-3 h-3 mr-1" />
        MuSig2
      </UBadge>
    </UTooltip>
  </div>
</template>
```

---

## Contact Detail View Updates

### Show Public Key and MuSig2 Status

```vue
<!-- In ContactDetailSlideover.vue or similar -->
<template>
  <div class="space-y-4">
    <!-- Existing contact info... -->

    <!-- MuSig2 Section -->
    <div v-if="contact.publicKey" class="space-y-3">
      <h3 class="text-sm font-medium flex items-center gap-2">
        <UIcon name="i-lucide-shield" class="w-4 h-4 text-primary" />
        Multi-Signature
      </h3>

      <!-- Public Key -->
      <div>
        <p class="text-xs text-muted mb-1">Public Key</p>
        <div class="flex items-center gap-2">
          <code class="text-xs bg-muted/50 p-2 rounded flex-1 truncate">
            {{ contact.publicKey }}
          </code>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            @click="copyPublicKey"
          />
        </div>
      </div>

      <!-- Signer Capabilities -->
      <div v-if="contact.signerCapabilities">
        <p class="text-xs text-muted mb-1">Signer Capabilities</p>
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="type in contact.signerCapabilities.transactionTypes"
            :key="type"
            variant="subtle"
            size="xs"
          >
            {{ type }}
          </UBadge>
        </div>
      </div>

      <!-- Shared Wallets with this contact -->
      <div v-if="sharedWalletsWithContact.length > 0">
        <p class="text-xs text-muted mb-1">Shared Wallets</p>
        <div class="space-y-1">
          <NuxtLink
            v-for="wallet in sharedWalletsWithContact"
            :key="wallet.id"
            :to="`/people/shared-wallets/${wallet.id}`"
            class="block p-2 rounded-lg hover:bg-muted/50 text-sm"
          >
            {{ wallet.name }}
          </NuxtLink>
        </div>
      </div>

      <!-- Create shared wallet action -->
      <UButton
        v-if="!hasSharedWalletWith"
        variant="outline"
        size="sm"
        icon="i-lucide-plus"
        @click="createSharedWalletWith"
      >
        Create Shared Wallet
      </UButton>
    </div>

    <!-- No public key - prompt to add -->
    <div v-else class="p-3 bg-muted/30 rounded-lg">
      <p class="text-sm text-muted mb-2">
        This contact doesn't have a public key. Add one to enable shared
        wallets.
      </p>
      <UButton size="sm" variant="outline" @click="editContact">
        Add Public Key
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const musig2Store = useMuSig2Store()

// Find shared wallets that include this contact
const sharedWalletsWithContact = computed(() => {
  return musig2Store.sharedWallets.filter(wallet =>
    wallet.participants.some(p => p.publicKeyHex === props.contact.publicKey),
  )
})

const hasSharedWalletWith = computed(
  () => sharedWalletsWithContact.value.length > 0,
)

function createSharedWalletWith() {
  // Navigate to create shared wallet with this contact pre-selected
  navigateTo({
    path: '/people/shared-wallets',
    query: { createWith: props.contact.id },
  })
}

function copyPublicKey() {
  navigator.clipboard.writeText(props.contact.publicKey!)
  success('Copied', 'Public key copied to clipboard')
}
</script>
```

---

## Contact Store Updates

### Add Public Key Validation

```typescript
// In stores/contacts.ts
actions: {
  async addContact(contact: Partial<Contact>) {
    // Validate public key if provided
    if (contact.publicKey) {
      if (!/^0[23][0-9a-fA-F]{64}$/.test(contact.publicKey)) {
        throw new Error('Invalid public key format')
      }

      // Check for duplicate public key
      const existing = this.contactList.find(c => c.publicKey === contact.publicKey)
      if (existing) {
        throw new Error(`A contact with this public key already exists: ${existing.name}`)
      }
    }

    // ... rest of add logic
  },

  async updateContact(id: string, updates: Partial<Contact>) {
    // Validate public key if being updated
    if (updates.publicKey) {
      if (!/^0[23][0-9a-fA-F]{64}$/.test(updates.publicKey)) {
        throw new Error('Invalid public key format')
      }

      // Check for duplicate (excluding self)
      const existing = this.contactList.find(
        c => c.id !== id && c.publicKey === updates.publicKey
      )
      if (existing) {
        throw new Error(`A contact with this public key already exists: ${existing.name}`)
      }
    }

    // ... rest of update logic
  },
}
```

---

## Migration for Existing Contacts

If contacts were added before public key support, provide a way to add keys:

### Bulk Update UI

```vue
<!-- In contacts page or settings -->
<template>
  <UCard v-if="contactsWithoutPublicKey.length > 0">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-warning" />
        <span class="font-semibold">
          {{ contactsWithoutPublicKey.length }} contacts need public keys
        </span>
      </div>
    </template>

    <p class="text-sm text-muted mb-4">
      These contacts cannot participate in shared wallets until you add their
      public keys.
    </p>

    <div class="space-y-2">
      <div
        v-for="contact in contactsWithoutPublicKey.slice(0, 5)"
        :key="contact.id"
        class="flex items-center justify-between p-2 rounded-lg bg-muted/30"
      >
        <div class="flex items-center gap-2">
          <ContactAvatar :contact="contact" size="sm" />
          <span>{{ contact.name }}</span>
        </div>
        <UButton size="xs" variant="outline" @click="editContact(contact)">
          Add Key
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const contactStore = useContactStore()

const contactsWithoutPublicKey = computed(() =>
  contactStore.contactList.filter(c => !c.publicKey),
)
</script>
```

---

## Implementation Checklist

### Type Updates

- [ ] Add `publicKey` field to Contact interface
- [ ] Add `publicKeys` field for network-specific keys
- [ ] Add `signerCapabilities` field

### Contact Form

- [ ] Add public key input field
- [ ] Add validation for public key format
- [ ] Show help text explaining purpose

### Contact Store

- [ ] Validate public key on add/update
- [ ] Check for duplicate public keys
- [ ] Persist public key to storage

### P2P Integration

- [ ] Save public key when adding signer as contact
- [ ] Save signer capabilities
- [ ] Auto-tag as "signer"

### Contact Detail View

- [ ] Show public key with copy button
- [ ] Show signer capabilities
- [ ] Show shared wallets with contact
- [ ] Add "Create Shared Wallet" action

### Shared Wallet Creation

- [ ] Filter contacts by public key availability
- [ ] Show "MuSig2 eligible" badge
- [ ] Pre-select contact from query param

---

## Files to Create/Modify

| File                                             | Action | Description                        |
| ------------------------------------------------ | ------ | ---------------------------------- |
| `types/contact.ts`                               | Modify | Add publicKey and related fields   |
| `stores/contacts.ts`                             | Modify | Add validation for public keys     |
| `components/contacts/ContactForm.vue`            | Modify | Add public key input               |
| `components/contacts/ContactDetailSlideover.vue` | Modify | Show MuSig2 info                   |
| `pages/people/p2p.vue`                           | Modify | Save public key when adding signer |

---

_Next: [10_TESTING_VERIFICATION.md](./10_TESTING_VERIFICATION.md)_
