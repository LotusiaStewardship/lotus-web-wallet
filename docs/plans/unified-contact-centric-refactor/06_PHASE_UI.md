# Phase 6: UI/UX Restructure

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 2-3 weeks  
**Dependencies**: Phase 4 (Contacts), Phase 5 (MuSig2)

---

## Overview

This phase restructures the UI/UX to implement the contact-centric design philosophy. It creates new components, updates navigation, and implements progressive disclosure patterns.

> ⚠️ **REQUIRED**: All implementations in this phase MUST follow the human-centered UX principles defined in [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md). Complete the UX checklist before implementing any component.

---

## Goals

1. Create contact-aware address display components
2. Implement AccountSelector and AccountBadge components
3. Update navigation to elevate "People" section
4. Add relationship indicators (online, MuSig2, favorite)
5. Implement progressive disclosure patterns
6. Add loading skeletons and improved empty states
7. **Implement dismissible UI components** (anti-annoyance pattern)
8. **Create feature introduction modals** for complex features
9. **Add user-friendly terminology helper**
10. **Integrate dismissed prompts settings**

---

## Design Principles

### 1. Contact Context Everywhere

Every address displayed should show contact information when available.

### 2. Relationship Indicators

Visual badges communicate contact capabilities at a glance:

- 🟢 Online / 🟡 Recent / 🔴 Offline
- 🔐 MuSig2 eligible
- ⭐ Favorite

### 3. Progressive Disclosure

Show basic information first, reveal advanced features on demand.

### 4. Contextual Actions

Actions adapt based on contact capabilities and current context.

---

## Tasks

### 6.1 Create AddressDisplay Component

**File**: `components/common/AddressDisplay.vue` (NEW/MODIFY)

```vue
<template>
  <div class="inline-flex items-center gap-2">
    <!-- If contact exists, show contact info -->
    <template v-if="contact">
      <ContactAvatar :contact="contact" size="xs" show-presence />
      <div class="min-w-0">
        <span class="font-medium truncate">{{ contact.name }}</span>
        <span v-if="showAddress" class="text-muted text-sm ml-1">
          ({{ fingerprint }})
        </span>
      </div>
    </template>

    <!-- Otherwise show raw address -->
    <template v-else>
      <code class="text-sm font-mono truncate">
        {{ truncate ? fingerprint : address }}
      </code>
    </template>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0">
      <UButton
        v-if="!contact && showAddToContacts"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-user-plus"
        title="Add to Contacts"
        @click="addToContacts"
      />
      <UButton
        v-if="copyable"
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
const props = withDefaults(
  defineProps<{
    address: string
    showAddress?: boolean
    showAddToContacts?: boolean
    truncate?: boolean
    copyable?: boolean
  }>(),
  {
    showAddress: true,
    showAddToContacts: true,
    truncate: true,
    copyable: true,
  },
)

const contactStore = useContactsStore()
const { copy } = useClipboard()
const toast = useToast()

const contact = computed(() => contactStore.findByAddress(props.address))

const fingerprint = computed(() => {
  if (!props.address) return ''
  return `${props.address.slice(0, 12)}...${props.address.slice(-6)}`
})

function addToContacts() {
  navigateTo(`/people/contacts?add=true&address=${props.address}`)
}

async function copyAddress() {
  await copy(props.address)
  toast.add({ title: 'Address copied', color: 'success' })
}
</script>
```

| Task                                 | Priority | Status         |
| ------------------------------------ | -------- | -------------- |
| Create AddressDisplay component      | P0       | ⬜ Not Started |
| Integrate with contact store         | P0       | ⬜ Not Started |
| Add copy and add-to-contacts actions | P0       | ⬜ Not Started |

---

### 6.2 Create AccountSelector Component

**File**: `components/wallet/AccountSelector.vue` (NEW)

```vue
<template>
  <UDropdownMenu :items="accountItems">
    <UButton
      color="neutral"
      variant="soft"
      class="min-w-[180px] justify-between"
    >
      <div class="flex items-center gap-2">
        <AccountBadge :purpose="selectedAccount" size="sm" />
        <span>{{ selectedLabel }}</span>
      </div>
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import { AccountPurpose, ACCOUNT_FRIENDLY_LABELS } from '~/types/accounts'

const props = defineProps<{
  modelValue: AccountPurpose
  showAll?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AccountPurpose]
}>()

const selectedAccount = computed(() => props.modelValue)

const selectedLabel = computed(() => {
  return ACCOUNT_FRIENDLY_LABELS[selectedAccount.value] || 'Unknown'
})

const accountItems = computed(() => {
  const items = [
    {
      label: ACCOUNT_FRIENDLY_LABELS[AccountPurpose.PRIMARY],
      icon: 'i-lucide-wallet',
      click: () => emit('update:modelValue', AccountPurpose.PRIMARY),
    },
    {
      label: ACCOUNT_FRIENDLY_LABELS[AccountPurpose.MUSIG2],
      icon: 'i-lucide-shield',
      click: () => emit('update:modelValue', AccountPurpose.MUSIG2),
    },
  ]

  if (props.showAll) {
    items.unshift({
      label: 'All Accounts',
      icon: 'i-lucide-layers',
      click: () => emit('update:modelValue', -1 as AccountPurpose),
    })
  }

  return [items]
})
</script>
```

| Task                              | Priority | Status         |
| --------------------------------- | -------- | -------------- |
| Create AccountSelector component  | P1       | ⬜ Not Started |
| Add dropdown with account options | P1       | ⬜ Not Started |
| Emit selection changes            | P1       | ⬜ Not Started |

---

### 6.3 Create AccountBadge Component

**File**: `components/wallet/AccountBadge.vue` (NEW)

```vue
<template>
  <div
    :class="[
      'inline-flex items-center gap-1 rounded-full',
      sizeClasses[size],
      colorClasses[purpose],
    ]"
  >
    <UIcon :name="icon" :class="iconSizeClasses[size]" />
    <span v-if="showLabel">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { AccountPurpose, ACCOUNT_FRIENDLY_LABELS } from '~/types/accounts'

const props = withDefaults(
  defineProps<{
    purpose: AccountPurpose
    size?: 'xs' | 'sm' | 'md'
    showLabel?: boolean
  }>(),
  {
    size: 'sm',
    showLabel: false,
  },
)

const icon = computed(() => {
  switch (props.purpose) {
    case AccountPurpose.PRIMARY:
      return 'i-lucide-wallet'
    case AccountPurpose.MUSIG2:
      return 'i-lucide-shield'
    case AccountPurpose.SWAP:
      return 'i-lucide-repeat'
    case AccountPurpose.PRIVACY:
      return 'i-lucide-eye-off'
    default:
      return 'i-lucide-circle'
  }
})

const label = computed(
  () => ACCOUNT_FRIENDLY_LABELS[props.purpose] || 'Unknown',
)

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-1.5 text-base',
}

const iconSizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
}

const colorClasses = {
  [AccountPurpose.PRIMARY]: 'bg-primary/10 text-primary',
  [AccountPurpose.MUSIG2]:
    'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  [AccountPurpose.SWAP]: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  [AccountPurpose.PRIVACY]: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
}
</script>
```

| Task                            | Priority | Status         |
| ------------------------------- | -------- | -------------- |
| Create AccountBadge component   | P1       | ⬜ Not Started |
| Add icons for each account type | P1       | ⬜ Not Started |
| Add color variants              | P1       | ⬜ Not Started |

---

### 6.4 Update Contact Card Component

**File**: `components/contacts/ContactCard.vue` (MODIFY)

```vue
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

            <!-- Relationship Indicators -->
            <UIcon
              v-if="contact.isFavorite"
              name="i-lucide-star"
              class="w-4 h-4 text-warning flex-shrink-0"
            />
            <UBadge
              v-if="contactWithIdentity?.canMuSig2"
              color="purple"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-lucide-shield" class="w-3 h-3 mr-1" />
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
            title="Send"
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

      <!-- Expanded content -->
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

<script setup lang="ts">
const props = defineProps<{
  contact: Contact
  isSelected?: boolean
  expanded?: boolean
}>()

const emit = defineEmits<{
  click: []
  send: []
  edit: []
  delete: []
}>()

const contactStore = useContactsStore()
const musig2Store = useMuSig2Store()

const contactWithIdentity = computed(() => {
  return contactStore.getContactWithIdentity(props.contact.id)
})

const stats = computed(() => ({
  transactions: props.contact.transactionCount || 0,
  sent: props.contact.totalSent || 0n,
  received: props.contact.totalReceived || 0n,
}))

const sharedWallets = computed(() => {
  const pubKey = props.contact.identityId || props.contact.publicKey
  if (!pubKey) return []

  return musig2Store.sharedWallets.filter(w =>
    w.participants.some(p => p.publicKeyHex === pubKey),
  )
})

const lastActivity = computed(() => {
  if (!props.contact.lastTransactionAt) return null
  return `Last: ${formatTimeAgo(props.contact.lastTransactionAt)}`
})

const menuItems = computed(() => [
  [
    {
      label: 'View Details',
      icon: 'i-lucide-user',
      click: () => emit('click'),
    },
    { label: 'Edit', icon: 'i-lucide-edit', click: () => emit('edit') },
    { label: 'Delete', icon: 'i-lucide-trash', click: () => emit('delete') },
  ],
])

function fingerprint(address: string) {
  if (!address) return 'No address'
  return `${address.slice(0, 12)}...${address.slice(-6)}`
}
</script>
```

| Task                        | Priority | Status         |
| --------------------------- | -------- | -------------- |
| Add relationship indicators | P0       | ⬜ Not Started |
| Show MuSig2 badge           | P0       | ⬜ Not Started |
| Add shared wallets section  | P1       | ⬜ Not Started |
| Add quick actions           | P0       | ⬜ Not Started |

---

### 6.5 Update Navigation Structure

**File**: `layouts/default.vue` (MODIFY)

```typescript
const navigation = [
  {
    label: 'Home',
    icon: 'i-lucide-home',
    to: '/',
  },
  {
    label: 'People', // Elevated in hierarchy
    icon: 'i-lucide-users',
    to: '/people',
    children: [
      { label: 'Contacts', icon: 'i-lucide-contact', to: '/people/contacts' },
      {
        label: 'Shared Wallets',
        icon: 'i-lucide-shield',
        to: '/people/shared-wallets',
      },
      { label: 'P2P Network', icon: 'i-lucide-wifi', to: '/people/p2p' },
    ],
  },
  {
    label: 'Transact',
    icon: 'i-lucide-wallet',
    to: '/transact',
    children: [
      { label: 'Send', icon: 'i-lucide-send', to: '/transact/send' },
      { label: 'Receive', icon: 'i-lucide-download', to: '/transact/receive' },
      { label: 'History', icon: 'i-lucide-history', to: '/transact/history' },
    ],
  },
  {
    label: 'Explore',
    icon: 'i-lucide-compass',
    to: '/explore',
    children: [
      { label: 'Explorer', icon: 'i-lucide-search', to: '/explore/explorer' },
      { label: 'Social', icon: 'i-lucide-at-sign', to: '/explore/social' },
    ],
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
  },
]
```

| Task                                   | Priority | Status         |
| -------------------------------------- | -------- | -------------- |
| Elevate "People" section in navigation | P0       | ⬜ Not Started |
| Add child navigation items             | P0       | ⬜ Not Started |
| Update icons                           | P1       | ⬜ Not Started |

---

### 6.6 Add Loading Skeletons

**File**: `components/shared-wallets/AvailableSigners.vue` (MODIFY)

```vue
<template>
  <div class="space-y-4">
    <!-- Skeleton Loading -->
    <div v-if="isLoading && signers.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div
          class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <!-- Avatar skeleton -->
            <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <!-- Content skeleton -->
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
            <!-- Action skeleton -->
            <div class="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Discovery Progress Banner -->
    <div
      v-else-if="isLoading"
      class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg"
    >
      <div
        class="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300"
      >
        <UIcon name="i-lucide-loader-2" class="animate-spin w-4 h-4" />
        <span>Discovering signers on the network...</span>
        <span class="text-xs opacity-75">({{ signers.length }} found)</span>
      </div>
    </div>

    <!-- Signers List -->
    <div v-if="filteredSigners.length" class="space-y-2">
      <SignerCard
        v-for="signer in filteredSigners"
        :key="signer.id"
        :signer="signer"
        @add-to-contacts="handleAddToContacts"
        @subscribe="handleSubscribe"
      />
    </div>

    <!-- Empty State -->
    <UiAppEmptyState
      v-else-if="!isLoading"
      icon="i-lucide-users"
      title="No signers found"
      :description="emptyStateDescription"
    >
      <template #actions>
        <div class="flex gap-2">
          <UButton
            v-if="!p2pStore.connected"
            color="primary"
            @click="handleConnect"
          >
            Connect to P2P
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-refresh-cw"
            @click="emit('refresh')"
          >
            Refresh
          </UButton>
        </div>
      </template>
    </UiAppEmptyState>
  </div>
</template>

<script setup lang="ts">
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

const isLoading = computed(() => props.loading || musig2Store.loading)

const emptyStateDescription = computed(() => {
  if (!p2pStore.connected) {
    return 'Connect to the P2P network to discover available signers for shared wallets.'
  }
  if (!p2pStore.dhtReady) {
    return 'Waiting for the distributed hash table to initialize. This usually takes a few seconds.'
  }
  if (!musig2Store.initialized) {
    return 'The MuSig2 service is initializing. Please wait a moment.'
  }
  return 'No signers are currently advertising on the network. Try refreshing or check back later.'
})
</script>
```

| Task                             | Priority | Status         |
| -------------------------------- | -------- | -------------- |
| Add skeleton loading states      | P0       | ⬜ Not Started |
| Add discovery progress banner    | P1       | ⬜ Not Started |
| Improve empty state descriptions | P0       | ⬜ Not Started |

---

### 6.7 Fix Tab Navigation Defaults

**File**: `pages/people/shared-wallets/index.vue` (MODIFY)

```typescript
const tabs = [
  { label: 'My Wallets', slot: 'wallets', icon: 'i-lucide-shield' },
  { label: 'Available Signers', slot: 'signers', icon: 'i-lucide-users' },
  { label: 'Pending Requests', slot: 'requests', icon: 'i-lucide-inbox' },
]

// Default to first tab's slot name when no query param
const selectedTab = ref<string>(() => {
  const queryTab = route.query.tab as string | undefined
  if (queryTab && tabs.some(t => t.slot === queryTab)) {
    return queryTab
  }
  return tabs[0].slot
})

// Only update URL when user clicks a tab
const isInitialLoad = ref(true)

watch(selectedTab, tab => {
  if (isInitialLoad.value) {
    isInitialLoad.value = false
    return
  }
  router.replace({ query: { ...route.query, tab } })
})
```

| Task                                | Priority | Status         |
| ----------------------------------- | -------- | -------------- |
| Fix default tab selection           | P0       | ⬜ Not Started |
| Use slot names consistently         | P0       | ⬜ Not Started |
| Only update URL on user interaction | P1       | ⬜ Not Started |

---

### 6.8 Update Transaction History with Contacts

**File**: `components/history/TxItem.vue` (MODIFY)

```vue
<template>
  <div
    class="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-lg transition-colors"
  >
    <!-- Direction Icon -->
    <div
      :class="[
        'w-10 h-10 rounded-full flex items-center justify-center',
        directionClass,
      ]"
    >
      <UIcon :name="directionIcon" class="w-5 h-5" />
    </div>

    <!-- Counterparty (Contact-aware) -->
    <div class="flex-1 min-w-0">
      <AddressDisplay
        :address="counterpartyAddress"
        :show-address="!!contact"
        :show-add-to-contacts="!contact"
        :copyable="false"
      />
      <p class="text-xs text-muted mt-0.5">
        {{ formatTimeAgo(transaction.timestamp) }}
      </p>
    </div>

    <!-- Amount -->
    <div class="text-right">
      <p :class="['font-mono font-medium', amountClass]">
        {{ formattedAmount }}
      </p>
      <p v-if="transaction.confirmations < 6" class="text-xs text-muted">
        {{ transaction.confirmations }} confirmations
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const contactStore = useContactsStore()

const counterpartyAddress = computed(() =>
  props.transaction.type === 'send'
    ? props.transaction.toAddress
    : props.transaction.fromAddress,
)

const contact = computed(() =>
  contactStore.findByAddress(counterpartyAddress.value),
)
</script>
```

| Task                                        | Priority | Status         |
| ------------------------------------------- | -------- | -------------- |
| Use AddressDisplay for counterparty         | P0       | ⬜ Not Started |
| Show contact name when available            | P0       | ⬜ Not Started |
| Add "Add to Contacts" for unknown addresses | P1       | ⬜ Not Started |

---

### 6.9 Create Dismissible UI Composable

**File**: `composables/useDismissible.ts` (NEW)

Per [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md#principle-8-respect-user-autonomy-anti-annoyance), all educational UI must be dismissible.

```typescript
const STORAGE_PREFIX = 'ux:dismissed:'

export function useDismissible(key: string) {
  const storageKey = `${STORAGE_PREFIX}${key}`

  const isDismissed = ref(localStorage.getItem(storageKey) === 'true')

  function dismiss(dontShowAgain: boolean = true) {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true')
      isDismissed.value = true
    }
  }

  function reset() {
    localStorage.removeItem(storageKey)
    isDismissed.value = false
  }

  return {
    isDismissed: readonly(isDismissed),
    dismiss,
    reset,
  }
}

// Get all dismissed keys for Settings page
export function getAllDismissedPrompts(): string[] {
  const dismissed: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      dismissed.push(key.replace(STORAGE_PREFIX, ''))
    }
  }
  return dismissed
}

// Reset all dismissed prompts
export function resetAllDismissedPrompts(): void {
  const keys = getAllDismissedPrompts()
  keys.forEach(key => localStorage.removeItem(`${STORAGE_PREFIX}${key}`))
}
```

| Task                                 | Priority | Status         |
| ------------------------------------ | -------- | -------------- |
| Create `useDismissible()` composable | P0       | ⬜ Not Started |
| Add `getAllDismissedPrompts()`       | P1       | ⬜ Not Started |
| Add `resetAllDismissedPrompts()`     | P1       | ⬜ Not Started |

---

### 6.10 Create Dismissible UI Components

**File**: `components/common/DismissibleBanner.vue` (NEW)

```vue
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
```

**File**: `components/common/FeatureIntro.vue` (NEW)

First-time feature introduction modal with "Don't show again" option.

**File**: `components/common/FirstTimeTooltip.vue` (NEW)

Tooltip that only shows once per user, with dismiss options.

| Task                           | Priority | Status         |
| ------------------------------ | -------- | -------------- |
| Create `DismissibleBanner.vue` | P0       | ⬜ Not Started |
| Create `FeatureIntro.vue`      | P0       | ⬜ Not Started |
| Create `FirstTimeTooltip.vue`  | P1       | ⬜ Not Started |

---

### 6.11 Add Feature Introductions

Add first-time introductions for complex features:

| Feature           | Key                      | Title                       | Use Cases                                                 |
| ----------------- | ------------------------ | --------------------------- | --------------------------------------------------------- |
| Shared Wallets    | `intro:sharedWallets`    | "Welcome to Shared Wallets" | Family savings, Business accounts, Extra security         |
| P2P Network       | `intro:p2pNetwork`       | "Connect with Others"       | Real-time presence, Signer discovery, Coordinated signing |
| Available Signers | `intro:availableSigners` | "Find Co-signers"           | Create shared wallets, Multi-party transactions           |

| Task                               | Priority | Status         |
| ---------------------------------- | -------- | -------------- |
| Add Shared Wallets introduction    | P0       | ⬜ Not Started |
| Add P2P Network introduction       | P1       | ⬜ Not Started |
| Add Available Signers introduction | P1       | ⬜ Not Started |

---

### 6.12 Add User-Friendly Terminology

**File**: `utils/terminology.ts` (NEW)

```typescript
// User-friendly terminology translations
export const userFriendlyTerms: Record<string, string> = {
  utxo: 'coin',
  utxos: 'coins',
  dht: 'network',
  peerId: 'wallet ID',
  publicKey: 'wallet address',
  musig2: 'shared wallet',
  signer: 'co-signer',
  mempool: 'pending transactions',
  blockHeight: 'network status',
}

export function formatTechnicalTerm(
  term: string,
  showTechnical = false,
): string {
  if (showTechnical) return term
  return userFriendlyTerms[term.toLowerCase()] || term
}
```

| Task                       | Priority | Status         |
| -------------------------- | -------- | -------------- |
| Create terminology utility | P1       | ⬜ Not Started |
| Apply to UI labels         | P1       | ⬜ Not Started |

---

### 6.13 Add Dismissed Prompts Settings

**File**: `pages/settings/preferences.vue` (MODIFY)

Add section to re-enable dismissed prompts:

```vue
<template>
  <div class="dismissed-prompts-settings">
    <h3>Dismissed Prompts</h3>
    <p class="hint">
      You've dismissed some helpful prompts. Re-enable them here if you'd like
      to see them again.
    </p>

    <div v-for="prompt in dismissedPrompts" :key="prompt.key">
      <div class="prompt-item">
        <span>{{ prompt.label }}</span>
        <UButton size="xs" @click="resetPrompt(prompt.key)">
          Show again
        </UButton>
      </div>
    </div>

    <UButton v-if="dismissedPrompts.length" @click="resetAllPrompts">
      Reset all prompts
    </UButton>
  </div>
</template>
```

| Task                          | Priority | Status         |
| ----------------------------- | -------- | -------------- |
| Add dismissed prompts section | P1       | ⬜ Not Started |
| List all dismissed prompts    | P1       | ⬜ Not Started |
| Add "Reset all" button        | P2       | ⬜ Not Started |

---

## Testing Checklist

### Components

- [ ] AddressDisplay shows contact info when available
- [ ] AddressDisplay shows raw address when no contact
- [ ] AccountSelector switches between accounts
- [ ] AccountBadge shows correct icons and colors
- [ ] ContactCard shows relationship indicators

### Navigation

- [ ] "People" section visible in main navigation
- [ ] Child routes accessible
- [ ] Tab defaults work correctly

### Loading States

- [ ] Skeleton loading shows during discovery
- [ ] Progress banner shows count
- [ ] Empty states have helpful messages

### Contact Integration

- [ ] Transaction history shows contact names
- [ ] "Add to Contacts" appears for unknown addresses
- [ ] Contact cards show shared wallets

### Dismissible UI (Anti-Annoyance)

- [ ] Feature introductions show on first visit
- [ ] "Don't show again" checkbox works
- [ ] Dismissed preferences persist across sessions
- [ ] Settings page shows dismissed prompts
- [ ] "Reset all prompts" works correctly

### User-Friendly Language

- [ ] Technical terms translated in UI
- [ ] "Show technical details" toggle available

---

## Files Summary

| File                                             | Change Type | Description                   |
| ------------------------------------------------ | ----------- | ----------------------------- |
| `components/common/AddressDisplay.vue`           | NEW/MODIFY  | Contact-aware address display |
| `components/wallet/AccountSelector.vue`          | NEW         | Account selection dropdown    |
| `components/wallet/AccountBadge.vue`             | NEW         | Account type badge            |
| `components/contacts/ContactCard.vue`            | MODIFY      | Relationship indicators       |
| `layouts/default.vue`                            | MODIFY      | Updated navigation            |
| `components/shared-wallets/AvailableSigners.vue` | MODIFY      | Loading skeletons             |
| `pages/people/shared-wallets/index.vue`          | MODIFY      | Tab defaults                  |
| `components/history/TxItem.vue`                  | MODIFY      | Contact integration           |
| `composables/useDismissible.ts`                  | NEW         | Dismissible UI composable     |
| `components/common/DismissibleBanner.vue`        | NEW         | Dismissible banner component  |
| `components/common/FeatureIntro.vue`             | NEW         | Feature introduction modal    |
| `components/common/FirstTimeTooltip.vue`         | NEW         | First-time tooltip component  |
| `utils/terminology.ts`                           | NEW         | User-friendly term helper     |
| `pages/settings/preferences.vue`                 | MODIFY      | Dismissed prompts settings    |

---

## Success Criteria

- [ ] Addresses show contact info when available
- [ ] Navigation reflects contact-centric design
- [ ] Loading states are visually clear
- [ ] Empty states provide helpful guidance
- [ ] Relationship indicators visible at a glance
- [ ] All educational UI is dismissible with "Don't show again"
- [ ] Dismissed preferences persist and can be reset in Settings
- [ ] Technical terms use user-friendly alternatives

---

## Dependencies

- **Phase 4**: Contact system with identity linking
- **Phase 5**: MuSig2 integration

## Dependents

- **Phase 7**: Final polish and testing

---

_Created: December 18, 2025_  
_Status: Pending_
