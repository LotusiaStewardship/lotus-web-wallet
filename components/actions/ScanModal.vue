<script setup lang="ts">
/**
 * Scan Modal Component
 *
 * Camera-based QR code scanner for scanning Lotus addresses, payment URIs, and contact URIs.
 * Uses vue-qrcode-reader for QR code detection.
 * Uses useOverlay pattern - emits 'close' event with scan result.
 *
 * Supported formats:
 * - lotus-contact://address?name=Name&pubkey=hex  → Contact import
 * - sendto:address?amount=X                       → Payment request (opens SendModal)
 * - lotus_...                                     → Raw address (opens SendModal)
 */
import { QrcodeStream } from 'vue-qrcode-reader'
import { useContactUri, type ContactUriData } from '~/composables/useContactUri'
import { PAYMENT_URI_SCHEME } from '~/utils/constants'

export type ScanResult =
  | { type: 'address'; address: string }
  | { type: 'payment'; address: string; amount?: number }
  | { type: 'contact'; contact: ContactUriData }

const emit = defineEmits<{
  close: [result?: ScanResult | { manualEntry: true }]
}>()

const { isContactUri, parseContactUri } = useContactUri()
const { isValidAddress } = useAddress()

// Reset state on mount
onMounted(() => {
  scanning.value = true
  error.value = null
  paused.value = false
})

const scanning = ref(true)
const error = ref<string | null>(null)
const paused = ref(false)

function onCameraOn() {
  scanning.value = true
  error.value = null
}

function onCameraOff() {
  scanning.value = false
}

function onError(err: Error) {
  scanning.value = false
  if (err.name === 'NotAllowedError') {
    error.value = 'Camera access denied. Please enable camera permissions in your browser settings.'
  } else if (err.name === 'NotFoundError') {
    error.value = 'No camera found on this device.'
  } else if (err.name === 'NotReadableError') {
    error.value = 'Camera is already in use by another application.'
  } else if (err.name === 'OverconstrainedError') {
    error.value = 'Camera does not meet requirements.'
  } else if (err.name === 'StreamApiNotSupportedError') {
    error.value = 'Camera streaming not supported in this browser.'
  } else {
    error.value = `Camera error: ${err.message}`
  }
}

function onDetect(detectedCodes: { rawValue: string }[]) {
  if (detectedCodes.length === 0) return

  const text = detectedCodes[0].rawValue
  if (!text) return

  // Pause scanning while processing
  paused.value = true
  handleScanResult(text)
}

function handleScanResult(text: string) {
  // Parse the scanned content

  // 1. Check for Contact URI (lotus-contact://...)
  if (isContactUri(text)) {
    const result = parseContactUri(text)
    if (result.success && result.data) {
      emit('close', {
        type: 'contact',
        contact: result.data,
      })
      return
    } else {
      error.value = result.error || 'Invalid contact URI format'
      paused.value = false
      return
    }
  }

  // 2. Check for Payment URI (sendto:address?amount=X)
  const paymentPrefix = `${PAYMENT_URI_SCHEME}:`
  if (text.toLowerCase().startsWith(paymentPrefix.toLowerCase())) {
    try {
      // Parse custom URI scheme manually since URL() doesn't support custom schemes
      const withoutScheme = text.slice(paymentPrefix.length)
      const queryIndex = withoutScheme.indexOf('?')

      let address: string
      let amount: number | undefined

      if (queryIndex !== -1) {
        address = withoutScheme.slice(0, queryIndex)
        const queryString = withoutScheme.slice(queryIndex + 1)
        const params = new URLSearchParams(queryString)
        const amountStr = params.get('amount')
        amount = amountStr ? parseFloat(amountStr) : undefined
      } else {
        address = withoutScheme
      }

      emit('close', {
        type: 'payment',
        address,
        amount,
      })
      return
    } catch {
      error.value = 'Invalid payment URI format'
      paused.value = false
      return
    }
  }

  // 3. Check for plain address (lotus_...)
  if (isValidAddress(text)) {
    emit('close', {
      type: 'address',
      address: text,
    })
    return
  }

  // Unknown format
  error.value = 'Invalid QR code format. Expected a Lotus address or contact.'
  paused.value = false
}

function retryCamera() {
  error.value = null
  paused.value = false
}

function openManualEntry() {
  emit('close', { manualEntry: true })
}
</script>

<template>
  <USlideover :open="true" side="bottom" :ui="{ content: 'h-[100dvh]' }">
    <template #content>
      <div class="h-full flex flex-col bg-black">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 text-white">
          <h2 class="text-lg font-semibold">Scan QR Code</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="emit('close')" />
        </div>

        <!-- Camera View -->
        <div class="flex-1 relative overflow-hidden">
          <QrcodeStream v-if="!error" :paused="paused" @camera-on="onCameraOn" @camera-off="onCameraOff"
            @error="onError" @detect="onDetect" class="w-full h-full" />

          <!-- Scan Frame Overlay -->
          <div v-if="!error" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
              <!-- Corner accents -->
              <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            </div>
          </div>

          <!-- Scanning indicator -->
          <div v-if="scanning && !error && !paused"
            class="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
            <p class="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
              Point camera at QR code
            </p>
          </div>

          <!-- Error message -->
          <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-black">
            <div class="text-center text-white p-6 max-w-sm">
              <UIcon name="i-lucide-camera-off" class="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p class="font-medium mb-2">Camera Error</p>
              <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
              <UButton @click="retryCamera">
                Try Again
              </UButton>
            </div>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="p-4 bg-gray-900">
          <UButton variant="outline" block @click="openManualEntry">
            Enter address manually
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
