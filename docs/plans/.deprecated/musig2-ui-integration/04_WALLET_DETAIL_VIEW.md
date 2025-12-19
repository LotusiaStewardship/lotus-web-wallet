# 04: Wallet Detail View

## Overview

This document details the shared wallet detail page (`/people/shared-wallets/[id]`). This page provides a comprehensive view of a single shared wallet including balance, participants, transaction history, and actions.

---

## Page Design

### Target Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Shared Wallets                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔐 Family Treasury                                           2-of-2        │
│  Joint savings account for family expenses                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                      10,000.00 XPI                                   │   │
│  │                      ≈ $50.00 USD                                    │   │
│  │                                                                      │   │
│  │              [Fund Wallet]        [Spend]                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📍 Shared Address                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ lotus_16PSJKqoPbvGLWdNhKCrCkP5KrPi9...              [Copy] [QR]     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  👥 Participants (2)                                    ● All online        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 You                                                    ● Online   │   │
│  │    02abc123...def456                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Alice                                                  ● Online   │   │
│  │    02xyz789...ghi012                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📜 Transaction History                                     [View All]      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ↓ Received 1,000 XPI                              Dec 10, 2024      │   │
│  │   From: lotus_16PSJ...abc123                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ↑ Sent 500 XPI                                    Dec 8, 2024       │   │
│  │   To: Bob (lotus_16PSJ...def456)                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚙️ Wallet Settings                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Rename Wallet]  [Export Details]  [Delete Wallet]                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Page Implementation

### File: `pages/people/shared-wallets/[id].vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const musig2Store = useMuSig2Store()
const contactStore = useContactStore()
const p2pStore = useP2PStore()
const { formatXPI } = useAmount()
const { success, error: showError } = useNotifications()

// Get wallet ID from route
const walletId = computed(() => route.params.id as string)

// Get wallet from store
const wallet = computed(() =>
  musig2Store.sharedWallets.find(w => w.id === walletId.value),
)

// Redirect if wallet not found
watchEffect(() => {
  if (!wallet.value && musig2Store.initialized) {
    router.replace('/people/shared-wallets')
  }
})

// State
const showFundModal = ref(false)
const showSpendModal = ref(false)
const showQRModal = ref(false)
const showDeleteConfirm = ref(false)
const loading = ref(false)

// Computed
const balance = computed(() => BigInt(wallet.value?.balanceSats || '0'))
const hasBalance = computed(() => balance.value > 0n)

const participantCount = computed(() => wallet.value?.participants.length || 0)
const threshold = computed(() => participantCount.value) // n-of-n

// Check online status
const onlineCount = computed(() => {
  if (!wallet.value) return 0
  return wallet.value.participants.filter(p => {
    if (p.isMe) return true
    return p.peerId && p2pStore.isPeerOnline(p.peerId)
  }).length
})

const allOnline = computed(() => onlineCount.value === participantCount.value)
const canSpend = computed(() => hasBalance.value && allOnline.value)

// Transaction history (placeholder - would come from Chronik)
const transactions = ref<any[]>([])
const loadingHistory = ref(false)

// Actions
async function refreshBalance() {
  loading.value = true
  try {
    await musig2Store.refreshSharedWalletBalances()
  } finally {
    loading.value = false
  }
}

async function loadTransactionHistory() {
  loadingHistory.value = true
  try {
    // TODO: Fetch from Chronik using wallet.sharedAddress
    // For now, just simulate
    await new Promise(resolve => setTimeout(resolve, 500))
    transactions.value = []
  } finally {
    loadingHistory.value = false
  }
}

function copyAddress() {
  if (wallet.value) {
    navigator.clipboard.writeText(wallet.value.sharedAddress)
    success('Copied', 'Address copied to clipboard')
  }
}

async function deleteWallet() {
  if (!wallet.value) return

  try {
    musig2Store.deleteSharedWallet(wallet.value.id)
    success('Deleted', 'Shared wallet has been removed')
    router.replace('/people/shared-wallets')
  } catch (e) {
    showError('Error', 'Failed to delete wallet')
  }
}

function getParticipantContact(publicKeyHex: string) {
  return contactStore.contactList.find(c => c.publicKey === publicKeyHex)
}

function isParticipantOnline(participant: { isMe: boolean; peerId?: string }) {
  if (participant.isMe) return true
  return participant.peerId && p2pStore.isPeerOnline(participant.peerId)
}

function truncateKey(key: string): string {
  if (key.length <= 16) return key
  return `${key.slice(0, 8)}...${key.slice(-8)}`
}

function truncateAddress(address: string): string {
  if (address.length <= 24) return address
  return `${address.slice(0, 12)}...${address.slice(-12)}`
}

// Initialize
onMounted(() => {
  refreshBalance()
  loadTransactionHistory()
})
</script>

<template>
  <div v-if="wallet" class="max-w-4xl mx-auto space-y-6 p-4">
    <!-- Back Navigation -->
    <div class="flex items-center gap-2">
      <UButton
        variant="ghost"
        icon="i-lucide-arrow-left"
        @click="router.back()"
      >
        Back to Shared Wallets
      </UButton>
    </div>

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
          >
            <UIcon name="i-lucide-shield" class="w-6 h-6 text-primary" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold">{{ wallet.name }}</h1>
              <UBadge color="primary" variant="subtle">
                {{ threshold }}-of-{{ participantCount }}
              </UBadge>
            </div>
            <p v-if="wallet.description" class="text-muted">
              {{ wallet.description }}
            </p>
          </div>
        </div>
      </div>

      <UButton
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="loading"
        @click="refreshBalance"
      />
    </div>

    <!-- Balance Card -->
    <UCard class="text-center">
      <div class="py-4">
        <p class="text-4xl font-bold mb-2">{{ formatXPI(balance) }}</p>
        <!-- Fiat conversion placeholder -->
        <p class="text-muted">≈ $0.00 USD</p>
      </div>

      <div class="flex justify-center gap-4 pt-4 border-t">
        <UButton
          color="primary"
          icon="i-lucide-plus"
          @click="showFundModal = true"
        >
          Fund Wallet
        </UButton>
        <UButton
          color="primary"
          variant="outline"
          icon="i-lucide-send"
          :disabled="!canSpend"
          @click="showSpendModal = true"
        >
          Spend
        </UButton>
      </div>

      <p v-if="!allOnline && hasBalance" class="text-sm text-warning mt-4">
        ⚠️ Not all participants are online. Spending requires all
        {{ participantCount }} to be online.
      </p>
    </UCard>

    <!-- Shared Address -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary" />
          <span class="font-semibold">Shared Address</span>
        </div>
      </template>

      <div class="flex items-center gap-2">
        <code class="flex-1 p-3 bg-muted/50 rounded-lg text-sm truncate">
          {{ wallet.sharedAddress }}
        </code>
        <UButton variant="ghost" icon="i-lucide-copy" @click="copyAddress" />
        <UButton
          variant="ghost"
          icon="i-lucide-qr-code"
          @click="showQRModal = true"
        />
      </div>

      <p class="text-sm text-muted mt-2">
        Share this address to receive funds into this shared wallet.
      </p>
    </UCard>

    <!-- Participants -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
            <span class="font-semibold"
              >Participants ({{ participantCount }})</span
            >
          </div>
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="allOnline ? 'bg-green-500' : 'bg-yellow-500'"
            />
            <span class="text-sm text-muted">
              {{
                allOnline
                  ? 'All online'
                  : `${onlineCount}/${participantCount} online`
              }}
            </span>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <div
          v-for="participant in wallet.participants"
          :key="participant.publicKeyHex"
          class="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
        >
          <div class="relative">
            <ContactAvatar
              v-if="getParticipantContact(participant.publicKeyHex)"
              :contact="getParticipantContact(participant.publicKeyHex)!"
              size="sm"
            />
            <div
              v-else
              class="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <UIcon name="i-lucide-user" class="w-5 h-5 text-muted" />
            </div>

            <!-- Online indicator -->
            <span
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
              :class="
                isParticipantOnline(participant)
                  ? 'bg-green-500'
                  : 'bg-gray-400'
              "
            />
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-medium">
              {{
                participant.isMe
                  ? 'You'
                  : getParticipantContact(participant.publicKeyHex)?.name ||
                    'Unknown'
              }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ truncateKey(participant.publicKeyHex) }}
            </p>
          </div>

          <UBadge
            :color="isParticipantOnline(participant) ? 'green' : 'neutral'"
            variant="subtle"
            size="xs"
          >
            {{ isParticipantOnline(participant) ? 'Online' : 'Offline' }}
          </UBadge>
        </div>
      </div>
    </UCard>

    <!-- Transaction History -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-scroll" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Transaction History</span>
          </div>
          <UButton variant="ghost" size="xs">View All</UButton>
        </div>
      </template>

      <!-- Loading -->
      <div v-if="loadingHistory" class="py-8 text-center">
        <UIcon
          name="i-lucide-loader-2"
          class="w-6 h-6 animate-spin text-primary mx-auto"
        />
      </div>

      <!-- Empty state -->
      <div v-else-if="transactions.length === 0" class="py-8 text-center">
        <UIcon
          name="i-lucide-inbox"
          class="w-12 h-12 text-muted mx-auto mb-2"
        />
        <p class="text-muted">No transactions yet</p>
        <p class="text-sm text-muted">Fund this wallet to get started</p>
      </div>

      <!-- Transaction list -->
      <div v-else class="space-y-2">
        <div
          v-for="tx in transactions.slice(0, 5)"
          :key="tx.txid"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
        >
          <!-- Transaction item would go here -->
        </div>
      </div>
    </UCard>

    <!-- Wallet Settings -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-settings" class="w-5 h-5 text-primary" />
          <span class="font-semibold">Wallet Settings</span>
        </div>
      </template>

      <div class="flex flex-wrap gap-3">
        <UButton variant="outline" icon="i-lucide-edit">
          Rename Wallet
        </UButton>
        <UButton variant="outline" icon="i-lucide-download">
          Export Details
        </UButton>
        <UButton
          variant="outline"
          color="red"
          icon="i-lucide-trash-2"
          @click="showDeleteConfirm = true"
        >
          Delete Wallet
        </UButton>
      </div>

      <UAlert color="warning" icon="i-lucide-alert-triangle" class="mt-4">
        <template #description>
          Deleting this wallet only removes it from your device. The shared
          address and any funds remain on the blockchain. Other participants can
          still access the wallet if they have the configuration.
        </template>
      </UAlert>
    </UCard>

    <!-- Modals -->
    <Musig2FundWalletModal v-model:open="showFundModal" :wallet="wallet" />

    <Musig2ProposeSpendModal v-model:open="showSpendModal" :wallet="wallet" />

    <!-- QR Code Modal -->
    <UModal v-model:open="showQRModal">
      <template #content>
        <UCard>
          <template #header>
            <span class="font-semibold">Shared Wallet Address</span>
          </template>

          <div class="text-center space-y-4">
            <!-- QR Code placeholder -->
            <div
              class="w-48 h-48 bg-muted rounded-lg mx-auto flex items-center justify-center"
            >
              <UIcon name="i-lucide-qr-code" class="w-24 h-24 text-muted" />
            </div>

            <div>
              <p class="font-medium">{{ wallet.name }}</p>
              <code class="text-xs text-muted break-all">{{
                wallet.sharedAddress
              }}</code>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-center gap-3">
              <UButton
                variant="outline"
                icon="i-lucide-copy"
                @click="copyAddress"
              >
                Copy Address
              </UButton>
              <UButton color="primary" @click="showQRModal = false">
                Done
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-red-500">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" />
              <span class="font-semibold">Delete Shared Wallet?</span>
            </div>
          </template>

          <p>
            Are you sure you want to delete <strong>{{ wallet.name }}</strong
            >?
          </p>

          <p class="text-sm text-muted mt-2">
            This will remove the wallet from your device. Any funds in the
            wallet will remain on the blockchain and can be accessed if you have
            the participant keys.
          </p>

          <template #footer>
            <div class="flex gap-3">
              <UButton
                class="flex-1"
                variant="outline"
                @click="showDeleteConfirm = false"
              >
                Cancel
              </UButton>
              <UButton class="flex-1" color="red" @click="deleteWallet">
                Delete Wallet
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>

  <!-- Loading state -->
  <div v-else class="max-w-4xl mx-auto p-4">
    <div class="flex justify-center py-12">
      <UIcon
        name="i-lucide-loader-2"
        class="w-8 h-8 animate-spin text-primary"
      />
    </div>
  </div>
</template>
```

---

## SharedWalletDetail Component Update

The existing `SharedWalletDetail.vue` component can be used as a reusable detail view:

### File: `components/musig2/SharedWalletDetail.vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet
}>()

const emit = defineEmits<{
  fund: []
  spend: []
  delete: []
}>()

const { formatXPI } = useAmount()
const p2pStore = useP2PStore()

const balance = computed(() => BigInt(props.wallet.balanceSats || '0'))
const hasBalance = computed(() => balance.value > 0n)
const participantCount = computed(() => props.wallet.participants.length)

const onlineCount = computed(() => {
  return props.wallet.participants.filter(p => {
    if (p.isMe) return true
    return p.peerId && p2pStore.isPeerOnline(p.peerId)
  }).length
})

const allOnline = computed(() => onlineCount.value === participantCount.value)
</script>

<template>
  <div class="space-y-4">
    <!-- Balance -->
    <div class="text-center py-6">
      <p class="text-3xl font-bold">{{ formatXPI(balance) }}</p>
      <p class="text-sm text-muted mt-1">
        {{ participantCount }}-of-{{ participantCount }} MuSig2 Wallet
      </p>
    </div>

    <!-- Actions -->
    <div class="flex justify-center gap-3">
      <UButton color="primary" icon="i-lucide-plus" @click="emit('fund')">
        Fund
      </UButton>
      <UButton
        color="primary"
        variant="outline"
        icon="i-lucide-send"
        :disabled="!hasBalance || !allOnline"
        @click="emit('spend')"
      >
        Spend
      </UButton>
    </div>

    <!-- Status -->
    <div class="flex justify-center">
      <UBadge :color="allOnline ? 'green' : 'yellow'" variant="subtle">
        {{
          allOnline
            ? 'All participants online'
            : `${onlineCount}/${participantCount} online`
        }}
      </UBadge>
    </div>

    <!-- Participants -->
    <div class="space-y-2">
      <p class="text-sm font-medium">Participants</p>
      <div
        v-for="p in wallet.participants"
        :key="p.publicKeyHex"
        class="flex items-center gap-2 text-sm"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="
            p.isMe || (p.peerId && p2pStore.isPeerOnline(p.peerId))
              ? 'bg-green-500'
              : 'bg-gray-400'
          "
        />
        <span>{{ p.isMe ? 'You' : p.nickname || 'Unknown' }}</span>
      </div>
    </div>
  </div>
</template>
```

---

## Implementation Checklist

### Page Structure

- [ ] Create `pages/people/shared-wallets/[id].vue`
- [ ] Back navigation to list
- [ ] Header with wallet name and badge
- [ ] Balance card with actions
- [ ] Shared address with copy/QR
- [ ] Participants list with online status
- [ ] Transaction history section
- [ ] Settings section

### Modals

- [ ] Fund wallet modal integration
- [ ] Spend proposal modal integration
- [ ] QR code modal
- [ ] Delete confirmation modal

### Data Integration

- [ ] Load wallet from store by ID
- [ ] Refresh balance on mount
- [ ] Load transaction history from Chronik
- [ ] Check participant online status

### Actions

- [ ] Copy address to clipboard
- [ ] Delete wallet with confirmation
- [ ] Navigate to fund/spend flows

---

## Files to Create/Modify

| File                                       | Action | Description               |
| ------------------------------------------ | ------ | ------------------------- |
| `pages/people/shared-wallets/[id].vue`     | Create | Wallet detail page        |
| `components/musig2/SharedWalletDetail.vue` | Modify | Reusable detail component |

---

_Next: [05_FUNDING_FLOW.md](./05_FUNDING_FLOW.md)_
