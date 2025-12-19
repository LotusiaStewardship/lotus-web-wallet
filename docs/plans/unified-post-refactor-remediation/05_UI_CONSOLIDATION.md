# Phase 5: UI Component Consolidation

**Priority**: P1  
**Effort**: 1-2 days  
**Dependencies**: None

---

## Overview

This phase eliminates duplicate components and establishes shared base components for the P2P/MuSig2/Shared Contacts UI areas. The goal is to have a single source of truth for shared components.

---

## Critical Prerequisites

> ⚠️ **BEFORE IMPLEMENTING ANY CHANGES**, consult:
>
> - [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md) — Human-centered UX principles
> - [05_COMPONENTS.md](../../architecture/05_COMPONENTS.md) — Component organization patterns

---

## Problem Statement

### Duplicate Components

Two nearly identical `SignerCard` components exist:

| Location                                   | Lines | Primary Action | Styling                       |
| ------------------------------------------ | ----- | -------------- | ----------------------------- |
| `components/p2p/SignerCard.vue`            | 114   | "Request"      | `px-4 py-4 hover:bg-muted/50` |
| `components/shared-wallets/SignerCard.vue` | 105   | "Add"          | Card with border              |

### Issues

- Near-identical functionality with subtle differences
- Different action buttons ("Request" vs "Add")
- Inconsistent styling approaches
- Maintenance burden (changes needed in two places)

---

## Implementation

### Task 5.1: Create Unified SignerCard

**File**: `components/common/SignerCard.vue`

```vue
<script setup lang="ts">
/**
 * CommonSignerCard
 *
 * Unified signer card component for P2P and Shared Wallets contexts.
 * Follows ContactCard patterns for consistency.
 */
import { useContactsStore } from '~/stores/contacts'

// Unified signer interface that works with both contexts
interface SignerData {
  id: string
  peerId: string
  publicKey?: string
  publicKeyHex?: string
  nickname?: string
  reputation?: number
  isOnline?: boolean
  responseTime?: number
  capabilities?: Record<string, boolean>
  transactionTypes?: string[]
  fee?: number | string
  walletAddress?: string
}

const props = withDefaults(
  defineProps<{
    /** Signer data */
    signer: SignerData
    /** Primary action configuration */
    primaryAction?: {
      label: string
      icon: string
      event: string
    }
    /** Show compact variant */
    compact?: boolean
    /** Card variant: 'list' for list items, 'card' for standalone */
    variant?: 'list' | 'card'
  }>(),
  {
    primaryAction: () => ({
      label: 'Request',
      icon: 'i-lucide-pen-tool',
      event: 'request',
    }),
    compact: false,
    variant: 'list',
  },
)

const emit = defineEmits<{
  request: []
  addToWallet: []
  saveContact: []
  viewDetails: []
  [key: string]: any
}>()

const contactsStore = useContactsStore()
const { formatXPI } = useAmount()

// Check if already a contact
const isContact = computed(() =>
  contactsStore.contacts.some(c => c.peerId === props.signer.peerId),
)

// Normalize public key field
const publicKey = computed(
  () => props.signer.publicKeyHex || props.signer.publicKey || '',
)

// Online status
const isOnline = computed(() => props.signer.isOnline ?? true)

// Transaction type labels
const txTypeLabels = computed(() => {
  if (props.signer.capabilities) {
    return Object.entries(props.signer.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => formatTxType(type))
  }
  if (props.signer.transactionTypes) {
    return props.signer.transactionTypes.map(formatTxType)
  }
  return []
})

function formatTxType(type: string): string {
  const labels: Record<string, string> = {
    spend: 'Spend',
    swap: 'Swap',
    coinjoin: 'CoinJoin',
    custody: 'Custody',
    escrow: 'Escrow',
    channel: 'Channel',
  }
  return labels[type.toLowerCase()] || type
}

// Fee display
const feeDisplay = computed(() => {
  if (!props.signer.fee) return 'Free'
  const fee =
    typeof props.signer.fee === 'string'
      ? BigInt(props.signer.fee)
      : BigInt(props.signer.fee)
  return formatXPI(fee)
})

// Avatar initials (like ContactCard)
const initials = computed(() => {
  if (!props.signer.nickname) return null
  const parts = props.signer.nickname.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.signer.nickname.slice(0, 2).toUpperCase()
})

function handlePrimaryAction() {
  emit(props.primaryAction.event as any)
}
</script>

<template>
  <div
    :class="[
      'transition-colors',
      variant === 'card'
        ? 'p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary'
        : 'px-4 py-4 hover:bg-muted/50',
    ]"
  >
    <div class="flex items-start gap-3">
      <!-- Avatar with Online Indicator -->
      <div class="relative flex-shrink-0">
        <div
          :class="[
            'rounded-full flex items-center justify-center',
            compact ? 'w-10 h-10' : 'w-12 h-12',
            'bg-primary-100 dark:bg-primary-900/30',
            isOnline ? 'ring-2 ring-success-500' : '',
          ]"
        >
          <span v-if="initials" class="font-semibold text-primary">
            {{ initials }}
          </span>
          <UIcon
            v-else
            name="i-lucide-user"
            :class="compact ? 'w-5 h-5' : 'w-6 h-6'"
            class="text-primary"
          />
        </div>
        <span
          v-if="isOnline"
          class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success-500 border-2 border-white dark:border-gray-900"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <p class="font-medium">{{ signer.nickname || 'Anonymous' }}</p>
          <UBadge
            v-if="signer.reputation"
            color="warning"
            variant="subtle"
            size="xs"
          >
            ⭐ {{ signer.reputation }}
          </UBadge>
          <UBadge
            :color="isOnline ? 'success' : 'neutral'"
            variant="subtle"
            size="xs"
          >
            {{ isOnline ? 'Online' : 'Offline' }}
          </UBadge>
        </div>

        <div v-if="txTypeLabels.length" class="flex flex-wrap gap-1 mb-2">
          <UBadge
            v-for="type in txTypeLabels"
            :key="type"
            color="neutral"
            variant="outline"
            size="xs"
          >
            {{ type }}
          </UBadge>
        </div>

        <p class="text-sm text-muted">
          Fee: {{ feeDisplay }}
          <span v-if="signer.responseTime">
            • Avg response: {{ signer.responseTime }}s
          </span>
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <UButton
          v-if="!isContact"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-user-plus"
          title="Save as contact"
          @click="emit('saveContact')"
        />
        <UButton
          color="primary"
          size="sm"
          :icon="primaryAction.icon"
          @click="handlePrimaryAction"
        >
          {{ primaryAction.label }}
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-chevron-right"
          title="View details"
          @click="emit('viewDetails')"
        />
      </div>
    </div>
  </div>
</template>
```

---

### Task 5.2: Update P2P SignerList

**File**: `components/p2p/SignerList.vue`

**Before**:

```vue
<P2pSignerCard
  :signer="signer"
  @request-sign="handleRequestSign(signer)"
  @save-contact="handleSaveContact(signer)"
  @view-details="handleViewDetails(signer)"
/>
```

**After**:

```vue
<CommonSignerCard
  :signer="signer"
  :primary-action="{
    label: 'Request',
    icon: 'i-lucide-pen-tool',
    event: 'request',
  }"
  variant="list"
  @request="handleRequestSign(signer)"
  @save-contact="handleSaveContact(signer)"
  @view-details="handleViewDetails(signer)"
/>
```

---

### Task 5.3: Update AvailableSigners

**File**: `components/shared-wallets/AvailableSigners.vue`

**Before**:

```vue
<SharedWalletsSignerCard
  :signer="signer"
  @add-to-wallet="handleAddToWallet(signer)"
  @save-contact="handleSaveContact(signer)"
  @view-details="handleViewDetails(signer)"
/>
```

**After**:

```vue
<CommonSignerCard
  :signer="signer"
  :primary-action="{
    label: 'Add',
    icon: 'i-lucide-plus',
    event: 'addToWallet',
  }"
  variant="card"
  @add-to-wallet="handleAddToWallet(signer)"
  @save-contact="handleSaveContact(signer)"
  @view-details="handleViewDetails(signer)"
/>
```

---

### Task 5.4: Delete Duplicate Components

After updating all usages:

1. Delete `components/p2p/SignerCard.vue`
2. Delete `components/shared-wallets/SignerCard.vue`

---

### Task 5.5: Create Unified SignerDetailModal

**File**: `components/common/SignerDetailModal.vue`

```vue
<script setup lang="ts">
/**
 * CommonSignerDetailModal
 *
 * Unified modal for viewing signer details.
 * Used by both P2P and Shared Wallets contexts.
 */

interface SignerData {
  id: string
  peerId: string
  publicKey?: string
  publicKeyHex?: string
  nickname?: string
  reputation?: number
  isOnline?: boolean
  responseTime?: number
  capabilities?: Record<string, boolean>
  transactionTypes?: string[]
  fee?: number | string
  walletAddress?: string
  discoveredAt?: number
  lastSeen?: number
}

const props = defineProps<{
  signer: SignerData | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'request': []
  'addToWallet': []
  'saveContact': []
}>()

const { formatXPI } = useAmount()
const contactsStore = useContactsStore()

const isContact = computed(() =>
  props.signer
    ? contactsStore.contacts.some(c => c.peerId === props.signer?.peerId)
    : false,
)

const publicKey = computed(
  () => props.signer?.publicKeyHex || props.signer?.publicKey || '',
)

function close() {
  emit('update:open', false)
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-user" class="w-5 h-5 text-primary" />
        <span>Signer Details</span>
      </div>
    </template>

    <div v-if="signer" class="p-4 space-y-4">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <div
          class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
        >
          <UIcon name="i-lucide-user" class="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">
            {{ signer.nickname || 'Anonymous' }}
          </h3>
          <p class="text-sm text-muted">
            {{ signer.isOnline ? 'Online' : 'Offline' }}
          </p>
        </div>
      </div>

      <!-- Details -->
      <div class="space-y-3">
        <div v-if="signer.walletAddress">
          <p class="text-sm text-muted">Wallet Address</p>
          <p class="font-mono text-sm break-all">{{ signer.walletAddress }}</p>
        </div>

        <div v-if="publicKey">
          <p class="text-sm text-muted">Public Key</p>
          <p class="font-mono text-xs break-all">{{ publicKey }}</p>
        </div>

        <div v-if="signer.peerId">
          <p class="text-sm text-muted">Peer ID</p>
          <p class="font-mono text-xs break-all">{{ signer.peerId }}</p>
        </div>

        <div class="flex gap-4">
          <div v-if="signer.fee !== undefined">
            <p class="text-sm text-muted">Fee</p>
            <p>{{ signer.fee ? formatXPI(BigInt(signer.fee)) : 'Free' }}</p>
          </div>
          <div v-if="signer.responseTime">
            <p class="text-sm text-muted">Avg Response</p>
            <p>{{ signer.responseTime }}s</p>
          </div>
          <div v-if="signer.reputation">
            <p class="text-sm text-muted">Reputation</p>
            <p>⭐ {{ signer.reputation }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between gap-2">
        <UButton color="neutral" variant="ghost" @click="close">
          Close
        </UButton>
        <div class="flex gap-2">
          <UButton
            v-if="!isContact"
            color="neutral"
            variant="outline"
            icon="i-lucide-user-plus"
            @click="emit('saveContact')"
          >
            Save Contact
          </UButton>
          <slot name="primary-action" />
        </div>
      </div>
    </template>
  </UModal>
</template>
```

---

### Task 5.6: Align P2P HeroCard Styling

**File**: `components/p2p/HeroCard.vue`

The P2P HeroCard has complex state (connection status, peer count, DHT status) that justifies keeping it as a domain-specific component. However, ensure styling aligns with `UiAppHeroCard`:

**Verification Checklist**:

- [ ] Uses same base gradient: `bg-gradient-to-br from-primary-500 to-primary-700`
- [ ] Uses same padding: `p-6`
- [ ] Uses same border radius: `rounded-xl`
- [ ] Uses same text color: `text-white`
- [ ] Document as intentional domain-specific extension

---

## Verification Checklist

### Task 5.1: Unified SignerCard

- [ ] `components/common/SignerCard.vue` created
- [ ] Props interface handles both signer formats
- [ ] Primary action is configurable via props
- [ ] Avatar shows initials when nickname available
- [ ] Online indicator consistent with ContactCard
- [ ] No TypeScript errors

### Task 5.2-5.3: Usage Updates

- [ ] `components/p2p/SignerList.vue` uses `CommonSignerCard`
- [ ] `components/shared-wallets/AvailableSigners.vue` uses `CommonSignerCard`
- [ ] All events properly connected
- [ ] Visual appearance matches original

### Task 5.4: Cleanup

- [ ] `components/p2p/SignerCard.vue` deleted
- [ ] `components/shared-wallets/SignerCard.vue` deleted
- [ ] No broken imports

### Task 5.5: SignerDetailModal

- [ ] `components/common/SignerDetailModal.vue` created
- [ ] Old modal components updated or deleted
- [ ] All usages updated

### Task 5.6: HeroCard

- [ ] Styling aligned with `UiAppHeroCard`
- [ ] Documented as domain-specific extension

---

## Files Summary

| File                                             | Change | Lines Changed |
| ------------------------------------------------ | ------ | ------------- |
| `components/common/SignerCard.vue`               | CREATE | ~200 lines    |
| `components/common/SignerDetailModal.vue`        | CREATE | ~120 lines    |
| `components/p2p/SignerList.vue`                  | MODIFY | ~10 lines     |
| `components/shared-wallets/AvailableSigners.vue` | MODIFY | ~10 lines     |
| `components/p2p/SignerCard.vue`                  | DELETE | -114 lines    |
| `components/shared-wallets/SignerCard.vue`       | DELETE | -105 lines    |
| `components/p2p/HeroCard.vue`                    | MODIFY | ~5 lines      |

---

## Rollback Plan

If issues arise:

1. Restore deleted components from git
2. Revert import changes
3. Document specific issues for resolution

---

## Success Criteria

- [ ] Zero duplicate components for same functionality
- [ ] Single source of truth for shared components
- [ ] No visual regressions
- [ ] All P2P page functionality works
- [ ] All Shared Wallets page functionality works

---

_Phase 5 of Post-Refactor Remediation Plan_
