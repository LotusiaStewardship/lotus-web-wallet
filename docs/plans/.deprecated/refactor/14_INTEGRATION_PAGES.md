# 14: Integration - Pages

## Overview

This document details the **complete replacement** of existing page implementations with the new structured components. The goal is to refactor each page to use:

1. **Design System Components** (`components/ui/`) - AppCard, AppHeroCard, AppEmptyState, etc.
2. **Feature Components** (`components/wallet/`, `components/send/`, etc.) - Purpose-built components
3. **New Composables** - useAmount, useTime, useClipboard, useNotifications
4. **Proper Store Integration** - Using the aligned store APIs from Phase 13

**This is a complete refactor, not incremental additions.**

---

## Page Structure Overview

### Current Pages

```
pages/
├── index.vue           # Home/Dashboard
├── send.vue            # Send XPI
├── receive.vue         # Receive XPI
├── history.vue         # Transaction history
├── contacts.vue        # Contacts management
├── p2p.vue             # P2P network (if exists)
├── explorer/
│   ├── index.vue       # Explorer home
│   ├── block/[hashOrHeight].vue
│   ├── tx/[txid].vue
│   └── address/[address].vue
├── social/
│   ├── index.vue       # Social/RANK home
│   └── [platform]/[profileId].vue
└── settings/
    ├── index.vue       # Settings home
    ├── backup.vue      # Backup seed phrase
    ├── restore.vue     # Restore wallet
    ├── security.vue    # Security settings
    ├── network.vue     # Network settings
    └── advertise.vue   # P2P signer settings
```

---

## Page Integration Tasks

### 1. Home Page (`pages/index.vue`)

#### Components to Integrate

| Component              | Purpose                           |
| ---------------------- | --------------------------------- |
| `WalletBalanceHero`    | Display balance and quick actions |
| `WalletQuickActions`   | Action cards grid                 |
| `WalletNetworkStatus`  | Network stats bar                 |
| `WalletActivityCard`   | Recent transactions               |
| `WalletBackupReminder` | Backup prompt (if not backed up)  |

#### Implementation

```vue
<!-- pages/index.vue -->
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Backup Reminder -->
    <WalletBackupReminder
      v-if="!onboardingStore.backupComplete"
      @backup="navigateTo('/settings/backup')"
      @later="onboardingStore.snoozeBackupReminder()"
    />

    <!-- Balance Hero -->
    <WalletBalanceHero
      :balance="walletStore.balance.total"
      :connected="walletStore.connected"
      @send="navigateTo('/send')"
      @receive="navigateTo('/receive')"
    />

    <!-- Quick Actions -->
    <WalletQuickActions />

    <!-- Network Status -->
    <WalletNetworkStatus
      :block-height="walletStore.tipHeight"
      :utxo-count="walletStore.utxos.length"
      :peer-count="p2pStore.connectedPeers.length"
    />

    <!-- Recent Activity -->
    <WalletActivityCard
      :transactions="recentTransactions"
      :loading="walletStore.loading"
      @view-all="navigateTo('/history')"
    />
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const p2pStore = useP2PStore()

const recentTransactions = computed(() => walletStore.transactions.slice(0, 5))
</script>
```

---

### 2. Send Page (`pages/send.vue`)

#### Components to Integrate

| Component               | Purpose                                |
| ----------------------- | -------------------------------------- |
| `SendRecipientInput`    | Address input with contact suggestions |
| `SendAmountInput`       | Amount input with XPI/sats toggle      |
| `SendFeeSection`        | Fee display and advanced toggle        |
| `SendAdvancedOptions`   | Advanced transaction options           |
| `SendConfirmationModal` | Review and confirm                     |
| `SendSuccess`           | Success state                          |

#### Implementation

```vue
<!-- pages/send.vue -->
<template>
  <div class="max-w-lg mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-send"
      title="Send XPI"
      subtitle="Send to any Lotus address"
    />

    <!-- Success State -->
    <SendSuccess
      v-if="sendSuccess"
      :txid="lastTxid"
      :amount="draftStore.totalAmount"
      :recipient="draftStore.recipients[0]?.address"
      @done="resetSend"
      @view-tx="viewTransaction"
    />

    <!-- Send Form -->
    <template v-else>
      <SendRecipientInput
        v-model="recipient"
        :contacts="contactStore.contacts"
        @select-contact="selectContact"
        @scan-qr="openQRScanner"
      />

      <SendAmountInput
        v-model="amount"
        :balance="walletStore.balance.spendable"
        :unit="unit"
        @toggle-unit="toggleUnit"
        @max="setMaxAmount"
      />

      <SendFeeSection
        :fee="estimatedFee"
        :show-advanced="showAdvanced"
        @toggle-advanced="showAdvanced = !showAdvanced"
      />

      <SendAdvancedOptions
        v-if="showAdvanced"
        v-model:fee-rate="feeRate"
        v-model:op-return="opReturn"
        :utxos="walletStore.utxos"
        :selected-utxos="selectedUtxos"
        @select-utxos="selectedUtxos = $event"
      />

      <UButton
        block
        color="primary"
        size="lg"
        :disabled="!canSend"
        :loading="sending"
        @click="openConfirmation"
      >
        Review Transaction
      </UButton>
    </template>

    <!-- Confirmation Modal -->
    <SendConfirmationModal
      v-model:open="confirmOpen"
      :recipient="recipient"
      :amount="amountSats"
      :fee="estimatedFee"
      :sending="sending"
      @confirm="executeSend"
    />
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()
const contactStore = useContactStore()
const draftStore = useDraftStore()
const { formatXPI, xpiToSats } = useAmount()

// State
const recipient = ref('')
const amount = ref('')
const unit = ref<'xpi' | 'sats'>('xpi')
const showAdvanced = ref(false)
const feeRate = ref('normal')
const opReturn = ref('')
const selectedUtxos = ref<string[]>([])
const confirmOpen = ref(false)
const sending = ref(false)
const sendSuccess = ref(false)
const lastTxid = ref('')

// Computed
const amountSats = computed(() => {
  if (!amount.value) return 0n
  return unit.value === 'xpi' ? xpiToSats(amount.value) : BigInt(amount.value)
})

const estimatedFee = computed(() => {
  // Calculate based on inputs/outputs
  return 1000n // Placeholder
})

const canSend = computed(() => {
  return recipient.value && amountSats.value > 0n
})

// Actions
async function executeSend() {
  sending.value = true
  try {
    const result = await draftStore.send()
    lastTxid.value = result.txid
    sendSuccess.value = true
    confirmOpen.value = false
  } catch (e) {
    useNotifications().error('Send Failed', e.message)
  } finally {
    sending.value = false
  }
}

function resetSend() {
  recipient.value = ''
  amount.value = ''
  sendSuccess.value = false
  lastTxid.value = ''
}
</script>
```

---

### 3. Receive Page (`pages/receive.vue`)

#### Components to Integrate

| Component               | Purpose                    |
| ----------------------- | -------------------------- |
| `ReceiveQRDisplay`      | QR code with address       |
| `ReceivePaymentRequest` | Optional amount/label form |

#### Implementation

```vue
<!-- pages/receive.vue -->
<template>
  <div class="max-w-lg mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-qr-code"
      title="Receive XPI"
      subtitle="Share your address to receive funds"
    />

    <ReceiveQRDisplay
      :address="walletStore.address"
      :amount="requestAmount"
      :label="requestLabel"
      @copy="copyAddress"
    />

    <ReceivePaymentRequest
      v-model:amount="requestAmount"
      v-model:label="requestLabel"
      @generate="generatePaymentRequest"
      @share="sharePaymentRequest"
    />
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()
const { copy } = useClipboard()

const requestAmount = ref('')
const requestLabel = ref('')

function copyAddress() {
  copy(walletStore.address, 'Address copied')
}

function generatePaymentRequest() {
  // Generate payment URI
}

function sharePaymentRequest() {
  // Use Web Share API
}
</script>
```

---

### 4. History Page (`pages/history.vue`)

#### Components to Integrate

| Component              | Purpose                    |
| ---------------------- | -------------------------- |
| `HistoryFilters`       | Search and filter controls |
| `HistoryTxItem`        | Transaction list item      |
| `HistoryTxDetailModal` | Transaction detail modal   |

#### Implementation

```vue
<!-- pages/history.vue -->
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-history"
      title="Transaction History"
      :subtitle="`${filteredTransactions.length} transactions`"
    />

    <HistoryFilters
      v-model:search="search"
      v-model:filter="filter"
      @export="exportHistory"
    />

    <div v-if="filteredTransactions.length" class="space-y-2">
      <HistoryTxItem
        v-for="tx in filteredTransactions"
        :key="tx.txid"
        :transaction="tx"
        :own-addresses="walletStore.allAddresses"
        @click="openTxDetail(tx)"
      />
    </div>

    <AppEmptyState
      v-else
      icon="i-lucide-inbox"
      title="No transactions"
      description="Your transaction history will appear here"
    />

    <HistoryTxDetailModal
      v-model:open="detailOpen"
      :transaction="selectedTx"
      @view-explorer="viewInExplorer"
    />
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()

const search = ref('')
const filter = ref('all')
const detailOpen = ref(false)
const selectedTx = ref(null)

const filteredTransactions = computed(() => {
  let txs = walletStore.transactions

  // Apply filter
  if (filter.value !== 'all') {
    txs = txs.filter(tx => tx.type === filter.value)
  }

  // Apply search
  if (search.value) {
    const q = search.value.toLowerCase()
    txs = txs.filter(
      tx =>
        tx.txid.toLowerCase().includes(q) ||
        tx.addresses?.some(a => a.toLowerCase().includes(q)),
    )
  }

  return txs
})

function openTxDetail(tx) {
  selectedTx.value = tx
  detailOpen.value = true
}
</script>
```

---

### 5. Contacts Page (`pages/contacts.vue`)

#### Components to Integrate

| Component                | Purpose               |
| ------------------------ | --------------------- |
| `ContactSearch`          | Search contacts       |
| `ContactListItem`        | Contact list item     |
| `ContactQuickCard`       | Favorite contact card |
| `ContactFormSlideover`   | Add/edit contact      |
| `ContactDetailSlideover` | Contact details       |
| `ContactGroupModal`      | Create group          |
| `ContactPicker`          | Contact selection     |

#### Implementation

```vue
<!-- pages/contacts.vue -->
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-users"
      title="Contacts"
      :subtitle="`${contactStore.contacts.length} contacts`"
    >
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" @click="openAddContact">
          Add Contact
        </UButton>
      </template>
    </AppHeroCard>

    <!-- Favorites -->
    <div v-if="favorites.length" class="flex gap-3 overflow-x-auto pb-2">
      <ContactQuickCard
        v-for="contact in favorites"
        :key="contact.id"
        :contact="contact"
        @click="openContactDetail(contact)"
        @send="sendToContact(contact)"
      />
    </div>

    <!-- Search -->
    <ContactSearch v-model="search" :result-count="filteredContacts.length" />

    <!-- Contact List -->
    <div v-if="filteredContacts.length" class="space-y-2">
      <ContactListItem
        v-for="contact in filteredContacts"
        :key="contact.id"
        :contact="contact"
        @click="openContactDetail(contact)"
        @send="sendToContact(contact)"
        @toggle-favorite="toggleFavorite(contact)"
      />
    </div>

    <AppEmptyState
      v-else
      icon="i-lucide-users"
      title="No contacts"
      description="Add contacts for quick access when sending"
    />

    <!-- Slidevers -->
    <ContactFormSlideover
      v-model:open="formOpen"
      :contact="editingContact"
      @save="saveContact"
    />

    <ContactDetailSlideover
      v-model:open="detailOpen"
      :contact="selectedContact"
      @edit="editContact"
      @delete="deleteContact"
      @send="sendToContact"
    />
  </div>
</template>
```

---

### 6. P2P Page (`pages/p2p.vue`)

#### Components to Integrate

| Component             | Purpose                   |
| --------------------- | ------------------------- |
| `P2PHeroCard`         | Connection status         |
| `P2PIncomingRequests` | Incoming signing requests |
| `P2POnboardingCard`   | First-time intro          |
| `P2PQuickActions`     | Action cards              |
| `P2PSignerList`       | Available signers         |
| `P2PPeerGrid`         | Online peers              |
| `P2PActivityFeed`     | Live activity             |
| `P2PSessionList`      | Active sessions           |
| `P2PRequestList`      | Request management        |
| `P2PSettingsPanel`    | P2P settings              |

#### Implementation

See `09_P2P_SYSTEM.md` for full page implementation.

---

### 7. Explorer Pages

#### Index (`pages/explorer/index.vue`)

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <ExplorerSearchBar
      v-model="search"
      :recent-searches="recentSearches"
      @search="handleSearch"
    />

    <ExplorerNetworkStats :stats="networkStats" />

    <div class="grid md:grid-cols-2 gap-6">
      <ExplorerRecentBlocksCard
        :blocks="recentBlocks"
        :loading="loadingBlocks"
      />
      <ExplorerMempoolCard
        :transactions="mempoolTxs"
        :loading="loadingMempool"
      />
    </div>
  </div>
</template>
```

---

### 8. Social Pages

#### Index (`pages/social/index.vue`)

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <SocialSearchBar
      v-model:query="search"
      v-model:platform="platform"
      @search="handleSearch"
    />

    <SocialTrendingCard
      :profiles="trendingProfiles"
      :loading="loading"
      @view="viewProfile"
      @vote="openVoteModal"
    />

    <!-- Vote Modal -->
    <SocialVoteModal
      v-model:open="voteModalOpen"
      :profile="selectedProfile"
      @vote="submitVote"
    />
  </div>
</template>
```

---

### 9. Settings Pages

#### Index (`pages/settings/index.vue`)

```vue
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-settings"
      title="Settings"
      subtitle="Configure your wallet"
    />

    <!-- Backup Warning -->
    <UAlert
      v-if="!onboardingStore.backupComplete"
      color="warning"
      icon="i-lucide-alert-triangle"
      title="Backup Required"
    >
      <template #actions>
        <UButton color="warning" size="sm" to="/settings/backup">
          Backup Now
        </UButton>
      </template>
    </UAlert>

    <!-- Settings Sections -->
    <SettingsSection
      v-for="section in settingsSections"
      :key="section.title"
      :title="section.title"
      :icon="section.icon"
      :items="section.items"
    />

    <!-- Version Info -->
    <SettingsVersionInfo
      :version="version"
      :network="networkStore.currentNetwork"
    />
  </div>
</template>
```

---

## Integration Checklist

### Phase 14.1: App-Level Integration

- [ ] Add OnboardingModal to app.vue
- [ ] Initialize onboarding store on mount

### Phase 14.2: Home Page Refactor (`pages/index.vue`)

- [ ] Replace existing implementation with new components
- [ ] Use WalletBalanceHero for balance display
- [ ] Use WalletQuickActions for action grid
- [ ] Use WalletNetworkStatus for stats
- [ ] Use WalletActivityCard for recent transactions
- [ ] Add WalletBackupReminder for backup prompts

### Phase 14.3: History Page Refactor (`pages/history.vue`)

- [ ] Replace with AppHeroCard header
- [ ] Use HistoryFilters for search/filter
- [ ] Use HistoryTxItem for transaction list
- [ ] Use AppEmptyState for empty state
- [ ] Add HistoryTxDetailModal for details

### Phase 14.4: Settings Backup Page Integration

- [ ] Integrate onboarding store for backup tracking
- [ ] Mark backup complete when seed is copied

---

**Note:** Send, Receive, Contacts, P2P pages are already well-implemented and functional. They can be incrementally updated to use new design system components in future iterations.

---

_Next: [15_INTEGRATION_COMPOSABLES.md](./15_INTEGRATION_COMPOSABLES.md)_
