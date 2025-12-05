<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { toLotusUnits, toSatoshiUnits } from '~/stores/wallet'
import { useContactsStore, type Contact, getContactAddress } from '~/stores/contacts'
import { useNetworkStore } from '~/stores/network'
import { useAddressFormat } from '~/composables/useUtils'

definePageMeta({
  title: 'Send Lotus',
})

const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const networkStore = useNetworkStore()
const toast = useToast()
const route = useRoute()
const config = useRuntimeConfig()
const { truncateAddress, getNetworkName, isValidAddress } = useAddressFormat()

// ============================================================================
// UI-only state (contact names for display, not stored in wallet)
// ============================================================================
const contactNames = ref<Map<string, string>>(new Map())

// Fee presets (defined early so they can be referenced in onMounted)
const feePresets = [
  { label: 'Economy', value: 1, description: '1 sat/byte' },
  { label: 'Normal', value: 2, description: '2 sat/byte' },
  { label: 'Priority', value: 5, description: '5 sat/byte' },
]
const showCustomFee = ref(false)

// Initialize contacts store and draft transaction
onMounted(() => {
  contactsStore.initialize()
  walletStore.initializeDraftTransaction()

  // Check for prefilled address from query params
  if (route.query.address && walletStore.draftTx.recipients.length > 0) {
    const firstRecipient = walletStore.draftTx.recipients[0]
    walletStore.updateDraftRecipientAddress(firstRecipient.id, route.query.address as string)
  }

  // Sync fee rate display state - show custom input if fee doesn't match a preset
  const currentFeeRate = walletStore.draftTx.feeRate
  const isPreset = feePresets.some(p => p.value === currentFeeRate)
  if (!isPreset) {
    showCustomFee.value = true
  }

  // Re-resolve contact names from addresses for any existing recipients
  // This handles the case where user navigates away and returns
  for (const recipient of walletStore.draftTx.recipients) {
    if (recipient.address) {
      const contact = contactsStore.getContactByAddress(recipient.address)
      if (contact) {
        contactNames.value.set(recipient.id, contact.name)
      }
    }
  }
})

// ============================================================================
// Mode Toggle
// ============================================================================
const advancedMode = ref(false)

// When advanced mode is disabled, clear all advanced options
watch(advancedMode, (enabled) => {
  if (!enabled) {
    // Clear local state
    coinControlEnabled.value = false
    selectedUtxos.value = new Set()
    opReturnEnabled.value = false
    opReturnData.value = ''
    locktimeEnabled.value = false
    locktimeValue.value = ''
    // Sync to store to ensure consistency
    walletStore.setDraftSelectedUtxos([])
    walletStore.setDraftOpReturn(null)
    walletStore.setDraftLocktime(null)
  }
})

// ============================================================================
// Recipients (from store)
// ============================================================================
const recipients = computed(() => walletStore.draftTx.recipients)

const addRecipient = () => {
  walletStore.addDraftRecipient()
}

const removeRecipient = (id: string) => {
  walletStore.removeDraftRecipient(id)
  contactNames.value.delete(id)
}

const handleContactSelect = (recipientId: string, contact: Contact) => {
  const address = getContactAddress(contact, networkStore.currentNetwork) || contact.address
  walletStore.updateDraftRecipientAddress(recipientId, address)
  contactNames.value.set(recipientId, contact.name)
}

const clearRecipient = (id: string) => {
  walletStore.clearDraftRecipient(id)
  contactNames.value.delete(id)
}

const getContactName = (id: string): string | undefined => {
  return contactNames.value.get(id)
}

/**
 * Get display amount for a recipient (in XPI)
 * Returns empty string for zero amounts to show placeholder (unless sendMax)
 */
const getRecipientDisplayAmount = (recipient: typeof recipients.value[0]): string => {
  if (recipient.sendMax) {
    // For sendMax, always show the calculated amount (even if 0)
    const maxSendable = walletStore.draftTx.maxSendable
    return toLotusUnits(maxSendable.toString()).toString()
  }
  // For regular recipients, show empty string for 0 to display placeholder
  if (recipient.amountSats === 0n) return ''
  return toLotusUnits(recipient.amountSats.toString()).toString()
}

/**
 * Update recipient amount from user input (XPI string)
 * Only updates if the value actually changed to prevent feedback loops
 */
const updateRecipientAmount = (id: string, amountXpi: string) => {
  const recipient = walletStore.getDraftRecipient(id)
  if (!recipient) return

  // If sendMax is enabled, don't update from input changes
  // (the input is display-only when sendMax is true)
  if (recipient.sendMax) return

  const amountSats = BigInt(toSatoshiUnits(amountXpi || '0'))
  // Only update if the value actually changed
  if (amountSats !== recipient.amountSats) {
    walletStore.updateDraftRecipientAmount(id, amountSats)
  }
}

/**
 * Set max amount for a recipient
 * Shows a toast if MAX was moved from another recipient
 */
const setMaxAmount = (id: string) => {
  // Check if another recipient currently has sendMax
  const currentMaxRecipient = walletStore.draftTx.recipients.find(
    r => r.sendMax && r.id !== id,
  )

  walletStore.setDraftRecipientSendMax(id, true)

  // Notify user if MAX was moved from another recipient
  if (currentMaxRecipient) {
    const recipientIndex = walletStore.draftTx.recipients.findIndex(
      r => r.id === id,
    )
    toast.add({
      title: 'MAX amount moved',
      description: `Only one recipient can receive the maximum amount. MAX is now set for recipient ${recipientIndex + 1}.`,
      color: 'info',
      icon: 'i-lucide-info',
    })
  }
}

/**
 * Clear sendMax and allow manual input
 */
const clearSendMax = (id: string) => {
  walletStore.setDraftRecipientSendMax(id, false)
}

// ============================================================================
// Fee Configuration
// ============================================================================
const feeRate = computed({
  get: () => walletStore.draftTx.feeRate,
  set: (value: number) => walletStore.setDraftFeeRate(value),
})
// Note: showCustomFee and feePresets are defined earlier (before onMounted)
// so they can be referenced during initialization

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
  syncCoinControlToDraft()
}

const selectAllUtxos = () => {
  const utxos = walletStore.getSpendableUtxos()
  selectedUtxos.value = new Set(utxos.map(u => u.outpoint))
  syncCoinControlToDraft()
}

const deselectAllUtxos = () => {
  selectedUtxos.value = new Set()
  syncCoinControlToDraft()
}

const syncCoinControlToDraft = () => {
  if (coinControlEnabled.value && selectedUtxos.value.size > 0) {
    walletStore.setDraftSelectedUtxos(Array.from(selectedUtxos.value))
  } else {
    walletStore.setDraftSelectedUtxos([])
  }
}

// Watch coin control enabled state
watch(coinControlEnabled, (enabled) => {
  if (!enabled) {
    // Clear local selection when disabling coin control
    selectedUtxos.value = new Set()
  }
  syncCoinControlToDraft()
})

// Watch for UTXO changes and prune invalid selections from coin control
watch(
  () => walletStore.utxos,
  () => {
    if (coinControlEnabled.value && selectedUtxos.value.size > 0) {
      const validOutpoints = new Set(
        walletStore.getSpendableUtxos().map(u => u.outpoint),
      )
      const prunedSelection = new Set(
        [...selectedUtxos.value].filter(o => validOutpoints.has(o)),
      )
      if (prunedSelection.size !== selectedUtxos.value.size) {
        selectedUtxos.value = prunedSelection
        syncCoinControlToDraft()
      }
    }
  },
  { deep: true },
)

// OP_RETURN Data
const opReturnEnabled = ref(false)
const opReturnData = ref('')
const opReturnEncoding = ref<'utf8' | 'hex'>('utf8')

// Sync OP_RETURN changes to draft transaction
const syncOpReturnToDraft = () => {
  if (opReturnEnabled.value && opReturnData.value) {
    walletStore.setDraftOpReturn({
      data: opReturnData.value,
      encoding: opReturnEncoding.value,
    })
  } else {
    walletStore.setDraftOpReturn(null)
  }
}

watch([opReturnEnabled, opReturnData, opReturnEncoding], () => {
  syncOpReturnToDraft()
})

// Computed OP_RETURN byte count with hex validation
const opReturnByteCount = computed(() => {
  if (!opReturnData.value) return { bytes: 0, valid: true }

  if (opReturnEncoding.value === 'hex') {
    // Validate hex: must be even length and only hex characters
    const isValidHex = /^[0-9a-fA-F]*$/.test(opReturnData.value)
    const isEvenLength = opReturnData.value.length % 2 === 0
    if (!isValidHex || !isEvenLength) {
      return { bytes: 0, valid: false, error: !isValidHex ? 'Invalid hex characters' : 'Hex must have even length' }
    }
    return { bytes: opReturnData.value.length / 2, valid: true }
  }

  // UTF-8: use TextEncoder for accurate byte count
  const encoder = new TextEncoder()
  return { bytes: encoder.encode(opReturnData.value).length, valid: true }
})

// Locktime
const locktimeEnabled = ref(false)
const locktimeType = ref<'block' | 'time'>('block')
const locktimeValue = ref('')

// Sync locktime changes to draft transaction
const syncLocktimeToDraft = () => {
  if (locktimeEnabled.value && locktimeValue.value) {
    walletStore.setDraftLocktime({
      type: locktimeType.value,
      value: parseInt(locktimeValue.value, 10),
    })
  } else {
    walletStore.setDraftLocktime(null)
  }
}

watch([locktimeEnabled, locktimeType, locktimeValue], () => {
  syncLocktimeToDraft()
})

// ============================================================================
// Validation
// ============================================================================

// Check if address format is valid (any network)
const validateAddress = (address: string): boolean | null => {
  if (!address) return null
  if (!address.startsWith('lotus')) return false
  const network = getNetworkName(address)
  if (network === 'unknown') return false
  return isValidAddress(address)
}

// Check if address is for the current network
const validateAddressNetwork = (address: string): boolean | null => {
  if (!address) return null
  if (validateAddress(address) !== true) return null
  const addressNetwork = getNetworkName(address)
  return addressNetwork === networkStore.currentNetwork
}

const validateAmountSats = (amountSats: bigint, sendMax: boolean): boolean | null => {
  if (sendMax) return true
  if (amountSats === 0n) return null
  return amountSats > 0n
}

const recipientValidations = computed(() => {
  return recipients.value.map(r => ({
    address: validateAddress(r.address),
    addressNetwork: validateAddressNetwork(r.address),
    amount: validateAmountSats(r.amountSats, r.sendMax),
  }))
})

const allRecipientsValid = computed(() => {
  return recipientValidations.value.every(v =>
    v.address === true && v.addressNetwork === true && v.amount === true
  )
})

// Check if any recipient has wrong network
const hasNetworkMismatch = computed(() => {
  return recipientValidations.value.some(v => v.addressNetwork === false)
})

// ============================================================================
// Transaction Calculations (from wallet store)
// ============================================================================

// Computed values from draft transaction state
const draftTx = computed(() => walletStore.draftTx)
const availableBalance = computed(() => draftTx.value.inputAmount)
const availableBalanceXPI = computed(() => toLotusUnits(availableBalance.value.toString()))
const estimatedFee = computed(() => draftTx.value.estimatedFee)
const estimatedFeeXPI = computed(() => toLotusUnits(estimatedFee.value))
const changeAmount = computed(() => draftTx.value.changeAmount)
const changeAmountXPI = computed(() => toLotusUnits(changeAmount.value.toString()))

// Total send amount for display (in XPI) - use the store's calculated outputAmount
const totalSendAmountSats = computed(() => draftTx.value.outputAmount)
const totalSendAmount = computed(() => toLotusUnits(totalSendAmountSats.value.toString()))

// ============================================================================
// Form State
// ============================================================================
const sending = ref(false)
const txResult = ref<{ txid: string; amountXpi: number } | null>(null)
const error = ref<string | null>(null)
// Track if user has attempted to send - used to delay showing validation errors
const hasAttemptedSend = ref(false)

const canSend = computed(() => {
  if (sending.value) return false
  if (!allRecipientsValid.value) return false
  if (coinControlEnabled.value && selectedUtxos.value.size === 0) return false
  return draftTx.value.isValid
})

// Show validation errors only after user has attempted to send, or if they have
// entered a significant amount (to avoid premature error display while typing)
const shouldShowValidationError = computed(() => {
  if (!draftTx.value.validationError || draftTx.value.isValid) return false
  // Always show after attempted send
  if (hasAttemptedSend.value) return true
  // Show if user has entered an amount (they're actively working on the form)
  if (totalSendAmount.value > 0) return true
  // Show for critical errors like insufficient balance
  if (draftTx.value.validationError.includes('Insufficient')) return true
  return false
})

// ============================================================================
// Send Transaction
// ============================================================================
const sendTransaction = async () => {
  // Mark that user has attempted to send (shows validation errors)
  hasAttemptedSend.value = true

  if (!canSend.value) return

  sending.value = true
  error.value = null
  txResult.value = null

  // Capture the amount before sending (since resetForm will clear it)
  const amountToSend = totalSendAmount.value

  try {
    const txid = await walletStore.sendDraftTransaction()

    // If successful, show the success card with txid, amount, and actions
    txResult.value = { txid, amountXpi: amountToSend }

    /* toast.add({
      title: 'Transaction Sent!',
      description: `Successfully sent ${amountToSend.toFixed(2)} XPI`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    }) */

    // Reset form after successful send
    //resetForm()
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
  showCustomFee.value = false
  coinControlEnabled.value = false
  selectedUtxos.value = new Set()
  opReturnEnabled.value = false
  opReturnData.value = ''
  locktimeEnabled.value = false
  locktimeValue.value = ''
  error.value = null
  txResult.value = null
  hasAttemptedSend.value = false
  contactNames.value.clear()
  // Re-initialize the draft transaction (resets recipients and recalculates balance)
  walletStore.initializeDraftTransaction()
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
    minimumFractionDigits: 6,
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
        <p class="text-muted mb-4">{{ formatNumber(txResult.amountXpi) }} XPI sent successfully</p>

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
                  <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x"
                    @click="removeRecipient(recipient.id)" />
                </div>

                <!-- Selected Contact Display -->
                <div v-if="getContactName(recipient.id)"
                  class="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <ContactAvatar :name="getContactName(recipient.id)!" size="sm" />
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm">{{ getContactName(recipient.id) }}</p>
                    <p class="text-xs text-muted font-mono truncate">{{ truncateAddress(recipient.address) }}</p>
                  </div>
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x"
                    @click="clearRecipient(recipient.id)" />
                </div>

                <!-- Address Input -->
                <div v-else>
                  <ContactsContactSearch :model-value="recipient.address"
                    @update:model-value="walletStore.updateDraftRecipientAddress(recipient.id, $event)" class="w-full"
                    :filter-by-network="true" @select="handleContactSelect(recipient.id, $event)" />
                  <p v-if="recipientValidations[index]?.address === false" class="text-xs text-error-500 mt-1">
                    Invalid address format
                  </p>
                  <p v-else-if="recipientValidations[index]?.addressNetwork === false"
                    class="text-xs text-warning-500 mt-1">
                    <UIcon name="i-lucide-alert-triangle" class="w-3 h-3 inline" />
                    This address is for a different network. You are on {{ networkStore.displayName }}.
                  </p>
                </div>

                <!-- Amount Input (only shown if address is valid) -->
                <UInput v-show="validateAddress(recipient.address)" :model-value="getRecipientDisplayAmount(recipient)"
                  @update:model-value="updateRecipientAmount(recipient.id, $event)" type="number" placeholder="0.00"
                  class="w-full font-mono" :color="recipientValidations[index]?.amount === false ? 'error' : undefined"
                  :readonly="recipient.sendMax" step="0.000001" min="0">
                  <template #trailing>
                    <div class="flex items-center gap-1">
                      <span class="text-sm text-muted">XPI</span>
                      <UButton v-if="recipient.sendMax" size="xs" variant="link" color="neutral" class="px-1"
                        @click="clearSendMax(recipient.id)">
                        CLEAR
                      </UButton>
                      <UButton v-else size="xs" variant="link" color="primary" class="px-1"
                        @click="setMaxAmount(recipient.id)">
                        MAX
                      </UButton>
                    </div>
                  </template>
                </UInput>
              </div>
            </div>

            <!-- Quick Contacts (only show for first recipient when empty) -->
            <div v-if="quickContacts.length > 0 && recipients[0] && !recipients[0].address && recipients.length === 1"
              class="mt-3">
              <p class="text-xs text-muted mb-2">Quick send</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="contact in quickContacts" :key="contact.id"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-default hover:border-primary hover:bg-primary/5 transition-all text-sm"
                  @click="handleContactSelect(recipients[0].id, contact)">
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
                  class="w-full font-mono text-sm"
                  :color="!opReturnByteCount.valid || opReturnByteCount.bytes > 220 ? 'error' : undefined" />
                <p
                  :class="['text-xs', !opReturnByteCount.valid || opReturnByteCount.bytes > 220 ? 'text-error-500' : 'text-muted']">
                  <template v-if="!opReturnByteCount.valid">
                    {{ opReturnByteCount.error }}
                  </template>
                  <template v-else>
                    {{ opReturnByteCount.bytes }} bytes (max 220 bytes)
                  </template>
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
                <span class="font-mono">{{ formatNumber(toLotusUnits((totalSendAmountSats +
                  BigInt(estimatedFee)).toString())) }}
                  XPI</span>
              </div>
              <div v-if="changeAmount > 0n" class="flex justify-between text-muted">
                <span>Change</span>
                <span class="font-mono">{{ formatNumber(changeAmountXPI) }} XPI</span>
              </div>
            </div>
          </div>

          <!-- Error Messages -->
          <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="error"
            :close-button="{ icon: 'i-lucide-x', color: 'error', variant: 'link' }" @close="error = null" />

          <UAlert v-if="hasNetworkMismatch" color="error" variant="subtle" icon="i-lucide-alert-triangle"
            title="Network mismatch">
            <template #description>
              One or more recipient addresses are for a different network than {{ networkStore.displayName }}.
              Sending to the wrong network will result in lost funds.
            </template>
          </UAlert>

          <!-- Show store validation error if not ready to send -->
          <UAlert v-if="shouldShowValidationError" color="warning" variant="subtle" icon="i-lucide-alert-triangle"
            :title="draftTx.validationError || ''" />

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
