<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'
import { useAddressFormat } from '~/composables/useUtils'
import QRCode from 'qrcode-vue3'

definePageMeta({
  title: 'Receive Lotus',
})

const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const toast = useToast()
const { formatFingerprint, getAddressTypeLabel } = useAddressFormat()

// Address type info
const addressTypeInfo = computed(() => getAddressTypeLabel(walletStore.address))

// QR Code options
const qrOptions = {
  width: 280,
  height: 280,
  margin: 2,
  dotsOptions: {
    color: '#c6005c',
    type: 'rounded' as const,
  },
  cornersSquareOptions: {
    color: '#c6005c',
    type: 'extra-rounded' as const,
  },
  cornersDotOptions: {
    color: '#c6005c',
    type: 'dot' as const,
  },
  backgroundOptions: {
    color: '#ffffff',
  },
}

// Copy address to clipboard
const copyAddress = async () => {
  try {
    await navigator.clipboard.writeText(walletStore.address)
    toast.add({
      title: 'Address Copied',
      description: 'Your Lotus address has been copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Copy Failed',
      description: 'Failed to copy address to clipboard',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Share address (if supported)
const shareAddress = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Lotus Address',
        text: walletStore.address,
      })
    } catch (err) {
      // User cancelled or share failed
    }
  }
}

const canShare = computed(() => typeof navigator !== 'undefined' && !!navigator.share)

// Toggle between truncated and full address display
const displayAddress = computed(() => walletStore.address)
const fingerprint = computed(() => formatFingerprint(walletStore.address))
</script>

<template>
  <div class="max-w-xl mx-auto space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-qr-code" class="w-5 h-5" />
            <span class="font-semibold">Receive Lotus</span>
          </div>
          <UBadge v-if="!networkStore.isProduction" :color="networkStore.color" variant="subtle">
            {{ networkStore.displayName }}
          </UBadge>
        </div>
      </template>

      <div class="text-center space-y-6">
        <!-- QR Code -->
        <div class="flex justify-center">
          <div :class="[
            'p-4 rounded-xl shadow-sm',
            networkStore.isProduction ? 'bg-white' : '',
            networkStore.isTestnet ? 'bg-warning-50 ring-2 ring-warning-300' : '',
            /* networkStore.isRegtest ? 'bg-info-50 ring-2 ring-info-300' : '' */
          ]">
            <QRCode :value="walletStore.address" :width="qrOptions.width" :height="qrOptions.height"
              :margin="qrOptions.margin" :dots-options="qrOptions.dotsOptions"
              :corners-square-options="qrOptions.cornersSquareOptions"
              :corners-dot-options="qrOptions.cornersDotOptions" :background-options="qrOptions.backgroundOptions" />
          </div>
        </div>

        <!-- Address Display -->
        <div class="space-y-2">
          <div class="bg-muted/50 rounded-lg p-4 cursor-pointer">
            <p class="font-mono text-sm break-all select-all">
              {{ displayAddress }}
            </p>
          </div>
          <!-- Fingerprint and network badges -->
          <div v-if="fingerprint" class="flex items-center justify-center gap-1.5 flex-wrap">
            <span class="text-sm text-muted">Your ID:</span>
            <UBadge color="primary" variant="subtle" size="md" class="font-mono">
              {{ fingerprint }}
            </UBadge>
            <UBadge :icon="addressTypeInfo.icon" :color="addressTypeInfo.color as any" variant="subtle" size="md">
              {{ addressTypeInfo.short }}
            </UBadge>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-2 justify-center">
          <UButton color="primary" icon="i-lucide-copy" @click="copyAddress">
            Copy Address
          </UButton>
          <UButton v-if="canShare" color="neutral" variant="outline" icon="i-lucide-share-2" @click="shareAddress">
            Share
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Instructions -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-info" class="w-5 h-5" />
          <span class="font-semibold">How to Receive</span>
        </div>
      </template>

      <div class="space-y-4">
        <InstructionStep :number="1" title="Share your address"
          description="Copy your address or let others scan your QR code" />
        <InstructionStep :number="2" title="Wait for confirmation"
          description="Transactions typically confirm within a few seconds" />
        <InstructionStep :number="3" title="Check your balance"
          description="Your balance will update automatically when Lotus arrives" />
      </div>
    </UCard>

    <!-- Privacy Notice -->
    <UAlert color="warning" variant="subtle" icon="i-lucide-shield-alert">
      <template #title>Privacy Notice</template>
      <template #description>
        Sharing your address allows others to see your transaction history and voting activity on the Lotus blockchain.
        Use discretion when sharing.
      </template>
    </UAlert>
  </div>
</template>
