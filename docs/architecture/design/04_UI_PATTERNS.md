# Contact-Centric UI Patterns

**Version**: 1.0.1  
**Date**: December 2024  
**Status**: Active

---

## Prerequisites

> ⚠️ **REQUIRED READING**: [07_HUMAN_CENTERED_UX.md](./07_HUMAN_CENTERED_UX.md)
>
> All UI patterns in this document must be implemented following the human-centered UX principles. Before implementing any component, complete the UX checklist in that document.

---

## Overview

This document defines the UI/UX patterns that implement the contact-centric design philosophy. These patterns ensure consistent, intuitive interactions across all features while keeping contacts at the center of the user experience.

---

## Core UI Principles

### 1. Contact Context Everywhere

Every address displayed should show contact information when available:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADDRESS DISPLAY PATTERN                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WITHOUT CONTACT:                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  lotus_16PSJKLz9v7AXgh...abc123                            │ │
│  │  [Copy] [View in Explorer]                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  WITH CONTACT:                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  👤 Alice                                           🟢     │ │
│  │  lotus_16PSJKLz9v7AXgh...abc123                            │ │
│  │  [Copy] [View Contact] [Send]                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Relationship Indicators

Visual badges communicate contact capabilities at a glance:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RELATIONSHIP INDICATORS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRESENCE                                                        │
│  🟢 Online       Currently connected via P2P                     │
│  🟡 Recent       Seen within last 5 minutes                      │
│  🔴 Offline      Not currently reachable                         │
│  ⚫ Unknown      No P2P information                              │
│                                                                  │
│  CAPABILITIES                                                    │
│  🔐 MuSig2       Has public key, can participate in shared wallets│
│  📡 P2P         Connected to P2P network                         │
│  ✅ Verified     Address ownership verified                      │
│                                                                  │
│  RELATIONSHIP                                                    │
│  ⭐ Favorite     User-marked as favorite                         │
│  🏷️ Tagged       Has user-assigned tags                          │
│  👥 Group        Member of a contact group                       │
│                                                                  │
│  ACTIVITY                                                        │
│  💬 Recent       Transaction within last 7 days                  │
│  🤝 Shared       Has shared wallet together                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Progressive Disclosure

Show basic information first, reveal advanced features on demand:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE DISCLOSURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COLLAPSED (Default):                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  👤 Alice                                    🟢 ⭐ 🔐      │ │
│  │  lotus_16PSJ...abc123 • Last: 2 days ago                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  EXPANDED (On click/hover):                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  👤 Alice                                    🟢 ⭐ 🔐      │ │
│  │  lotus_16PSJ...abc123                                      │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │  12 transactions • 500 XPI sent • 200 XPI received         │ │
│  │  Shared wallets: Family Fund, Business                     │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │  [Send] [Request Signature] [View Details]                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Contextual Actions

Actions adapt based on contact capabilities and current context:

```typescript
// Action availability based on contact layer
const contactActions = computed(() => {
  const actions: Action[] = []

  // Always available
  actions.push({
    id: 'view',
    label: 'View Details',
    icon: 'i-lucide-user',
  })

  // Layer 1+: Has address
  if (contact.address) {
    actions.push({
      id: 'send',
      label: 'Send',
      icon: 'i-lucide-send',
      primary: true,
    })
    actions.push({
      id: 'copy',
      label: 'Copy Address',
      icon: 'i-lucide-copy',
    })
  }

  // Layer 2+: P2P connected
  if (contact.identityId && identity?.peerId) {
    actions.push({
      id: 'message',
      label: 'Message',
      icon: 'i-lucide-message-circle',
      disabled: !identity.isOnline,
      disabledReason: 'Contact is offline',
    })
  }

  // Layer 3: MuSig2 capable
  if (canParticipateInMuSig2(contact)) {
    actions.push({
      id: 'sign',
      label: 'Request Signature',
      icon: 'i-lucide-pen-tool',
      disabled: !identity?.isOnline,
      disabledReason: 'Contact must be online',
    })
    actions.push({
      id: 'wallet',
      label: 'Shared Wallet',
      icon: 'i-lucide-wallet',
    })
  }

  return actions
})
```

---

## Navigation Patterns

### Contact-Centric Navigation

The "People" section is the primary hub for contact interactions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PEOPLE SECTION STRUCTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /people                     People Hub                          │
│  ├── /people/contacts        All Contacts                        │
│  │   └── /people/contacts/[id]  Contact Detail                   │
│  ├── /people/shared-wallets  Shared Wallets                      │
│  │   ├── ?tab=wallets        My Shared Wallets                   │
│  │   ├── ?tab=signers        Available Signers                   │
│  │   ├── ?tab=requests       Signing Requests                    │
│  │   └── /[id]               Wallet Detail                       │
│  └── /people/network         P2P Network                         │
│      ├── ?tab=overview       Connection Status                   │
│      ├── ?tab=peers          Connected Peers                     │
│      └── ?tab=settings       P2P Settings                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cross-Feature Entry Points

Every feature should be accessible from contact context:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRY POINT MATRIX                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FROM CONTACT DETAIL:                                            │
│  • [Send] → /transact/send?to={address}                          │
│  • [Request Payment] → /transact/receive?for={contactId}         │
│  • [View History] → /transact/history?contact={contactId}        │
│  • [Shared Wallet] → /people/shared-wallets?createWith={id}      │
│  • [Request Signature] → /people/shared-wallets?tab=requests     │
│                                                                  │
│  FROM FEATURE TO CONTACT:                                        │
│  • Send confirmation → [Add to Contacts] if unknown              │
│  • Transaction detail → Click address → Contact detail           │
│  • Signer discovery → [Save as Contact]                          │
│  • Shared wallet → Click participant → Contact detail            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Patterns

### 1. Contact Avatar

Consistent avatar display with status indicators:

```vue
<!-- components/contacts/ContactAvatar.vue -->
<template>
  <div class="relative inline-block">
    <!-- Avatar image or generated -->
    <div :class="['rounded-full overflow-hidden', sizeClasses[size]]">
      <img
        v-if="contact.avatarUrl"
        :src="contact.avatarUrl"
        :alt="contact.name"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        :class="[
          'w-full h-full flex items-center justify-center',
          'bg-primary/10 text-primary font-semibold',
        ]"
      >
        {{ initials }}
      </div>
    </div>

    <!-- Presence indicator -->
    <div
      v-if="showPresence && presenceState !== 'unknown'"
      :class="[
        'absolute bottom-0 right-0 rounded-full border-2 border-white',
        presenceClasses[presenceState],
        presenceSizeClasses[size],
      ]"
    />

    <!-- Capability badge -->
    <div v-if="showCapabilities && canMuSig2" class="absolute -top-1 -right-1">
      <UIcon name="i-lucide-shield" class="w-3 h-3 text-primary" />
    </div>
  </div>
</template>
```

### 2. Contact Card

The primary contact display component:

```vue
<!-- components/contacts/ContactCard.vue -->
<template>
  <div
    :class="[
      'rounded-xl border transition-all cursor-pointer',
      'hover:shadow-md hover:border-primary/30',
      isSelected && 'ring-2 ring-primary',
    ]"
    @click="emit('click')"
  >
    <div class="p-4">
      <!-- Header: Avatar + Name + Indicators -->
      <div class="flex items-start gap-3">
        <ContactAvatar :contact="contact" size="md" show-presence />

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold truncate">{{ contact.name }}</h3>
            <UIcon
              v-if="contact.isFavorite"
              name="i-lucide-star"
              class="w-4 h-4 text-warning flex-shrink-0"
            />
            <UBadge v-if="canMuSig2" color="primary" variant="subtle" size="xs">
              MuSig2
            </UBadge>
          </div>

          <p class="text-sm text-muted truncate">
            {{ fingerprint(contact.address) }}
          </p>

          <p v-if="lastActivity" class="text-xs text-muted mt-1">
            {{ lastActivity }}
          </p>
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center gap-1">
          <UButton
            v-if="contact.address"
            color="primary"
            variant="ghost"
            size="xs"
            icon="i-lucide-send"
            @click.stop="emit('send')"
          />
          <UDropdownMenu :items="menuItems">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-more-vertical"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Expanded content (if expanded) -->
      <div v-if="expanded" class="mt-4 pt-4 border-t">
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p class="font-semibold">{{ stats.transactions }}</p>
            <p class="text-xs text-muted">Transactions</p>
          </div>
          <div>
            <p class="font-semibold text-error">{{ formatXPI(stats.sent) }}</p>
            <p class="text-xs text-muted">Sent</p>
          </div>
          <div>
            <p class="font-semibold text-success">
              {{ formatXPI(stats.received) }}
            </p>
            <p class="text-xs text-muted">Received</p>
          </div>
        </div>

        <!-- Shared wallets -->
        <div v-if="sharedWallets.length" class="mt-3">
          <p class="text-xs text-muted mb-1">Shared Wallets</p>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="wallet in sharedWallets"
              :key="wallet.id"
              variant="subtle"
              size="xs"
            >
              {{ wallet.name }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 3. Address Display with Contact Resolution

```vue
<!-- components/common/AddressDisplay.vue -->
<template>
  <div class="inline-flex items-center gap-2">
    <!-- If contact exists, show contact info -->
    <template v-if="contact">
      <ContactAvatar :contact="contact" size="xs" show-presence />
      <div>
        <span class="font-medium">{{ contact.name }}</span>
        <span v-if="showAddress" class="text-muted text-sm ml-1">
          ({{ fingerprint(address) }})
        </span>
      </div>
    </template>

    <!-- Otherwise show raw address -->
    <template v-else>
      <code class="text-sm font-mono">
        {{ truncate ? fingerprint(address) : address }}
      </code>
    </template>

    <!-- Actions -->
    <div class="flex items-center gap-1">
      <UButton
        v-if="!contact"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-user-plus"
        title="Add to Contacts"
        @click="addToContacts"
      />
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-copy"
        title="Copy Address"
        @click="copyAddress"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  address: string
  showAddress?: boolean
  truncate?: boolean
}>()

const contactStore = useContactsStore()

const contact = computed(() => contactStore.findByAddress(props.address))

function addToContacts() {
  navigateTo(`/people/contacts?add=true&address=${props.address}`)
}
</script>
```

### 4. Contact Selector

For selecting contacts in forms (send, shared wallet creation, etc.):

```vue
<!-- components/contacts/ContactSelector.vue -->
<template>
  <div class="space-y-3">
    <!-- Search input -->
    <UInput
      v-model="searchQuery"
      icon="i-lucide-search"
      placeholder="Search contacts or enter address..."
      @input="handleInput"
    />

    <!-- Quick filters -->
    <div class="flex gap-2">
      <UButton
        size="xs"
        :color="filter === 'all' ? 'primary' : 'neutral'"
        :variant="filter === 'all' ? 'soft' : 'ghost'"
        @click="filter = 'all'"
      >
        All
      </UButton>
      <UButton
        size="xs"
        :color="filter === 'favorites' ? 'primary' : 'neutral'"
        :variant="filter === 'favorites' ? 'soft' : 'ghost'"
        icon="i-lucide-star"
        @click="filter = 'favorites'"
      >
        Favorites
      </UButton>
      <UButton
        v-if="requireMuSig2"
        size="xs"
        :color="filter === 'signers' ? 'primary' : 'neutral'"
        :variant="filter === 'signers' ? 'soft' : 'ghost'"
        icon="i-lucide-shield"
        @click="filter = 'signers'"
      >
        MuSig2
      </UButton>
      <UButton
        v-if="showOnlineOnly"
        size="xs"
        :color="filter === 'online' ? 'primary' : 'neutral'"
        :variant="filter === 'online' ? 'soft' : 'ghost'"
        icon="i-lucide-wifi"
        @click="filter = 'online'"
      >
        Online
      </UButton>
    </div>

    <!-- Contact list -->
    <div class="max-h-64 overflow-y-auto space-y-1">
      <div
        v-for="contact in filteredContacts"
        :key="contact.id"
        :class="[
          'flex items-center gap-3 p-2 rounded-lg cursor-pointer',
          'hover:bg-muted/50 transition-colors',
          isSelected(contact) && 'bg-primary/10 ring-1 ring-primary',
        ]"
        @click="toggleSelect(contact)"
      >
        <ContactAvatar :contact="contact" size="sm" show-presence />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ contact.name }}</p>
          <p class="text-xs text-muted truncate">
            {{ fingerprint(contact.address) }}
          </p>
        </div>
        <UIcon
          v-if="isSelected(contact)"
          name="i-lucide-check"
          class="w-5 h-5 text-primary"
        />
      </div>

      <!-- Empty state -->
      <div v-if="!filteredContacts.length" class="text-center py-8 text-muted">
        <UIcon name="i-lucide-users" class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No contacts found</p>
        <p v-if="requireMuSig2" class="text-xs mt-1">
          Only contacts with public keys can participate
        </p>
      </div>
    </div>

    <!-- Manual address entry -->
    <div
      v-if="allowManualEntry && isValidAddress(searchQuery)"
      class="pt-3 border-t"
    >
      <p class="text-xs text-muted mb-2">Or use this address directly:</p>
      <div
        class="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50"
        @click="selectAddress(searchQuery)"
      >
        <UIcon name="i-lucide-wallet" class="w-5 h-5 text-muted" />
        <code class="text-sm flex-1 truncate">{{ searchQuery }}</code>
        <UButton size="xs" color="primary">Use Address</UButton>
      </div>
    </div>
  </div>
</template>
```

---

## Page Patterns

### Contact List Page

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 Contacts                                    [+ Add Contact]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [🔍 Search contacts...]                                         │
│                                                                  │
│  [All] [⭐ Favorites] [🔐 Signers] [🟢 Online] [Family] [Work]   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ⭐ FAVORITES                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                            │
│  │ 👤 Alice│ │ 👤 Bob  │ │ 👤 Carol│                            │
│  │   🟢    │ │   🔴    │ │   🟢    │                            │
│  └─────────┘ └─────────┘ └─────────┘                            │
│                                                                  │
│  ALL CONTACTS (12)                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👤 Alice                                    🟢 ⭐ 🔐       │ │
│  │ lotus_16PSJ...abc123 • Last: 2 days ago                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👤 Bob                                      🔴 🔐          │ │
│  │ lotus_16PSJ...def456 • Last: 1 week ago                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ...                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Contact Detail Page

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                                              [⋮ Menu]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         ┌──────────┐                             │
│                         │    👤    │                             │
│                         │  Alice   │                             │
│                         │    🟢    │                             │
│                         └──────────┘                             │
│                                                                  │
│                    lotus_16PSJKLz...abc123                       │
│                         🟢 Online now                            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  [💸 Send]  [🔐 Request Signature]  [📋 Copy]  [📱 QR]          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ACTIVITY                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │    12    │  │  500 XPI │  │  200 XPI │                       │
│  │   Txns   │  │   Sent   │  │ Received │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
│                                                                  │
│  SHARED WALLETS                                                  │
│  • Family Fund (Alice, Bob, You)                                 │
│  • Business Account (Alice, Carol, You)                          │
│  [+ Create Shared Wallet]                                        │
│                                                                  │
│  CAPABILITIES                                                    │
│  🔐 MuSig2 Signer                                               │
│  • Supports: standard, token transactions                        │
│  • Fee: 100 sats                                                 │
│  • Status: Available                                             │
│                                                                  │
│  RECENT TRANSACTIONS                                             │
│  • ↑ Sent 100 XPI - 2 days ago                                   │
│  • ↓ Received 50 XPI - 1 week ago                                │
│  • 🔐 Co-signed tx - 2 weeks ago                                 │
│  [View All History]                                              │
│                                                                  │
│  NOTES                                                           │
│  "My sister, works at tech company"                              │
│  [Edit Notes]                                                    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  [✏️ Edit Contact]  [🗑️ Delete]                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### 1. Add to Contacts Flow

Triggered from various contexts (transaction, explorer, P2P discovery):

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADD TO CONTACTS FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGER POINTS:                                                 │
│  • Transaction confirmation: "Add recipient to contacts?"        │
│  • Explorer address view: [+ Add to Contacts]                    │
│  • P2P signer discovery: [Save as Contact]                       │
│  • Manual: /people/contacts → [+ Add Contact]                    │
│                                                                  │
│  FLOW:                                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Add Contact                                                │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │                                                             │ │
│  │  Name *                                                     │ │
│  │  [Alice                                              ]      │ │
│  │                                                             │ │
│  │  Address *                                                  │ │
│  │  [lotus_16PSJKLz9v7AXgh...                          ] ✓    │ │
│  │                                                             │ │
│  │  Public Key (for MuSig2)                                    │ │
│  │  [02abc...                                           ] ✓    │ │
│  │  ℹ️ Enables shared wallets and signature requests           │ │
│  │                                                             │ │
│  │  Notes                                                      │ │
│  │  [Met at conference...                               ]      │ │
│  │                                                             │ │
│  │  ☐ Add to favorites                                         │ │
│  │                                                             │ │
│  │  [Cancel]                              [Add Contact]        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Send to Contact Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEND TO CONTACT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FROM CONTACT:                                                   │
│  Contact Detail → [Send] → Send page with recipient pre-filled   │
│                                                                  │
│  FROM SEND PAGE:                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Send Lotus                                                 │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │                                                             │ │
│  │  To                                                         │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │ 🔍 Search contacts or enter address...              │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  │                                                             │ │
│  │  RECENT CONTACTS                                            │ │
│  │  [👤 Alice 🟢] [👤 Bob] [👤 Carol 🟢]                       │ │
│  │                                                             │ │
│  │  FAVORITES                                                  │ │
│  │  [👤 Alice ⭐🟢] [👤 Dave ⭐]                               │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  AFTER SELECTION:                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  To                                                         │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │ 👤 Alice                                    🟢 ✕   │    │ │
│  │  │ lotus_16PSJ...abc123                               │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Create Shared Wallet Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                CREATE SHARED WALLET FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Select Participants                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Create Shared Wallet                                       │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │                                                             │ │
│  │  Select participants (contacts with public keys):           │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ ☑ 👤 You (required)                                  │  │ │
│  │  │ ☑ 👤 Alice                              🟢 🔐        │  │ │
│  │  │ ☐ 👤 Bob                                🔴 🔐        │  │ │
│  │  │ ☐ 👤 Carol                              🟢 🔐        │  │ │
│  │  │ ─────────────────────────────────────────────────── │  │ │
│  │  │ 👤 Dave                                 (no 🔐)      │  │ │
│  │  │ ℹ️ Needs public key to participate                   │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  Selected: 2 of 2 required                                  │ │
│  │                                                             │ │
│  │  [Cancel]                                    [Next →]       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Step 2: Configure Wallet                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Wallet Name                                                │ │
│  │  [Family Fund                                        ]      │ │
│  │                                                             │ │
│  │  Description                                                │ │
│  │  [Shared savings for family expenses                 ]      │ │
│  │                                                             │ │
│  │  Participants:                                              │ │
│  │  • You (organizer)                                          │ │
│  │  • Alice                                                    │ │
│  │                                                             │ │
│  │  ⚠️ All participants must approve transactions              │ │
│  │                                                             │ │
│  │  [← Back]                                  [Create Wallet]  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Empty States

Contact-centric empty states guide users toward building relationships:

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMPTY STATE PATTERNS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NO CONTACTS:                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                         👥                                  │ │
│  │                   No contacts yet                           │ │
│  │                                                             │ │
│  │  Add contacts to easily send Lotus and collaborate          │ │
│  │  on multi-signature transactions.                           │ │
│  │                                                             │ │
│  │  [+ Add Your First Contact]                                 │ │
│  │                                                             │ │
│  │  Or discover signers on the P2P network:                    │ │
│  │  [🌐 Browse P2P Network]                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  NO MUSIG2 CONTACTS:                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                         🔐                                  │ │
│  │             No MuSig2-eligible contacts                     │ │
│  │                                                             │ │
│  │  To create shared wallets, contacts need public keys.       │ │
│  │                                                             │ │
│  │  [Add Public Keys to Contacts]                              │ │
│  │  [🌐 Find Signers on P2P]                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  NO ONLINE CONTACTS:                                             │ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                         🔴                                  │ │
│  │              No contacts online                             │ │
│  │                                                             │ │
│  │  None of your contacts are currently on the P2P network.    │ │
│  │  They'll appear here when they come online.                 │ │
│  │                                                             │ │
│  │  [View All Contacts]                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dismissible UI Components

All educational and explanatory UI elements must be dismissible to respect user autonomy. See [07_HUMAN_CENTERED_UX.md](./07_HUMAN_CENTERED_UX.md#principle-8-respect-user-autonomy-anti-annoyance) for the full anti-annoyance principle.

### Dismissible Component Pattern

```vue
<!-- components/common/DismissibleBanner.vue -->
<template>
  <div v-if="!isDismissed" class="dismissible-banner" :class="variant">
    <div class="content">
      <UIcon v-if="icon" :name="icon" class="icon" />
      <div class="text">
        <p class="title">{{ title }}</p>
        <p v-if="description" class="description">{{ description }}</p>
      </div>
    </div>

    <div class="actions">
      <slot name="actions" />
      <UButton
        v-if="dismissible"
        variant="ghost"
        size="xs"
        icon="i-lucide-x"
        @click="handleDismiss"
      />
    </div>

    <div v-if="showDontShowAgain" class="dont-show-again">
      <UCheckbox v-model="dontShowAgain" size="xs">
        Don't show this again
      </UCheckbox>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  dismissKey: string // e.g., 'warning:addressReuse'
  title: string
  description?: string
  icon?: string
  variant?: 'info' | 'warning' | 'success'
  dismissible?: boolean // Can be dismissed (default: true)
  showDontShowAgain?: boolean // Show checkbox (default: true)
}

const props = withDefaults(defineProps<Props>(), {
  dismissible: true,
  showDontShowAgain: true,
  variant: 'info',
})

const { isDismissed, dismiss } = useDismissible(props.dismissKey)
const dontShowAgain = ref(false)

function handleDismiss() {
  dismiss(dontShowAgain.value)
}
</script>
```

### Dismissible Feature Introduction

```vue
<!-- components/common/FeatureIntro.vue -->
<template>
  <UModal v-if="!isDismissed" :open="true" @close="handleClose">
    <div class="feature-intro">
      <div class="header">
        <UIcon :name="icon" class="feature-icon" />
        <h2>{{ title }}</h2>
      </div>

      <p class="description">{{ description }}</p>

      <div v-if="useCases?.length" class="use-cases">
        <h3>Perfect for:</h3>
        <ul>
          <li v-for="useCase in useCases" :key="useCase">
            {{ useCase }}
          </li>
        </ul>
      </div>

      <div v-if="steps?.length" class="how-it-works">
        <h3>How it works:</h3>
        <ol>
          <li v-for="step in steps" :key="step">{{ step }}</li>
        </ol>
      </div>

      <div class="footer">
        <UCheckbox v-model="dontShowAgain"> Don't show this again </UCheckbox>
        <UButton color="primary" @click="handleClose">
          Got it, let's go!
        </UButton>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  featureKey: string // e.g., 'intro:sharedWallets'
  title: string
  description: string
  icon: string
  useCases?: string[]
  steps?: string[]
}

const props = defineProps<Props>()

const { isDismissed, dismiss } = useDismissible(`intro:${props.featureKey}`)
const dontShowAgain = ref(false)

function handleClose() {
  dismiss(dontShowAgain.value)
}
</script>
```

### Dismissible Tooltip (First-Time Only)

```vue
<!-- components/common/FirstTimeTooltip.vue -->
<template>
  <UTooltip v-if="!isDismissed" :text="text" :open="showTooltip">
    <slot />

    <template #content>
      <div class="first-time-tooltip">
        <p>{{ text }}</p>
        <div class="actions">
          <UButton size="xs" variant="ghost" @click="dismissOnce">
            Got it
          </UButton>
          <UButton size="xs" variant="ghost" @click="dismissForever">
            Don't show again
          </UButton>
        </div>
      </div>
    </template>
  </UTooltip>

  <!-- If dismissed, just render the slot without tooltip -->
  <slot v-else />
</template>

<script setup lang="ts">
interface Props {
  tooltipKey: string
  text: string
  showOnMount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showOnMount: true,
})

const { isDismissed, dismiss } = useDismissible(`tooltip:${props.tooltipKey}`)
const showTooltip = ref(props.showOnMount && !isDismissed.value)

function dismissOnce() {
  showTooltip.value = false
  // Don't persist - will show again next session
}

function dismissForever() {
  dismiss(true)
}
</script>
```

### Usage Examples

```vue
<!-- Example: Shared Wallets page introduction -->
<FeatureIntro
  feature-key="sharedWallets"
  title="Welcome to Shared Wallets"
  description="Create wallets that require multiple people to approve transactions."
  icon="i-lucide-users"
  :use-cases="['Family savings', 'Business accounts', 'Extra security']"
  :steps="[
    'Select co-signers from your contacts',
    'Create the shared wallet',
    'All co-signers must approve each transaction',
  ]"
/>

<!-- Example: Address reuse warning banner -->
<DismissibleBanner
  dismiss-key="warning:addressReuse"
  title="Privacy Notice"
  description="Reusing addresses can reduce your privacy. Consider generating a new address for each transaction."
  icon="i-lucide-shield-alert"
  variant="warning"
/>

<!-- Example: First-time tooltip on P2P status -->
<FirstTimeTooltip
  tooltip-key="p2pStatus"
  text="This shows how many peers you're connected to on the P2P network."
>
  <span class="p2p-status">{{ connectedPeers }} peers</span>
</FirstTimeTooltip>
```

---

## Summary

The contact-centric UI patterns ensure:

1. **Consistency**: Same contact display across all features
2. **Context**: Contact information shown wherever addresses appear
3. **Discoverability**: Clear paths to add and manage contacts
4. **Progressive Enhancement**: UI adapts to contact capabilities
5. **Relationship Focus**: Actions framed in terms of relationships
6. **Respect for Autonomy**: All educational UI is dismissible with "Don't show again"

---

_Next: [05_DATA_FLOW.md](./05_DATA_FLOW.md)_
