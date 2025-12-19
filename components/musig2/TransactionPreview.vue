<script setup lang="ts">
/**
 * TransactionPreview
 *
 * Preview of a transaction to be signed.
 */
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  /** Transaction details */
  transaction: {
    recipient: string
    amount: bigint | string
    fee?: bigint | string
    purpose?: string
    walletName?: string
  }
  /** Whether to show approve/reject actions */
  showActions?: boolean
}>()

const emit = defineEmits<{
  approve: []
  reject: []
}>()

const contactsStore = useContactsStore()
const { formatXPI } = useAmount()
const { truncateAddress } = useAddress()

// Convert amounts
const amount = computed(() => {
  return typeof props.transaction.amount === 'string'
    ? BigInt(props.transaction.amount)
    : props.transaction.amount
})

const fee = computed(() => {
  if (!props.transaction.fee) return 0n
  return typeof props.transaction.fee === 'string'
    ? BigInt(props.transaction.fee)
    : props.transaction.fee
})

const total = computed(() => amount.value + fee.value)

// Find contact for recipient
const recipientContact = computed(() =>
  contactsStore.contacts.find(c => c.address === props.transaction.recipient),
)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div v-if="transaction.walletName" class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-lucide-shield" class="w-4 h-4" />
      <span>From: {{ transaction.walletName }}</span>
    </div>

    <!-- Amount -->
    <div class="text-center py-4">
      <p class="text-sm text-muted mb-1">Amount</p>
      <p class="text-3xl font-bold">{{ formatXPI(amount) }}</p>
    </div>

    <!-- Details -->
    <div class="space-y-3 p-4 bg-muted/50 rounded-lg">
      <!-- Recipient -->
      <div class="flex justify-between">
        <span class="text-muted">To</span>
        <div class="text-right">
          <p v-if="recipientContact" class="font-medium">
            {{ recipientContact.name }}
          </p>
          <p class="font-mono text-sm">
            {{ truncateAddress(transaction.recipient, 8, 8) }}
          </p>
        </div>
      </div>

      <!-- Fee -->
      <div class="flex justify-between">
        <span class="text-muted">Network Fee</span>
        <span class="font-medium">{{ formatXPI(fee) }}</span>
      </div>

      <!-- Total -->
      <div class="flex justify-between pt-2 border-t border-default">
        <span class="font-medium">Total</span>
        <span class="font-bold">{{ formatXPI(total) }}</span>
      </div>
    </div>

    <!-- Purpose -->
    <div v-if="transaction.purpose" class="p-3 bg-muted/50 rounded-lg">
      <p class="text-xs text-muted mb-1">Purpose</p>
      <p class="text-sm">{{ transaction.purpose }}</p>
    </div>

    <!-- Actions -->
    <div v-if="showActions" class="flex gap-3 pt-2">
      <UButton class="flex-1" color="error" variant="outline" icon="i-lucide-x" @click="emit('reject')">
        Reject
      </UButton>
      <UButton class="flex-1" color="success" icon="i-lucide-check" @click="emit('approve')">
        Approve & Sign
      </UButton>
    </div>
  </div>
</template>
