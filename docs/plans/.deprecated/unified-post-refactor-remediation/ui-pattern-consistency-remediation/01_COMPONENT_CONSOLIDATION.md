# Phase 1: Component Consolidation

**Priority**: P0  
**Effort**: 1-2 days  
**Dependencies**: None

---

## Overview

This phase eliminates duplicate components and establishes shared base components for the P2P/MuSig2/Shared Contacts UI areas.

---

## Task 1.1: Create Unified SignerCard

### Current State

Two nearly identical `SignerCard` components exist:

**`components/p2p/SignerCard.vue`** (114 lines):

```typescript
const props = defineProps<{
  signer: {
    id: string
    peerId: string
    publicKeyHex: string
    nickname?: string
    reputation?: number
    transactionTypes: string[]
    fee?: number | string
    responseTime?: number
    amountRange?: { min?: number; max?: number }
  }
}>()

const emit = defineEmits<{
  requestSign: []
  saveContact: []
  viewDetails: []
}>()
```

**`components/shared-wallets/SignerCard.vue`** (105 lines):

```typescript
const props = defineProps<{
  signer: StoreSigner
}>()

const emit = defineEmits<{
  addToWallet: []
  saveContact: []
  viewDetails: []
}>()
```

### Differences

| Aspect               | P2P SignerCard                | Shared Wallets SignerCard       |
| -------------------- | ----------------------------- | ------------------------------- |
| **Signer Type**      | Inline type definition        | `StoreSigner` from store        |
| **Primary Action**   | "Request" (requestSign)       | "Add" (addToWallet)             |
| **Styling**          | `px-4 py-4 hover:bg-muted/50` | Card with border and rounded-lg |
| **Online Indicator** | Always shows "Online" badge   | Conditional based on `isOnline` |

### Target Implementation

Create `components/common/SignerCard.vue`:

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
  publicKey?: string // publicKeyHex from StoreSigner
  publicKeyHex?: string // Alternative field name
  nickname?: string
  reputation?: number
  isOnline?: boolean
  responseTime?: number
  capabilities?: Record<string, boolean>
  transactionTypes?: string[] // Legacy format
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
  [key: string]: any // Allow custom events
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

// Transaction type labels - handle both formats
const txTypeLabels = computed(() => {
  // Handle capabilities object format
  if (props.signer.capabilities) {
    return Object.entries(props.signer.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => formatTxType(type))
  }
  // Handle transactionTypes array format
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

// Handle primary action click
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
          <!-- Show initials if available, otherwise icon -->
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

### Migration Steps

1. Create `components/common/SignerCard.vue` with unified implementation
2. Update `components/p2p/SignerList.vue`:

   ```vue
   <!-- Before -->
   <P2pSignerCard :signer="signer" @request-sign="..." />

   <!-- After -->
   <CommonSignerCard
     :signer="signer"
     :primary-action="{
       label: 'Request',
       icon: 'i-lucide-pen-tool',
       event: 'request',
     }"
     @request="..."
   />
   ```

3. Update `components/shared-wallets/AvailableSigners.vue`:

   ```vue
   <!-- Before -->
   <SharedWalletsSignerCard :signer="signer" @add-to-wallet="..." />

   <!-- After -->
   <CommonSignerCard
     :signer="signer"
     :primary-action="{
       label: 'Add',
       icon: 'i-lucide-plus',
       event: 'addToWallet',
     }"
     variant="card"
     @add-to-wallet="..."
   />
   ```

4. Delete `components/p2p/SignerCard.vue`
5. Delete `components/shared-wallets/SignerCard.vue`

---

## Task 1.2: Refactor P2P HeroCard

### Current State

`components/p2p/HeroCard.vue` uses custom div styling:

```vue
<template>
  <div
    class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white"
  >
    <!-- Custom implementation -->
  </div>
</template>
```

### Established Pattern

`components/ui/AppHeroCard.vue`:

```vue
<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white"
  >
    <!-- Standardized structure -->
  </div>
</template>
```

### Target Implementation

The P2P HeroCard has more complex state (connection status, peer count, DHT status) than the generic `UiAppHeroCard`. Two options:

**Option A**: Extend `UiAppHeroCard` with slots
**Option B**: Keep P2P-specific component but align styling

**Recommendation**: Option B - Keep domain-specific component but ensure styling matches.

Update `components/p2p/HeroCard.vue` to:

1. Use same base classes as `UiAppHeroCard`
2. Ensure consistent spacing and typography
3. Document as intentional domain-specific extension

---

## Task 1.3: Consolidate SignerDetailModal

### Current State

Two similar detail modals:

- `components/p2p/SignerDetailModal.vue`
- `components/shared-wallets/SignerDetailModal.vue`

### Target Implementation

Create `components/common/SignerDetailModal.vue` with configurable actions, similar to the SignerCard consolidation.

---

## Verification Checklist

### Task 1.1: Unified SignerCard

- [ ] `components/common/SignerCard.vue` created
- [ ] Props interface handles both signer formats
- [ ] Primary action is configurable
- [ ] Avatar shows initials when nickname available
- [ ] Online indicator consistent with ContactCard
- [ ] `components/p2p/SignerList.vue` updated
- [ ] `components/shared-wallets/AvailableSigners.vue` updated
- [ ] Old SignerCard components deleted
- [ ] No TypeScript errors
- [ ] Visual appearance matches original

### Task 1.2: P2P HeroCard

- [ ] Styling aligned with `UiAppHeroCard`
- [ ] Consistent spacing and typography
- [ ] Domain-specific features preserved
- [ ] Documented as intentional extension

### Task 1.3: SignerDetailModal

- [ ] `components/common/SignerDetailModal.vue` created
- [ ] Old modal components deleted
- [ ] All usages updated

---

## Rollback Plan

If issues arise:

1. Restore deleted components from git
2. Revert import changes
3. Document specific issues for resolution

---

_Phase 1 of UI Pattern Consistency Remediation_
