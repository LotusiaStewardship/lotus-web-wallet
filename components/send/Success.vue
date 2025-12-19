<script setup lang="ts">
/**
 * SendSuccess
 *
 * Success state after transaction is sent.
 */
const props = defineProps<{
  /** Transaction ID */
  txid: string
  /** Amount sent */
  amount?: string
  /** Recipient address or name */
  recipient?: string
}>()

const emit = defineEmits<{
  sendAnother: []
  done: []
}>()

const { copy } = useClipboard()
const { formatXPI } = useAmount()
const { truncateAddress } = useAddress()

const txidDisplay = computed(() =>
  props.txid ? `${props.txid.slice(0, 16)}...${props.txid.slice(-8)}` : '',
)

const amountDisplay = computed(() =>
  props.amount ? formatXPI(props.amount, { showUnit: false }) : null,
)

function copyTxid() {
  copy(props.txid, 'Transaction ID')
}
</script>

<template>
  <UiAppCard class="text-center py-8">
    <!-- Success Icon -->
    <div class="mb-6">
      <div class="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
        <UIcon name="i-lucide-check-circle" class="w-10 h-10 text-success" />
      </div>
    </div>

    <!-- Title -->
    <h2 class="text-2xl font-bold mb-2">Transaction Sent!</h2>

    <!-- Amount and recipient -->
    <p v-if="amountDisplay && recipient" class="text-lg text-muted mb-4">
      {{ amountDisplay }} XPI → {{ recipient }}
    </p>

    <!-- Transaction ID -->
    <div class="mb-6">
      <p class="text-sm text-muted mb-1">Transaction ID</p>
      <div class="flex items-center justify-center gap-2">
        <code class="text-sm font-mono">{{ txidDisplay }}</code>
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copyTxid" />
      </div>
    </div>

    <!-- Info -->
    <p class="text-sm text-muted mb-6">
      Your transaction has been broadcast to the network.
      <br />
      It usually confirms within ~10 seconds.
    </p>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row justify-center gap-3">
      <UButton :to="`/explorer/tx/${txid}`" color="neutral" variant="outline" icon="i-lucide-external-link">
        View in Explorer
      </UButton>
      <UButton color="neutral" variant="ghost" icon="i-lucide-repeat" @click="emit('sendAnother')">
        Send Another
      </UButton>
      <UButton color="primary" icon="i-lucide-check" @click="emit('done')">
        Done
      </UButton>
    </div>
  </UiAppCard>
</template>
