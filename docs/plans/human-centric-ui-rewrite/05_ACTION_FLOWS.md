# Phase 5: Action Flows

## Overview

Action flows are the **core transactional experiences** of the wallet. This phase builds the Send, Receive, and Scan flows as modal-based experiences that can be triggered from anywhere in the app.

**Prerequisites**: Phase 1-4  
**Estimated Effort**: 5-6 days  
**Priority**: P0

---

## Goals

1. Build Send flow as a modal wizard
2. Build Receive flow with QR and sharing
3. Build Scan flow with QR camera
4. Integrate contact selection into flows
5. Implement transaction confirmation and feedback

---

## Design Philosophy

### Modal-Based Actions

Actions are **modals, not pages**. This allows:

- Triggering from anywhere (home, people, activity)
- Maintaining context (don't lose your place)
- Quick completion without navigation

### People-First Selection

When sending, the primary input is **who**, not **address**:

- Show recent contacts first
- Search by name, not just address
- Allow manual address entry as fallback

### Clear Feedback Loop

Every action follows: **Intent → Confirm → Execute → Result**

---

## Send Flow

### Send Modal Component

```vue
<!-- components/actions/SendModal.vue -->
<template>
  <UModal
    v-model:open="open"
    :ui="{ width: 'max-w-md' }"
    :prevent-close="step !== 'recipient'"
  >
    <!-- Step 1: Recipient Selection -->
    <template v-if="step === 'recipient'">
      <div class="p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Send XPI</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Search/Address Input -->
        <UInput
          v-model="recipientInput"
          icon="i-lucide-search"
          placeholder="Search contacts or enter address..."
          autofocus
          @input="handleRecipientInput"
        />

        <!-- Quick Select: Recent Contacts -->
        <div
          v-if="!recipientInput && recentContacts.length > 0"
          class="space-y-2"
        >
          <p class="text-xs text-muted font-medium">Recent</p>
          <div class="space-y-1">
            <button
              v-for="person in recentContacts"
              :key="person.id"
              class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              @click="selectRecipient(person)"
            >
              <PersonAvatar :person="person" size="sm" />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ person.name }}</p>
                <p class="text-xs text-muted truncate">
                  {{ truncateAddress(person.address) }}
                </p>
              </div>
              <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
            </button>
          </div>
        </div>

        <!-- Search Results -->
        <div
          v-if="recipientInput && searchResults.length > 0"
          class="space-y-1"
        >
          <button
            v-for="person in searchResults"
            :key="person.id"
            class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            @click="selectRecipient(person)"
          >
            <PersonAvatar :person="person" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ person.name }}</p>
              <p class="text-xs text-muted truncate">
                {{ truncateAddress(person.address) }}
              </p>
            </div>
          </button>
        </div>

        <!-- Manual Address Entry -->
        <div v-if="isValidAddress(recipientInput)" class="pt-3 border-t">
          <button
            class="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left"
            @click="selectAddress(recipientInput)"
          >
            <div
              class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-wallet" class="w-4 h-4 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium">Use this address</p>
              <p class="text-xs text-muted truncate">{{ recipientInput }}</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-primary" />
          </button>
        </div>

        <!-- No Results -->
        <div
          v-if="
            recipientInput &&
            searchResults.length === 0 &&
            !isValidAddress(recipientInput)
          "
          class="text-center py-6 text-muted"
        >
          <p class="text-sm">No contacts found</p>
          <p class="text-xs mt-1">Enter a valid Lotus address to continue</p>
        </div>
      </div>
    </template>

    <!-- Step 2: Amount Entry -->
    <template v-else-if="step === 'amount'">
      <div class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'recipient'"
          />
          <h2 class="text-lg font-semibold">Amount</h2>
        </div>

        <!-- Recipient Display -->
        <div
          class="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <template v-if="selectedPerson">
            <PersonAvatar :person="selectedPerson" size="sm" />
            <div>
              <p class="font-medium">{{ selectedPerson.name }}</p>
              <p class="text-xs text-muted">
                {{ truncateAddress(selectedPerson.address) }}
              </p>
            </div>
          </template>
          <template v-else>
            <div
              class="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center"
            >
              <UIcon name="i-lucide-wallet" class="w-4 h-4" />
            </div>
            <div>
              <p class="font-medium">Address</p>
              <p class="text-xs text-muted">
                {{ truncateAddress(recipientAddress) }}
              </p>
            </div>
          </template>
        </div>

        <!-- Amount Input -->
        <div class="text-center py-6">
          <div class="flex items-center justify-center gap-2">
            <input
              v-model="amountInput"
              type="text"
              inputmode="decimal"
              class="text-4xl font-bold font-mono text-center bg-transparent border-none outline-none w-48"
              placeholder="0"
              @input="handleAmountInput"
            />
            <span class="text-2xl text-muted">XPI</span>
          </div>

          <p class="text-sm text-muted mt-2">
            Available: {{ formattedBalance }} XPI
          </p>

          <!-- Quick Amount Buttons -->
          <div class="flex justify-center gap-2 mt-4">
            <UButton
              v-for="preset in amountPresets"
              :key="preset"
              size="xs"
              variant="outline"
              @click="setAmount(preset)"
            >
              {{ preset }} XPI
            </UButton>
            <UButton size="xs" variant="outline" @click="setMaxAmount">
              Max
            </UButton>
          </div>
        </div>

        <!-- Error Message -->
        <p v-if="amountError" class="text-sm text-error text-center">
          {{ amountError }}
        </p>

        <!-- Continue Button -->
        <UButton
          color="primary"
          block
          :disabled="!isAmountValid"
          @click="step = 'confirm'"
        >
          Continue
        </UButton>
      </div>
    </template>

    <!-- Step 3: Confirmation -->
    <template v-else-if="step === 'confirm'">
      <div class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'amount'"
          />
          <h2 class="text-lg font-semibold">Confirm</h2>
        </div>

        <!-- Transaction Summary -->
        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-4">
          <div class="text-center">
            <p class="text-sm text-muted">Sending</p>
            <p class="text-3xl font-bold font-mono">{{ amountInput }} XPI</p>
          </div>

          <div class="flex items-center justify-center gap-2 text-muted">
            <UIcon name="i-lucide-arrow-down" class="w-4 h-4" />
          </div>

          <div class="flex items-center gap-3">
            <template v-if="selectedPerson">
              <PersonAvatar :person="selectedPerson" size="md" />
              <div>
                <p class="font-medium">{{ selectedPerson.name }}</p>
                <p class="text-xs text-muted font-mono">
                  {{ truncateAddress(selectedPerson.address) }}
                </p>
              </div>
            </template>
            <template v-else>
              <div
                class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center"
              >
                <UIcon name="i-lucide-wallet" class="w-5 h-5" />
              </div>
              <div>
                <p class="font-medium">Address</p>
                <p class="text-xs text-muted font-mono">
                  {{ truncateAddress(recipientAddress) }}
                </p>
              </div>
            </template>
          </div>
        </div>

        <!-- Fee Display -->
        <div class="flex justify-between text-sm">
          <span class="text-muted">Network fee</span>
          <span class="font-mono">{{ estimatedFee }} XPI</span>
        </div>

        <div class="flex justify-between text-sm font-medium">
          <span>Total</span>
          <span class="font-mono">{{ totalAmount }} XPI</span>
        </div>

        <!-- Send Button -->
        <UButton
          color="primary"
          block
          size="lg"
          :loading="sending"
          @click="executeSend"
        >
          Send {{ amountInput }} XPI
        </UButton>
      </div>
    </template>

    <!-- Step 4: Result -->
    <template v-else-if="step === 'result'">
      <div class="p-6 text-center space-y-4">
        <!-- Success -->
        <template v-if="sendResult?.success">
          <div
            class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"
          >
            <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
          </div>

          <div>
            <h2 class="text-xl font-bold">Sent!</h2>
            <p class="text-muted">{{ amountInput }} XPI sent successfully</p>
          </div>

          <div class="space-y-2">
            <UButton
              variant="outline"
              block
              icon="i-lucide-external-link"
              @click="viewTransaction"
            >
              View Transaction
            </UButton>

            <UButton
              v-if="!selectedPerson && !existingContact"
              variant="outline"
              block
              icon="i-lucide-user-plus"
              @click="addToContacts"
            >
              Add to Contacts
            </UButton>

            <UButton color="primary" block @click="close"> Done </UButton>
          </div>
        </template>

        <!-- Error -->
        <template v-else>
          <div
            class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto"
          >
            <UIcon name="i-lucide-x" class="w-8 h-8 text-error" />
          </div>

          <div>
            <h2 class="text-xl font-bold">Failed</h2>
            <p class="text-muted">
              {{ sendResult?.error || 'Transaction failed' }}
            </p>
          </div>

          <div class="space-y-2">
            <UButton color="primary" block @click="step = 'confirm'">
              Try Again
            </UButton>

            <UButton variant="ghost" block @click="close"> Cancel </UButton>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Person } from '~/types/people'

const open = defineModel<boolean>('open')

const props = defineProps<{
  initialRecipient?: Person | string
}>()

const walletStore = useWalletStore()
const peopleStore = usePeopleStore()

// State
const step = ref<'recipient' | 'amount' | 'confirm' | 'result'>('recipient')
const recipientInput = ref('')
const recipientAddress = ref('')
const selectedPerson = ref<Person | null>(null)
const amountInput = ref('')
const sending = ref(false)
const sendResult = ref<{
  success: boolean
  txid?: string
  error?: string
} | null>(null)

// Initialize with props
watch(open, isOpen => {
  if (isOpen) {
    if (props.initialRecipient) {
      if (typeof props.initialRecipient === 'string') {
        recipientAddress.value = props.initialRecipient
        step.value = 'amount'
      } else {
        selectedPerson.value = props.initialRecipient
        recipientAddress.value = props.initialRecipient.address
        step.value = 'amount'
      }
    } else {
      reset()
    }
  }
})

// Computed
const recentContacts = computed(() => peopleStore.sortedPeople.slice(0, 5))

const searchResults = computed(() => {
  if (!recipientInput.value.trim()) return []
  const query = recipientInput.value.toLowerCase()
  return peopleStore.allPeople
    .filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query),
    )
    .slice(0, 5)
})

const formattedBalance = computed(() => {
  const xpi = Number(walletStore.balanceSats) / 1_000_000
  return xpi.toLocaleString(undefined, { maximumFractionDigits: 6 })
})

const amountPresets = [10, 50, 100]

const amountSats = computed(() => {
  const xpi = parseFloat(amountInput.value) || 0
  return BigInt(Math.floor(xpi * 1_000_000))
})

const amountError = computed(() => {
  if (!amountInput.value) return null
  if (amountSats.value <= 0n) return 'Enter a valid amount'
  if (amountSats.value > walletStore.balanceSats) return 'Insufficient balance'
  return null
})

const isAmountValid = computed(
  () =>
    amountSats.value > 0n &&
    amountSats.value <= walletStore.balanceSats &&
    !amountError.value,
)

const estimatedFee = computed(() => '0.001') // TODO: Calculate actual fee

const totalAmount = computed(() => {
  const amount = parseFloat(amountInput.value) || 0
  const fee = parseFloat(estimatedFee.value)
  return (amount + fee).toFixed(6)
})

const existingContact = computed(() =>
  peopleStore.getByAddress(recipientAddress.value),
)

// Methods
function handleRecipientInput() {
  selectedPerson.value = null
}

function selectRecipient(person: Person) {
  selectedPerson.value = person
  recipientAddress.value = person.address
  step.value = 'amount'
}

function selectAddress(address: string) {
  recipientAddress.value = address
  selectedPerson.value = null
  step.value = 'amount'
}

function isValidAddress(input: string): boolean {
  return input.startsWith('lotus_') && input.length > 20
}

function truncateAddress(address: string): string {
  if (address.length <= 20) return address
  return `${address.slice(0, 12)}...${address.slice(-6)}`
}

function handleAmountInput(e: Event) {
  const input = e.target as HTMLInputElement
  // Allow only numbers and one decimal point
  input.value = input.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  amountInput.value = input.value
}

function setAmount(amount: number) {
  amountInput.value = amount.toString()
}

function setMaxAmount() {
  const maxXpi = Number(walletStore.balanceSats) / 1_000_000
  // Leave room for fee
  const maxSend = Math.max(0, maxXpi - 0.001)
  amountInput.value = maxSend.toFixed(6)
}

async function executeSend() {
  sending.value = true

  try {
    const result = await walletStore.sendTransaction({
      to: recipientAddress.value,
      amountSats: amountSats.value,
    })

    sendResult.value = { success: true, txid: result.txid }

    // Record activity with contact
    if (selectedPerson.value) {
      peopleStore.recordActivity(
        selectedPerson.value.id,
        amountSats.value,
        true, // isSend
      )
    }

    step.value = 'result'
  } catch (error) {
    sendResult.value = {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    }
    step.value = 'result'
  } finally {
    sending.value = false
  }
}

function viewTransaction() {
  if (sendResult.value?.txid) {
    navigateTo(`/explore/tx/${sendResult.value.txid}`)
    close()
  }
}

function addToContacts() {
  navigateTo(`/people?add=true&address=${recipientAddress.value}`)
  close()
}

function close() {
  open.value = false
  // Reset after animation
  setTimeout(reset, 300)
}

function reset() {
  step.value = 'recipient'
  recipientInput.value = ''
  recipientAddress.value = ''
  selectedPerson.value = null
  amountInput.value = ''
  sendResult.value = null
}
</script>
```

---

## Receive Flow

```vue
<!-- components/actions/ReceiveModal.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-sm' }">
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Receive XPI</h2>
        <UButton variant="ghost" icon="i-lucide-x" @click="open = false" />
      </div>

      <!-- QR Code -->
      <div class="flex justify-center">
        <div class="p-4 bg-white rounded-xl">
          <QRCode :value="address" :size="200" />
        </div>
      </div>

      <!-- Address Display -->
      <div class="space-y-2">
        <p class="text-xs text-muted text-center">Your Lotus address</p>
        <div
          class="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <code class="flex-1 text-sm font-mono break-all">{{ address }}</code>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            @click="copyAddress"
          />
        </div>
      </div>

      <!-- Share Options -->
      <div class="grid grid-cols-2 gap-3">
        <UButton
          variant="outline"
          block
          icon="i-lucide-copy"
          @click="copyAddress"
        >
          Copy
        </UButton>
        <UButton
          variant="outline"
          block
          icon="i-lucide-share"
          @click="shareAddress"
        >
          Share
        </UButton>
      </div>

      <!-- Request Amount (optional) -->
      <div class="pt-4 border-t">
        <UButton
          variant="ghost"
          block
          icon="i-lucide-plus"
          @click="showAmountRequest = !showAmountRequest"
        >
          {{ showAmountRequest ? 'Hide' : 'Request specific amount' }}
        </UButton>

        <div v-if="showAmountRequest" class="mt-4 space-y-3">
          <UInput
            v-model="requestAmount"
            type="number"
            placeholder="Amount in XPI"
            icon="i-lucide-coins"
          />
          <UButton
            color="primary"
            block
            :disabled="!requestAmount"
            @click="shareWithAmount"
          >
            Share Request
          </UButton>
        </div>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open')

const walletStore = useWalletStore()
const toast = useToast()

const showAmountRequest = ref(false)
const requestAmount = ref('')

const address = computed(() => walletStore.address)

async function copyAddress() {
  await navigator.clipboard.writeText(address.value)
  toast.add({ title: 'Address copied!' })
}

async function shareAddress() {
  if (navigator.share) {
    await navigator.share({
      title: 'My Lotus Address',
      text: address.value,
    })
  } else {
    copyAddress()
  }
}

async function shareWithAmount() {
  const amount = parseFloat(requestAmount.value)
  if (!amount) return

  // Create payment request URI
  const uri = `lotus:${address.value}?amount=${amount}`

  if (navigator.share) {
    await navigator.share({
      title: `Request for ${amount} XPI`,
      text: `Please send ${amount} XPI to: ${address.value}`,
      url: uri,
    })
  } else {
    await navigator.clipboard.writeText(uri)
    toast.add({ title: 'Payment request copied!' })
  }
}
</script>
```

---

## Scan Flow

```vue
<!-- components/actions/ScanModal.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }" fullscreen>
    <div class="h-full flex flex-col bg-black">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 text-white">
        <h2 class="text-lg font-semibold">Scan QR Code</h2>
        <UButton
          variant="ghost"
          icon="i-lucide-x"
          color="white"
          @click="open = false"
        />
      </div>

      <!-- Camera View -->
      <div class="flex-1 relative">
        <video
          ref="videoRef"
          class="w-full h-full object-cover"
          autoplay
          playsinline
        />

        <!-- Scan Frame Overlay -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-64 h-64 border-2 border-white rounded-2xl relative">
            <!-- Corner accents -->
            <div
              class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"
            />
            <div
              class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"
            />
            <div
              class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"
            />
            <div
              class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"
            />
          </div>
        </div>

        <!-- Scanning indicator -->
        <div
          v-if="scanning"
          class="absolute bottom-8 left-0 right-0 text-center"
        >
          <p class="text-white text-sm">Point camera at QR code</p>
        </div>

        <!-- Error message -->
        <div
          v-if="error"
          class="absolute inset-0 flex items-center justify-center bg-black/80"
        >
          <div class="text-center text-white p-6">
            <UIcon
              name="i-lucide-camera-off"
              class="w-12 h-12 mx-auto mb-4 opacity-50"
            />
            <p class="font-medium">{{ error }}</p>
            <UButton class="mt-4" @click="requestCamera">
              Enable Camera
            </UButton>
          </div>
        </div>
      </div>

      <!-- Manual Entry Option -->
      <div class="p-4 bg-gray-900">
        <UButton variant="outline" block color="white" @click="openManualEntry">
          Enter address manually
        </UButton>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { BrowserQRCodeReader } from '@aspect-dev/browser-qr-code-reader'

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  scan: [
    result: { type: 'address' | 'payment'; address: string; amount?: number },
  ]
}>()

const videoRef = ref<HTMLVideoElement>()
const scanning = ref(false)
const error = ref<string | null>(null)

let codeReader: BrowserQRCodeReader | null = null
let stream: MediaStream | null = null

watch(open, async isOpen => {
  if (isOpen) {
    await startScanning()
  } else {
    stopScanning()
  }
})

onUnmounted(() => {
  stopScanning()
})

async function startScanning() {
  error.value = null
  scanning.value = true

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })

    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }

    codeReader = new BrowserQRCodeReader()

    const result = await codeReader.decodeFromVideoElement(videoRef.value!)

    if (result) {
      handleScanResult(result.getText())
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'NotAllowedError') {
        error.value = 'Camera access denied'
      } else if (e.name === 'NotFoundError') {
        error.value = 'No camera found'
      } else {
        error.value = 'Failed to start camera'
      }
    }
    scanning.value = false
  }
}

function stopScanning() {
  scanning.value = false

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  if (codeReader) {
    codeReader.reset()
    codeReader = null
  }
}

function handleScanResult(text: string) {
  stopScanning()

  // Parse the scanned content
  if (text.startsWith('lotus:')) {
    // Payment URI: lotus:address?amount=X
    const uri = new URL(text)
    const address = uri.pathname
    const amount = uri.searchParams.get('amount')

    emit('scan', {
      type: 'payment',
      address,
      amount: amount ? parseFloat(amount) : undefined,
    })
  } else if (text.startsWith('lotus_')) {
    // Plain address
    emit('scan', {
      type: 'address',
      address: text,
    })
  } else {
    // Unknown format
    error.value = 'Invalid QR code format'
    startScanning() // Resume scanning
    return
  }

  open.value = false
}

async function requestCamera() {
  error.value = null
  await startScanning()
}

function openManualEntry() {
  open.value = false
  // Emit event to open send modal
}
</script>
```

---

## Action Sheet Integration

Update the ActionSheet to wire up these modals:

```vue
<!-- components/navigation/ActionSheet.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-sm' }">
    <div class="p-4">
      <h2 class="text-lg font-semibold mb-4 text-center">Quick Actions</h2>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="action in actions"
          :key="action.id"
          class="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          @click="handleAction(action)"
        >
          <div
            class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <UIcon :name="action.icon" class="w-6 h-6 text-primary" />
          </div>
          <span class="text-sm font-medium">{{ action.label }}</span>
        </button>
      </div>
    </div>
  </UModal>

  <!-- Action Modals -->
  <SendModal v-model:open="sendOpen" />
  <ReceiveModal v-model:open="receiveOpen" />
  <ScanModal v-model:open="scanOpen" @scan="handleScan" />
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open')

const sendOpen = ref(false)
const receiveOpen = ref(false)
const scanOpen = ref(false)

const actions = [
  { id: 'send', icon: 'i-lucide-send', label: 'Send' },
  { id: 'receive', icon: 'i-lucide-qr-code', label: 'Receive' },
  { id: 'scan', icon: 'i-lucide-scan', label: 'Scan QR' },
  { id: 'wallet', icon: 'i-lucide-shield', label: 'New Wallet' },
]

function handleAction(action: (typeof actions)[0]) {
  open.value = false

  // Small delay to let the sheet close
  setTimeout(() => {
    switch (action.id) {
      case 'send':
        sendOpen.value = true
        break
      case 'receive':
        receiveOpen.value = true
        break
      case 'scan':
        scanOpen.value = true
        break
      case 'wallet':
        navigateTo('/people/wallets?create=true')
        break
    }
  }, 150)
}

function handleScan(result: {
  type: string
  address: string
  amount?: number
}) {
  // Open send modal with scanned data
  sendOpen.value = true
  // Pass data to send modal via props or store
}
</script>
```

---

## Tasks Checklist

### Send Flow

- [ ] Create `components/actions/SendModal.vue`
- [ ] Implement recipient selection step
- [ ] Implement amount entry step
- [ ] Implement confirmation step
- [ ] Implement result step
- [ ] Wire to wallet store for transaction execution
- [ ] Add contact activity recording

### Receive Flow

- [ ] Create `components/actions/ReceiveModal.vue`
- [ ] Implement QR code generation
- [ ] Implement copy/share functionality
- [ ] Implement amount request feature

### Scan Flow

- [ ] Create `components/actions/ScanModal.vue`
- [ ] Implement camera access
- [ ] Implement QR code scanning
- [ ] Parse Lotus addresses and payment URIs
- [ ] Handle errors gracefully

### Integration

- [ ] Update ActionSheet to open modals
- [ ] Wire scan results to send flow
- [ ] Add keyboard shortcuts (if applicable)

---

## Verification

- [ ] Send flow completes successfully
- [ ] Contact selection works
- [ ] Manual address entry works
- [ ] Amount validation works
- [ ] Transaction confirmation displays correctly
- [ ] Success/error states display correctly
- [ ] Receive QR code generates correctly
- [ ] Copy/share works
- [ ] Scan opens camera
- [ ] Scan detects QR codes
- [ ] Scanned address opens send flow

---

_Next: [06_SHARED_WALLETS.md](./06_SHARED_WALLETS.md)_
