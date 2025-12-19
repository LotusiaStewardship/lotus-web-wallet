# Phase 4: Send & Receive Pages

## Overview

The send and receive pages are the core transaction functionality of the wallet. This phase implements a complete send flow with QR scanning, transaction preview/confirmation, and success states. The receive page gets payment request generation with BIP21 URIs.

**Priority**: P0 (Critical)
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 1 (Layout), Phase 3 (Home), existing send/receive components

---

## Goals

1. Send page with QR code scanning
2. Transaction confirmation modal before sending
3. Success state with celebration and next actions
4. Receive page with payment request generation (amount + memo)
5. BIP21 URI encoding in QR codes
6. "Add to contacts" prompt for new recipients

---

## 1. Transact Hub Page

### File: `pages/transact/index.vue`

```vue
<script setup lang="ts">
definePageMeta({
  title: 'Transact',
})

const subPages = [
  {
    label: 'Send',
    icon: 'i-lucide-send',
    to: '/transact/send',
    description: 'Send Lotus to anyone',
    color: 'primary',
  },
  {
    label: 'Receive',
    icon: 'i-lucide-qr-code',
    to: '/transact/receive',
    description: 'Get your address or request payment',
    color: 'success',
  },
  {
    label: 'History',
    icon: 'i-lucide-history',
    to: '/transact/history',
    description: 'View all transactions',
    color: 'info',
  },
]
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-arrow-left-right"
      title="Transact"
      subtitle="Send, receive, and track your Lotus transactions"
    />

    <div class="grid gap-4 md:grid-cols-3">
      <AppActionCard
        v-for="page in subPages"
        :key="page.to"
        :icon="page.icon"
        :label="page.label"
        :description="page.description"
        :to="page.to"
        :icon-color="page.color"
      />
    </div>
  </div>
</template>
```

---

## 2. Send Page

### File: `pages/transact/send.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useContactsStore } from '~/stores/contacts'
import { useDraftStore } from '~/stores/draft'
import { useOnboardingStore } from '~/stores/onboarding'

definePageMeta({
  title: 'Send',
})

const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const draftStore = useDraftStore()
const onboardingStore = useOnboardingStore()

// Form state
const recipient = ref((route.query.to as string) || '')
const amount = ref('')
const memo = ref('')
const showAdvanced = ref(false)

// QR Scanner state
const showScanner = ref(route.query.scan === 'true')

// Confirmation modal state
const showConfirmation = ref(false)

// Success state
const showSuccess = ref(false)
const successTxid = ref('')

// Error state
const error = ref('')

// Loading state
const sending = ref(false)

// Recipient validation
const recipientValid = computed(() => {
  if (!recipient.value) return null
  return walletStore.validateAddress(recipient.value)
})

// Amount validation
const amountSats = computed(() => {
  const num = parseFloat(amount.value)
  if (isNaN(num) || num <= 0) return 0
  return Math.floor(num * 1e6) // Convert to sats
})

const amountValid = computed(() => {
  if (!amount.value) return null
  if (amountSats.value <= 0) return false
  if (amountSats.value > walletStore.balanceSats) return false
  return true
})

// Fee estimation
const estimatedFee = computed(() => {
  // Simplified fee estimation
  return 226 // ~226 sats for typical transaction
})

// Total amount
const totalSats = computed(() => amountSats.value + estimatedFee.value)

// Can send?
const canSend = computed(
  () =>
    recipientValid.value &&
    amountValid.value &&
    totalSats.value <= walletStore.balanceSats,
)

// Contact lookup
const recipientContact = computed(() => {
  if (!recipient.value) return null
  return contactsStore.getContactByAddress(recipient.value)
})

// Handle QR scan result
function handleScanResult(result: string) {
  showScanner.value = false

  // Parse BIP21 URI or plain address
  if (result.startsWith('lotus:')) {
    const parsed = parseBIP21(result)
    recipient.value = parsed.address
    if (parsed.amount) amount.value = parsed.amount.toString()
    if (parsed.message) memo.value = parsed.message
  } else {
    recipient.value = result
  }
}

function parseBIP21(uri: string): {
  address: string
  amount?: number
  message?: string
} {
  const url = new URL(uri)
  const address = url.pathname
  const amount = url.searchParams.get('amount')
  const message = url.searchParams.get('message')
  return {
    address,
    amount: amount ? parseFloat(amount) : undefined,
    message: message || undefined,
  }
}

// Show confirmation
function showConfirmationModal() {
  if (!canSend.value) return
  error.value = ''
  showConfirmation.value = true
}

// Execute send
async function executeSend() {
  if (!canSend.value || sending.value) return

  sending.value = true
  error.value = ''

  try {
    const txid = await walletStore.sendTransaction({
      to: recipient.value,
      amount: amountSats.value,
      memo: memo.value || undefined,
    })

    successTxid.value = txid
    showConfirmation.value = false
    showSuccess.value = true

    // Mark checklist item
    onboardingStore.completeChecklistItem('sendFirst')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to send transaction'
  } finally {
    sending.value = false
  }
}

// Reset form
function resetForm() {
  recipient.value = ''
  amount.value = ''
  memo.value = ''
  showSuccess.value = false
  successTxid.value = ''
}

// Send more
function sendMore() {
  resetForm()
}

// Use max balance
function useMaxBalance() {
  const maxSats = walletStore.balanceSats - estimatedFee.value
  if (maxSats > 0) {
    amount.value = (maxSats / 1e6).toString()
  }
}

// Select contact
function selectContact(contact: Contact) {
  recipient.value = contact.address
}
</script>

<template>
  <div class="space-y-6 max-w-lg mx-auto">
    <!-- Success State -->
    <SendSuccess
      v-if="showSuccess"
      :txid="successTxid"
      :amount="amountSats"
      :recipient="recipient"
      :recipient-contact="recipientContact"
      @send-more="sendMore"
      @view-details="router.push(`/explore/explorer/tx/${successTxid}`)"
      @add-contact="
        router.push(`/people/contacts?add=true&address=${recipient}`)
      "
    />

    <!-- Send Form -->
    <template v-else>
      <AppHeroCard
        icon="i-lucide-send"
        title="Send Lotus"
        subtitle="Transfer XPI to any address"
      />

      <!-- QR Scanner Modal -->
      <QRScannerModal v-model:open="showScanner" @scan="handleScanResult" />

      <!-- Recipient Input -->
      <AppCard title="Recipient" icon="i-lucide-user">
        <div class="space-y-3">
          <div class="relative">
            <input
              v-model="recipient"
              type="text"
              placeholder="Enter address or select contact"
              class="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
              :class="{
                'border-red-500 focus:ring-red-500': recipientValid === false,
                'border-green-500 focus:ring-green-500':
                  recipientValid === true,
              }"
            />
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary"
              @click="showScanner = true"
            >
              <UIcon name="i-lucide-scan" class="w-5 h-5" />
            </button>
          </div>

          <!-- Validation feedback -->
          <div v-if="recipientValid === false" class="text-sm text-red-500">
            Invalid address format
          </div>

          <!-- Contact match -->
          <div
            v-if="recipientContact"
            class="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
          >
            <UIcon name="i-lucide-user-check" class="w-4 h-4 text-green-600" />
            <span class="text-sm text-green-700 dark:text-green-400">
              Sending to <strong>{{ recipientContact.name }}</strong>
            </span>
          </div>

          <!-- Recent contacts -->
          <div v-if="!recipient && contactsStore.recentContacts.length > 0">
            <div class="text-xs text-gray-500 mb-2">Recent contacts</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="contact in contactsStore.recentContacts.slice(0, 4)"
                :key="contact.id"
                class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                @click="selectContact(contact)"
              >
                <ContactAvatar :contact="contact" size="xs" />
                <span class="text-sm">{{ contact.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Amount Input -->
      <AppCard title="Amount" icon="i-lucide-coins">
        <div class="space-y-3">
          <div class="relative">
            <input
              v-model="amount"
              type="number"
              step="0.000001"
              min="0"
              placeholder="0.00"
              class="w-full px-4 py-3 pr-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-2xl"
              :class="{
                'border-red-500 focus:ring-red-500': amountValid === false,
              }"
            />
            <span
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium"
            >
              XPI
            </span>
          </div>

          <!-- Balance info -->
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">
              Available: {{ walletStore.formattedBalance }} XPI
            </span>
            <button class="text-primary hover:underline" @click="useMaxBalance">
              Use Max
            </button>
          </div>

          <!-- Amount validation -->
          <div v-if="amountValid === false" class="text-sm text-red-500">
            <template v-if="amountSats > walletStore.balanceSats">
              Insufficient balance
            </template>
            <template v-else> Invalid amount </template>
          </div>
        </div>
      </AppCard>

      <!-- Advanced Options -->
      <AppCard v-if="showAdvanced" title="Advanced" icon="i-lucide-settings-2">
        <div class="space-y-4">
          <!-- Memo -->
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Memo (optional)
            </label>
            <input
              v-model="memo"
              type="text"
              placeholder="Add a note to this transaction"
              maxlength="220"
              class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div class="text-xs text-gray-500 mt-1">
              {{ memo.length }}/220 characters
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Toggle Advanced -->
      <button
        class="flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
        @click="showAdvanced = !showAdvanced"
      >
        <UIcon
          :name="showAdvanced ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="w-4 h-4"
        />
        {{ showAdvanced ? 'Hide' : 'Show' }} advanced options
      </button>

      <!-- Fee Summary -->
      <div
        v-if="amountSats > 0"
        class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
      >
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Amount</span>
          <span class="font-mono">{{ (amountSats / 1e6).toFixed(6) }} XPI</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Network Fee</span>
          <span class="font-mono"
            >{{ (estimatedFee / 1e6).toFixed(6) }} XPI</span
          >
        </div>
        <div
          class="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-medium"
        >
          <span>Total</span>
          <span class="font-mono">{{ (totalSats / 1e6).toFixed(6) }} XPI</span>
        </div>
      </div>

      <!-- Error Display -->
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle">
        {{ error }}
      </UAlert>

      <!-- Send Button -->
      <UButton
        color="primary"
        size="lg"
        block
        :disabled="!canSend"
        @click="showConfirmationModal"
      >
        <UIcon name="i-lucide-send" class="w-5 h-5 mr-2" />
        Review Transaction
      </UButton>

      <!-- Confirmation Modal -->
      <SendConfirmationModal
        v-model:open="showConfirmation"
        :recipient="recipient"
        :recipient-contact="recipientContact"
        :amount-sats="amountSats"
        :fee-sats="estimatedFee"
        :memo="memo"
        :sending="sending"
        @confirm="executeSend"
      />
    </template>
  </div>
</template>
```

---

## 3. Send Confirmation Modal

### File: `components/send/SendConfirmationModal.vue`

```vue
<script setup lang="ts">
import type { Contact } from '~/types/contact'

const props = defineProps<{
  recipient: string
  recipientContact: Contact | null
  amountSats: number
  feeSats: number
  memo?: string
  sending: boolean
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: []
}>()

const totalSats = computed(() => props.amountSats + props.feeSats)

function formatAmount(sats: number): string {
  return (sats / 1e6).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <div class="p-6">
      <!-- Header -->
      <div class="text-center mb-6">
        <div
          class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <UIcon name="i-lucide-send" class="w-8 h-8 text-primary" />
        </div>
        <h2 class="text-xl font-bold">Confirm Transaction</h2>
        <p class="text-gray-500 mt-1">
          Please review the details before sending
        </p>
      </div>

      <!-- Details -->
      <div class="space-y-4 mb-6">
        <!-- Recipient -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Sending to
          </div>
          <div v-if="recipientContact" class="flex items-center gap-3">
            <ContactAvatar :contact="recipientContact" size="sm" />
            <div>
              <div class="font-medium">{{ recipientContact.name }}</div>
              <div class="text-sm text-gray-500 font-mono truncate">
                {{ recipient }}
              </div>
            </div>
          </div>
          <div v-else class="font-mono text-sm break-all">{{ recipient }}</div>
        </div>

        <!-- Amount -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Amount
          </div>
          <div class="text-3xl font-bold font-mono text-primary">
            {{ formatAmount(amountSats) }}
            <span class="text-lg text-gray-500">XPI</span>
          </div>
        </div>

        <!-- Fee & Total -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Network Fee</span>
            <span class="font-mono">{{ formatAmount(feeSats) }} XPI</span>
          </div>
          <div
            class="flex justify-between font-medium text-base pt-2 border-t border-gray-200 dark:border-gray-700"
          >
            <span>Total</span>
            <span class="font-mono">{{ formatAmount(totalSats) }} XPI</span>
          </div>
        </div>

        <!-- Memo -->
        <div v-if="memo" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Memo
          </div>
          <div class="text-sm">{{ memo }}</div>
        </div>

        <!-- Confirmation Time -->
        <div
          class="flex items-center justify-center gap-2 text-sm text-gray-500"
        >
          <UIcon name="i-lucide-clock" class="w-4 h-4" />
          <span>Usually confirms in ~10 seconds</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <UButton
          color="neutral"
          variant="soft"
          size="lg"
          class="flex-1"
          :disabled="sending"
          @click="open = false"
        >
          Edit
        </UButton>
        <UButton
          color="primary"
          size="lg"
          class="flex-1"
          :loading="sending"
          @click="emit('confirm')"
        >
          {{ sending ? 'Sending...' : 'Confirm & Send' }}
        </UButton>
      </div>
    </div>
  </UModal>
</template>
```

---

## 4. Send Success Component

### File: `components/send/SendSuccess.vue`

```vue
<script setup lang="ts">
import type { Contact } from '~/types/contact'

const props = defineProps<{
  txid: string
  amount: number
  recipient: string
  recipientContact: Contact | null
}>()

const emit = defineEmits<{
  sendMore: []
  viewDetails: []
  addContact: []
}>()

// Confetti animation on mount
const showConfetti = ref(true)
onMounted(() => {
  setTimeout(() => (showConfetti.value = false), 3000)
})

function formatAmount(sats: number): string {
  return (sats / 1e6).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

// Copy txid
const copied = ref(false)
function copyTxid() {
  navigator.clipboard.writeText(props.txid)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="text-center">
    <!-- Confetti Animation (CSS-based) -->
    <div v-if="showConfetti" class="confetti-container">
      <!-- Add confetti elements here -->
    </div>

    <!-- Success Icon -->
    <div
      class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6 animate-bounce-once"
    >
      <UIcon name="i-lucide-check-circle" class="w-12 h-12 text-green-600" />
    </div>

    <!-- Title -->
    <h2 class="text-2xl font-bold mb-2">Transaction Sent!</h2>
    <p class="text-gray-500 mb-6">
      {{ formatAmount(amount) }} XPI sent successfully
    </p>

    <!-- Recipient Info -->
    <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
      <div class="text-sm text-gray-500 mb-2">Sent to</div>
      <div
        v-if="recipientContact"
        class="flex items-center justify-center gap-2"
      >
        <ContactAvatar :contact="recipientContact" size="sm" />
        <span class="font-medium">{{ recipientContact.name }}</span>
      </div>
      <div v-else class="font-mono text-sm truncate">{{ recipient }}</div>
    </div>

    <!-- Transaction ID -->
    <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
      <div class="text-sm text-gray-500 mb-2">Transaction ID</div>
      <div class="flex items-center justify-center gap-2">
        <span class="font-mono text-sm truncate max-w-[200px]">{{ txid }}</span>
        <button class="text-gray-400 hover:text-primary" @click="copyTxid">
          <UIcon
            :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            class="w-4 h-4"
          />
        </button>
      </div>
    </div>

    <!-- Add to Contacts (if new recipient) -->
    <UAlert
      v-if="!recipientContact"
      color="info"
      icon="i-lucide-user-plus"
      class="mb-6 text-left"
    >
      <template #title>Save this address?</template>
      <template #description>
        <p class="mb-2">
          Add this address to your contacts for easier sending next time.
        </p>
        <UButton size="sm" @click="emit('addContact')">
          Add to Contacts
        </UButton>
      </template>
    </UAlert>

    <!-- Actions -->
    <div class="flex gap-3">
      <UButton
        color="neutral"
        variant="soft"
        size="lg"
        class="flex-1"
        @click="emit('viewDetails')"
      >
        <UIcon name="i-lucide-external-link" class="w-4 h-4 mr-2" />
        View Details
      </UButton>
      <UButton
        color="primary"
        size="lg"
        class="flex-1"
        @click="emit('sendMore')"
      >
        <UIcon name="i-lucide-send" class="w-4 h-4 mr-2" />
        Send More
      </UButton>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce-once {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-bounce-once {
  animation: bounce-once 0.5s ease-in-out;
}
</style>
```

---

## 5. Receive Page

### File: `pages/transact/receive.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'

definePageMeta({
  title: 'Receive',
})

const route = useRoute()
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()

// Payment request mode
const requestMode = ref(route.query.request === 'true')

// Request amount
const requestAmount = ref('')
const requestMemo = ref('')

// Current address
const address = computed(() => walletStore.receiveAddress)

// Generate BIP21 URI
const paymentUri = computed(() => {
  if (!address.value) return ''

  let uri = `lotus:${address.value}`
  const params = new URLSearchParams()

  if (requestAmount.value) {
    const amount = parseFloat(requestAmount.value)
    if (!isNaN(amount) && amount > 0) {
      params.set('amount', amount.toString())
    }
  }

  if (requestMemo.value) {
    params.set('message', requestMemo.value)
  }

  const paramString = params.toString()
  if (paramString) {
    uri += `?${paramString}`
  }

  return uri
})

// QR code data
const qrData = computed(() =>
  requestMode.value ? paymentUri.value : address.value,
)

// Copy address/URI
const copied = ref(false)
function copyToClipboard() {
  const text = requestMode.value ? paymentUri.value : address.value
  navigator.clipboard.writeText(text || '')
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// Share (native share API)
async function share() {
  if (!navigator.share) return

  try {
    await navigator.share({
      title: 'Lotus Payment Request',
      text: requestMode.value
        ? `Please send ${requestAmount.value || 'some'} XPI to my Lotus wallet`
        : 'My Lotus wallet address',
      url: paymentUri.value,
    })
  } catch (e) {
    // User cancelled or share failed
  }
}

// Mark checklist when address is viewed
onMounted(() => {
  // Could track if user actually shares/copies
})
</script>

<template>
  <div class="space-y-6 max-w-lg mx-auto">
    <AppHeroCard
      icon="i-lucide-qr-code"
      title="Receive Lotus"
      subtitle="Share your address or create a payment request"
    />

    <!-- Mode Toggle -->
    <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      <button
        class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
        :class="
          !requestMode
            ? 'bg-white dark:bg-gray-700 shadow'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="requestMode = false"
      >
        Address Only
      </button>
      <button
        class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
        :class="
          requestMode
            ? 'bg-white dark:bg-gray-700 shadow'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="requestMode = true"
      >
        Payment Request
      </button>
    </div>

    <!-- Payment Request Form -->
    <AppCard
      v-if="requestMode"
      title="Request Details"
      icon="i-lucide-file-text"
    >
      <div class="space-y-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Amount (optional)
          </label>
          <div class="relative">
            <input
              v-model="requestAmount"
              type="number"
              step="0.000001"
              min="0"
              placeholder="0.00"
              class="w-full px-4 py-2 pr-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
            />
            <span
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              XPI
            </span>
          </div>
        </div>

        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Memo (optional)
          </label>
          <input
            v-model="requestMemo"
            type="text"
            placeholder="What's this payment for?"
            maxlength="100"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>
    </AppCard>

    <!-- QR Code -->
    <AppCard>
      <div class="text-center">
        <!-- QR Code Display -->
        <div class="bg-white p-4 rounded-xl inline-block mb-4">
          <QRCode :value="qrData" :size="200" level="M" />
        </div>

        <!-- Address Display -->
        <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
          <div class="text-xs text-gray-500 mb-1">
            {{ requestMode ? 'Payment URI' : 'Your Address' }}
          </div>
          <div class="font-mono text-sm break-all">
            {{ requestMode ? paymentUri : address }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton
            color="primary"
            variant="soft"
            class="flex-1"
            @click="copyToClipboard"
          >
            <UIcon
              :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              class="w-4 h-4 mr-2"
            />
            {{ copied ? 'Copied!' : 'Copy' }}
          </UButton>
          <UButton
            v-if="navigator.share"
            color="primary"
            class="flex-1"
            @click="share"
          >
            <UIcon name="i-lucide-share" class="w-4 h-4 mr-2" />
            Share
          </UButton>
        </div>
      </div>
    </AppCard>

    <!-- Privacy Notice -->
    <UAlert color="warning" icon="i-lucide-shield-alert" variant="subtle">
      <template #title>Privacy Notice</template>
      <template #description>
        Anyone who knows this address can see your transaction history. For
        better privacy, consider using a new address for each transaction.
      </template>
    </UAlert>

    <!-- Recent Incoming (placeholder) -->
    <AppCard
      title="Waiting for Payment"
      icon="i-lucide-clock"
      v-if="requestMode && requestAmount"
    >
      <div class="text-center py-4 text-gray-500">
        <UIcon
          name="i-lucide-loader-2"
          class="w-8 h-8 animate-spin mx-auto mb-2"
        />
        <p>Listening for incoming payment...</p>
        <p class="text-sm">You'll be notified when payment is received</p>
      </div>
    </AppCard>
  </div>
</template>
```

---

## 6. QR Scanner Modal

### File: `components/send/QRScannerModal.vue`

```vue
<script setup lang="ts">
// Note: Requires vue-qrcode-reader package
// npm install vue-qrcode-reader

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  scan: [result: string]
}>()

const error = ref('')
const hasCamera = ref(true)

function onDecode(result: string) {
  if (result) {
    emit('scan', result)
    open.value = false
  }
}

function onError(err: Error) {
  if (err.name === 'NotAllowedError') {
    error.value =
      'Camera access denied. Please allow camera access to scan QR codes.'
  } else if (err.name === 'NotFoundError') {
    error.value = 'No camera found on this device.'
    hasCamera.value = false
  } else {
    error.value = 'Failed to access camera: ' + err.message
  }
}

// Manual input fallback
const manualInput = ref('')
function submitManual() {
  if (manualInput.value.trim()) {
    emit('scan', manualInput.value.trim())
    open.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <div class="p-6">
      <div class="text-center mb-4">
        <h2 class="text-xl font-bold">Scan QR Code</h2>
        <p class="text-gray-500 text-sm">
          Point your camera at a Lotus address QR code
        </p>
      </div>

      <!-- Camera View -->
      <div
        v-if="hasCamera && !error"
        class="relative aspect-square bg-black rounded-lg overflow-hidden mb-4"
      >
        <QrcodeStream @decode="onDecode" @error="onError">
          <!-- Scanning overlay -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-48 h-48 border-2 border-white/50 rounded-lg">
              <div
                class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"
              />
              <div
                class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"
              />
              <div
                class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"
              />
              <div
                class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"
              />
            </div>
          </div>
        </QrcodeStream>
      </div>

      <!-- Error State -->
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-camera-off"
        class="mb-4"
      >
        {{ error }}
      </UAlert>

      <!-- Manual Input Fallback -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div class="text-sm text-gray-500 mb-2">Or paste address manually:</div>
        <div class="flex gap-2">
          <input
            v-model="manualInput"
            type="text"
            placeholder="lotus_test1q..."
            class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
          />
          <UButton @click="submitManual" :disabled="!manualInput.trim()">
            Use
          </UButton>
        </div>
      </div>

      <!-- Close Button -->
      <UButton
        color="neutral"
        variant="ghost"
        block
        class="mt-4"
        @click="open = false"
      >
        Cancel
      </UButton>
    </div>
  </UModal>
</template>
```

---

## 7. Implementation Checklist

### Pages

- [ ] Create `pages/transact/index.vue` (hub)
- [ ] Create `pages/transact/send.vue`
- [ ] Create `pages/transact/receive.vue`

### Components

- [ ] Create/update `components/send/SendConfirmationModal.vue`
- [ ] Create/update `components/send/SendSuccess.vue`
- [ ] Create `components/send/QRScannerModal.vue`
- [ ] Create QRCode display component (or use library)

### Dependencies

- [ ] Install `vue-qrcode-reader` for QR scanning
- [ ] Install QR code generation library (e.g., `qrcode.vue`)

### Store Updates

- [ ] Add `sendTransaction` method to wallet store
- [ ] Add `validateAddress` method
- [ ] Add `receiveAddress` getter

### Features

- [ ] QR code scanning
- [ ] BIP21 URI parsing
- [ ] BIP21 URI generation
- [ ] Transaction confirmation modal
- [ ] Success state with confetti
- [ ] Add to contacts prompt
- [ ] Payment request mode

### Testing

- [ ] Test send flow end-to-end
- [ ] Test QR scanning (mobile)
- [ ] Test manual address entry
- [ ] Test payment request generation
- [ ] Test BIP21 URI parsing
- [ ] Test insufficient balance handling
- [ ] Test invalid address handling

---

## Next Phase

Once this phase is complete, proceed to [05_TRANSACTION_HISTORY.md](./05_TRANSACTION_HISTORY.md) to implement the transaction history page with search and filtering.
