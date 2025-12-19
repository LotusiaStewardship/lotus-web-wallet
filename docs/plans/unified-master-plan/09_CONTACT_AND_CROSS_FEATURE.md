# Phase 9: Contact and Cross-Feature Integration

## Overview

This phase implements the contact integration with P2P/MuSig2 features and creates cross-feature connections throughout the app. The goal is to make the entire application feel like one cohesive product with seamless navigation between features.

**Priority**: P1 (High)
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 6 (Signing Flow and Notifications), Phase 7 (Explorer and Social)

---

## Source Phases

| Source Plan             | Phase | Component                    |
| ----------------------- | ----- | ---------------------------- |
| unified-p2p-musig2-ui   | 5     | Contact & Social Integration |
| unified-remaining-tasks | 6     | Cross-Feature Integration    |

---

## Tasks

### 9.1 Contact Detail P2P Section

**Source**: unified-p2p-musig2-ui/05_CONTACT_INTEGRATION.md
**Effort**: 1 day

#### ContactDetailSlideover Update

- [ ] Add P2P section to `components/contacts/ContactDetailSlideover.vue`
  ```vue
  <template>
    <!-- Existing contact info... -->

    <!-- P2P Section (if contact has public key) -->
    <UCard v-if="contact.publicKey" class="mt-4">
      <template #header>
        <div class="flex items-center justify-between">
          <span>P2P & MuSig2</span>
          <UBadge :color="isOnline ? 'green' : 'gray'">
            {{ isOnline ? 'Online' : 'Offline' }}
          </UBadge>
        </div>
      </template>

      <!-- Public Key -->
      <div class="space-y-3">
        <div>
          <p class="text-xs text-gray-500">Public Key</p>
          <div class="flex items-center gap-2">
            <code class="text-sm">{{ truncate(contact.publicKey) }}</code>
            <UButton
              icon="i-heroicons-clipboard"
              size="xs"
              variant="ghost"
              @click="copyPublicKey"
            />
          </div>
        </div>

        <!-- Signer Capabilities -->
        <div v-if="contact.signerCapabilities">
          <p class="text-xs text-gray-500">Capabilities</p>
          <div class="flex gap-2 mt-1">
            <UBadge v-if="contact.signerCapabilities.musig2" color="blue"
              >MuSig2</UBadge
            >
            <UBadge v-if="contact.signerCapabilities.threshold" color="purple">
              {{ contact.signerCapabilities.threshold }}-of-N
            </UBadge>
          </div>
        </div>

        <!-- Shared Wallets with Contact -->
        <div v-if="sharedWalletsWithContact.length > 0">
          <p class="text-xs text-gray-500">Shared Wallets</p>
          <div class="divide-y divide-default mt-1">
            <NuxtLink
              v-for="wallet in sharedWalletsWithContact"
              :key="wallet.id"
              :to="`/people/shared-wallets/${wallet.id}`"
              class="block py-2 hover:bg-gray-50"
            >
              {{ wallet.name }}
            </NuxtLink>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <UButton size="sm" @click="requestSignature">
            <UIcon name="i-heroicons-pencil-square" />
            Request Signature
          </UButton>
          <UButton size="sm" variant="soft" @click="createSharedWallet">
            <UIcon name="i-heroicons-wallet" />
            Create Shared Wallet
          </UButton>
        </div>
      </div>
    </UCard>
  </template>
  ```

#### Online Status Display

- [ ] Show online status indicator

  ```typescript
  const p2pStore = useP2PStore()

  const isOnline = computed(() => {
    if (!contact.value?.peerId) return false
    return p2pStore.isPeerOnline(contact.value.peerId)
  })
  ```

---

### 9.2 Contact Form P2P Fields

**Effort**: 0.5 days

#### Public Key Input

- [ ] Add public key input to `components/contacts/ContactForm.vue`

  ```vue
  <UFormGroup label="Public Key (Optional)" hint="For MuSig2 signing">
    <UInput
      v-model="form.publicKey"
      placeholder="02a1b2c3..."
      :error="publicKeyError"
    />
  </UFormGroup>

  <UAlert
    v-if="form.publicKey"
    color="blue"
    icon="i-heroicons-information-circle"
  >
    Adding a public key enables MuSig2 multi-signature features with this contact.
  </UAlert>
  ```

#### Public Key Validation

- [ ] Add validation helper

  ```typescript
  function validatePublicKey(key: string): boolean {
    if (!key) return true // Optional field

    // Check format: 33 bytes hex (compressed public key)
    if (!/^(02|03)[a-fA-F0-9]{64}$/.test(key)) {
      return false
    }

    return true
  }

  const publicKeyError = computed(() => {
    if (!form.publicKey) return null
    if (!validatePublicKey(form.publicKey)) {
      return 'Invalid public key format'
    }
    return null
  })
  ```

---

### 9.3 Contact List Enhancement

**Effort**: 0.5 days

#### Online Status Indicator

- [ ] Add online status to contact list items
  ```vue
  <!-- In ContactCard.vue or contact list -->
  <div class="flex items-center gap-2">
    <ContactAvatar :contact="contact" />
    <div>
      <p class="font-medium">{{ contact.name }}</p>
      <div class="flex items-center gap-1 text-xs text-gray-500">
        <span v-if="isOnline" class="w-2 h-2 bg-green-500 rounded-full" />
        <span v-else class="w-2 h-2 bg-gray-300 rounded-full" />
        <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
      </div>
    </div>
  </div>
  ```

#### MuSig2-Ready Badge

- [ ] Add badge for contacts with public keys
  ```vue
  <UBadge v-if="contact.publicKey" color="blue" size="xs">
    MuSig2
  </UBadge>
  ```

---

### 9.4 Store Updates

**Effort**: 0.5 days

#### Contacts Store

- [ ] Add `updateLastSeen` action

  ```typescript
  updateLastSeen(contactId: string, timestamp: Date) {
    const contact = this.contacts.find(c => c.id === contactId)
    if (contact) {
      contact.lastSeenOnline = timestamp
    }
  }
  ```

- [ ] Add `updateSignerCapabilities` action
  ```typescript
  updateSignerCapabilities(contactId: string, capabilities: SignerCapabilities) {
    const contact = this.contacts.find(c => c.id === contactId)
    if (contact) {
      contact.signerCapabilities = capabilities
    }
  }
  ```

#### P2P Store

- [ ] Add `isPeerOnline` getter
  ```typescript
  isPeerOnline: state => (peerId: string) => {
    return state.connectedPeers.some(p => p.id === peerId)
  }
  ```

#### P2P Integration

- [ ] Implement `handleSaveSignerAsContact` in P2P page

  ```typescript
  async function handleSaveSignerAsContact(signer: DiscoveredSigner) {
    const contactsStore = useContactsStore()

    await contactsStore.addContact({
      name: `Signer ${truncate(signer.publicKey)}`,
      address: '', // May not have address
      publicKey: signer.publicKey,
      peerId: signer.peerId,
      signerCapabilities: signer.capabilities,
    })

    // Show success toast
    toast.success('Signer saved as contact')
  }
  ```

- [ ] Auto-update contact last seen on peer events
  ```typescript
  // In P2P store or service
  function handlePeerConnected(peerId: string) {
    const contactsStore = useContactsStore()
    const contact = contactsStore.findByPeerId(peerId)

    if (contact) {
      contactsStore.updateLastSeen(contact.id, new Date())
    }
  }
  ```

---

### 9.5 Home Page Integration

**Source**: unified-remaining-tasks/06_CROSS_FEATURE_INTEGRATION.md
**Effort**: 0.5 days

#### P2P Connection Indicator

- [ ] Add P2P status to home page
  ```vue
  <div class="flex items-center gap-2 text-sm">
    <span :class="p2pConnected ? 'text-green-500' : 'text-gray-400'">●</span>
    <span>{{ p2pConnected ? `${peerCount} peers` : 'P2P offline' }}</span>
  </div>
  ```

#### Pending Requests Badge

- [ ] Add pending signing requests indicator
  ```vue
  <NuxtLink to="/people/p2p?tab=requests" class="relative">
    <UIcon name="i-heroicons-inbox" />
    <UBadge
      v-if="pendingRequestsCount > 0"
      color="red"
      size="xs"
      class="absolute -top-1 -right-1"
    >
      {{ pendingRequestsCount }}
    </UBadge>
  </NuxtLink>
  ```

#### Shared Wallets Section

- [ ] Add shared wallets below personal balance
  ```vue
  <UCard v-if="sharedWallets.length > 0" class="mt-4">
    <template #header>
      <div class="flex justify-between items-center">
        <span>Shared Wallets</span>
        <NuxtLink to="/people/shared-wallets" class="text-sm text-primary">
          View All
        </NuxtLink>
      </div>
    </template>
    
    <div class="divide-y divide-default">
      <div v-for="wallet in sharedWallets.slice(0, 3)" :key="wallet.id">
        <!-- Compact wallet display -->
      </div>
    </div>
  </UCard>
  ```

---

### 9.6 Contact Transaction Integration

**Effort**: 0.5 days

#### Wallet Store Addition

- [ ] Add `getTransactionsWithContact` to wallet store
  ```typescript
  getTransactionsWithContact: state => (contactAddress: string) => {
    return state.transactions.filter(
      tx =>
        tx.inputs.some(i => i.address === contactAddress) ||
        tx.outputs.some(o => o.address === contactAddress),
    )
  }
  ```

#### Contact Detail Enhancement

- [ ] Add transaction stats to contact detail
  ```vue
  <div v-if="transactionsWithContact.length > 0">
    <p class="text-xs text-gray-500">Transaction History</p>
    <p class="text-sm">
      {{ transactionsWithContact.length }} transactions
      <span class="text-gray-400">
        ({{ sentCount }} sent, {{ receivedCount }} received)
      </span>
    </p>
    <NuxtLink
      :to="`/explore/explorer/address/${contact.address}`"
      class="text-sm text-primary"
    >
      View in Explorer →
    </NuxtLink>
  </div>
  ```

---

### 9.7 Explorer Integration

**Effort**: 0.5 days

#### Contact Name Resolution

- [ ] Resolve contact names in address displays
  ```typescript
  // Already handled by ExplorerAddressDisplay component
  // Verify it's used consistently
  ```

#### Own Transaction Highlighting

- [ ] Highlight user's own transactions in explorer
  ```vue
  <UBadge v-if="isOwnTransaction" color="blue">Your Transaction</UBadge>
  ```

#### Add to Contacts Prompts

- [ ] Add "Add to Contacts" prompts for unknown addresses
  ```vue
  <!-- In address detail page -->
  <AddToContactButton v-if="!isContact && !isOwnAddress" :address="address" />
  ```

---

### 9.8 Unified Activity Feed

**Effort**: 1 day

#### Activity Store

- [ ] Create `stores/activity.ts`
  ```typescript
  export const useActivityStore = defineStore('activity', () => {
    const walletStore = useWalletStore()
    const p2pStore = useP2PStore()
    const musig2Store = useMusig2Store()
    const contactsStore = useContactsStore()

    const allActivity = computed(() => {
      const activities: ActivityItem[] = []

      // Wallet transactions
      for (const tx of walletStore.recentTransactions) {
        activities.push({
          type: 'transaction',
          timestamp: tx.timestamp,
          data: tx,
        })
      }

      // P2P events
      for (const event of p2pStore.activityEvents) {
        activities.push({
          type: 'p2p',
          timestamp: event.timestamp,
          data: event,
        })
      }

      // MuSig2 events
      for (const session of musig2Store.recentSessions) {
        activities.push({
          type: 'musig2',
          timestamp: session.timestamp,
          data: session,
        })
      }

      // Sort by timestamp descending
      return activities.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )
    })

    return { allActivity }
  })
  ```

#### ActivityFeed Component

- [ ] Create `components/common/ActivityFeed.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    limit?: number
    filter?: 'all' | 'transaction' | 'p2p' | 'musig2'
  }

  const props = withDefaults(defineProps<Props>(), {
    limit: 10,
    filter: 'all',
  })

  const activityStore = useActivityStore()

  const filteredActivity = computed(() => {
    let items = activityStore.allActivity

    if (props.filter !== 'all') {
      items = items.filter(a => a.type === props.filter)
    }

    return items.slice(0, props.limit)
  })
  </script>
  ```

#### Home Page Integration

- [ ] Integrate activity feed on home page
  ```vue
  <ActivityFeed :limit="5" />
  ```

---

### 9.9 Navigation Enhancements

**Effort**: 0.5 days

#### Contextual Links

- [ ] Add contextual links between features
  - Transaction → Contact (if address is contact)
  - Contact → Shared Wallets
  - Shared Wallet → Participants (contacts)

#### Breadcrumb Enhancement

- [ ] Enhance breadcrumbs with context
  ```vue
  <!-- Example: Shared Wallet Detail -->
  <UBreadcrumb
    :items="[
      { label: 'People', to: '/people' },
      { label: 'Shared Wallets', to: '/people/shared-wallets' },
      { label: wallet.name },
    ]"
  />
  ```

#### Command Palette Update

- [ ] Update command palette with cross-feature search
  ```typescript
  const searchResults = computed(() => {
    const results = []

    // Search contacts
    results.push(
      ...contactsStore.contacts
        .filter(c => c.name.toLowerCase().includes(query.value))
        .map(c => ({ type: 'contact', item: c })),
    )

    // Search shared wallets
    results.push(
      ...musig2Store.sharedWallets
        .filter(w => w.name.toLowerCase().includes(query.value))
        .map(w => ({ type: 'wallet', item: w })),
    )

    // Search addresses/txids
    // ...

    return results
  })
  ```

---

## File Changes Summary

### New Files

| File                                 | Purpose                      |
| ------------------------------------ | ---------------------------- |
| `stores/activity.ts`                 | Unified activity aggregation |
| `components/common/ActivityFeed.vue` | Cross-feature activity feed  |

### Modified Files

| File                                             | Changes                                  |
| ------------------------------------------------ | ---------------------------------------- |
| `components/contacts/ContactDetailSlideover.vue` | P2P section                              |
| `components/contacts/ContactForm.vue`            | Public key input                         |
| `components/contacts/ContactCard.vue`            | Online status, MuSig2 badge              |
| `stores/contacts.ts`                             | updateLastSeen, updateSignerCapabilities |
| `stores/p2p.ts`                                  | isPeerOnline getter                      |
| `stores/wallet.ts`                               | getTransactionsWithContact               |
| `pages/index.vue`                                | P2P status, shared wallets               |
| `pages/people/p2p.vue`                           | Save signer as contact                   |

---

## Cross-Feature Navigation Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CROSS-FEATURE NAVIGATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HOME                                                                       │
│  ├─► Personal Balance ──► Transaction History                               │
│  ├─► Shared Wallets ──► Shared Wallet Detail                               │
│  ├─► P2P Status ──► P2P Page                                               │
│  └─► Activity Feed ──► Transaction/Event Detail                            │
│                                                                             │
│  CONTACTS                                                                   │
│  ├─► Contact Detail ──► Explorer Address                                   │
│  ├─► Contact Detail ──► Shared Wallets (with contact)                      │
│  ├─► Contact Detail ──► Request Signature                                  │
│  └─► Contact Detail ──► Create Shared Wallet                               │
│                                                                             │
│  P2P                                                                        │
│  ├─► Signer ──► Save as Contact                                            │
│  ├─► Session ──► Transaction Detail (when complete)                        │
│  └─► Request ──► Contact Detail (if from contact)                          │
│                                                                             │
│  EXPLORER                                                                   │
│  ├─► Address ──► Contact Detail (if contact)                               │
│  ├─► Address ──► Add to Contacts (if unknown)                              │
│  └─► Transaction ──► Contact names in inputs/outputs                       │
│                                                                             │
│  SOCIAL                                                                     │
│  ├─► Profile ──► Link to Contact (future)                                  │
│  └─► Voter Address ──► Explorer Address                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

### Contact P2P Integration

- [ ] P2P section shows in contact detail
- [ ] Online status updates correctly
- [ ] Public key displays with copy
- [ ] Shared wallets with contact listed
- [ ] Action buttons work

### Contact Form

- [ ] Public key input validates correctly
- [ ] Info alert shows when key entered
- [ ] Contact saves with public key

### Contact List

- [ ] Online status indicator shows
- [ ] MuSig2 badge shows for capable contacts

### Home Page

- [ ] P2P status displays
- [ ] Pending requests badge shows
- [ ] Shared wallets section shows

### Cross-Feature

- [ ] Activity feed aggregates correctly
- [ ] Navigation links work
- [ ] Command palette searches across features

---

## Notes

- Cross-feature integration creates a cohesive UX
- Contact-centric design puts relationships first
- Activity feed provides unified view of all events
- Navigation should feel natural and contextual

---

## Next Phase

After completing Phase 9, proceed to:

- **Phase 10**: Polish and State Sync

---

_Source: unified-p2p-musig2-ui/05_CONTACT_INTEGRATION.md, unified-remaining-tasks/06_CROSS_FEATURE_INTEGRATION.md_
