<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { toLotusUnits, toSatoshiUnits } from '~/stores/wallet'
import { useContactsStore, type Contact } from '~/stores/contacts'
import { useAddressFormat } from '~/composables/useUtils'

definePageMeta({
  title: 'Send Lotus',
})

const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const toast = useToast()
const route = useRoute()
const config = useRuntimeConfig()
const { truncateAddress } = useAddressFormat()

// Initialize contacts store
onMounted(() => {
  contactsStore.initialize()
  // Check for prefilled address from query params
  if (route.query.address) {
    recipients.value[0].address = route.query.address as string
  }
})

// ============================================================================
// Mode Toggle
// ============================================================================
const advancedMode = ref(false)

// ============================================================================
// Transaction Constants
// ============================================================================
const TX_OVERHEAD = 10
const INPUT_SIZE = 148
const OUTPUT_SIZE = 34
const OP_RETURN_OVERHEAD = 11 // OP_RETURN + pushdata
const DUST_THRESHOLD = 546

// ============================================================================
// Recipient Management (Multi-output support)
// ============================================================================
interface Recipient {
  id: string
  address: string
  amount: string
  contactName?: string
}

const recipients = ref<Recipient[]>([
  { id: crypto.randomUUID(), address: '', amount: '' }
])

const addRecipient = () => {
  recipients.value.push({
    id: crypto.randomUUID(),
    address: '',
    amount: '',
  })
}

const removeRecipient = (index: number) => {
  if (recipients.value.length > 1) {
    recipients.value.splice(index, 1)
  }
}

const handleContactSelect = (index: number, contact: Contact) => {
  recipients.value[index].address = contact.address
  recipients.value[index].contactName = contact.name
}

const clearRecipient = (index: number) => {
  recipients.value[index].address = ''
  recipients.value[index].amount = ''
  recipients.value[index].contactName = undefined
}

// ============================================================================
// Fee Configuration
// ============================================================================
const feeRate = ref(1)
const showCustomFee = ref(false)

const feePresets = [
  { label: 'Economy', value: 1, description: '1 sat/byte' },
  { label: 'Normal', value: 2, description: '2 sat/byte' },
  { label: 'Priority', value: 5, description: '5 sat/byte' },
]

// ============================================================================
// Advanced Mode Options
// ============================================================================

// Coin Control
const coinControlEnabled = ref(false)
const selectedUtxos = ref<Set<string>>(new Set())

const toggleUtxoSelection = (outpoint: string) => {
  if (selectedUtxos.value.has(outpoint)) {
    selectedUtxos.value.delete(outpoint)
  } else {
    selectedUtxos.value.add(outpoint)
  }
  // Force reactivity
  selectedUtxos.value = new Set(selectedUtxos.value)
}

const selectAllUtxos = () => {
  const utxos = walletStore.getSpendableUtxos()
  selectedUtxos.value = new Set(utxos.map(u => u.outpoint))
}

const deselectAllUtxos = () => {
  selectedUtxos.value = new Set()
}

// OP_RETURN Data
const opReturnEnabled = ref(false)
const opReturnData = ref('')
const opReturnEncoding = ref<'utf8' | 'hex'>('utf8')

// Locktime
const locktimeEnabled = ref(false)
const locktimeType = ref<'block' | 'time'>('block')
const locktimeValue = ref('')

// ============================================================================
// Validation
// ============================================================================
const validateAddress = (address: string): boolean | null => {
  if (!address) return null
  return walletStore.isValidAddress(address)
}

const validateAmount = (amount: string): boolean | null => {
  if (!amount) return null
  const num = parseFloat(amount)
  return !isNaN(num) && num > 0
}

const recipientValidations = computed(() => {
  return recipients.value.map(r => ({
    address: validateAddress(r.address),
    amount: validateAmount(r.amount),
  }))
})

const allRecipientsValid = computed(() => {
  return recipientValidations.value.every(v => v.address === true && v.amount === true)
})

// ============================================================================
// Transaction Calculations
// ============================================================================
const totalSendAmount = computed(() => {
  return recipients.value.reduce((sum, r) => {
    const amount = parseFloat(r.amount) || 0
    return sum + amount
  }, 0)
})

const totalSendAmountSats = computed(() => {
  return BigInt(toSatoshiUnits(totalSendAmount.value))
})

// Get available UTXOs based on coin control
const availableUtxos = computed(() => {
  const spendable = walletStore.getSpendableUtxos()
  if (coinControlEnabled.value && selectedUtxos.value.size > 0) {
    return spendable.filter(u => selectedUtxos.value.has(u.outpoint))
  }
  return spendable
})

const availableBalance = computed(() => {
  return availableUtxos.value.reduce((sum, u) => sum + BigInt(u.value), 0n)
})

const availableBalanceXPI = computed(() => {
  return toLotusUnits(availableBalance.value.toString())
})

// Estimate transaction size
const estimatedTxSize = computed(() => {
  const numInputs = coinControlEnabled.value && selectedUtxos.value.size > 0
    ? selectedUtxos.value.size
    : Math.max(1, availableUtxos.value.length)

  let numOutputs = recipients.value.length + 1 // +1 for change

  let opReturnSize = 0
  if (opReturnEnabled.value && opReturnData.value) {
    const dataLength = opReturnEncoding.value === 'hex'
      ? opReturnData.value.length / 2
      : opReturnData.value.length
    opReturnSize = OP_RETURN_OVERHEAD + dataLength
    numOutputs++
  }

  return TX_OVERHEAD + (numInputs * INPUT_SIZE) + (numOutputs * OUTPUT_SIZE) + opReturnSize
})

const estimatedFee = computed(() => {
  return estimatedTxSize.value * feeRate.value
})

const estimatedFeeXPI = computed(() => {
  return toLotusUnits(estimatedFee.value)
})

const totalWithFee = computed(() => {
  return totalSendAmountSats.value + BigInt(estimatedFee.value)
})

const hasInsufficientBalance = computed(() => {
  return totalWithFee.value > availableBalance.value
})

const changeAmount = computed(() => {
  if (hasInsufficientBalance.value) return 0n
  return availableBalance.value - totalWithFee.value
})

const changeAmountXPI = computed(() => {
  return toLotusUnits(changeAmount.value.toString())
})

// Max sendable (accounting for fee)
const maxSendable = computed(() => {
  const txSizeNoChange = TX_OVERHEAD + availableUtxos.value.length * INPUT_SIZE + OUTPUT_SIZE
  const fee = BigInt(txSizeNoChange * feeRate.value)
  const max = availableBalance.value - fee
  return max > 0n ? max : 0n
})

const setMaxAmount = (index: number) => {
  // For single recipient, set max
  if (recipients.value.length === 1) {
    recipients.value[0].amount = toLotusUnits(maxSendable.value.toString()).toString()
  } else {
    // For multi-output, calculate remaining after other recipients
    const otherAmounts = recipients.value.reduce((sum, r, i) => {
      if (i === index) return sum
      return sum + BigInt(toSatoshiUnits(r.amount || '0'))
    }, 0n)
    const remaining = maxSendable.value - otherAmounts
    if (remaining > 0n) {
      recipients.value[index].amount = toLotusUnits(remaining.toString()).toString()
    }
  }
}

// ============================================================================
// Form State
// ============================================================================
const sending = ref(false)
const txResult = ref<{ txid: string, recipients: Recipient[] } | null>(null)
const error = ref<string | null>(null)

const canSend = computed(() => {
  if (sending.value) return false
  if (!allRecipientsValid.value) return false
  if (hasInsufficientBalance.value) return false
  if (coinControlEnabled.value && selectedUtxos.value.size === 0) return false
  return true
})

// ============================================================================
// Send Transaction
// ============================================================================
const sendTransaction = async () => {
  if (!canSend.value) return

  sending.value = true
  error.value = null
  txResult.value = null

  try {
    // Determine if we need advanced features
    const needsAdvanced =
      recipients.value.length > 1 ||
      opReturnEnabled.value ||
      locktimeEnabled.value ||
      (coinControlEnabled.value && selectedUtxos.value.size > 0)

    if (needsAdvanced) {
      // Use advanced transaction builder
      const txid = await walletStore.sendAdvanced({
        recipients: recipients.value.map(r => ({
          address: r.address,
          amountSats: toSatoshiUnits(r.amount),
        })),
        feeRate: feeRate.value,
        selectedUtxos: coinControlEnabled.value && selectedUtxos.value.size > 0
          ? Array.from(selectedUtxos.value)
          : undefined,
        opReturnData: opReturnEnabled.value && opReturnData.value
          ? {
            data: opReturnData.value,
            encoding: opReturnEncoding.value,
          }
          : undefined,
        locktime: locktimeEnabled.value && locktimeValue.value
          ? {
            type: locktimeType.value,
            value: parseInt(locktimeValue.value, 10),
          }
          : undefined,
      })
      txResult.value = { txid, recipients: recipients.value }
    } else {
      // Use simple single-output send for basic transactions
      const txid = await walletStore.sendLotus(
        recipients.value[0].address,
        toSatoshiUnits(recipients.value[0].amount),
        feeRate.value
      )
      txResult.value = { txid, recipients: recipients.value }
    }

    toast.add({
      title: 'Transaction Sent!',
      description: `Successfully sent ${totalSendAmount.value.toFixed(2)} XPI`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to send transaction'
    toast.add({
      title: 'Transaction Failed',
      description: error.value,
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    sending.value = false
  }
}

// ============================================================================
// Reset Form
// ============================================================================
const resetForm = () => {
  recipients.value = [{ id: crypto.randomUUID(), address: '', amount: '' }]
  feeRate.value = 1
  showCustomFee.value = false
  coinControlEnabled.value = false
  selectedUtxos.value = new Set()
  opReturnEnabled.value = false
  opReturnData.value = ''
  locktimeEnabled.value = false
  locktimeValue.value = ''
  error.value = null
  txResult.value = null
}

// ============================================================================
// Quick Contacts
// ============================================================================
const quickContacts = computed(() => {
  const favorites = contactsStore.favoriteContacts
  if (favorites.length >= 3) {
    return favorites.slice(0, 3)
  }
  const nonFavorites = contactsStore.sortedContacts.filter(c => !c.isFavorite)
  return [...favorites, ...nonFavorites].slice(0, 3)
})

// Format number helper
const formatNumber = (num: number) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-4">
    <!-- Success State -->
    <UCard v-if="txResult">
      <div class="text-center py-8">
        <div
          class="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-check" class="w-8 h-8 text-success-500" />
        </div>
        <h3 class="text-xl font-semibold mb-2">Transaction Sent!</h3>
        <p class="text-muted mb-4">{{ formatNumber(totalSendAmount) }} XPI sent successfully</p>

        <div class="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <p class="text-sm text-muted mb-1">Transaction ID</p>
          <p class="font-mono text-xs break-all">{{ txResult.txid }}</p>
        </div>

        <div class="flex gap-2 justify-center">
          <UButton color="neutral" variant="outline" icon="i-lucide-external-link"
            :href="`${config.public.explorerUrl}/tx/${txResult.txid}`" target="_blank">
            View on Explorer
          </UButton>
          <UButton color="primary" icon="i-lucide-plus" @click="resetForm">
            Send More
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Send Form -->
    <template v-else>
      <!-- Header with Mode Toggle -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">Send Lotus</h1>
          <p class="text-sm text-muted">{{ formatNumber(availableBalanceXPI) }} XPI available</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">Advanced</span>
          <USwitch v-model="advancedMode" />
        </div>
      </div>

      <!-- Main Send Card -->
      <UCard>
        <div class="space-y-5">
          <!-- Recipients Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium">
                {{ recipients.length > 1 ? 'Recipients' : 'Send to' }}
              </label>
              <UButton v-if="recipients.length > 1 || advancedMode" color="primary" variant="ghost" size="xs"
                icon="i-lucide-plus" @click="addRecipient">
                Add Recipient
              </UButton>
            </div>

            <div class="space-y-3">
              <div v-for="(recipient, index) in recipients" :key="recipient.id"
                :class="['rounded-lg', recipients.length > 1 ? 'p-4 bg-muted/30 space-y-3' : 'space-y-3']">

                <!-- Multi-recipient header -->
                <div v-if="recipients.length > 1" class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted">Recipient {{ index + 1 }}</span>
                  <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" @click="removeRecipient(index)" />
                </div>

                <!-- Selected Contact Display -->
                <div v-if="recipient.contactName"
                  class="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <ContactAvatar :name="recipient.contactName" size="sm" />
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm">{{ recipient.contactName }}</p>
                    <p class="text-xs text-muted font-mono truncate">{{ truncateAddress(recipient.address) }}</p>
                  </div>
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="clearRecipient(index)" />
                </div>

                <!-- Address Input -->
                <div v-else>
                  <ContactsContactSearch v-model="recipient.address" class="w-full"
                    @select="handleContactSelect(index, $event)" />
                  <p v-if="recipientValidations[index]?.address === false" class="text-xs text-error-500 mt-1">
                    Invalid address format
                  </p>
                </div>

                <!-- Amount Input -->
                <UInput v-model="recipient.amount" type="number" placeholder="0.00" class="w-full font-mono"
                  :color="recipientValidations[index]?.amount === false ? 'error' : undefined" step="0.000001" min="0">
                  <template #trailing>
                    <div class="flex items-center gap-1">
                      <span class="text-sm text-muted">XPI</span>
                      <UButton size="xs" variant="link" color="primary" class="px-1" @click="setMaxAmount(index)">
                        MAX
                      </UButton>
                    </div>
                  </template>
                </UInput>
              </div>
            </div>

            <!-- Quick Contacts (only show for first recipient when empty) -->
            <div v-if="quickContacts.length > 0 && !recipients[0].address && recipients.length === 1" class="mt-3">
              <p class="text-xs text-muted mb-2">Quick send</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="contact in quickContacts" :key="contact.id"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-default hover:border-primary hover:bg-primary/5 transition-all text-sm"
                  @click="handleContactSelect(0, contact)">
                  <ContactAvatar :name="contact.name" size="xs" />
                  <span>{{ contact.name }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-default" />

          <!-- Fee Selection -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium">Network Fee</label>
              <button class="text-xs text-primary hover:underline" @click="showCustomFee = !showCustomFee">
                {{ showCustomFee ? 'Use preset' : 'Custom' }}
              </button>
            </div>

            <div v-if="showCustomFee" class="flex items-center gap-2">
              <UInput v-model.number="feeRate" type="number" min="1" step="1" class="w-24" />
              <span class="text-sm text-muted">sat/byte</span>
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <button v-for="preset in feePresets" :key="preset.value" :class="[
                'p-2 rounded-lg border text-center transition-all',
                feeRate === preset.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-default hover:border-primary/50'
              ]" @click="feeRate = preset.value">
                <p class="text-sm font-medium">{{ preset.label }}</p>
                <p class="text-xs text-muted">{{ preset.description }}</p>
              </button>
            </div>
          </div>

          <!-- Advanced Options -->
          <template v-if="advancedMode">
            <div class="border-t border-default" />

            <!-- Coin Control -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <USwitch v-model="coinControlEnabled" size="sm" />
                  <label class="text-sm font-medium">Coin Control</label>
                </div>
                <span v-if="coinControlEnabled" class="text-xs text-muted">
                  {{ selectedUtxos.size }} of {{ walletStore.getSpendableUtxos().length }} selected
                </span>
              </div>

              <div v-if="coinControlEnabled" class="mt-3 space-y-2">
                <div class="flex gap-2 mb-2">
                  <UButton size="xs" variant="outline" color="neutral" @click="selectAllUtxos">Select All</UButton>
                  <UButton size="xs" variant="outline" color="neutral" @click="deselectAllUtxos">Deselect All</UButton>
                </div>
                <div class="max-h-48 overflow-y-auto space-y-1 bg-muted/30 rounded-lg p-2">
                  <button v-for="utxo in walletStore.getSpendableUtxos()" :key="utxo.outpoint" :class="[
                    'w-full flex items-center justify-between p-2 rounded text-left transition-all text-sm',
                    selectedUtxos.has(utxo.outpoint)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50'
                  ]" @click="toggleUtxoSelection(utxo.outpoint)">
                    <div class="flex items-center gap-2 min-w-0">
                      <UIcon :name="selectedUtxos.has(utxo.outpoint) ? 'i-lucide-check-square' : 'i-lucide-square'"
                        class="w-4 h-4 shrink-0" />
                      <span class="font-mono text-xs truncate">{{ utxo.outpoint.split('_')[0].slice(0, 12) }}...</span>
                    </div>
                    <span class="font-mono text-xs">{{ formatNumber(toLotusUnits(utxo.value)) }} XPI</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- OP_RETURN Data -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <USwitch v-model="opReturnEnabled" size="sm" />
                <label class="text-sm font-medium">Attach Data (OP_RETURN)</label>
              </div>

              <div v-if="opReturnEnabled" class="space-y-2">
                <div class="flex gap-2">
                  <UButton size="xs" :variant="opReturnEncoding === 'utf8' ? 'solid' : 'outline'"
                    :color="opReturnEncoding === 'utf8' ? 'primary' : 'neutral'" @click="opReturnEncoding = 'utf8'">
                    Text
                  </UButton>
                  <UButton size="xs" :variant="opReturnEncoding === 'hex' ? 'solid' : 'outline'"
                    :color="opReturnEncoding === 'hex' ? 'primary' : 'neutral'" @click="opReturnEncoding = 'hex'">
                    Hex
                  </UButton>
                </div>
                <UTextarea v-model="opReturnData"
                  :placeholder="opReturnEncoding === 'hex' ? '48656c6c6f...' : 'Your message...'" :rows="2"
                  class="w-full font-mono text-sm" />
                <p class="text-xs text-muted">
                  {{ opReturnEncoding === 'hex' ? opReturnData.length / 2 : opReturnData.length }} bytes
                  (max 220 bytes)
                </p>
              </div>
            </div>

            <!-- Locktime -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <USwitch v-model="locktimeEnabled" size="sm" />
                <label class="text-sm font-medium">Locktime</label>
              </div>

              <div v-if="locktimeEnabled" class="flex gap-2">
                <USelectMenu v-model="locktimeType" :items="[
                  { label: 'Block Height', value: 'block' },
                  { label: 'Unix Time', value: 'time' },
                ]" value-key="value" class="w-32" />
                <UInput v-model="locktimeValue" type="number"
                  :placeholder="locktimeType === 'block' ? 'Block #' : 'Timestamp'" class="flex-1 font-mono" />
              </div>
            </div>
          </template>

          <!-- Transaction Summary -->
          <div class="border-t border-default pt-4">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">Amount</span>
                <span class="font-mono">{{ formatNumber(totalSendAmount) }} XPI</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Network Fee</span>
                <span class="font-mono">{{ estimatedFeeXPI.toFixed(6) }} XPI</span>
              </div>
              <div class="flex justify-between font-medium pt-2 border-t border-default">
                <span>Total</span>
                <span class="font-mono">{{ formatNumber(toLotusUnits(totalWithFee.toString())) }} XPI</span>
              </div>
              <div v-if="changeAmount > 0n" class="flex justify-between text-muted">
                <span>Change</span>
                <span class="font-mono">{{ formatNumber(changeAmountXPI) }} XPI</span>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="error"
            :close-button="{ icon: 'i-lucide-x', color: 'error', variant: 'link' }" @close="error = null" />

          <UAlert v-if="hasInsufficientBalance && totalSendAmount > 0" color="warning" variant="subtle"
            icon="i-lucide-alert-triangle" title="Insufficient balance for this transaction" />

          <!-- Send Button -->
          <UButton block size="lg" :loading="sending" :disabled="!canSend" icon="i-lucide-send"
            @click="sendTransaction">
            {{ sending ? 'Sending...' : `Send ${formatNumber(totalSendAmount)} XPI` }}
          </UButton>
        </div>
      </UCard>

      <!-- Add Recipient Button (Simple Mode) -->
      <div v-if="!advancedMode && recipients.length === 1" class="text-center">
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-plus" @click="addRecipient">
          Send to multiple recipients
        </UButton>
      </div>
    </template>
  </div>
</template>
