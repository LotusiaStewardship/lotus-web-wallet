# Phase 3: Wallet Home Page

## Overview

The home page is the first thing users see after onboarding. It should provide a clear overview of their wallet status, quick access to common actions, and a preview of recent activity.

**Priority**: P0 (Critical)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1 (Layout), Phase 2 (Onboarding), existing wallet components

---

## Goals

1. Clear balance display with optional fiat conversion
2. Balance change indicator (24h)
3. Quick action buttons (Send, Receive, Scan, Request)
4. Network status summary (user-friendly)
5. Recent activity preview
6. Backup reminder (if not backed up)

---

## 1. Page Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        WALLET HOME                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Backup Reminder - if not backed up]                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    BALANCE CARD                            │  │
│  │                                                            │  │
│  │              1,234,567.890000 XPI                          │  │
│  │                  ≈ $12.34 USD                              │  │
│  │               ▲ +5.2% (24h)                                │  │
│  │                                                            │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                   │  │
│  │  │ Send │  │Receive│  │ Scan │  │Request│                  │  │
│  │  └──────┘  └──────┘  └──────┘  └──────┘                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  NETWORK STATUS                                            │  │
│  │  ● Connected to Mainnet                                    │  │
│  │  Block: 1,234,567 • 3 peers • Network healthy              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  RECENT ACTIVITY                          [View All →]     │  │
│  │  ─────────────────────────────────────────────────────────│  │
│  │  ↗ Sent to Alice                    -100.00 XPI  2m ago   │  │
│  │  ↙ Received from Bob               +500.00 XPI  1h ago   │  │
│  │  ↗ RANK vote @elonmusk              -10.00 XPI  3h ago   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  GETTING STARTED                          [Dismiss]        │  │
│  │  ─────────────────────────────────────────────────────────│  │
│  │  ☐ Add your first contact                                  │  │
│  │  ☐ Receive your first Lotus                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Page Implementation

### File: `pages/index.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'
import { useNetworkStore } from '~/stores/network'

definePageMeta({
  title: 'Home',
})

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const networkStore = useNetworkStore()

// Quick actions
const quickActions = [
  {
    label: 'Send',
    icon: 'i-lucide-send',
    to: '/transact/send',
    color: 'primary',
  },
  {
    label: 'Receive',
    icon: 'i-lucide-qr-code',
    to: '/transact/receive',
    color: 'success',
  },
  {
    label: 'Scan',
    icon: 'i-lucide-scan',
    to: '/transact/send?scan=true',
    color: 'info',
  },
  {
    label: 'Request',
    icon: 'i-lucide-hand-coins',
    to: '/transact/receive?request=true',
    color: 'warning',
  },
]

// Recent transactions (limit to 5)
const recentTransactions = computed(() => walletStore.transactions.slice(0, 5))

// Show getting started if checklist not complete
const showGettingStarted = computed(() => {
  const { completed, total } = onboardingStore.checklistProgress
  return completed < total
})
</script>

<template>
  <div class="space-y-6">
    <!-- Backup Reminder -->
    <BackupReminder />

    <!-- Balance Card -->
    <BalanceCard :quick-actions="quickActions" />

    <!-- Network Status -->
    <NetworkStatusCard />

    <!-- Recent Activity -->
    <AppCard title="Recent Activity" icon="i-lucide-activity">
      <template #action>
        <NuxtLink
          to="/transact/history"
          class="text-sm text-primary hover:underline"
        >
          View All →
        </NuxtLink>
      </template>

      <div
        v-if="recentTransactions.length > 0"
        class="divide-y divide-gray-200 dark:divide-gray-700"
      >
        <TransactionItem
          v-for="tx in recentTransactions"
          :key="tx.txid"
          :transaction="tx"
          compact
        />
      </div>

      <AppEmptyState
        v-else
        icon="i-lucide-inbox"
        title="No transactions yet"
        description="Your transaction history will appear here"
      >
        <template #action>
          <UButton color="primary" to="/transact/receive">
            Receive Your First Lotus
          </UButton>
        </template>
      </AppEmptyState>
    </AppCard>

    <!-- Getting Started Checklist (if incomplete) -->
    <GettingStartedCard v-if="showGettingStarted" />
  </div>
</template>
```

---

## 3. Balance Card Component

### File: `components/wallet/BalanceCard.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useSettingsStore } from '~/stores/settings'

defineProps<{
  quickActions: Array<{
    label: string
    icon: string
    to: string
    color: string
  }>
}>()

const walletStore = useWalletStore()
const settingsStore = useSettingsStore()

// Balance visibility toggle
const balanceVisible = ref(true)

// Fiat conversion (placeholder - would need price feed)
const fiatBalance = computed(() => {
  if (!settingsStore.showFiatBalance) return null
  // TODO: Implement actual price conversion
  const price = 0.00001 // Placeholder price per XPI
  const fiat = (walletStore.balanceSats / 1e6) * price
  return fiat.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
})

// 24h change (placeholder - would need historical data)
const balanceChange = computed(() => {
  // TODO: Implement actual 24h change calculation
  return { percent: 5.2, positive: true }
})

// Pending balance
const hasPending = computed(() => walletStore.pendingBalance > 0)
</script>

<template>
  <div
    class="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-900 rounded-2xl p-6 text-white shadow-lg"
  >
    <!-- Balance Section -->
    <div class="text-center mb-6">
      <!-- Label -->
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-primary-100 text-sm">Total Balance</span>
        <button
          class="text-primary-200 hover:text-white transition-colors"
          @click="balanceVisible = !balanceVisible"
        >
          <UIcon
            :name="balanceVisible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
            class="w-4 h-4"
          />
        </button>
      </div>

      <!-- Main Balance -->
      <div class="text-4xl md:text-5xl font-bold font-mono mb-1">
        <template v-if="balanceVisible">
          {{ walletStore.formattedBalance }}
          <span class="text-2xl text-primary-200">XPI</span>
        </template>
        <template v-else> •••••••• </template>
      </div>

      <!-- Fiat Equivalent -->
      <div
        v-if="fiatBalance && balanceVisible"
        class="text-primary-200 text-lg"
      >
        ≈ {{ fiatBalance }}
      </div>

      <!-- 24h Change -->
      <div
        v-if="balanceChange && balanceVisible"
        class="flex items-center justify-center gap-1 mt-2"
        :class="balanceChange.positive ? 'text-green-300' : 'text-red-300'"
      >
        <UIcon
          :name="
            balanceChange.positive
              ? 'i-lucide-trending-up'
              : 'i-lucide-trending-down'
          "
          class="w-4 h-4"
        />
        <span class="text-sm font-medium">
          {{ balanceChange.positive ? '+' : '' }}{{ balanceChange.percent }}%
          (24h)
        </span>
      </div>

      <!-- Pending Balance -->
      <div
        v-if="hasPending && balanceVisible"
        class="mt-2 text-sm text-primary-200"
      >
        <UIcon name="i-lucide-clock" class="w-3 h-3 inline mr-1" />
        {{ walletStore.formattedPendingBalance }} XPI pending
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-4 gap-2">
      <NuxtLink
        v-for="action in quickActions"
        :key="action.label"
        :to="action.to"
        class="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
      >
        <div
          class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <UIcon :name="action.icon" class="w-5 h-5" />
        </div>
        <span class="text-xs font-medium">{{ action.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
```

---

## 4. Network Status Card

### File: `components/wallet/NetworkStatusCard.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'
import { useP2PStore } from '~/stores/p2p'

const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const p2pStore = useP2PStore()

// Connection status
const isConnected = computed(() => walletStore.connected)

// Network health (simplified for users)
const networkHealth = computed(() => {
  if (!isConnected.value) return 'offline'
  // Could add more sophisticated health checks
  return 'healthy'
})

const healthColor = computed(() => {
  switch (networkHealth.value) {
    case 'healthy':
      return 'success'
    case 'degraded':
      return 'warning'
    default:
      return 'error'
  }
})

const healthLabel = computed(() => {
  switch (networkHealth.value) {
    case 'healthy':
      return 'Network healthy'
    case 'degraded':
      return 'Network degraded'
    default:
      return 'Offline'
  }
})

// Stats (user-friendly labels)
const stats = computed(() => [
  {
    label: 'Block',
    value: walletStore.blockHeight?.toLocaleString() || '—',
    icon: 'i-lucide-box',
  },
  {
    label: 'Peers',
    value: p2pStore.connectedPeers.length.toString(),
    icon: 'i-lucide-users',
  },
  {
    label: 'Status',
    value: healthLabel.value,
    icon: 'i-lucide-activity',
    color: healthColor.value,
  },
])
</script>

<template>
  <AppCard>
    <div class="flex items-center justify-between">
      <!-- Connection Status -->
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="{
            'bg-green-100 dark:bg-green-900/30': isConnected,
            'bg-red-100 dark:bg-red-900/30': !isConnected,
          }"
        >
          <span class="relative flex h-3 w-3">
            <span
              v-if="isConnected"
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
            />
            <span
              class="relative inline-flex rounded-full h-3 w-3"
              :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
            />
          </span>
        </div>
        <div>
          <div class="font-medium">
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </div>
          <div class="text-sm text-gray-500">
            {{ networkStore.displayName }}
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="flex items-center gap-6">
        <div v-for="stat in stats" :key="stat.label" class="text-center">
          <div class="text-xs text-gray-500 mb-1">{{ stat.label }}</div>
          <div
            class="font-mono font-medium text-sm"
            :class="
              stat.color
                ? `text-${stat.color}-600 dark:text-${stat.color}-400`
                : ''
            "
          >
            {{ stat.value }}
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>
```

---

## 5. Transaction Item Component

### File: `components/history/TransactionItem.vue`

```vue
<script setup lang="ts">
import type { ParsedTransaction } from '~/types/transaction'
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  transaction: ParsedTransaction
  compact?: boolean
}>()

const contactsStore = useContactsStore()

// Determine transaction type and styling
const txType = computed(() => {
  switch (props.transaction.type) {
    case 'send':
      return {
        icon: 'i-lucide-arrow-up-right',
        color: 'text-red-500',
        label: 'Sent',
      }
    case 'receive':
      return {
        icon: 'i-lucide-arrow-down-left',
        color: 'text-green-500',
        label: 'Received',
      }
    case 'rank_upvote':
      return {
        icon: 'i-lucide-thumbs-up',
        color: 'text-blue-500',
        label: 'Upvote',
      }
    case 'rank_downvote':
      return {
        icon: 'i-lucide-thumbs-down',
        color: 'text-orange-500',
        label: 'Downvote',
      }
    default:
      return {
        icon: 'i-lucide-circle',
        color: 'text-gray-500',
        label: 'Transaction',
      }
  }
})

// Get contact name if available
const contactName = computed(() => {
  const address =
    props.transaction.type === 'send'
      ? props.transaction.toAddress
      : props.transaction.fromAddress
  if (!address) return null
  const contact = contactsStore.getContactByAddress(address)
  return contact?.name
})

// Format amount with sign
const formattedAmount = computed(() => {
  const amount = props.transaction.amount / 1e6 // Convert from sats
  const sign = props.transaction.type === 'receive' ? '+' : '-'
  return `${sign}${amount.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })}`
})

// Relative time
const timeAgo = computed(() => {
  const date = new Date(props.transaction.timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
})
</script>

<template>
  <NuxtLink
    :to="`/explore/explorer/tx/${transaction.txid}`"
    class="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    :class="{ 'px-4 -mx-4': !compact }"
  >
    <!-- Icon -->
    <div
      class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      :class="`bg-${txType.color.replace('text-', '')}/10`"
    >
      <UIcon :name="txType.icon" class="w-5 h-5" :class="txType.color" />
    </div>

    <!-- Details -->
    <div class="flex-1 min-w-0">
      <div class="font-medium truncate">
        {{ txType.label }}
        <template v-if="contactName">
          {{ transaction.type === 'send' ? 'to' : 'from' }} {{ contactName }}
        </template>
      </div>
      <div class="text-sm text-gray-500 truncate">
        {{ transaction.txid.slice(0, 16) }}...
      </div>
    </div>

    <!-- Amount & Time -->
    <div class="text-right shrink-0">
      <div
        class="font-mono font-medium"
        :class="
          transaction.type === 'receive' ? 'text-green-600' : 'text-red-600'
        "
      >
        {{ formattedAmount }} XPI
      </div>
      <div class="text-sm text-gray-500">
        {{ timeAgo }}
      </div>
    </div>
  </NuxtLink>
</template>
```

---

## 6. Getting Started Card

### File: `components/wallet/GettingStartedCard.vue`

```vue
<script setup lang="ts">
import { useOnboardingStore } from '~/stores/onboarding'

const onboardingStore = useOnboardingStore()

const incompleteItems = computed(() => {
  const items = []
  if (!onboardingStore.checklist.backup) {
    items.push({
      key: 'backup',
      label: 'Back up your wallet',
      to: '/settings/backup',
      icon: 'i-lucide-shield',
    })
  }
  if (!onboardingStore.checklist.addContact) {
    items.push({
      key: 'addContact',
      label: 'Add your first contact',
      to: '/people/contacts?add=true',
      icon: 'i-lucide-user-plus',
    })
  }
  if (!onboardingStore.checklist.receiveFirst) {
    items.push({
      key: 'receiveFirst',
      label: 'Receive your first Lotus',
      to: '/transact/receive',
      icon: 'i-lucide-qr-code',
    })
  }
  if (!onboardingStore.checklist.sendFirst) {
    items.push({
      key: 'sendFirst',
      label: 'Send your first transaction',
      to: '/transact/send',
      icon: 'i-lucide-send',
    })
  }
  return items.slice(0, 3) // Show max 3
})

const dismissed = ref(false)

function dismiss() {
  dismissed.value = true
}
</script>

<template>
  <AppCard
    v-if="!dismissed && incompleteItems.length > 0"
    title="Getting Started"
    icon="i-lucide-rocket"
  >
    <template #action>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-x"
        @click="dismiss"
      />
    </template>

    <div class="space-y-2">
      <NuxtLink
        v-for="item in incompleteItems"
        :key="item.key"
        :to="item.to"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div
          class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <UIcon :name="item.icon" class="w-4 h-4 text-primary" />
        </div>
        <span class="flex-1 font-medium">{{ item.label }}</span>
        <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400" />
      </NuxtLink>
    </div>
  </AppCard>
</template>
```

---

## 7. Implementation Checklist

### Page

- [ ] Create `pages/index.vue` with new home layout

### Components

- [ ] Create/update `components/wallet/BalanceCard.vue`
- [ ] Create/update `components/wallet/NetworkStatusCard.vue`
- [ ] Create/update `components/wallet/GettingStartedCard.vue`
- [ ] Create/update `components/history/TransactionItem.vue`
- [ ] Create `components/onboarding/BackupReminder.vue`

### Store Updates

- [ ] Add `pendingBalance` to wallet store
- [ ] Add `formattedPendingBalance` getter
- [ ] Add transaction type detection

### Features

- [ ] Balance visibility toggle
- [ ] Fiat conversion (optional, needs price feed)
- [ ] 24h balance change (needs historical data)
- [ ] Pending transaction display

### Testing

- [ ] Test with zero balance
- [ ] Test with pending transactions
- [ ] Test backup reminder display
- [ ] Test getting started checklist
- [ ] Test mobile responsiveness

---

## 8. Future Enhancements (Out of Scope)

- Mini balance chart (requires historical data)
- Price alerts
- Portfolio breakdown (if multiple assets)
- Customizable quick actions

---

## Next Phase

Once this phase is complete, proceed to [04_SEND_RECEIVE.md](./04_SEND_RECEIVE.md) to implement the send and receive pages.
