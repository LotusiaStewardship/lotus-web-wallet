<script setup lang="ts">
/**
 * Receive Page
 *
 * Display wallet address with QR code for receiving Lotus.
 * Supports payment request mode with amount and memo.
 */
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'
import { useAddress } from '~/composables/useAddress'
import { PAYMENT_URI_SCHEME } from '~/utils/constants'
import QRCode from 'qrcode-vue3'

definePageMeta({
  title: 'Receive',
})

const route = useRoute()
const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const toast = useToast()
const { formatFingerprint, getAddressTypeLabel } = useAddress()

// Payment request mode
const requestMode = ref(route.query.request === 'true')
const requestAmount = ref('')
const requestMemo = ref('')

// Address type info
const addressTypeInfo = computed(() => getAddressTypeLabel(walletStore.address))

// Generate BIP21 URI
const paymentUri = computed(() => {
  if (!walletStore.address) return ''

  let uri = `${PAYMENT_URI_SCHEME}:${walletStore.address}`
  const params = new URLSearchParams()

  if (requestAmount.value) {
    const amount = parseFloat(requestAmount.value)
    if (!isNaN(amount) && amount > 0) {
      params.set('amount', amount.toString())
    }
  }

  if (requestMemo.value) {
    params.set('message', requestMemo.value)
  }

  const paramString = params.toString()
  if (paramString) {
    uri += `?${paramString}`
  }

  return uri
})

// QR code data
const qrData = computed(() => requestMode.value ? paymentUri.value : walletStore.address)

// QR Code options - styled with Lotus brand color
const qrOptions = {
  width: 300,
  height: 300,
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

// Copy to clipboard
const copied = ref(false)
async function copyToClipboard() {
  const text = requestMode.value ? paymentUri.value : walletStore.address
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
    toast.add({
      title: 'Copied!',
      description: requestMode.value ? 'Payment link copied' : 'Address copied',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch {
    // Fallback
    const input = document.createElement('input')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  }
}

// Share (native share API)
async function share() {
  if (!navigator.share) return

  try {
    await navigator.share({
      title: 'Lotus Payment Request',
      text: requestMode.value
        ? `Please send ${requestAmount.value || 'some'} XPI to my Lotus wallet`
        : 'My Lotus wallet address',
      url: paymentUri.value,
    })
  } catch {
    // User cancelled
  }
}

const canShare = computed(() => typeof navigator !== 'undefined' && !!navigator.share)

// Address fingerprint for display
const fingerprint = computed(() => formatFingerprint(walletStore.address))
</script>

<template>
  <div class="space-y-6 max-w-lg mx-auto">
    <!-- Hero Header -->
    <UiAppHeroCard icon="i-lucide-qr-code" title="Receive Lotus"
      subtitle="Share your address or create a payment request" />

    <!-- Mode Toggle -->
    <div class="flex rounded-lg bg-muted/50 p-1">
      <button class="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all" :class="!requestMode
        ? 'bg-white dark:bg-gray-800 shadow-sm'
        : 'text-muted hover:text-foreground'
        " @click="requestMode = false">
        Address Only
      </button>
      <button class="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all" :class="requestMode
        ? 'bg-white dark:bg-gray-800 shadow-sm'
        : 'text-muted hover:text-foreground'
        " @click="requestMode = true">
        Payment Request
      </button>
    </div>

    <!-- Payment Request Form -->
    <UiAppCard v-if="requestMode" title="Request Details" icon="i-lucide-file-text">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">Amount (optional)</label>
          <div class="relative">
            <input v-model="requestAmount" type="number" step="0.000001" min="0" placeholder="0.00"
              class="w-full px-4 py-2.5 pr-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono" />
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-muted">XPI</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Memo (optional)</label>
          <input v-model="requestMemo" type="text" placeholder="What's this payment for?" maxlength="100"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
      </div>
    </UiAppCard>

    <!-- QR Code Card -->
    <UiAppCard>
      <div class="text-center">
        <!-- Network Badge -->
        <div v-if="!networkStore.isProduction" class="mb-4">
          <UBadge :color="networkStore.color" variant="subtle" size="lg">
            {{ networkStore.displayName }}
          </UBadge>
        </div>

        <!-- QR Code Display -->
        <div class="flex justify-center mb-4">
          <div class="bg-white p-4 rounded-xl inline-block shadow-sm">
            <QRCode v-if="qrData" :key="qrData" :value="qrData" :width="qrOptions.width" :height="qrOptions.height"
              :margin="qrOptions.margin" :dots-options="qrOptions.dotsOptions"
              :corners-square-options="qrOptions.cornersSquareOptions"
              :corners-dot-options="qrOptions.cornersDotOptions" :background-options="qrOptions.backgroundOptions" />
            <div v-else class="w-[220px] h-[220px] flex items-center justify-center">
              <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
            </div>
          </div>
        </div>

        <!-- Address/URI Display -->
        <div class="p-3 bg-muted/30 rounded-lg mb-4">
          <div class="text-xs text-muted mb-1">
            {{ requestMode ? 'Payment URI' : 'Your Address' }}
          </div>
          <div class="font-mono text-sm break-all">
            {{ requestMode ? paymentUri : walletStore.address }}
          </div>
        </div>

        <!-- Fingerprint badges -->
        <div v-if="fingerprint && !requestMode" class="flex items-center justify-center gap-2 mb-4">
          <UBadge color="primary" variant="subtle" class="font-mono">
            {{ fingerprint }}
          </UBadge>
          <UBadge :icon="addressTypeInfo.icon" :color="addressTypeInfo.color as any" variant="subtle">
            {{ addressTypeInfo.short }}
          </UBadge>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton color="primary" variant="soft" size="lg" class="flex-1" @click="copyToClipboard">
            <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="w-4 h-4 mr-2" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </UButton>
          <UButton v-if="canShare" color="primary" size="lg" class="flex-1" @click="share">
            <UIcon name="i-lucide-share" class="w-4 h-4 mr-2" />
            Share
          </UButton>
        </div>
      </div>
    </UiAppCard>

    <!-- Waiting for Payment (when request mode with amount) -->
    <UiAppCard v-if="requestMode && requestAmount" title="Waiting for Payment" icon="i-lucide-clock">
      <div class="text-center py-4 text-muted">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2" />
        <p>Listening for incoming payment...</p>
        <p class="text-sm">You'll be notified when payment is received</p>
      </div>
    </UiAppCard>

    <!-- Privacy Notice -->
    <UAlert color="warning" variant="subtle" icon="i-lucide-shield-alert">
      <template #title>Privacy Notice</template>
      <template #description>
        Anyone who knows this address can see your transaction history. For better privacy,
        consider using a new address for each transaction.
      </template>
    </UAlert>
  </div>
</template>
