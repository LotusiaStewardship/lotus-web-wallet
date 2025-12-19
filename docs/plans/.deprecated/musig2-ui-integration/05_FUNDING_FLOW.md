# 05: Funding Flow

## Overview

This document details the flow for funding a shared wallet. Funding is a standard transaction from the user's personal wallet to the shared wallet address.

---

## Funding Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FUND SHARED WALLET FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Fund" on shared wallet
         │
         ▼
┌─────────────────────┐
│ Fund Modal Opens    │
│ • Show wallet info  │
│ • Show your balance │
│ • Enter amount      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Confirm Transaction │
│ • Review amount     │
│ • Review fees       │
│ • Confirm send      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Processing          │
│ • Build transaction │
│ • Sign with key     │
│ • Broadcast         │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Success             │
│ • Show txid         │
│ • Update balance    │
│ • Close modal       │
└─────────────────────┘
```

---

## Modal Design

### Fund Wallet Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 Fund Family Treasury                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Current Shared Balance: 10,000.00 XPI                                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Your Personal Balance: 5,000.00 XPI                                        │
│                                                                             │
│  Amount to deposit:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [1,000.00                                              ] XPI        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [25%]  [50%]  [75%]  [Max]                                                │
│                                                                             │
│  Network Fee: ~0.001 XPI                                                    │
│  You will send: 1,000.001 XPI                                              │
│  Remaining personal balance: 3,999.999 XPI                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Sending to:                                                                │
│  lotus_16PSJKqoPbvGLWdNhKCrCkP5KrPi9...                                    │
│                                                                             │
│                                              [Cancel]  [Fund Wallet]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Processing State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 Fund Family Treasury                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   [Spinner]     │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
│                    Sending 1,000.00 XPI...                                  │
│                                                                             │
│                    Building transaction...                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Success State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ Deposit Successful!                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │       ✓         │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
│                    1,000.00 XPI sent to                                     │
│                    Family Treasury                                          │
│                                                                             │
│  Transaction ID:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ abc123...def456                                            [Copy]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  New shared balance: 11,000.00 XPI                                         │
│                                                                             │
│                                    [View Transaction]  [Done]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Implementation

### File: `components/musig2/FundWalletModal.vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet | null
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  funded: [txid: string]
}>()

const walletStore = useWalletStore()
const musig2Store = useMuSig2Store()
const draftStore = useDraftStore()
const { formatXPI, xpiToSats, satsToXpi } = useAmount()
const { success, error: showError } = useNotifications()

// State
type Step = 'input' | 'processing' | 'success'
const currentStep = ref<Step>('input')
const amountInput = ref('')
const txid = ref('')

// Computed
const personalBalance = computed(() => walletStore.balance || 0n)
const sharedBalance = computed(() => BigInt(props.wallet?.balanceSats || '0'))

const amountSats = computed(() => {
  if (!amountInput.value) return 0n
  try {
    return xpiToSats(amountInput.value)
  } catch {
    return 0n
  }
})

// Estimate fee (simplified)
const estimatedFeeSats = computed(() => 1000n) // ~0.001 XPI

const totalSendSats = computed(() => amountSats.value + estimatedFeeSats.value)

const remainingBalance = computed(() => {
  if (personalBalance.value < totalSendSats.value) return 0n
  return personalBalance.value - totalSendSats.value
})

const isValidAmount = computed(() => {
  if (amountSats.value <= 0n) return false
  if (totalSendSats.value > personalBalance.value) return false
  return true
})

const newSharedBalance = computed(() => sharedBalance.value + amountSats.value)

// Quick amount buttons
function setPercentage(percent: number) {
  const available = personalBalance.value - estimatedFeeSats.value
  if (available <= 0n) return

  const amount = (available * BigInt(percent)) / 100n
  amountInput.value = satsToXpi(amount).toString()
}

function setMax() {
  const available = personalBalance.value - estimatedFeeSats.value
  if (available <= 0n) return
  amountInput.value = satsToXpi(available).toString()
}

// Actions
async function fundWallet() {
  if (!props.wallet || !isValidAmount.value) return

  currentStep.value = 'processing'

  try {
    // Initialize draft transaction
    draftStore.initializeDraft()

    // Set recipient to shared wallet address
    const recipientId = draftStore.recipients[0]?.id
    if (recipientId) {
      draftStore.updateRecipientAddress(recipientId, props.wallet.sharedAddress)
      draftStore.updateRecipientAmount(recipientId, amountSats.value)
    }

    // Send the transaction
    const result = await draftStore.send()

    if (result.txid) {
      txid.value = result.txid

      // Refresh shared wallet balance
      await musig2Store.refreshSharedWalletBalances()

      currentStep.value = 'success'
      success(
        'Deposit Successful',
        `${formatXPI(amountSats.value)} sent to ${props.wallet.name}`,
      )
      emit('funded', result.txid)
    } else {
      throw new Error('Transaction failed')
    }
  } catch (e) {
    showError(
      'Transaction Failed',
      e instanceof Error ? e.message : 'Failed to send transaction',
    )
    currentStep.value = 'input'
  }
}

function copyTxid() {
  navigator.clipboard.writeText(txid.value)
  success('Copied', 'Transaction ID copied to clipboard')
}

function viewTransaction() {
  // Navigate to explorer
  navigateTo(`/explore/explorer/tx/${txid.value}`)
  handleDone()
}

function handleDone() {
  resetForm()
  open.value = false
}

function resetForm() {
  currentStep.value = 'input'
  amountInput.value = ''
  txid.value = ''
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    setTimeout(resetForm, 300)
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <template #content>
      <UCard v-if="wallet">
        <!-- Header -->
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              :name="
                currentStep === 'success'
                  ? 'i-lucide-check-circle'
                  : 'i-lucide-plus-circle'
              "
              class="w-5 h-5"
              :class="
                currentStep === 'success' ? 'text-green-500' : 'text-primary'
              "
            />
            <span class="font-semibold">
              {{
                currentStep === 'success'
                  ? 'Deposit Successful!'
                  : `Fund ${wallet.name}`
              }}
            </span>
          </div>
        </template>

        <!-- Input Step -->
        <div v-if="currentStep === 'input'" class="space-y-4">
          <!-- Current balances -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 bg-muted/50 rounded-lg text-center">
              <p class="text-xs text-muted">Shared Balance</p>
              <p class="font-semibold">{{ formatXPI(sharedBalance) }}</p>
            </div>
            <div class="p-3 bg-muted/50 rounded-lg text-center">
              <p class="text-xs text-muted">Your Balance</p>
              <p class="font-semibold">{{ formatXPI(personalBalance) }}</p>
            </div>
          </div>

          <!-- Amount input -->
          <UFormField label="Amount to deposit">
            <UInput
              v-model="amountInput"
              type="number"
              placeholder="0.00"
              autofocus
            >
              <template #trailing>
                <span class="text-muted">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Quick amount buttons -->
          <div class="flex gap-2">
            <UButton size="xs" variant="outline" @click="setPercentage(25)"
              >25%</UButton
            >
            <UButton size="xs" variant="outline" @click="setPercentage(50)"
              >50%</UButton
            >
            <UButton size="xs" variant="outline" @click="setPercentage(75)"
              >75%</UButton
            >
            <UButton size="xs" variant="outline" @click="setMax">Max</UButton>
          </div>

          <!-- Fee breakdown -->
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Network Fee</span>
              <span>~{{ formatXPI(estimatedFeeSats) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">You will send</span>
              <span class="font-medium">{{ formatXPI(totalSendSats) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Remaining balance</span>
              <span>{{ formatXPI(remainingBalance) }}</span>
            </div>
          </div>

          <!-- Destination -->
          <div class="p-3 bg-muted/30 rounded-lg">
            <p class="text-xs text-muted mb-1">Sending to</p>
            <code class="text-xs break-all">{{ wallet.sharedAddress }}</code>
          </div>

          <!-- Validation error -->
          <UAlert
            v-if="amountSats > 0n && !isValidAmount"
            color="red"
            icon="i-lucide-alert-circle"
          >
            <template #description>
              Insufficient balance. You need at least
              {{ formatXPI(totalSendSats) }} XPI.
            </template>
          </UAlert>
        </div>

        <!-- Processing Step -->
        <div v-else-if="currentStep === 'processing'" class="py-8 text-center">
          <UIcon
            name="i-lucide-loader-2"
            class="w-12 h-12 animate-spin text-primary mx-auto mb-4"
          />
          <p class="font-medium">Sending {{ formatXPI(amountSats) }}...</p>
          <p class="text-sm text-muted">
            Building and broadcasting transaction
          </p>
        </div>

        <!-- Success Step -->
        <div
          v-else-if="currentStep === 'success'"
          class="space-y-4 text-center"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-16 h-16 text-green-500 mx-auto"
          />

          <div>
            <p class="text-xl font-bold">{{ formatXPI(amountSats) }}</p>
            <p class="text-muted">sent to {{ wallet.name }}</p>
          </div>

          <div>
            <p class="text-sm text-muted mb-1">Transaction ID</p>
            <div class="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <code class="text-xs flex-1 truncate">{{ txid }}</code>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-lucide-copy"
                @click="copyTxid"
              />
            </div>
          </div>

          <p class="text-sm">
            New shared balance:
            <strong>{{ formatXPI(newSharedBalance) }}</strong>
          </p>
        </div>

        <!-- Footer -->
        <template #footer>
          <div class="flex gap-3">
            <template v-if="currentStep === 'input'">
              <UButton class="flex-1" variant="outline" @click="open = false">
                Cancel
              </UButton>
              <UButton
                class="flex-1"
                color="primary"
                :disabled="!isValidAmount"
                @click="fundWallet"
              >
                Fund Wallet
              </UButton>
            </template>

            <template v-else-if="currentStep === 'success'">
              <UButton variant="outline" @click="viewTransaction">
                View Transaction
              </UButton>
              <UButton color="primary" @click="handleDone"> Done </UButton>
            </template>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## Integration with Draft Store

The funding flow uses the existing draft transaction system:

```typescript
// In the fund action
draftStore.initializeDraft()
draftStore.updateRecipientAddress(recipientId, wallet.sharedAddress)
draftStore.updateRecipientAmount(recipientId, amountSats)
const result = await draftStore.send()
```

This ensures:

- Proper UTXO selection
- Fee calculation
- Transaction signing
- Broadcasting

---

## Implementation Checklist

### Modal Steps

- [ ] Input step with amount entry
- [ ] Quick percentage buttons (25%, 50%, 75%, Max)
- [ ] Fee breakdown display
- [ ] Processing step with spinner
- [ ] Success step with txid

### Validation

- [ ] Amount must be positive
- [ ] Amount + fee must not exceed balance
- [ ] Show clear error messages

### Integration

- [ ] Use draftStore for transaction building
- [ ] Refresh shared wallet balance after success
- [ ] Copy txid to clipboard
- [ ] Navigate to explorer for transaction

---

## Files to Create/Modify

| File                                    | Action | Description                 |
| --------------------------------------- | ------ | --------------------------- |
| `components/musig2/FundWalletModal.vue` | Modify | Implement full funding flow |

---

_Next: [06_SPENDING_FLOW.md](./06_SPENDING_FLOW.md)_
