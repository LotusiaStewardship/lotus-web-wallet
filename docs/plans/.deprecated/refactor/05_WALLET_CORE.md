# 05: Wallet Core Pages

## Overview

This document details the refactoring of the core wallet pages: Home, Send, Receive, and History. These are the most-used pages and must be polished.

---

## Page: Home (index.vue)

### Current Problems

- Balance display lacks context (no fiat, no change indicator)
- Network stats use technical jargon
- Quick actions are limited
- Activity feed is basic

### Target Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                         🪷 Lotus Wallet                              │
│                                                                      │
│                        1,234.567890 XPI                              │
│                          ≈ $12.34 USD                                │
│                     ▲ +5.2% from yesterday                           │
│                                                                      │
│                    [Send]  [Receive]  [Scan]                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Network Status                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  [Block: 1,234,567]  [12 UTXOs]  [5 P2P Peers]  [3 Signers]         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📊 Recent Activity                               [View All →]       │
│  ─────────────────────────────────────────────────────────────────  │
│  ↗️ Sent to Alice                    -100.00 XPI      2 min ago     │
│  ↙️ Received from Bob                +50.00 XPI       1 hour ago    │
│  ⛏️ Mining reward                    +125.00 XPI      3 hours ago   │
│  ─────────────────────────────────────────────────────────────────  │
│  [Load More]                                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ Backup Reminder                                                  │
│  Your wallet is not backed up. If you lose access to this device,   │
│  you will lose your funds.                                          │
│                                              [Backup Now]  [Later]   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```vue
<!-- pages/index.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Balance Hero -->
    <WalletBalanceHero
      :balance="walletStore.balance"
      :network="networkStore.currentNetwork"
      :connected="walletStore.connected"
    />

    <!-- Quick Actions -->
    <WalletQuickActions />

    <!-- Network Status -->
    <WalletNetworkStatus
      :tip-height="walletStore.tipHeight"
      :utxo-count="walletStore.utxoCount"
      :p2p-peers="p2pStore.connectedPeers.length"
      :signers="musig2Store.discoveredSigners.length"
    />

    <!-- Recent Activity -->
    <WalletActivityCard
      :transactions="recentTransactions"
      :loading="walletStore.historyLoading"
      @load-more="loadMore"
    />

    <!-- Backup Reminder -->
    <WalletBackupReminder
      v-if="onboardingStore.shouldShowBackupReminder()"
      @backup="navigateTo('/settings/backup')"
      @dismiss="onboardingStore.snoozeBackupReminder()"
    />
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const onboardingStore = useOnboardingStore()

const recentTransactions = computed(() =>
  walletStore.transactionHistory.slice(0, 5),
)

async function loadMore() {
  await walletStore.fetchMoreHistory()
}
</script>
```

### New Components

#### WalletBalanceHero.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  balance: WalletBalance
  network: 'livenet' | 'testnet'
  connected: boolean
}>()

const { formatXPI } = useAmount()

const balanceDisplay = computed(() => formatXPI(props.balance.total))
const pendingDisplay = computed(() => {
  if (props.balance.unconfirmed === 0n) return null
  return `${formatXPI(props.balance.unconfirmed)} pending`
})
</script>

<template>
  <AppHeroCard gradient>
    <template #icon>
      <div class="relative">
        <div
          class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
        >
          <UIcon name="i-lucide-wallet" class="w-8 h-8 text-primary" />
        </div>
        <span
          v-if="connected"
          class="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-white dark:border-gray-900"
        />
      </div>
    </template>

    <h1 class="text-3xl font-bold mb-1">{{ balanceDisplay }}</h1>
    <p v-if="pendingDisplay" class="text-sm text-warning mb-2">
      {{ pendingDisplay }}
    </p>
    <p class="text-muted text-sm">
      {{ connected ? `Connected to ${network}` : 'Connecting...' }}
    </p>

    <template #actions>
      <div class="flex justify-center gap-3 mt-4">
        <UButton to="/send" icon="i-lucide-send">Send</UButton>
        <UButton to="/receive" variant="outline" icon="i-lucide-qr-code"
          >Receive</UButton
        >
        <UButton variant="ghost" icon="i-lucide-scan" @click="openScanner"
          >Scan</UButton
        >
      </div>
    </template>
  </AppHeroCard>
</template>
```

---

## Page: Send (send.vue)

### Current Problems

- 32KB file - way too large
- No QR code scanning
- No confirmation step before sending
- Success state is basic
- Advanced mode is hidden

### Target Design

The send page should be a multi-step flow:

```
Step 1: Enter Details
┌─────────────────────────────────────────────────────────────────────┐
│  💸 Send XPI                                                         │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  To:                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [lotus_16PSJ...]                              [📋] [📷] [👥] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Amount:                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [100.00                                    ] XPI    [Max]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  Available: 1,234.56 XPI                                            │
│                                                                      │
│  Note (optional):                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Payment for lunch                                         ] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  Fee: 0.001 XPI (1 sat/byte)                     [⚙️ Advanced]      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│                                              [Review Transaction]    │
└─────────────────────────────────────────────────────────────────────┘

Step 2: Review & Confirm (Modal)
┌─────────────────────────────────────────────────────────────────────┐
│  📋 Review Transaction                                               │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  To:         Alice (lotus_16PSJ...abc123)                           │
│  Amount:     100.00 XPI                                             │
│  Fee:        0.001 XPI                                              │
│  ─────────────────────────────────────────────────────────────────  │
│  Total:      100.001 XPI                                            │
│                                                                      │
│  Remaining:  1,134.559 XPI                                          │
│                                                                      │
│                                    [Cancel]  [Confirm & Send]        │
└─────────────────────────────────────────────────────────────────────┘

Step 3: Success
┌─────────────────────────────────────────────────────────────────────┐
│                           ✅                                         │
│                                                                      │
│                    Transaction Sent!                                 │
│                                                                      │
│                    100.00 XPI → Alice                                │
│                                                                      │
│                    Transaction ID:                                   │
│                    abc123...xyz789  [📋]                             │
│                                                                      │
│                    Usually confirms in ~10 seconds                   │
│                                                                      │
│              [View in Explorer]  [Send Another]  [Done]              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```vue
<!-- pages/send.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Success State -->
    <SendSuccess
      v-if="sendState === 'success'"
      :result="sendResult"
      @send-another="resetForm"
      @done="navigateTo('/')"
    />

    <!-- Send Form -->
    <template v-else>
      <AppHeroCard
        icon="i-lucide-send"
        title="Send XPI"
        :subtitle="`Available: ${availableBalance}`"
      />

      <!-- Recipient Section -->
      <AppCard title="Recipient" icon="i-lucide-user">
        <SendRecipientInput
          v-model:address="draftStore.recipients[0].address"
          :contacts="contactStore.contacts"
          :error="draftStore.recipients[0].error"
          @select-contact="selectContact"
          @scan-qr="openScanner"
        />
      </AppCard>

      <!-- Amount Section -->
      <AppCard title="Amount" icon="i-lucide-coins">
        <SendAmountInput
          v-model:amount="amount"
          :max="draftStore.maxSendable"
          :error="amountError"
          @set-max="setMaxAmount"
        />
      </AppCard>

      <!-- Note Section (Optional) -->
      <AppCard title="Note" icon="i-lucide-message-square">
        <UTextarea
          v-model="note"
          placeholder="What's this for? (optional)"
          :rows="2"
        />
      </AppCard>

      <!-- Fee & Advanced -->
      <SendFeeSection
        :fee="draftStore.feeAmount"
        :fee-rate="draftStore.feeRate"
        :advanced-open="advancedOpen"
        @toggle-advanced="advancedOpen = !advancedOpen"
      />

      <!-- Advanced Options -->
      <SendAdvancedOptions v-if="advancedOpen" :draft-store="draftStore" />

      <!-- Summary & Action -->
      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <span class="text-muted">Total</span>
          <span class="text-xl font-bold">{{ totalDisplay }}</span>
        </div>
        <UButton
          block
          color="primary"
          size="lg"
          :disabled="!draftStore.canSend"
          :loading="sendState === 'sending'"
          @click="openConfirmation"
        >
          Review Transaction
        </UButton>
      </AppCard>
    </template>

    <!-- Confirmation Modal -->
    <SendConfirmationModal
      v-model:open="confirmationOpen"
      :draft="draftStore"
      :sending="sendState === 'sending'"
      @confirm="sendTransaction"
      @cancel="confirmationOpen = false"
    />

    <!-- QR Scanner Modal -->
    <QRScannerModal v-model:open="scannerOpen" @scan="handleScan" />
  </div>
</template>

<script setup lang="ts">
const draftStore = useDraftStore()
const contactStore = useContactStore()
const { formatXPI } = useAmount()
const { success, error } = useNotifications()

// State
const sendState = ref<'idle' | 'sending' | 'success'>('idle')
const sendResult = ref<SendResult | null>(null)
const confirmationOpen = ref(false)
const scannerOpen = ref(false)
const advancedOpen = ref(false)
const note = ref('')

// Computed
const amount = computed({
  get: () => draftStore.recipients[0]?.amountSats ?? 0n,
  set: val =>
    draftStore.updateRecipientAmount(draftStore.recipients[0].id, val),
})

const availableBalance = computed(() => formatXPI(draftStore.maxSendable))
const totalDisplay = computed(() => formatXPI(draftStore.totalWithFee))

// Initialize
onMounted(() => {
  draftStore.initializeDraft()
})

// Actions
function openConfirmation() {
  draftStore.validate()
  if (draftStore.isValid) {
    confirmationOpen.value = true
  }
}

async function sendTransaction() {
  sendState.value = 'sending'
  try {
    const result = await draftStore.send()
    sendResult.value = result
    sendState.value = 'success'
    success('Transaction Sent', 'Your transaction has been broadcast')
  } catch (e) {
    error('Send Failed', e.message)
    sendState.value = 'idle'
  } finally {
    confirmationOpen.value = false
  }
}

function resetForm() {
  draftStore.resetDraft()
  draftStore.initializeDraft()
  sendState.value = 'idle'
  sendResult.value = null
}

function handleScan(data: string) {
  const { parsePaymentURI } = useQRCode()
  const parsed = parsePaymentURI(data)
  if (parsed) {
    draftStore.updateRecipientAddress(
      draftStore.recipients[0].id,
      parsed.address,
    )
    if (parsed.amount) {
      const { xpiToSats } = useAmount()
      draftStore.updateRecipientAmount(
        draftStore.recipients[0].id,
        xpiToSats(parsed.amount),
      )
    }
  } else {
    // Assume it's just an address
    draftStore.updateRecipientAddress(draftStore.recipients[0].id, data)
  }
  scannerOpen.value = false
}
</script>
```

### New Components for Send

- `SendRecipientInput.vue` - Address input with contact picker, paste, scan
- `SendAmountInput.vue` - Amount input with max button
- `SendFeeSection.vue` - Fee display with advanced toggle
- `SendAdvancedOptions.vue` - Coin control, OP_RETURN, multiple recipients
- `SendConfirmationModal.vue` - Review and confirm modal
- `SendSuccess.vue` - Success state with actions
- `QRScannerModal.vue` - QR code scanner

---

## Page: Receive (receive.vue)

### Current Problems

- No amount pre-fill for payment requests
- No payment waiting indicator
- Privacy warning is passive

### Target Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  📥 Receive XPI                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│                    ┌─────────────────────┐                          │
│                    │                     │                          │
│                    │      [QR CODE]      │                          │
│                    │                     │                          │
│                    └─────────────────────┘                          │
│                                                                      │
│                    lotus_16PSJk9W...oSb8xyz                         │
│                              [📋 Copy]                               │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Request specific amount (optional):                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [                                      ] XPI                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Note for sender (optional):                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [                                                           ] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│                    [Share Payment Request]                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ Privacy Notice                                                   │
│  Anyone who knows this address can see your transaction history.    │
│  Consider using a new address for each payment.                     │
│                                              [Learn More]            │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```vue
<!-- pages/receive.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-qr-code"
      title="Receive XPI"
      subtitle="Share your address to receive payments"
    />

    <!-- QR Code & Address -->
    <AppCard>
      <div class="text-center py-4">
        <!-- QR Code -->
        <div class="inline-block p-4 bg-white rounded-xl mb-4">
          <img :src="qrCodeUrl" :alt="address" class="w-48 h-48" />
        </div>

        <!-- Address -->
        <div class="mb-4">
          <p class="font-mono text-sm break-all px-4">{{ address }}</p>
        </div>

        <!-- Copy Button -->
        <UButton
          color="primary"
          variant="outline"
          icon="i-lucide-copy"
          @click="copyAddress"
        >
          Copy Address
        </UButton>
      </div>
    </AppCard>

    <!-- Payment Request Options -->
    <AppCard title="Payment Request" icon="i-lucide-file-text">
      <div class="space-y-4">
        <UFormField label="Amount (optional)">
          <UInput v-model="requestAmount" type="number" placeholder="0.00">
            <template #trailing>
              <span class="text-muted text-sm">XPI</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField label="Note (optional)">
          <UInput
            v-model="requestNote"
            placeholder="What's this payment for?"
          />
        </UFormField>

        <UButton
          block
          color="primary"
          icon="i-lucide-share"
          @click="sharePaymentRequest"
        >
          Share Payment Request
        </UButton>
      </div>
    </AppCard>

    <!-- Privacy Notice -->
    <UAlert
      color="warning"
      icon="i-lucide-shield-alert"
      title="Privacy Notice"
      description="Anyone who knows this address can see your transaction history. Consider using a new address for each payment."
    >
      <template #actions>
        <UButton color="warning" variant="ghost" size="xs" to="/docs/privacy">
          Learn More
        </UButton>
      </template>
    </UAlert>

    <!-- View in Explorer -->
    <div class="text-center">
      <UButton
        variant="link"
        :to="`/explorer/address/${address}`"
        icon="i-lucide-external-link"
      >
        View in Explorer
      </UButton>
    </div>
  </div>
</template>
```

---

## Page: History (history.vue)

### Current Problems

- No filtering or search
- No export functionality
- No pagination for large histories

### Target Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  📜 Transaction History                                              │
│  ─────────────────────────────────────────────────────────────────  │
│  [🔍 Search transactions...]                                         │
│                                                                      │
│  [All] [Sent] [Received] [RANK] [Coinbase]           [Export ↓]     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Today                                                               │
│  ─────────────────────────────────────────────────────────────────  │
│  ↗️ Sent to Alice                    -100.00 XPI      2:34 PM       │
│  ↙️ Received from Bob                +50.00 XPI       11:20 AM      │
│  ─────────────────────────────────────────────────────────────────  │
│  Yesterday                                                           │
│  ─────────────────────────────────────────────────────────────────  │
│  ⛏️ Mining reward                    +125.00 XPI      3:45 PM       │
│  ↗️ Sent to Carol                    -25.00 XPI       10:15 AM      │
│  ─────────────────────────────────────────────────────────────────  │
│  December 5, 2024                                                    │
│  ─────────────────────────────────────────────────────────────────  │
│  ↙️ Received from Dave               +500.00 XPI      5:30 PM       │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│                         [Load More]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```vue
<!-- pages/history.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header with Search -->
    <AppCard>
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-history" class="w-5 h-5" />
          <h1 class="text-xl font-semibold">Transaction History</h1>
        </div>

        <!-- Search -->
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search by address, amount, or note..."
        />

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-for="filter in filters"
            :key="filter.value"
            size="sm"
            :color="activeFilter === filter.value ? 'primary' : 'neutral'"
            :variant="activeFilter === filter.value ? 'solid' : 'outline'"
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
          </UButton>

          <div class="flex-1" />

          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-download"
            @click="exportHistory"
          >
            Export
          </UButton>
        </div>
      </div>
    </AppCard>

    <!-- Transaction List -->
    <AppCard v-if="groupedTransactions.length" :no-padding="true">
      <div class="divide-y divide-default">
        <template v-for="group in groupedTransactions" :key="group.date">
          <!-- Date Header -->
          <div class="px-4 py-2 bg-muted/30">
            <span class="text-sm font-medium text-muted">{{
              group.label
            }}</span>
          </div>

          <!-- Transactions -->
          <HistoryTxItem
            v-for="tx in group.transactions"
            :key="tx.txid"
            :transaction="tx"
            @click="openTxDetail(tx)"
          />
        </template>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="p-4 text-center">
        <UButton
          color="neutral"
          variant="ghost"
          :loading="loading"
          @click="loadMore"
        >
          Load More
        </UButton>
      </div>
    </AppCard>

    <!-- Empty State -->
    <AppEmptyState
      v-else-if="!loading"
      icon="i-lucide-inbox"
      title="No transactions yet"
      description="Your transaction history will appear here once you send or receive XPI"
      :action="{ label: 'Receive XPI', to: '/receive' }"
    />

    <!-- Loading State -->
    <AppLoadingState v-else message="Loading transactions..." />

    <!-- Transaction Detail Modal -->
    <HistoryTxDetailModal v-model:open="detailOpen" :transaction="selectedTx" />
  </div>
</template>
```

---

## Shared Patterns

### Transaction Item Component

Used in both Home and History pages:

```vue
<!-- components/wallet/TxItem.vue -->
<script setup lang="ts">
const props = defineProps<{
  transaction: WalletTransaction
  compact?: boolean
}>()

const emit = defineEmits<{
  click: [tx: WalletTransaction]
}>()

const { formatXPI, getAmountColor } = useAmount()
const { timeAgo } = useTime()
const { toFingerprint } = useAddress()
const contactStore = useContactStore()

const contact = computed(() =>
  contactStore.findByAddress(props.transaction.address),
)

const icon = computed(() => {
  switch (props.transaction.type) {
    case 'send':
      return 'i-lucide-arrow-up-right'
    case 'receive':
      return 'i-lucide-arrow-down-left'
    case 'coinbase':
      return 'i-lucide-pickaxe'
    case 'rank':
      return 'i-lucide-thumbs-up'
    default:
      return 'i-lucide-circle'
  }
})

const iconColor = computed(() => {
  switch (props.transaction.type) {
    case 'send':
      return 'bg-error-100 dark:bg-error-900/30 text-error'
    case 'receive':
      return 'bg-success-100 dark:bg-success-900/30 text-success'
    case 'coinbase':
      return 'bg-warning-100 dark:bg-warning-900/30 text-warning'
    default:
      return 'bg-primary-100 dark:bg-primary-900/30 text-primary'
  }
})
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
    @click="emit('click', transaction)"
  >
    <!-- Icon -->
    <div
      class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      :class="iconColor"
    >
      <UIcon :name="icon" class="w-5 h-5" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="font-medium truncate">
        {{ contact?.name || toFingerprint(transaction.address) }}
      </p>
      <p class="text-sm text-muted truncate">
        {{ transaction.type === 'send' ? 'Sent' : 'Received' }}
      </p>
    </div>

    <!-- Amount & Time -->
    <div class="text-right flex-shrink-0">
      <p
        class="font-medium"
        :class="
          getAmountColor(transaction.amount, transaction.type === 'receive')
        "
      >
        {{ transaction.type === 'receive' ? '+' : '-'
        }}{{ formatXPI(transaction.amount, { showUnit: false }) }}
      </p>
      <p class="text-xs text-muted">{{ timeAgo(transaction.timestamp) }}</p>
    </div>
  </div>
</template>
```

---

_Next: [06_CONTACTS_SYSTEM.md](./06_CONTACTS_SYSTEM.md)_
