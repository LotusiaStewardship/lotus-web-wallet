# Phase 4: Home Page

## Overview

The Home page is the **command center** of the wallet. It answers: **"What do I need to know right now?"**

This phase builds a home screen that provides immediate value—balance, pending actions, online contacts, and recent activity—all in one glance.

**Prerequisites**: Phase 1-3  
**Estimated Effort**: 3-4 days  
**Priority**: P0

---

## Goals

1. Build the balance card with quick actions
2. Create the "Needs Attention" section
3. Add online contacts preview
4. Integrate recent activity preview
5. Handle onboarding for new users

---

## Home Page Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOME PAGE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              BALANCE CARD (Primary Focus)               │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │                                                      ││    │
│  │  │              1,234.56 XPI                           ││    │
│  │  │           ≈ $12.34 USD                              ││    │
│  │  │                                                      ││    │
│  │  │     [Send]    [Receive]    [Scan]                   ││    │
│  │  │                                                      ││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🔔 NEEDS ATTENTION (Conditional - only if items)       │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  • Alice requested your signature          [View]       │    │
│  │  • Backup your wallet                      [Backup]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  👥 ONLINE NOW (Conditional - only if any online)       │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  [Alice 🟢] [Bob 🟢] [Carol 🟢] [+3 more]               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📊 RECENT ACTIVITY                          [View All] │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  ↓ Received 100 XPI from Alice • 2h ago                 │    │
│  │  ↑ Sent 50 XPI to Bob • Yesterday                       │    │
│  │  🔐 Signed tx with Carol • 2 days ago                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🚀 GETTING STARTED (New users only)                    │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  ☑ Create wallet                                        │    │
│  │  ☐ Back up your recovery phrase                         │    │
│  │  ☐ Receive your first XPI                               │    │
│  │  ☐ Add a contact                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Home Page Implementation

```vue
<!-- pages/index.vue -->
<template>
  <div class="space-y-4">
    <!-- Balance Card -->
    <BalanceCard />

    <!-- Needs Attention (if any) -->
    <NeedsAttentionCard v-if="hasAttentionItems" />

    <!-- Online Now (if any online contacts) -->
    <OnlineNowCard v-if="hasOnlineContacts" />

    <!-- Shared Wallets Preview (if any) -->
    <SharedWalletsPreview v-if="hasSharedWallets" />

    <!-- Recent Activity -->
    <RecentActivityCard />

    <!-- Getting Started (new users) -->
    <GettingStartedCard v-if="showGettingStarted" />

    <!-- Network Status (compact) -->
    <NetworkStatusCard variant="compact" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Home',
})

const activityStore = useActivityStore()
const peopleStore = usePeopleStore()
const onboardingStore = useOnboardingStore()

// Initialize stores
onMounted(() => {
  activityStore.initialize()
  peopleStore.initialize()
})

const hasAttentionItems = computed(
  () => activityStore.needsAttention.length > 0 || !onboardingStore.isBackedUp,
)

const hasOnlineContacts = computed(() => peopleStore.onlinePeople.length > 0)

const hasSharedWallets = computed(() => peopleStore.allWallets.length > 0)

const showGettingStarted = computed(() => !onboardingStore.isChecklistComplete)
</script>
```

---

## Balance Card Component

```vue
<!-- components/home/BalanceCard.vue -->
<template>
  <div
    class="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-900 rounded-2xl p-6 text-white shadow-lg"
  >
    <!-- Balance Display -->
    <div class="text-center mb-6">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-primary-100 text-sm">Total Balance</span>
        <button
          class="text-primary-200 hover:text-white transition-colors"
          @click="toggleVisibility"
        >
          <UIcon
            :name="visible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
            class="w-4 h-4"
          />
        </button>
      </div>

      <div class="text-4xl font-bold font-mono tracking-tight">
        <template v-if="visible">
          {{ formattedBalance }}
          <span class="text-xl text-primary-200 ml-1">XPI</span>
        </template>
        <template v-else> •••••••• </template>
      </div>

      <!-- Fiat equivalent (if available) -->
      <p v-if="visible && fiatValue" class="text-primary-200 text-sm mt-1">
        ≈ {{ fiatValue }}
      </p>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-3 gap-3">
      <button
        v-for="action in quickActions"
        :key="action.id"
        class="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        @click="handleAction(action.id)"
      >
        <div
          class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <UIcon :name="action.icon" class="w-5 h-5" />
        </div>
        <span class="text-sm font-medium">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()

const visible = ref(true)

const formattedBalance = computed(() => {
  const xpi = Number(walletStore.balanceSats) / 1_000_000
  return xpi.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
})

const fiatValue = computed(() => {
  // TODO: Implement fiat conversion
  return null
})

const quickActions = [
  { id: 'send', icon: 'i-lucide-send', label: 'Send' },
  { id: 'receive', icon: 'i-lucide-qr-code', label: 'Receive' },
  { id: 'scan', icon: 'i-lucide-scan', label: 'Scan' },
]

function toggleVisibility() {
  visible.value = !visible.value
}

function handleAction(id: string) {
  switch (id) {
    case 'send':
      // Open send modal
      break
    case 'receive':
      // Open receive modal
      break
    case 'scan':
      // Open scanner
      break
  }
}
</script>
```

---

## Needs Attention Card

```vue
<!-- components/home/NeedsAttentionCard.vue -->
<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-warning animate-pulse" />
        <span class="font-semibold">Needs Attention</span>
        <UBadge color="warning" size="xs">{{ items.length }}</UBadge>
      </div>
    </template>

    <div class="space-y-3">
      <!-- Backup Reminder -->
      <div
        v-if="!onboardingStore.isBackedUp"
        class="flex items-center justify-between p-3 rounded-lg bg-warning/10"
      >
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-warning" />
          <div>
            <p class="font-medium">Backup your wallet</p>
            <p class="text-sm text-muted">Secure your recovery phrase</p>
          </div>
        </div>
        <UButton
          size="sm"
          color="warning"
          @click="navigateTo('/settings?backup=true')"
        >
          Backup
        </UButton>
      </div>

      <!-- Signing Requests -->
      <div
        v-for="item in signingRequests"
        :key="item.id"
        class="flex items-center justify-between p-3 rounded-lg bg-primary/5"
      >
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-primary" />
          <div>
            <p class="font-medium">Signature requested</p>
            <p class="text-sm text-muted">{{ item.data.walletName }}</p>
          </div>
        </div>
        <UButton size="sm" @click="handleSigningRequest(item)"> View </UButton>
      </div>

      <!-- Other attention items -->
      <div
        v-for="item in otherItems"
        :key="item.id"
        class="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
      >
        <div class="flex items-center gap-3">
          <UIcon :name="getItemIcon(item)" class="w-5 h-5" />
          <div>
            <p class="font-medium">{{ getItemTitle(item) }}</p>
            <p class="text-sm text-muted">{{ getItemSubtitle(item) }}</p>
          </div>
        </div>
        <UButton size="sm" variant="ghost" @click="handleItem(item)">
          View
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const activityStore = useActivityStore()
const onboardingStore = useOnboardingStore()

const items = computed(() => activityStore.needsAttention)

const signingRequests = computed(() =>
  items.value.filter(item => item.type === 'signing_request'),
)

const otherItems = computed(() =>
  items.value.filter(item => item.type !== 'signing_request'),
)

function getItemIcon(item: ActivityItem): string {
  switch (item.type) {
    case 'signer_discovered':
      return 'i-lucide-user-plus'
    default:
      return 'i-lucide-bell'
  }
}

function getItemTitle(item: ActivityItem): string {
  switch (item.data.type) {
    case 'signer_discovered':
      return 'New signer found'
    default:
      return 'New activity'
  }
}

function getItemSubtitle(item: ActivityItem): string {
  switch (item.data.type) {
    case 'signer_discovered':
      return item.data.nickname || 'Add to contacts'
    default:
      return ''
  }
}

function handleSigningRequest(item: ActivityItem) {
  if (item.data.type === 'signing_request') {
    navigateTo(`/people/wallets/${item.data.walletId}`)
  }
}

function handleItem(item: ActivityItem) {
  activityStore.markAsRead(item.id)
  // Navigate based on type
}
</script>
```

---

## Online Now Card

```vue
<!-- components/home/OnlineNowCard.vue -->
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-success" />
          <span class="font-semibold">Online Now</span>
        </div>
        <NuxtLink
          to="/people?tab=online"
          class="text-sm text-primary hover:underline"
        >
          View All
        </NuxtLink>
      </div>
    </template>

    <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
      <PersonChip
        v-for="person in displayedPeople"
        :key="person.id"
        :person="person"
        @click="navigateTo(`/people/${person.id}`)"
      />

      <button
        v-if="remainingCount > 0"
        class="flex items-center gap-1 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm"
        @click="navigateTo('/people?tab=online')"
      >
        +{{ remainingCount }} more
      </button>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const peopleStore = usePeopleStore()

const MAX_DISPLAY = 5

const displayedPeople = computed(() =>
  peopleStore.onlinePeople.slice(0, MAX_DISPLAY),
)

const remainingCount = computed(() =>
  Math.max(0, peopleStore.onlinePeople.length - MAX_DISPLAY),
)
</script>
```

---

## Shared Wallets Preview

```vue
<!-- components/home/SharedWalletsPreview.vue -->
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
          <span class="font-semibold">Shared Wallets</span>
        </div>
        <NuxtLink
          to="/people/wallets"
          class="text-sm text-primary hover:underline"
        >
          View All
        </NuxtLink>
      </div>
    </template>

    <div class="space-y-3">
      <NuxtLink
        v-for="wallet in displayedWallets"
        :key="wallet.id"
        :to="`/people/wallets/${wallet.id}`"
        class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors -mx-4 px-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="font-medium">{{ wallet.name }}</p>
            <p class="text-xs text-muted">
              {{ wallet.participantIds.length }} participants
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-mono text-sm">{{ formatXPI(wallet.balanceSats) }}</p>
          <p class="text-xs text-muted">XPI</p>
        </div>
      </NuxtLink>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const peopleStore = usePeopleStore()

const MAX_DISPLAY = 3

const displayedWallets = computed(() =>
  peopleStore.allWallets.slice(0, MAX_DISPLAY),
)

function formatXPI(sats: bigint): string {
  const xpi = Number(sats) / 1_000_000
  return xpi.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
</script>
```

---

## Recent Activity Card

```vue
<!-- components/home/RecentActivityCard.vue -->
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-activity" class="w-5 h-5" />
          <span class="font-semibold">Recent Activity</span>
          <UBadge
            v-if="activityStore.unreadCount > 0"
            color="primary"
            size="xs"
          >
            {{ activityStore.unreadCount }} new
          </UBadge>
        </div>
        <NuxtLink to="/activity" class="text-sm text-primary hover:underline">
          View All
        </NuxtLink>
      </div>
    </template>

    <div v-if="recentItems.length > 0" class="space-y-2">
      <ActivityItemCompact
        v-for="item in recentItems"
        :key="item.id"
        :item="item"
        @click="handleItemClick(item)"
      />
    </div>

    <div v-else class="text-center py-6 text-muted">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">No recent activity</p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const activityStore = useActivityStore()

const recentItems = computed(() => activityStore.recentItems)

function handleItemClick(item: ActivityItem) {
  activityStore.markAsRead(item.id)
  navigateTo('/activity')
}
</script>
```

---

## Activity Item Compact Component

```vue
<!-- components/activity/ActivityItemCompact.vue -->
<template>
  <div
    class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
    @click="emit('click')"
  >
    <!-- Icon -->
    <div
      :class="[
        'w-8 h-8 rounded-full flex items-center justify-center',
        iconBgClass,
      ]"
    >
      <UIcon :name="icon" :class="['w-4 h-4', iconClass]" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">{{ title }}</p>
      <p class="text-xs text-muted">{{ formattedTime }}</p>
    </div>

    <!-- Amount (if applicable) -->
    <p v-if="amount" :class="['font-mono text-sm', amountClass]">
      {{ amount }}
    </p>

    <!-- Unread indicator -->
    <div
      v-if="!item.readAt"
      class="w-2 h-2 rounded-full bg-primary flex-shrink-0"
    />
  </div>
</template>

<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const props = defineProps<{
  item: ActivityItem
}>()

const emit = defineEmits<{
  click: []
}>()

// Reuse logic from ActivityItem.vue but with compact display
const icon = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.direction === 'incoming'
        ? 'i-lucide-arrow-down-left'
        : 'i-lucide-arrow-up-right'
    case 'signing_request':
      return 'i-lucide-pen-tool'
    case 'signing_complete':
      return 'i-lucide-check-circle'
    default:
      return 'i-lucide-activity'
  }
})

const iconBgClass = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.direction === 'incoming'
        ? 'bg-success/10'
        : 'bg-error/10'
    case 'signing_request':
      return 'bg-warning/10'
    case 'signing_complete':
      return 'bg-success/10'
    default:
      return 'bg-gray-100 dark:bg-gray-800'
  }
})

const iconClass = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.direction === 'incoming'
        ? 'text-success'
        : 'text-error'
    case 'signing_request':
      return 'text-warning'
    case 'signing_complete':
      return 'text-success'
    default:
      return 'text-gray-500'
  }
})

const title = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.direction === 'incoming' ? 'Received' : 'Sent'
    case 'signing_request':
      return 'Signature requested'
    case 'signing_complete':
      return 'Transaction signed'
    default:
      return 'Activity'
  }
})

const amount = computed(() => {
  if (props.item.data.type === 'transaction') {
    const xpi = Number(props.item.data.amountSats) / 1_000_000
    const sign = props.item.data.direction === 'incoming' ? '+' : '-'
    return `${sign}${xpi.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} XPI`
  }
  return null
})

const amountClass = computed(() => {
  if (props.item.data.type === 'transaction') {
    return props.item.data.direction === 'incoming'
      ? 'text-success'
      : 'text-error'
  }
  return ''
})

const formattedTime = computed(() => {
  const diff = Date.now() - props.item.timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
})
</script>
```

---

## Getting Started Card

```vue
<!-- components/home/GettingStartedCard.vue -->
<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-rocket" class="w-5 h-5 text-primary" />
        <span class="font-semibold">Getting Started</span>
      </div>
    </template>

    <div class="space-y-3">
      <div
        v-for="step in steps"
        :key="step.id"
        :class="[
          'flex items-center gap-3 p-3 rounded-lg transition-colors',
          step.completed ? 'bg-success/5' : 'bg-gray-100 dark:bg-gray-800',
        ]"
      >
        <div
          :class="[
            'w-6 h-6 rounded-full flex items-center justify-center',
            step.completed
              ? 'bg-success text-white'
              : 'bg-gray-300 dark:bg-gray-600',
          ]"
        >
          <UIcon
            :name="step.completed ? 'i-lucide-check' : 'i-lucide-circle'"
            class="w-4 h-4"
          />
        </div>

        <div class="flex-1">
          <p
            :class="[
              'font-medium',
              step.completed && 'line-through text-muted',
            ]"
          >
            {{ step.title }}
          </p>
          <p class="text-xs text-muted">{{ step.description }}</p>
        </div>

        <UButton
          v-if="!step.completed && step.action"
          size="xs"
          @click="step.action"
        >
          {{ step.actionLabel }}
        </UButton>
      </div>
    </div>

    <!-- Dismiss option -->
    <div
      class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-center"
    >
      <UButton variant="ghost" size="xs" @click="dismissChecklist">
        Dismiss checklist
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const onboardingStore = useOnboardingStore()
const walletStore = useWalletStore()
const peopleStore = usePeopleStore()

const steps = computed(() => [
  {
    id: 'create',
    title: 'Create wallet',
    description: 'Your wallet is ready to use',
    completed: walletStore.initialized,
    action: null,
    actionLabel: '',
  },
  {
    id: 'backup',
    title: 'Back up recovery phrase',
    description: 'Secure your wallet with a backup',
    completed: onboardingStore.isBackedUp,
    action: () => navigateTo('/settings?backup=true'),
    actionLabel: 'Backup',
  },
  {
    id: 'receive',
    title: 'Receive your first XPI',
    description: 'Get some Lotus to get started',
    completed: walletStore.balanceSats > 0n,
    action: () => {}, // Open receive modal
    actionLabel: 'Receive',
  },
  {
    id: 'contact',
    title: 'Add a contact',
    description: 'Save people you transact with',
    completed: peopleStore.allPeople.length > 0,
    action: () => navigateTo('/people?add=true'),
    actionLabel: 'Add',
  },
])

function dismissChecklist() {
  onboardingStore.dismissChecklist()
}
</script>
```

---

## Network Status Card

```vue
<!-- components/home/NetworkStatusCard.vue -->
<template>
  <div
    v-if="variant === 'compact'"
    class="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
  >
    <div class="flex items-center gap-2">
      <span
        class="w-2 h-2 rounded-full"
        :class="isConnected ? 'bg-success' : 'bg-error'"
      />
      <span class="text-sm text-muted">
        {{ isConnected ? 'Connected' : 'Offline' }}
      </span>
    </div>

    <div class="flex items-center gap-3 text-xs text-muted">
      <span v-if="blockHeight">Block {{ blockHeight.toLocaleString() }}</span>
      <span v-if="p2pPeerCount">{{ p2pPeerCount }} peers</span>
    </div>
  </div>

  <!-- Full variant for settings page -->
  <UCard v-else>
    <!-- ... full network status display ... -->
  </UCard>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'compact' | 'full'
  }>(),
  {
    variant: 'full',
  },
)

const networkStore = useNetworkStore()
const p2pStore = useP2PStore()

const isConnected = computed(() => networkStore.isConnected)
const blockHeight = computed(() => networkStore.blockHeight)
const p2pPeerCount = computed(() => p2pStore.peerCount)
</script>
```

---

## Tasks Checklist

### Components

- [ ] Create `components/home/BalanceCard.vue`
- [ ] Create `components/home/NeedsAttentionCard.vue`
- [ ] Create `components/home/OnlineNowCard.vue`
- [ ] Create `components/home/SharedWalletsPreview.vue`
- [ ] Create `components/home/RecentActivityCard.vue`
- [ ] Create `components/home/GettingStartedCard.vue`
- [ ] Create `components/home/NetworkStatusCard.vue`
- [ ] Create `components/activity/ActivityItemCompact.vue`

### Page

- [ ] Create `pages/index.vue` with all sections
- [ ] Implement conditional rendering
- [ ] Add pull-to-refresh

### Integration

- [ ] Wire balance from wallet store
- [ ] Wire attention items from activity store
- [ ] Wire online contacts from people store
- [ ] Wire shared wallets from people store
- [ ] Wire onboarding state

### Modals

- [ ] Create Send modal (or reuse existing)
- [ ] Create Receive modal (or reuse existing)
- [ ] Create Scan modal (or reuse existing)

---

## Verification

- [ ] Balance displays correctly
- [ ] Balance visibility toggle works
- [ ] Quick actions open correct modals
- [ ] Needs Attention shows when items exist
- [ ] Online Now shows when contacts are online
- [ ] Shared Wallets preview shows correctly
- [ ] Recent Activity shows latest items
- [ ] Getting Started shows for new users
- [ ] Getting Started can be dismissed
- [ ] Network status displays correctly

---

_Next: [05_ACTION_FLOWS.md](./05_ACTION_FLOWS.md)_
