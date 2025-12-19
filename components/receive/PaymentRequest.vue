<script setup lang="ts">
/**
 * ReceivePaymentRequest
 *
 * Form to create a payment request with amount and note.
 */
import { useWalletStore } from '~/stores/wallet'

const emit = defineEmits<{
  'update:amount': [value: string]
  'update:label': [value: string]
  share: []
}>()

const walletStore = useWalletStore()
const { createPaymentURI } = useQRCode()
const { copy } = useClipboard()

const amount = ref('')
const label = ref('')

// Emit changes
watch(amount, val => emit('update:amount', val))
watch(label, val => emit('update:label', val))

// Create shareable link
const paymentLink = computed(() => {
  return createPaymentURI(walletStore.address, {
    amount: amount.value || undefined,
    label: label.value || undefined,
  })
})

// Share payment request
async function shareRequest() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Payment Request',
        text: label.value || 'Payment request',
        url: paymentLink.value,
      })
    } catch {
      // User cancelled or share failed, fall back to copy
      copyLink()
    }
  } else {
    copyLink()
  }
  emit('share')
}

function copyLink() {
  copy(paymentLink.value, 'Payment link')
}
</script>

<template>
  <UiAppCard title="Payment Request" icon="i-lucide-file-text">
    <div class="space-y-4">
      <!-- Amount -->
      <UFormField label="Amount (optional)">
        <UInput v-model="amount" type="number" inputmode="decimal" placeholder="0.00" step="0.000001">
          <template #trailing>
            <span class="text-muted text-sm">XPI</span>
          </template>
        </UInput>
      </UFormField>

      <!-- Label/Note -->
      <UFormField label="Note (optional)">
        <UInput v-model="label" placeholder="What's this payment for?" maxlength="100" />
      </UFormField>

      <!-- Share Button -->
      <UButton block color="primary" icon="i-lucide-share" @click="shareRequest">
        Share Payment Request
      </UButton>

      <!-- Copy Link -->
      <UButton block color="neutral" variant="ghost" icon="i-lucide-link" @click="copyLink">
        Copy Payment Link
      </UButton>
    </div>
  </UiAppCard>
</template>
