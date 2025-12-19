<script setup lang="ts">
/**
 * Send Page - Simplified
 *
 * Uses draft store as single source of truth for all transaction state.
 * UI-only state is minimal (contact names, form validation display).
 */
import { useWalletStore, toLotusUnits, toSatoshiUnits } from '~/stores/wallet'
import { useDraftStore } from '~/stores/draft'
import { useContactsStore, type Contact, getContactAddress } from '~/stores/contacts'
import { useNetworkStore } from '~/stores/network'
import { useOnboardingStore } from '~/stores/onboarding'

definePageMeta({
  title: 'Send',
})

const walletStore = useWalletStore()
const draftStore = useDraftStore()
const contactsStore = useContactsStore()
const networkStore = useNetworkStore()
const onboardingStore = useOnboardingStore()
const toast = useToast()
const route = useRoute()

// ============================================================================
// UI-Only State
// ============================================================================

// Contact names for display (not persisted in draft store)
const contactNames = ref<Map<string, string>>(new Map())

// Fee UI state
const feePresets = [
  { label: 'Economy', value: 1, description: '1 sat/byte' },
  { label: 'Normal', value: 2, description: '2 sat/byte' },
  { label: 'Priority', value: 5, description: '5 sat/byte' },
]
const showCustomFee = ref(false)

// Advanced mode toggle
const advancedMode = ref(false)

// Coin control UI state (synced to draft store)
const coinControlEnabled = ref(false)

// Form state
const txResult = ref<{ txid: string; amountXpi: number } | null>(null)
const error = ref<string | null>(null)
const hasAttemptedSend = ref(false)
const showConfirmModal = ref(false)

// ============================================================================
// Initialization
// ============================================================================

onMounted(() => {
  contactsStore.initialize()
  draftStore.initialize()

  // Prefill address from query params
  if (route.query.to && draftStore.recipients.length > 0) {
    const firstRecipient = draftStore.recipients[0]
    draftStore.updateRecipientAddress(firstRecipient.id, route.query.to as string)
  }

  // Sync fee rate display state
  const currentFeeRate = draftStore.feeRate
  const isPreset = feePresets.some(p => p.value === currentFeeRate)
  if (!isPreset) {
    showCustomFee.value = true
  }

  // Sync coin control state
  coinControlEnabled.value = draftStore.selectedUtxos.length > 0

  // Sync advanced mode if any advanced options are set
  if (draftStore.selectedUtxos.length > 0 || draftStore.opReturn || draftStore.locktime) {
    advancedMode.value = true
  }

  // Resolve contact names from addresses
  for (const recipient of draftStore.recipients) {
    if (recipient.address) {
      const contact = contactsStore.getContactByAddress(recipient.address)
      if (contact) {
        contactNames.value.set(recipient.id, contact.name)
      }
    }
  }
})

// Watch for wallet initialization
watch(
  () => walletStore.initialized,
  (initialized) => {
    if (initialized && draftStore.inputAmount === 0n && walletStore.utxos.size > 0) {
      draftStore.initialize()
    }
  }
)

// Reset advanced options when toggling off
watch(advancedMode, (enabled) => {
  if (!enabled) {
    coinControlEnabled.value = false
    draftStore.setSelectedUtxos([])
    draftStore.setOpReturn(null)
    draftStore.setLocktime(null)
  }
})

// Sync coin control toggle to draft store
watch(coinControlEnabled, (enabled) => {
  if (!enabled) {
    draftStore.setSelectedUtxos([])
  }
})

// ============================================================================
// Computed Values (from draft store)
// ============================================================================

const recipients = computed(() => draftStore.recipients)
const isMultiSend = computed(() => draftStore.recipients.length > 1)
const availableBalance = computed(() => draftStore.availableBalance)
const availableBalanceXPI = computed(() => toLotusUnits(availableBalance.value.toString()))
const inputAmount = computed(() => draftStore.inputAmount)
const inputAmountXPI = computed(() => toLotusUnits(inputAmount.value.toString()))
const estimatedFee = computed(() => draftStore.estimatedFee)
const estimatedFeeXPI = computed(() => toLotusUnits(estimatedFee.value))
const changeAmount = computed(() => draftStore.changeAmount)
const changeAmountXPI = computed(() => toLotusUnits(changeAmount.value.toString()))
const totalSendAmountSats = computed(() => draftStore.outputAmount)
const totalSendAmount = computed(() => toLotusUnits(totalSendAmountSats.value.toString()))
const selectedUtxoCount = computed(() => draftStore.selectedUtxoCount)
const totalUtxoCount = computed(() => draftStore.totalUtxoCount)
const sending = computed(() => draftStore.sending)

// Fee rate (two-way binding to draft store)
const feeRate = computed({
  get: () => draftStore.feeRate,
  set: (value: number) => draftStore.setFeeRate(value),
})

// OP_RETURN (two-way binding to draft store)
const opReturnEnabled = computed({
  get: () => draftStore.opReturn !== null,
  set: (enabled: boolean) => {
    if (!enabled) {
      draftStore.setOpReturn(null)
    } else {
      draftStore.setOpReturn({ data: '', encoding: 'utf8' })
    }
  },
})

const opReturnData = computed({
  get: () => draftStore.opReturn?.data ?? '',
  set: (data: string) => {
    if (draftStore.opReturn) {
      draftStore.setOpReturn({ ...draftStore.opReturn, data })
    }
  },
})

const opReturnEncoding = computed({
  get: () => draftStore.opReturn?.encoding ?? 'utf8',
  set: (encoding: 'utf8' | 'hex') => {
    if (draftStore.opReturn) {
      draftStore.setOpReturn({ ...draftStore.opReturn, encoding })
    }
  },
})

const opReturnByteCount = computed(() => {
  const data = opReturnData.value
  if (!data) return { bytes: 0, valid: true }
  if (opReturnEncoding.value === 'hex') {
    const isValidHex = /^[0-9a-fA-F]*$/.test(data)
    const isEvenLength = data.length % 2 === 0
    if (!isValidHex || !isEvenLength) {
      return { bytes: 0, valid: false, error: !isValidHex ? 'Invalid hex characters' : 'Hex must have even length' }
    }
    return { bytes: data.length / 2, valid: true }
  }
  const encoder = new TextEncoder()
  return { bytes: encoder.encode(data).length, valid: true }
})

// Locktime (two-way binding to draft store)
const locktimeEnabled = computed({
  get: () => draftStore.locktime !== null,
  set: (enabled: boolean) => {
    if (!enabled) {
      draftStore.setLocktime(null)
    } else {
      draftStore.setLocktime({ type: 'block', value: 0 })
    }
  },
})

const locktimeType = computed({
  get: () => draftStore.locktime?.type ?? 'block',
  set: (type: 'block' | 'time') => {
    if (draftStore.locktime) {
      draftStore.setLocktime({ ...draftStore.locktime, type })
    }
  },
})

const locktimeValue = computed({
  get: () => draftStore.locktime?.value?.toString() ?? '',
  set: (value: string) => {
    if (draftStore.locktime) {
      draftStore.setLocktime({ ...draftStore.locktime, value: parseInt(value, 10) || 0 })
    }
  },
})

// ============================================================================
// Recipient Management
// ============================================================================

const addRecipient = () => { draftStore.addRecipient() }

const removeRecipient = (id: string) => {
  draftStore.removeRecipient(id)
  contactNames.value.delete(id)
}

const handleContactSelect = (recipientId: string, contact: Contact) => {
  const address = getContactAddress(contact, networkStore.currentNetwork) || contact.address
  draftStore.updateRecipientAddress(recipientId, address)
  contactNames.value.set(recipientId, contact.name)
}

const clearRecipient = (id: string) => {
  draftStore.clearRecipient(id)
  contactNames.value.delete(id)
}

const getContactName = (id: string): string | undefined => contactNames.value.get(id)

const getRecipientDisplayAmount = (recipient: typeof recipients.value[0]): string => {
  if (recipient.sendMax) {
    const maxSendable = draftStore.maxSendable
    return toLotusUnits(maxSendable.toString()).toString()
  }
  if (recipient.amountSats === 0n) return ''
  return toLotusUnits(recipient.amountSats.toString()).toString()
}

const updateRecipientAmount = (id: string, amountXpi: string) => {
  const recipient = draftStore.getRecipient(id)
  if (!recipient || recipient.sendMax) return
  const amountSats = BigInt(toSatoshiUnits(amountXpi || '0'))
  if (amountSats !== recipient.amountSats) {
    draftStore.updateRecipientAmount(id, amountSats)
  }
}

const setMaxAmount = (id: string) => {
  const currentMaxRecipient = draftStore.recipients.find(r => r.sendMax && r.id !== id)
  draftStore.setRecipientSendMax(id, true)
  if (currentMaxRecipient) {
    const recipientIndex = draftStore.recipients.findIndex(r => r.id === id)
    toast.add({
      title: 'MAX amount moved',
      description: `Only one recipient can receive the maximum amount. MAX is now set for recipient ${recipientIndex + 1}.`,
      color: 'info',
      icon: 'i-lucide-info',
    })
  }
}

const clearSendMax = (id: string) => draftStore.setRecipientSendMax(id, false)

// ============================================================================
// Coin Control
// ============================================================================

const selectedUtxoSet = computed(() => new Set(draftStore.selectedUtxos))

const toggleUtxoSelection = (outpoint: string) => {
  const current = new Set(draftStore.selectedUtxos)
  if (current.has(outpoint)) {
    current.delete(outpoint)
  } else {
    current.add(outpoint)
  }
  draftStore.setSelectedUtxos(Array.from(current))
}

const selectAllUtxos = () => {
  const utxos = walletStore.getSpendableUtxos()
  draftStore.setSelectedUtxos(utxos.map(u => u.outpoint))
}

const deselectAllUtxos = () => {
  draftStore.setSelectedUtxos([])
}

// ============================================================================
// Validation
// ============================================================================

const { isValidAddress, getNetworkFromAddress } = useAddress()

const validateAddress = (address: string): boolean | null => {
  if (!address) return null
  if (!address.startsWith('lotus')) return false
  const network = getNetworkFromAddress(address)
  if (!network) return false
  return isValidAddress(address)
}

const validateAddressNetwork = (address: string): boolean | null => {
  if (!address) return null
  if (validateAddress(address) !== true) return null
  const addressNetwork = getNetworkFromAddress(address)
  return addressNetwork === networkStore.currentNetwork
}

const recipientValidations = computed(() => {
  return recipients.value.map(r => ({
    address: validateAddress(r.address),
    addressNetwork: validateAddressNetwork(r.address),
    amount: r.sendMax ? true : r.amountSats > 0n ? true : null,
  }))
})

const allRecipientsValid = computed(() => {
  return recipientValidations.value.every(v =>
    v.address === true && v.addressNetwork === true && v.amount === true
  )
})

const hasNetworkMismatch = computed(() => {
  return recipientValidations.value.some(v => v.addressNetwork === false)
})

const canSend = computed(() => {
  if (sending.value) return false
  if (!allRecipientsValid.value) return false
  if (coinControlEnabled.value && draftStore.selectedUtxos.length === 0) return false
  return draftStore.isValid
})

const shouldShowValidationError = computed(() => {
  if (!draftStore.validationError || draftStore.isValid) return false
  if (hasAttemptedSend.value) return true
  if (totalSendAmount.value > 0) return true
  if (draftStore.validationError.includes('Insufficient')) return true
  return false
})

// ============================================================================
// Send Transaction
// ============================================================================

const initiateTransaction = () => {
  hasAttemptedSend.value = true
  if (!canSend.value) return
  showConfirmModal.value = true
}

const sendTransaction = async () => {
  error.value = null
  txResult.value = null
  const amountToSend = totalSendAmount.value

  try {
    const txid = await draftStore.send()
    txResult.value = { txid, amountXpi: amountToSend }
    showConfirmModal.value = false
    onboardingStore.completeChecklistItem('sendFirst')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to send transaction'
    showConfirmModal.value = false
    toast.add({
      title: 'Transaction Failed',
      description: error.value,
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  }
}

// ============================================================================
// Reset Form
// ============================================================================

const resetForm = () => {
  showCustomFee.value = false
  coinControlEnabled.value = false
  advancedMode.value = false
  error.value = null
  txResult.value = null
  hasAttemptedSend.value = false
  contactNames.value.clear()
  draftStore.initialize()
}

// ============================================================================
// Quick Contacts
// ============================================================================

const quickContacts = computed(() => {
  const favorites = contactsStore.favoriteContacts
  if (favorites.length >= 3) return favorites.slice(0, 3)
  const nonFavorites = contactsStore.sortedContacts.filter(c => !c.isFavorite)
  return [...favorites, ...nonFavorites].slice(0, 3)
})

// ============================================================================
// Helpers
// ============================================================================

const formatNumber = (num: number) => {
  return num.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}
</script>

<template>
  <div class="space-y-6 max-w-lg mx-auto">
    <!-- Success State -->
    <template v-if="txResult">
      <UiAppCard>
        <div class="text-center py-8">
          <div
            class="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 animate-bounce-once">
            <UIcon name="i-lucide-check" class="w-10 h-10 text-success" />
          </div>
          <h2 class="text-2xl font-bold mb-2">Transaction Sent!</h2>
          <p class="text-muted text-lg mb-6">{{ formatNumber(txResult.amountXpi) }} XPI</p>

          <div class="p-4 bg-muted/30 rounded-lg mb-6 text-left">
            <div class="text-xs text-muted mb-1">Transaction ID</div>
            <div class="font-mono text-sm break-all">{{ txResult.txid }}</div>
          </div>

          <div class="flex gap-3">
            <UButton color="neutral" variant="soft" size="lg" class="flex-1" icon="i-lucide-external-link"
              :to="`/explore/explorer/tx/${txResult.txid}`">
              View Details
            </UButton>
            <UButton color="primary" size="lg" class="flex-1" icon="i-lucide-send" @click="resetForm">
              Send More
            </UButton>
          </div>
        </div>
      </UiAppCard>
    </template>

    <!-- Send Form -->
    <template v-else>
      <!-- Hero Header -->
      <UiAppHeroCard icon="i-lucide-send" title="Send Lotus" subtitle="Transfer XPI to any address" />

      <!-- Recipient Card -->
      <UiAppCard title="Recipient" icon="i-lucide-user" allow-overflow>
        <template #header-action>
          <UButton v-if="advancedMode" color="primary" variant="ghost" size="xs" icon="i-lucide-plus"
            @click="addRecipient">
            Add Recipient
          </UButton>
        </template>

        <div class="space-y-4">
          <div v-for="(recipient, index) in recipients" :key="recipient.id"
            :class="['space-y-3', isMultiSend ? 'p-3 bg-muted/20 rounded-lg' : '']">

            <!-- Multi-recipient header -->
            <div v-if="isMultiSend" class="flex items-center justify-between">
              <span class="text-sm font-medium text-muted">Recipient {{ index + 1 }}</span>
              <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x"
                @click="removeRecipient(recipient.id)" />
            </div>

            <!-- Selected Contact Display -->
            <div v-if="getContactName(recipient.id)"
              class="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
              <div class="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <UIcon name="i-lucide-user-check" class="w-5 h-5 text-success" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium">{{ getContactName(recipient.id) }}</p>
                <p class="text-sm text-muted font-mono truncate">{{ recipient.address }}</p>
              </div>
              <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x"
                @click="clearRecipient(recipient.id)" />
            </div>

            <!-- Address Input -->
            <template v-else>
              <ContactsContactSearch :model-value="recipient.address"
                @update:model-value="draftStore.updateRecipientAddress(recipient.id, $event)" :filter-by-network="true"
                @select="handleContactSelect(recipient.id, $event)" />
              <div v-if="recipientValidations[index]?.address === false" class="text-sm text-error">
                Invalid address format
              </div>
              <div v-else-if="recipientValidations[index]?.addressNetwork === false"
                class="text-sm text-warning flex items-center gap-1">
                <UIcon name="i-lucide-alert-triangle" class="w-4 h-4" />
                Address is for a different network
              </div>
            </template>

            <!-- Amount Input (only show when address is valid) -->
            <div v-if="validateAddress(recipient.address)" class="relative">
              <input :value="getRecipientDisplayAmount(recipient)"
                @input="updateRecipientAmount(recipient.id, ($event.target as HTMLInputElement).value)" type="number"
                step="0.000001" min="0" placeholder="0.00" :disabled="recipient.sendMax"
                class="w-full px-4 py-3 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-xl" />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span class="text-muted font-medium">XPI</span>
                <button v-if="recipient.sendMax" class="text-xs text-primary hover:underline"
                  @click="clearSendMax(recipient.id)">CLEAR</button>
                <button v-else class="text-xs text-primary hover:underline font-medium"
                  @click="setMaxAmount(recipient.id)">MAX</button>
              </div>
            </div>
          </div>

          <!-- Quick Contacts -->
          <div v-if="quickContacts.length > 0 && recipients[0] && !recipients[0].address && recipients.length === 1">
            <div class="text-xs text-muted mb-2">Recent contacts</div>
            <div class="flex flex-wrap gap-2">
              <button v-for="contact in quickContacts" :key="contact.id"
                class="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full hover:bg-muted transition-colors"
                @click="handleContactSelect(recipients[0].id, contact)">
                <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span class="text-xs font-semibold text-primary">{{ contact.name.charAt(0) }}</span>
                </div>
                <span class="text-sm">{{ contact.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </UiAppCard>

      <!-- Balance Info -->
      <div class="flex justify-between text-sm px-1">
        <span class="text-muted">
          <template v-if="!walletStore.initialized && availableBalanceXPI === 0">
            <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin inline mr-1" />
            Loading balance...
          </template>
          <template v-else>
            Available: <span class="font-mono">{{ formatNumber(availableBalanceXPI) }}</span> XPI
          </template>
        </span>
        <button class="text-primary hover:underline flex items-center gap-1" @click="advancedMode = !advancedMode">
          <UIcon :name="advancedMode ? 'i-lucide-chevron-up' : 'i-lucide-settings-2'" class="w-4 h-4" />
          {{ advancedMode ? 'Hide' : 'Advanced' }}
        </button>
      </div>

      <!-- Advanced Options Card -->
      <UiAppCard v-if="advancedMode" title="Advanced Options" icon="i-lucide-settings-2">
        <div class="space-y-6">
          <!-- Fee Selection -->
          <div>
            <div class="flex items-center justify-between mb-3">
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
                'p-3 rounded-lg border text-center transition-all',
                feeRate === preset.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
              ]" @click="feeRate = preset.value">
                <p class="text-sm font-medium">{{ preset.label }}</p>
                <p class="text-xs text-muted">{{ preset.description }}</p>
              </button>
            </div>
          </div>

          <!-- Coin Control -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <USwitch v-model="coinControlEnabled" size="sm" />
                <label class="text-sm font-medium">Coin Control</label>
              </div>
              <span v-if="coinControlEnabled" class="text-xs text-muted">
                {{ draftStore.selectedUtxos.length }} / {{ walletStore.getSpendableUtxos().length }} selected
              </span>
            </div>

            <div v-if="coinControlEnabled" class="space-y-2">
              <div class="flex gap-2">
                <UButton size="xs" variant="outline" color="neutral" @click="selectAllUtxos">Select All</UButton>
                <UButton size="xs" variant="outline" color="neutral" @click="deselectAllUtxos">Clear</UButton>
              </div>
              <div class="max-h-40 overflow-y-auto space-y-1 bg-muted/20 rounded-lg p-2">
                <button v-for="utxo in walletStore.getSpendableUtxos()" :key="utxo.outpoint" :class="[
                  'w-full flex items-center justify-between p-2 rounded text-left transition-all text-sm',
                  selectedUtxoSet.has(utxo.outpoint) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                ]" @click="toggleUtxoSelection(utxo.outpoint)">
                  <div class="flex items-center gap-2 min-w-0">
                    <UIcon :name="selectedUtxoSet.has(utxo.outpoint) ? 'i-lucide-check-square' : 'i-lucide-square'"
                      class="w-4 h-4 shrink-0" />
                    <span class="font-mono truncate text-xs">{{ utxo.outpoint.split('_')[0].slice(0, 12) }}...</span>
                  </div>
                  <span class="font-mono text-sm">{{ formatNumber(toLotusUnits(utxo.value)) }} XPI</span>
                </button>
              </div>
            </div>
          </div>

          <!-- OP_RETURN -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <USwitch v-model="opReturnEnabled" size="sm" />
              <label class="text-sm font-medium">Attach Data (OP_RETURN)</label>
            </div>

            <div v-if="opReturnEnabled" class="space-y-3">
              <div class="flex gap-2">
                <UButton size="sm" :variant="opReturnEncoding === 'utf8' ? 'solid' : 'outline'"
                  :color="opReturnEncoding === 'utf8' ? 'primary' : 'neutral'" @click="opReturnEncoding = 'utf8'">
                  Text
                </UButton>
                <UButton size="sm" :variant="opReturnEncoding === 'hex' ? 'solid' : 'outline'"
                  :color="opReturnEncoding === 'hex' ? 'primary' : 'neutral'" @click="opReturnEncoding = 'hex'">
                  Hex
                </UButton>
              </div>
              <UTextarea v-model="opReturnData"
                :placeholder="opReturnEncoding === 'hex' ? '48656c6c6f...' : 'Your message...'" :rows="2"
                class="font-mono" />
              <p
                :class="['text-xs', !opReturnByteCount.valid || opReturnByteCount.bytes > 220 ? 'text-error' : 'text-muted']">
                <template v-if="!opReturnByteCount.valid">{{ opReturnByteCount.error }}</template>
                <template v-else>{{ opReturnByteCount.bytes }} / 220 bytes</template>
              </p>
            </div>
          </div>

          <!-- Locktime -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <USwitch v-model="locktimeEnabled" size="sm" />
              <label class="text-sm font-medium">Locktime</label>
            </div>

            <div v-if="locktimeEnabled" class="flex gap-2">
              <USelectMenu v-model="locktimeType" :items="[
                { label: 'Block', value: 'block' },
                { label: 'Time', value: 'time' },
              ]" value-key="value" class="w-28" />
              <UInput v-model="locktimeValue" type="number"
                :placeholder="locktimeType === 'block' ? 'Block height' : 'Unix timestamp'" class="flex-1 font-mono" />
            </div>
          </div>
        </div>
      </UiAppCard>

      <!-- Transaction Summary -->
      <div v-if="totalSendAmount > 0" class="p-4 bg-muted/30 rounded-lg space-y-2">
        <div v-if="selectedUtxoCount > 0" class="flex justify-between text-sm">
          <span class="text-muted">Input Amount</span>
          <span class="font-mono">{{ formatNumber(inputAmountXPI) }} XPI</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted">Output Amount</span>
          <span class="font-mono">{{ formatNumber(totalSendAmount) }} XPI</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted">Network Fee</span>
          <span class="font-mono">{{ estimatedFeeXPI.toFixed(6) }} XPI</span>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-medium">
          <span>Total</span>
          <span class="font-mono">{{ formatNumber(toLotusUnits((totalSendAmountSats + BigInt(estimatedFee)).toString()))
          }}
            XPI</span>
        </div>
        <div v-if="changeAmount > 0n" class="flex justify-between text-muted text-sm">
          <span>Change returned</span>
          <span class="font-mono">{{ formatNumber(changeAmountXPI) }} XPI</span>
        </div>
      </div>

      <!-- Errors -->
      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="error"
        :close-button="{ icon: 'i-lucide-x', color: 'error', variant: 'link' }" @close="error = null" />

      <UAlert v-if="hasNetworkMismatch" color="error" variant="subtle" icon="i-lucide-alert-triangle"
        title="Network mismatch" description="One or more addresses are for a different network." />

      <UAlert v-if="shouldShowValidationError" color="warning" variant="subtle" icon="i-lucide-alert-triangle"
        :title="draftStore.validationError || ''" />

      <!-- Send Button -->
      <UButton color="primary" size="lg" block :loading="sending" :disabled="!canSend" @click="initiateTransaction">
        <UIcon name="i-lucide-send" class="w-5 h-5 mr-2" />
        {{ sending ? 'Sending...' : `Send ${formatNumber(totalSendAmount)} XPI` }}
      </UButton>

      <!-- Confirmation Modal -->
      <SendConfirmationModal v-model:open="showConfirmModal" :draft="draftStore" :sending="sending"
        @confirm="sendTransaction" @cancel="showConfirmModal = false" />
    </template>
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
