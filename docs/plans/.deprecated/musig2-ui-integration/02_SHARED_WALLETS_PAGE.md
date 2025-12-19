# 02: Shared Wallets Page

## Overview

This document details the main shared wallets list page (`/people/shared-wallets`). This page serves as the central hub for managing all multi-signature wallets.

---

## Page Design

### Target Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Shared Wallets                              [+ Create Shared Wallet]    │
│  Multi-signature wallets you share with contacts                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👥 Family Treasury                                    2-of-2         │   │
│  │ Balance: 10,000.00 XPI                                              │   │
│  │ You + Alice                                          ● Both online   │   │
│  │                                                                      │   │
│  │ [View]  [Fund]  [Spend]                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👥 Business Fund                                      3-of-3         │   │
│  │ Balance: 50,000.00 XPI                                              │   │
│  │ You + Bob + Carol                                    ○ 1 offline     │   │
│  │                                                                      │   │
│  │ [View]  [Fund]  [Spend]                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Total Shared Balance: 60,000.00 XPI                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Shared Wallets                              [+ Create Shared Wallet]    │
│  Multi-signature wallets you share with contacts                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌─────────────────┐                               │
│                           │       👥        │                               │
│                           │                 │                               │
│                           └─────────────────┘                               │
│                                                                             │
│                      No Shared Wallets Yet                                  │
│                                                                             │
│           Create a shared wallet to collaborate with                        │
│           contacts on multi-signature transactions.                         │
│                                                                             │
│                    [Create Your First Shared Wallet]                        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  💡 What is a Shared Wallet?                                                │
│                                                                             │
│  A shared wallet (MuSig2) requires all participants to sign                 │
│  every transaction. This provides:                                          │
│                                                                             │
│  • 🔒 Enhanced security - No single point of failure                        │
│  • 🤝 Collaborative control - Joint custody of funds                        │
│  • 📜 Accountability - All parties must agree to spend                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Page Implementation

### File: `pages/people/shared-wallets/index.vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

definePageMeta({
  layout: 'default',
})

const musig2Store = useMuSig2Store()
const { formatXPI } = useAmount()

// State
const showCreateModal = ref(false)
const showFundModal = ref(false)
const showSpendModal = ref(false)
const selectedWallet = ref<SharedWallet | null>(null)
const loading = ref(false)

// Computed
const hasWallets = computed(() => musig2Store.sharedWallets.length > 0)
const totalBalance = computed(() => musig2Store.totalSharedBalance)

// Actions
async function refreshBalances() {
  loading.value = true
  try {
    await musig2Store.refreshSharedWalletBalances()
  } finally {
    loading.value = false
  }
}

function openFundModal(wallet: SharedWallet) {
  selectedWallet.value = wallet
  showFundModal.value = true
}

function openSpendModal(wallet: SharedWallet) {
  selectedWallet.value = wallet
  showSpendModal.value = true
}

function viewWalletDetail(wallet: SharedWallet) {
  navigateTo(`/people/shared-wallets/${wallet.id}`)
}

// Initialize
onMounted(() => {
  if (musig2Store.initialized) {
    refreshBalances()
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 p-4">
    <!-- Breadcrumbs -->
    <Musig2Breadcrumbs />

    <!-- Hero Card -->
    <AppHeroCard
      icon="i-lucide-shield"
      title="Shared Wallets"
      subtitle="Multi-signature wallets you share with contacts"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-lucide-plus"
          @click="showCreateModal = true"
        >
          Create Shared Wallet
        </UButton>
      </template>
    </AppHeroCard>

    <!-- Loading State -->
    <div v-if="musig2Store.loading" class="flex justify-center py-12">
      <UIcon
        name="i-lucide-loader-2"
        class="w-8 h-8 animate-spin text-primary"
      />
    </div>

    <!-- Wallet List -->
    <template v-else-if="hasWallets">
      <!-- Refresh Button -->
      <div class="flex justify-end">
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="refreshBalances"
        >
          Refresh Balances
        </UButton>
      </div>

      <!-- Wallet Cards -->
      <div class="space-y-4">
        <Musig2SharedWalletCard
          v-for="wallet in musig2Store.sharedWallets"
          :key="wallet.id"
          :wallet="wallet"
          @view="viewWalletDetail(wallet)"
          @fund="openFundModal(wallet)"
          @spend="openSpendModal(wallet)"
        />
      </div>

      <!-- Total Balance -->
      <UCard>
        <div class="flex justify-between items-center">
          <span class="text-muted">Total Shared Balance</span>
          <span class="text-2xl font-bold">{{ formatXPI(totalBalance) }}</span>
        </div>
      </UCard>
    </template>

    <!-- Empty State -->
    <template v-else>
      <AppEmptyState
        icon="i-lucide-shield"
        title="No Shared Wallets Yet"
        description="Create a shared wallet to collaborate with contacts on multi-signature transactions."
      >
        <template #action>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="showCreateModal = true"
          >
            Create Your First Shared Wallet
          </UButton>
        </template>
      </AppEmptyState>

      <!-- Educational Content -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-lightbulb" class="w-5 h-5 text-warning" />
            <span class="font-semibold">What is a Shared Wallet?</span>
          </div>
        </template>

        <p class="text-muted mb-4">
          A shared wallet (MuSig2) requires all participants to sign every
          transaction. This provides:
        </p>

        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-lock" class="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p class="font-medium">Enhanced Security</p>
              <p class="text-sm text-muted">No single point of failure</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-handshake"
              class="w-5 h-5 text-primary mt-0.5"
            />
            <div>
              <p class="font-medium">Collaborative Control</p>
              <p class="text-sm text-muted">Joint custody of funds</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-file-check"
              class="w-5 h-5 text-primary mt-0.5"
            />
            <div>
              <p class="font-medium">Accountability</p>
              <p class="text-sm text-muted">All parties must agree to spend</p>
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <!-- Modals -->
    <Musig2CreateSharedWalletModal
      v-model:open="showCreateModal"
      @created="refreshBalances"
    />

    <Musig2FundWalletModal
      v-model:open="showFundModal"
      :wallet="selectedWallet"
      @funded="refreshBalances"
    />

    <Musig2ProposeSpendModal
      v-model:open="showSpendModal"
      :wallet="selectedWallet"
    />
  </div>
</template>
```

---

## SharedWalletCard Component Update

The existing `SharedWalletCard.vue` needs updates to match the design.

### File: `components/musig2/SharedWalletCard.vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet
  compact?: boolean
}>()

const emit = defineEmits<{
  view: []
  fund: []
  spend: []
}>()

const { formatXPI } = useAmount()
const p2pStore = useP2PStore()

// Compute participant status
const participantCount = computed(() => props.wallet.participants.length)
const threshold = computed(() => participantCount.value) // n-of-n for MuSig2

// Check online status of participants
const onlineParticipants = computed(() => {
  return props.wallet.participants.filter(p => {
    if (p.isMe) return true
    // Check P2P presence for peer
    return p.peerId && p2pStore.isPeerOnline(p.peerId)
  }).length
})

const allOnline = computed(
  () => onlineParticipants.value === participantCount.value,
)

// Format participant names
const participantNames = computed(() => {
  const names = props.wallet.participants.map(p =>
    p.isMe ? 'You' : p.nickname || 'Unknown',
  )
  if (names.length <= 3) {
    return names.join(' + ')
  }
  return `${names.slice(0, 2).join(' + ')} + ${names.length - 2} more`
})

// Balance as bigint
const balance = computed(() => BigInt(props.wallet.balanceSats || '0'))
const hasBalance = computed(() => balance.value > 0n)
</script>

<template>
  <UCard
    class="hover:bg-muted/50 transition-colors cursor-pointer"
    @click="emit('view')"
  >
    <div class="flex items-start gap-4">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        :class="
          hasBalance ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-muted'
        "
      >
        <UIcon
          name="i-lucide-shield"
          class="w-6 h-6"
          :class="hasBalance ? 'text-primary' : 'text-muted'"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium truncate">{{ wallet.name }}</p>
          <UBadge color="primary" variant="subtle" size="xs">
            {{ threshold }}-of-{{ participantCount }}
          </UBadge>
        </div>

        <p class="text-2xl font-bold mb-1">
          {{ formatXPI(balance) }}
        </p>

        <div class="flex items-center gap-2 text-sm text-muted">
          <span class="truncate">{{ participantNames }}</span>
          <span>•</span>
          <span class="flex items-center gap-1">
            <span
              class="w-2 h-2 rounded-full"
              :class="allOnline ? 'bg-green-500' : 'bg-yellow-500'"
            />
            {{
              allOnline
                ? 'All online'
                : `${onlineParticipants}/${participantCount} online`
            }}
          </span>
        </div>
      </div>

      <!-- Actions (hidden in compact mode) -->
      <div v-if="!compact" class="flex flex-col gap-1 flex-shrink-0">
        <UButton
          color="primary"
          size="sm"
          icon="i-lucide-eye"
          variant="ghost"
          @click.stop="emit('view')"
        >
          View
        </UButton>
        <UButton
          color="primary"
          size="sm"
          icon="i-lucide-plus"
          @click.stop="emit('fund')"
        >
          Fund
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-send"
          :disabled="!hasBalance"
          @click.stop="emit('spend')"
        >
          Spend
        </UButton>
      </div>
    </div>

    <!-- Description (if exists and not compact) -->
    <p
      v-if="wallet.description && !compact"
      class="text-sm text-muted mt-3 pt-3 border-t"
    >
      {{ wallet.description }}
    </p>
  </UCard>
</template>
```

---

## SharedWalletList Component Update

### File: `components/musig2/SharedWalletList.vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

defineProps<{
  wallets: SharedWallet[]
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [wallet: SharedWallet]
  fund: [wallet: SharedWallet]
  spend: [wallet: SharedWallet]
}>()
</script>

<template>
  <div class="space-y-4">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <UCard v-for="i in 3" :key="i">
        <div class="flex items-start gap-4">
          <USkeleton class="w-12 h-12 rounded-lg" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-5 w-1/3" />
            <USkeleton class="h-8 w-1/2" />
            <USkeleton class="h-4 w-2/3" />
          </div>
        </div>
      </UCard>
    </template>

    <!-- Wallet cards -->
    <template v-else>
      <Musig2SharedWalletCard
        v-for="wallet in wallets"
        :key="wallet.id"
        :wallet="wallet"
        @view="emit('select', wallet)"
        @fund="emit('fund', wallet)"
        @spend="emit('spend', wallet)"
      />
    </template>
  </div>
</template>
```

---

## Store Integration

Ensure the MuSig2 store provides the necessary data:

```typescript
// In stores/musig2.ts - Ensure these getters exist

getters: {
  // Total balance across all shared wallets
  totalSharedBalance(): bigint {
    return this.sharedWallets.reduce(
      (sum, w) => sum + BigInt(w.balanceSats || '0'),
      0n,
    )
  },

  // Get wallet by ID
  getWalletById: (state) => (id: string): SharedWallet | undefined => {
    return state.sharedWallets.find(w => w.id === id)
  },
}
```

---

## Implementation Checklist

### Page Structure

- [ ] Create `pages/people/shared-wallets/index.vue`
- [ ] Implement hero card with create button
- [ ] Implement wallet list with cards
- [ ] Implement empty state with educational content
- [ ] Add total balance summary

### Component Updates

- [ ] Update `SharedWalletCard.vue` with online status
- [ ] Update `SharedWalletList.vue` with loading skeleton
- [ ] Create `Musig2Breadcrumbs.vue` component

### Store Integration

- [ ] Verify `totalSharedBalance` getter exists
- [ ] Verify `getWalletById` getter exists
- [ ] Verify `refreshSharedWalletBalances` action works

### Modal Integration

- [ ] Wire up `CreateSharedWalletModal`
- [ ] Wire up `FundWalletModal`
- [ ] Wire up `ProposeSpendModal`

---

## Files to Create/Modify

| File                                     | Action | Description                       |
| ---------------------------------------- | ------ | --------------------------------- |
| `pages/people/shared-wallets/index.vue`  | Create | Main shared wallets page          |
| `components/musig2/SharedWalletCard.vue` | Modify | Add online status, improve layout |
| `components/musig2/SharedWalletList.vue` | Modify | Add loading skeleton              |
| `components/musig2/Breadcrumbs.vue`      | Create | Breadcrumb navigation             |

---

_Next: [03_WALLET_CREATION_FLOW.md](./03_WALLET_CREATION_FLOW.md)_
