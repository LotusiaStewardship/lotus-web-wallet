<script setup lang="ts">
/**
 * SendConfirmationModal
 *
 * Review and confirm transaction before sending.
 */
import type { DraftState } from '~/stores/draft'
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  /** Whether modal is open */
  open: boolean
  /** Draft transaction state */
  draft: DraftState
  /** Whether currently sending */
  sending?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const contactsStore = useContactsStore()
const { formatXPI } = useAmount()
const { truncateAddress } = useAddress()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Get contact for recipient
const recipientContact = computed(() => {
  const address = props.draft.recipients[0]?.address
  if (!address) return null
  return contactsStore.contacts.find(c => c.address === address)
})

// Display values
const recipientDisplay = computed(() => {
  if (recipientContact.value) {
    return recipientContact.value.name
  }
  const address = props.draft.recipients[0]?.address
  return address ? truncateAddress(address, 12, 8) : 'Unknown'
})

const amountDisplay = computed(() =>
  formatXPI(props.draft.outputAmount.toString(), { showUnit: false }),
)

const feeDisplay = computed(() =>
  formatXPI(props.draft.estimatedFee.toString(), { showUnit: false }),
)

const totalDisplay = computed(() => {
  const output = props.draft.outputAmount
  const fee = BigInt(props.draft.estimatedFee)
  return formatXPI((output + fee).toString(), { showUnit: false })
})

const inputDisplay = computed(() =>
  formatXPI(props.draft.inputAmount.toString(), { showUnit: false }),
)

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-file-check" class="w-5 h-5 text-primary" />
        <span class="font-semibold">Review Transaction</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Recipient -->
        <div class="flex items-center justify-between py-2">
          <span class="text-muted">To</span>
          <div class="text-right">
            <p class="font-medium">{{ recipientDisplay }}</p>
            <p v-if="recipientContact" class="text-xs text-muted font-mono">
              {{ truncateAddress(draft.recipients[0]?.address || '', 12, 8) }}
            </p>
          </div>
        </div>

        <!-- Input Amount -->
        <div v-if="draft.selectedUtxoCount > 0" class="flex items-center justify-between py-2">
          <span>Using {{ draft.selectedUtxoCount }} of {{ draft.totalUtxoCount }} UTXOs</span>
          <span class="font-mono">{{ inputDisplay }} XPI input</span>
        </div>

        <!-- Output Amount -->
        <div class="flex items-center justify-between py-2">
          <span class="text-muted">Output Amount</span>
          <span class="font-medium">{{ amountDisplay }} XPI</span>
        </div>

        <!-- Fee -->
        <div class="flex items-center justify-between py-2">
          <span class="text-muted">Network Fee</span>
          <span class="text-sm">{{ feeDisplay }} XPI</span>
        </div>

        <div class="border-t border-default my-2" />

        <!-- Total -->
        <div class="flex items-center justify-between py-2">
          <span class="font-medium">Total</span>
          <span class="text-lg font-bold">{{ totalDisplay }} XPI</span>
        </div>

        <!-- Warning for large amounts -->
        <UAlert v-if="draft.outputAmount > 1000000000n" color="warning" icon="i-lucide-alert-triangle"
          title="Large Transaction"
          description="You are about to send a large amount. Please double-check the recipient address." />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="sending" @click="handleCancel">
          Cancel
        </UButton>
        <UButton color="primary" :loading="sending" icon="i-lucide-send" @click="handleConfirm">
          Confirm & Send
        </UButton>
      </div>
    </template>
  </UModal>
</template>
