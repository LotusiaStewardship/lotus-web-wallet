<script setup lang="ts">
/**
 * Send Modal Component
 *
 * Multi-step modal for sending XPI:
 * 1. Recipient selection (contact or address)
 * 2. Amount entry
 * 3. Confirmation
 * 4. Result
 *
 * Uses useOverlay pattern - receives props and emits 'close' event with result.
 */
import { usePeopleStore } from '~/stores/people'
import { useWalletStore } from '~/stores/wallet'
import { useDraftStore } from '~/stores/draft'
import { useNetworkStore } from '~/stores/network'
import { truncateAddress, formatXPI } from '~/utils/formatting'
import { registerBackHandler } from '~/composables/useOverlays'
import type { Person } from '~/types/people'

const props = defineProps<{
  initialRecipient?: Person | string
  initialAmount?: number
  backPressed?: number // Counter that increments on each back button press
}>()

const emit = defineEmits<{
  close: [result?: { success: boolean; txid?: string; error?: string }]
}>()

const peopleStore = usePeopleStore()
const walletStore = useWalletStore()
const draftStore = useDraftStore()
const networkStore = useNetworkStore()
const { isValidAddress, isValidForCurrentNetwork, getNetworkFromAddress } = useAddress()
const overlays = useOverlays()

// State
const step = ref<'recipient' | 'amount' | 'confirm' | 'result'>('recipient')
const recipientInput = ref('')
const selectedPerson = ref<Person | null>(null)
const amountInput = ref('')
const sendResult = ref<{ success: boolean; txid?: string; error?: string } | null>(null)

// Register back handler for multi-stage navigation
// Returns true if modal should close, false if we handled navigation internally
onMounted(() => {
  registerBackHandler(() => {
    if (step.value === 'amount') {
      // If we had an initial recipient, close instead of going back
      if (props.initialRecipient) {
        return true // Close modal
      } else {
        step.value = 'recipient'
        return false // Handled internally
      }
    } else if (step.value === 'confirm') {
      step.value = 'amount'
      return false // Handled internally
    } else if (step.value === 'result') {
      // Result is final, close the modal
      return true
    } else {
      // On first step (recipient), allow close
      return true
    }
  })
})

// Initialize on mount (props come from useOverlay)
onMounted(() => {
  draftStore.reset()

  if (props.initialRecipient) {
    if (typeof props.initialRecipient === 'string') {
      draftStore.setAddress(props.initialRecipient)
      step.value = 'amount'
    } else {
      selectedPerson.value = props.initialRecipient
      draftStore.setAddress(props.initialRecipient.address)
      step.value = 'amount'
    }
  } else {
    reset()
  }

  if (props.initialAmount) {
    amountInput.value = props.initialAmount.toString()
    const sats = BigInt(Math.floor(props.initialAmount * 1_000_000))
    draftStore.setAmount(sats)
  }
})

// Watch for prop changes (when modal.patch() is called)
watch(() => props.initialRecipient, (newRecipient) => {
  if (newRecipient) {
    if (typeof newRecipient === 'string') {
      draftStore.setAddress(newRecipient)
      step.value = 'amount'
    } else {
      selectedPerson.value = newRecipient
      draftStore.setAddress(newRecipient.address)
      step.value = 'amount'
    }
  }
})

watch(() => props.initialAmount, (newAmount) => {
  if (newAmount) {
    amountInput.value = newAmount.toString()
    const sats = BigInt(Math.floor(newAmount * 1_000_000))
    draftStore.setAmount(sats)
  }
})

// Computed
const recentContacts = computed(() => peopleStore.allPeople.slice(0, 5))

const searchResults = computed(() => {
  if (!recipientInput.value.trim()) return []
  const query = recipientInput.value.toLowerCase()
  return peopleStore.allPeople
    .filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query)
    )
    .slice(0, 5)
})

const formattedBalance = computed(() => {
  return formatXPI(walletStore.balance?.spendable || '0', { minDecimals: 2, maxDecimals: 6 })
})

// Percentage-based amount presets
const amountPresets = [
  { label: '25%', percent: 0.25 },
  { label: '50%', percent: 0.50 },
  { label: '75%', percent: 0.75 },
]

const recipientAddress = computed(() => {
  return draftStore.address
})

const amountSats = computed(() => {
  const xpi = parseFloat(amountInput.value) || 0
  return BigInt(Math.floor(xpi * 1_000_000))
})

const amountError = computed(() => {
  if (!amountInput.value) return null
  if (amountSats.value <= 0n) return 'Enter a valid amount'
  const spendable = BigInt(walletStore.balance?.spendable || '0')
  if (amountSats.value > spendable) return 'Insufficient balance'
  return null
})

const isAmountValid = computed(() => {
  return amountSats.value > 0n && !amountError.value
})

const estimatedFee = computed(() => {
  return formatXPI(draftStore.estimatedFee, { minDecimals: 3 })
})

const totalAmount = computed(() => {
  const amount = parseFloat(amountInput.value) || 0
  const fee = draftStore.estimatedFee / 1_000_000
  return (amount + fee).toFixed(6)
})

const existingContact = computed(() =>
  peopleStore.getByAddress(recipientAddress.value)
)

// Methods
function handleRecipientInput() {
  selectedPerson.value = null
}

function selectRecipient(person: Person) {
  selectedPerson.value = person
  draftStore.setAddress(person.address)
  step.value = 'amount'
}

function selectAddress(address: string) {
  selectedPerson.value = null
  draftStore.setAddress(address)
  step.value = 'amount'
}

// Check if input looks like a valid address (uses composable for proper validation)
const inputLooksLikeAddress = computed(() => {
  const input = recipientInput.value
  if (!input) return false
  return isValidAddress(input)
})

// Check if address is for wrong network
const isWrongNetwork = computed(() => {
  const input = recipientInput.value
  if (!input || !isValidAddress(input)) return false
  return !isValidForCurrentNetwork(input)
})

// Get the network name of the entered address
const enteredAddressNetwork = computed(() => {
  const input = recipientInput.value
  if (!input) return null
  return getNetworkFromAddress(input)
})

function handleAmountInput(e: Event) {
  const input = e.target as HTMLInputElement
  input.value = input.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  amountInput.value = input.value

  const sats = BigInt(Math.floor((parseFloat(input.value) || 0) * 1_000_000))
  draftStore.setAmount(sats)
}

function setAmount(amount: number) {
  amountInput.value = amount.toFixed(6).replace(/\.?0+$/, '')
  const sats = BigInt(Math.floor(amount * 1_000_000))
  draftStore.setAmount(sats)
}

function setPercentAmount(percent: number) {
  const spendable = BigInt(walletStore.balance?.spendable || '0')
  const amountSats = (spendable * BigInt(Math.floor(percent * 100))) / 100n
  const amountXpi = Number(amountSats) / 1_000_000
  setAmount(amountXpi)
}

function setMaxAmount() {
  draftStore.setSendMax(true)
  const maxXpi = Number(draftStore.maxSendable) / 1_000_000
  amountInput.value = maxXpi.toFixed(6)
}

async function executeSend() {
  try {
    const txid = await draftStore.send()

    sendResult.value = { success: true, txid }

    // Record activity with contact
    if (selectedPerson.value) {
      peopleStore.recordActivity(selectedPerson.value.id, amountSats.value, true)
    }

    step.value = 'result'
  } catch (error) {
    sendResult.value = {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    }
    step.value = 'result'
  }
}

function viewTransaction() {
  if (sendResult.value?.txid) {
    navigateTo(`/explore/tx/${sendResult.value.txid}`)
    close()
  }
}

async function addToContacts() {
  // Store the address before closing
  const address = recipientAddress.value
  close()
  // Wait a tick for modal to close, then open add contact modal
  await nextTick()
  await overlays.openAddContactModal({ initialAddress: address })
}

function close(result?: { success: boolean; txid?: string; error?: string }) {
  reset()
  emit('close', result)
}

function reset() {
  step.value = 'recipient'
  recipientInput.value = ''
  selectedPerson.value = null
  amountInput.value = ''
  sendResult.value = null
  draftStore.reset()
}
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <!-- Step 1: Recipient Selection -->
      <div v-if="step === 'recipient'" class="p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Send XPI</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="() => close()" />
        </div>

        <!-- Search/Address Input -->
        <FormInput v-model="recipientInput" icon="i-lucide-search" placeholder="Search contacts or enter address..."
          autofocus @input="handleRecipientInput" class="w-full" />

        <!-- Quick Select: Recent Contacts -->
        <div v-if="!recipientInput && recentContacts.length > 0" class="space-y-2">
          <p class="text-xs text-gray-500 font-medium">Recent</p>
          <div class="space-y-1">
            <button v-for="person in recentContacts" :key="person.id"
              class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              @click="selectRecipient(person)">
              <PeoplePersonAvatar :person="person" size="sm" />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ person.name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ truncateAddress(person.address) }}</p>
              </div>
              <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <!-- Search Results -->
        <div v-if="recipientInput && searchResults.length > 0" class="space-y-1">
          <button v-for="person in searchResults" :key="person.id"
            class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            @click="selectRecipient(person)">
            <PeoplePersonAvatar :person="person" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ person.name }}</p>
              <p class="text-xs text-gray-500 truncate">{{ truncateAddress(person.address) }}</p>
            </div>
          </button>
        </div>

        <!-- Manual Address Entry -->
        <div v-if="inputLooksLikeAddress" class="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <!-- Network Mismatch Warning -->
          <div v-if="isWrongNetwork" class="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-warning mt-0.5" />
              <div>
                <p class="text-sm font-medium text-warning">Wrong Network</p>
                <p class="text-xs text-warning/80">
                  This is a {{ enteredAddressNetwork === 'livenet' ? 'mainnet' : 'testnet' }} address.
                  You are currently on {{ networkStore.config.displayName }}.
                </p>
              </div>
            </div>
          </div>

          <button class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left" :class="isWrongNetwork
            ? 'bg-warning/5 hover:bg-warning/10 opacity-50 cursor-not-allowed'
            : 'bg-primary/5 hover:bg-primary/10'" :disabled="isWrongNetwork"
            @click="!isWrongNetwork && selectAddress(recipientInput)">
            <div class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="isWrongNetwork ? 'bg-warning/10' : 'bg-primary/10'">
              <UIcon name="i-lucide-wallet" class="w-4 h-4" :class="isWrongNetwork ? 'text-warning' : 'text-primary'" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium">{{ isWrongNetwork ? 'Cannot use this address' : 'Use this address' }}</p>
              <p class="text-xs text-gray-500 truncate">{{ recipientInput }}</p>
            </div>
            <UIcon v-if="!isWrongNetwork" name="i-lucide-chevron-right" class="w-4 h-4 text-primary" />
          </button>
        </div>

        <!-- No Results -->
        <div v-if="recipientInput && searchResults.length === 0 && !inputLooksLikeAddress"
          class="text-center py-6 text-gray-500">
          <p class="text-sm">No contacts found</p>
          <p class="text-xs mt-1">Enter a valid Lotus address to continue</p>
        </div>
      </div>

      <!-- Step 2: Amount Entry -->
      <div v-else-if="step === 'amount'" class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <!-- Don't show back button if initial recipient was provided -->
          <UButton v-if="!props.initialRecipient" variant="ghost" icon="i-lucide-arrow-left"
            @click="step = 'recipient'" />
          <h2 class="text-lg font-semibold">Amount</h2>
          <UButton class="ml-auto" variant="ghost" icon="i-lucide-x" @click="() => close()" />
        </div>

        <!-- Recipient Display -->
        <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <template v-if="selectedPerson">
            <PeoplePersonAvatar :person="selectedPerson" size="sm" />
            <div>
              <p class="font-medium">{{ selectedPerson.name }}</p>
              <p class="text-xs text-gray-500">{{ truncateAddress(selectedPerson.address) }}</p>
            </div>
          </template>
          <template v-else>
            <div class="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <UIcon name="i-lucide-wallet" class="w-4 h-4" />
            </div>
            <div>
              <p class="font-medium">Address</p>
              <p class="text-xs text-gray-500">{{ truncateAddress(recipientAddress) }}</p>
            </div>
          </template>
        </div>

        <!-- Amount Input -->
        <div class="space-y-4">
          <!-- Large Amount Display -->
          <div class="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-baseline justify-center gap-2">
              <input :value="amountInput" type="text" inputmode="decimal" autofocus
                class="text-5xl font-bold font-mono text-center bg-transparent border-none outline-none w-full max-w-[200px] focus:ring-0"
                placeholder="0" @input="handleAmountInput" />
              <span class="text-2xl font-medium text-gray-400">XPI</span>
            </div>
          </div>

          <!-- Available Balance -->
          <div class="flex items-center justify-between px-1">
            <span class="text-sm text-gray-500">Available balance</span>
            <span class="text-sm font-mono font-medium">{{ formattedBalance }} XPI</span>
          </div>

          <!-- Quick Amount Buttons -->
          <div class="grid grid-cols-4 gap-2">
            <UButton v-for="preset in amountPresets" :key="preset.label" size="sm" variant="soft"
              @click="setPercentAmount(preset.percent)" block>
              {{ preset.label }}
            </UButton>
            <UButton size="sm" variant="soft" color="primary" @click="setMaxAmount" block>
              Max
            </UButton>
          </div>
        </div>

        <!-- Error Message -->
        <p v-if="amountError" class="text-sm text-error text-center">
          {{ amountError }}
        </p>

        <!-- Continue Button -->
        <UButton color="primary" block :disabled="!isAmountValid" @click="step = 'confirm'">
          Continue
        </UButton>
      </div>

      <!-- Step 3: Confirmation -->
      <div v-else-if="step === 'confirm'" class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'amount'" />
          <h2 class="text-lg font-semibold">Confirm</h2>
          <UButton class="ml-auto" variant="ghost" icon="i-lucide-x" @click="() => close()" />
        </div>

        <!-- Transaction Summary -->
        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-4">
          <div class="text-center">
            <p class="text-sm text-gray-500">Sending</p>
            <p class="text-3xl font-bold font-mono">{{ amountInput }} XPI</p>
          </div>

          <div class="flex items-center justify-center gap-2 text-gray-400">
            <UIcon name="i-lucide-arrow-down" class="w-4 h-4" />
          </div>

          <div class="flex items-center gap-3">
            <template v-if="selectedPerson">
              <PeoplePersonAvatar :person="selectedPerson" size="md" />
              <div>
                <p class="font-medium">{{ selectedPerson.name }}</p>
                <p class="text-xs text-gray-500 font-mono">{{ truncateAddress(selectedPerson.address) }}</p>
              </div>
            </template>
            <template v-else>
              <div class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <UIcon name="i-lucide-wallet" class="w-5 h-5" />
              </div>
              <div>
                <p class="font-medium">Address</p>
                <p class="text-xs text-gray-500 font-mono">{{ truncateAddress(recipientAddress) }}</p>
              </div>
            </template>
          </div>
        </div>

        <!-- Transaction Details -->
        <div class="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Amount</span>
            <span class="font-mono">{{ amountInput }} XPI</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Network fee</span>
            <span class="font-mono text-gray-600 dark:text-gray-400">{{ estimatedFee }} XPI</span>
          </div>
          <div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <div class="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span class="font-mono">{{ totalAmount }} XPI</span>
            </div>
          </div>
        </div>

        <!-- Send Button -->
        <UButton color="primary" block size="lg" :loading="draftStore.sending" @click="executeSend">
          <UIcon name="i-lucide-send" class="w-4 h-4 mr-2" />
          Send {{ amountInput }} XPI
        </UButton>
      </div>

      <!-- Step 4: Result -->
      <div v-else-if="step === 'result'" class="p-6 text-center space-y-4">
        <!-- Success -->
        <template v-if="sendResult?.success">
          <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
          </div>

          <div>
            <h2 class="text-xl font-bold">Sent!</h2>
            <p class="text-gray-500">{{ amountInput }} XPI sent successfully</p>
          </div>

          <div class="space-y-2">
            <UButton variant="outline" block icon="i-lucide-external-link" @click="viewTransaction">
              View Transaction
            </UButton>

            <UButton v-if="!selectedPerson && !existingContact" variant="outline" block icon="i-lucide-user-plus"
              @click="addToContacts">
              Add to Contacts
            </UButton>

            <UButton color="primary" block @click="() => close(sendResult ?? undefined)">Done</UButton>
          </div>
        </template>

        <!-- Error -->
        <template v-else>
          <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-x" class="w-8 h-8 text-error" />
          </div>

          <div>
            <h2 class="text-xl font-bold">Failed</h2>
            <p class="text-gray-500">{{ sendResult?.error || 'Transaction failed' }}</p>
          </div>

          <div class="space-y-2">
            <UButton color="primary" block @click="step = 'confirm'">Try Again</UButton>
            <UButton variant="ghost" block @click="() => close()">Cancel</UButton>
          </div>
        </template>
      </div>
    </template>
  </USlideover>
</template>
