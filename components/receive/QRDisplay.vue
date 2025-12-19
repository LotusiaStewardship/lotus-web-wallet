<script setup lang="ts">
/**
 * ReceiveQRDisplay
 *
 * QR code display with address and copy functionality.
 * Phase 7: Fixed to use CommonQRCode component instead of non-existent generate function.
 */
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  /** Optional amount for payment request */
  amount?: string
  /** Optional label/note */
  label?: string
}>()

const walletStore = useWalletStore()
const { createPaymentURI } = useQRCode()
const { copyAddress } = useClipboard()

// Generate payment URI for QR code
const paymentURI = computed(() =>
  createPaymentURI(walletStore.address, {
    amount: props.amount,
    label: props.label,
  }),
)

function handleCopy() {
  copyAddress(walletStore.address)
}
</script>

<template>
  <div class="text-center">
    <!-- QR Code using CommonQRCode component -->
    <div class="mb-4">
      <CommonQRCode :value="paymentURI" :size="192" />
    </div>

    <!-- Address -->
    <div class="mb-4">
      <p class="font-mono text-sm break-all px-4 select-all">
        {{ walletStore.address }}
      </p>
    </div>

    <!-- Copy Button -->
    <UButton color="primary" variant="outline" icon="i-lucide-copy" @click="handleCopy">
      Copy Address
    </UButton>
  </div>
</template>
