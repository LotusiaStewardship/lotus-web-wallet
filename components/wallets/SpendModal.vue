<script setup lang="ts">
/**
 * Spend Modal Component
 *
 * Multi-step modal for spending from a shared wallet:
 * 1. Enter amount and recipient
 * 2. Confirm and request signatures
 * 3. Wait for signatures
 * 4. Result
 */
import { usePeopleStore } from '~/stores/people'
import { formatXPI, truncateAddress } from '~/utils/formatting'
import { registerBackHandler } from '~/composables/useOverlays'
import type { Person, SharedWallet } from '~/types/people'

interface Participant {
  id: string
  name: string
  isOnline: boolean
  isMe: boolean
}

const props = defineProps<{
  wallet: SharedWallet
  participants: Participant[]
  backPressed?: number // Counter that increments on each back button press
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const peopleStore = usePeopleStore()

// Reset state on mount
onMounted(() => {
  reset()
})

// Register back handler for multi-stage navigation
onMounted(() => {
  registerBackHandler(() => {
    if (step.value === 'confirm') {
      step.value = 'details'
      return false // Handled internally
    } else if (step.value === 'error') {
      step.value = 'confirm'
      return false // Handled internally
    } else if (step.value === 'waiting' || step.value === 'success') {
      return true // Close modal
    } else {
      // On first step (details), allow close
      return true
    }
  })
})

type Step = 'details' | 'confirm' | 'waiting' | 'success' | 'error'

const step = ref<Step>('details')
const requesting = ref(false)
const requestError = ref('')

const form = reactive({
  recipient: '',
  amount: '',
  note: '',
})

const signatureStatus = ref<Array<{ name: string; signed: boolean }>>([])


const balanceXPI = computed(() => {
  const sats = BigInt(props.wallet?.balanceSats || '0')
  return Number(sats) / 1_000_000
})

const amountSats = computed(() => {
  const xpi = parseFloat(form.amount) || 0
  return BigInt(Math.floor(xpi * 1_000_000))
})

const isValidAmount = computed(() => {
  if (!form.amount) return false
  const amount = amountSats.value
  if (amount <= 0n) return false
  if (amount > BigInt(props.wallet?.balanceSats || '0')) return false
  return true
})

const isValidRecipient = computed(() => {
  return form.recipient.startsWith('lotus_') && form.recipient.length > 20
})

const isValid = computed(() => isValidAmount.value && isValidRecipient.value)

const threshold = computed(() => props.wallet?.threshold || props.participants?.length || 2)

const signatureCount = computed(() =>
  signatureStatus.value.filter(s => s.signed).length
)

async function requestSignatures() {
  requesting.value = true
  requestError.value = ''

  try {
    // Initialize signature status
    signatureStatus.value = props.participants.map(p => ({
      name: p.name,
      signed: p.isMe, // Self is auto-signed
    }))

    step.value = 'waiting'

    // TODO: Integrate with musig2Store.createSigningSession
    // Simulate waiting for signatures
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Simulate success
    step.value = 'success'
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : 'Request failed'
    step.value = 'error'
  } finally {
    requesting.value = false
  }
}

function close() {
  emit('close')
}

function reset() {
  step.value = 'details'
  form.recipient = ''
  form.amount = ''
  form.note = ''
  requestError.value = ''
  signatureStatus.value = []
}
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <!-- Step 1: Amount & Recipient -->
      <div v-if="step === 'details'" class="p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Spend from {{ wallet?.name }}</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Balance -->
        <div class="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
          <p class="text-sm text-gray-500">Available</p>
          <p class="text-xl font-bold font-mono">
            {{ balanceXPI.toLocaleString(undefined, { maximumFractionDigits: 6 }) }} XPI
          </p>
        </div>

        <!-- Recipient -->
        <FormInput v-model="form.recipient" label="Send to" placeholder="lotus_... or search contacts" required />

        <!-- Amount -->
        <FormInput v-model="form.amount" label="Amount" type="number" placeholder="0.00" required>
          <template #trailing>
            <span class="text-gray-500">XPI</span>
          </template>
        </FormInput>

        <!-- Note -->
        <FormInput v-model="form.note" label="Note (optional)" placeholder="What's this for?" />

        <UButton color="primary" block :disabled="!isValid" @click="step = 'confirm'">
          Continue
        </UButton>
      </div>

      <!-- Step 2: Confirm & Request Signatures -->
      <div v-else-if="step === 'confirm'" class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'details'" />
          <h2 class="text-lg font-semibold">Confirm & Request</h2>
        </div>

        <!-- Transaction Summary -->
        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-500">Amount</span>
            <span class="font-mono font-medium">{{ form.amount }} XPI</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">To</span>
            <code class="text-sm">{{ truncateAddress(form.recipient) }}</code>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">From</span>
            <span>{{ wallet?.name }}</span>
          </div>
          <div v-if="form.note" class="flex justify-between">
            <span class="text-gray-500">Note</span>
            <span class="text-sm">{{ form.note }}</span>
          </div>
        </div>

        <!-- Signers Required -->
        <div class="space-y-2">
          <p class="text-sm font-medium">
            {{ threshold }} of {{ participants?.length || 0 }} signatures required
          </p>
          <div class="flex flex-wrap gap-2">
            <div v-for="participant in participants" :key="participant.id"
              class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <span class="w-2 h-2 rounded-full" :class="participant.isOnline ? 'bg-success' : 'bg-gray-400'" />
              <span class="text-sm">{{ participant.name }}</span>
            </div>
          </div>
        </div>

        <UButton color="primary" block size="lg" :loading="requesting" @click="requestSignatures">
          Request Signatures
        </UButton>
      </div>

      <!-- Step 3: Waiting for Signatures -->
      <div v-else-if="step === 'waiting'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-primary animate-spin" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Waiting for Signatures</h2>
          <p class="text-gray-500">{{ signatureCount }}/{{ threshold }} collected</p>
        </div>

        <!-- Signer Status -->
        <div class="space-y-2">
          <div v-for="signer in signatureStatus" :key="signer.name"
            class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
            <UIcon :name="signer.signed ? 'i-lucide-check-circle' : 'i-lucide-clock'"
              :class="['w-5 h-5', signer.signed ? 'text-success' : 'text-gray-400']" />
            <span class="flex-1">{{ signer.name }}</span>
            <span class="text-sm" :class="signer.signed ? 'text-success' : 'text-gray-500'">
              {{ signer.signed ? 'Signed' : 'Pending' }}
            </span>
          </div>
        </div>

        <UButton variant="outline" block @click="close">
          Continue in Background
        </UButton>
      </div>

      <!-- Step 4: Success -->
      <div v-else-if="step === 'success'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Transaction Sent!</h2>
          <p class="text-gray-500">{{ form.amount }} XPI sent successfully</p>
        </div>

        <div class="space-y-2">
          <UButton variant="outline" block icon="i-lucide-external-link">
            View Transaction
          </UButton>
          <UButton color="primary" block @click="close">Done</UButton>
        </div>
      </div>

      <!-- Step 5: Error -->
      <div v-else-if="step === 'error'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-x" class="w-8 h-8 text-error" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Request Failed</h2>
          <p class="text-gray-500">{{ requestError }}</p>
        </div>

        <div class="space-y-2">
          <UButton color="primary" block @click="step = 'confirm'">Try Again</UButton>
          <UButton variant="ghost" block @click="close">Cancel</UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
