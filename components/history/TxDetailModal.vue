<script setup lang="ts">
/**
 * HistoryTxDetailModal
 *
 * Detailed transaction view in a modal.
 */
const props = defineProps<{
  /** Whether modal is open */
  open: boolean
  /** Transaction data */
  transaction?: {
    txid: string
    timestamp: number
    blockHeight?: number
    direction: 'incoming' | 'outgoing' | 'self'
    amount: string
    fee?: string
    counterparty?: string
    counterpartyName?: string
    confirmations: number
    isCoinbase?: boolean
    opReturn?: string
    inputs?: Array<{ address: string; amount: string }>
    outputs?: Array<{ address: string; amount: string }>
  }
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { formatXPI } = useAmount()
const { formatDateTime } = useTime()
const { truncateAddress } = useAddress()
const { copy } = useClipboard()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const isIncoming = computed(() =>
  props.transaction?.direction === 'incoming' || props.transaction?.isCoinbase,
)

const statusColor = computed(() => {
  if (!props.transaction) return 'neutral'
  if (props.transaction.confirmations === 0) return 'warning'
  if (props.transaction.confirmations < 6) return 'primary'
  return 'success'
})

const statusLabel = computed(() => {
  if (!props.transaction) return ''
  if (props.transaction.confirmations === 0) return 'Pending'
  if (props.transaction.confirmations < 6) return `${props.transaction.confirmations} confirmations`
  return 'Confirmed'
})

function copyTxid() {
  if (props.transaction) {
    copy(props.transaction.txid, 'Transaction ID')
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-lg' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon :name="isIncoming ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'"
          :class="['w-5 h-5', isIncoming ? 'text-success' : 'text-error']" />
        <span class="font-semibold">Transaction Details</span>
      </div>
    </template>

    <template #body>
      <div v-if="transaction" class="space-y-4">
        <!-- Amount -->
        <div class="text-center py-4">
          <p :class="[
            'text-3xl font-bold',
            isIncoming ? 'text-success' : 'text-error',
          ]">
            {{ isIncoming ? '+' : '-' }}{{ formatXPI(transaction.amount, { showUnit: false }) }}
            <span class="text-lg font-normal text-muted">XPI</span>
          </p>
        </div>

        <!-- Status -->
        <div class="flex items-center justify-between py-2">
          <span class="text-muted">Status</span>
          <UBadge :color="statusColor" variant="subtle">
            {{ statusLabel }}
          </UBadge>
        </div>

        <!-- Date -->
        <div class="flex items-center justify-between py-2">
          <span class="text-muted">Date</span>
          <span>{{ formatDateTime(transaction.timestamp) }}</span>
        </div>

        <!-- Block -->
        <div v-if="transaction.blockHeight" class="flex items-center justify-between py-2">
          <span class="text-muted">Block</span>
          <NuxtLink :to="`/explorer/block/${transaction.blockHeight}`" class="text-primary hover:underline">
            {{ transaction.blockHeight.toLocaleString() }}
          </NuxtLink>
        </div>

        <!-- Fee -->
        <div v-if="transaction.fee && !isIncoming" class="flex items-center justify-between py-2">
          <span class="text-muted">Fee</span>
          <span>{{ formatXPI(transaction.fee) }}</span>
        </div>

        <!-- Counterparty -->
        <div v-if="transaction.counterparty" class="flex items-center justify-between py-2">
          <span class="text-muted">{{ isIncoming ? 'From' : 'To' }}</span>
          <div class="text-right">
            <p v-if="transaction.counterpartyName" class="font-medium">
              {{ transaction.counterpartyName }}
            </p>
            <NuxtLink :to="`/explorer/address/${transaction.counterparty}`"
              class="text-sm font-mono text-primary hover:underline">
              {{ truncateAddress(transaction.counterparty, 12, 8) }}
            </NuxtLink>
          </div>
        </div>

        <!-- OP_RETURN -->
        <div v-if="transaction.opReturn" class="py-2">
          <span class="text-muted block mb-1">Message</span>
          <p class="text-sm bg-muted/30 rounded p-2 font-mono break-all">
            {{ transaction.opReturn }}
          </p>
        </div>

        <!-- Transaction ID -->
        <div class="py-2">
          <span class="text-muted block mb-1">Transaction ID</span>
          <div class="flex items-center gap-2">
            <code class="text-xs font-mono break-all flex-1">
        {{ transaction.txid }}
      </code>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copyTxid" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between">
        <UButton :to="`/explorer/tx/${transaction?.txid}`" color="neutral" variant="ghost"
          icon="i-lucide-external-link">
          View in Explorer
        </UButton>
        <UButton color="primary" @click="isOpen = false">
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>
