# Phase 6: QR Code Scanner

## Overview

Add QR code scanning capability to the send page, allowing users to scan payment requests instead of manually entering addresses.

**Priority**: P2
**Estimated Effort**: 1-2 days
**Dependencies**: Camera API, useQRCode composable

---

## Problem Statement

The send page requires users to manually enter or paste addresses. On mobile devices especially, scanning a QR code is the expected and most convenient way to initiate a payment. The `useQRCode` composable exists for generating QR codes but not for scanning.

---

## Implementation

### Task 6.1: Create QR Scanner Composable

**File**: `composables/useQRScanner.ts`

```typescript
/**
 * useQRScanner
 *
 * QR code scanning functionality using the camera.
 */
export function useQRScanner() {
  const isScanning = ref(false)
  const hasPermission = ref<boolean | null>(null)
  const error = ref<string | null>(null)
  const videoRef = ref<HTMLVideoElement | null>(null)
  const stream = ref<MediaStream | null>(null)

  /**
   * Check camera permission
   */
  async function checkPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      })
      hasPermission.value = result.state === 'granted'
      return hasPermission.value
    } catch {
      // Permissions API not supported, try to access camera directly
      return true
    }
  }

  /**
   * Start scanning
   */
  async function startScanning(video: HTMLVideoElement): Promise<void> {
    error.value = null
    videoRef.value = video

    try {
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      video.srcObject = stream.value
      await video.play()

      hasPermission.value = true
      isScanning.value = true
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        hasPermission.value = false
        error.value =
          'Camera permission denied. Please allow camera access to scan QR codes.'
      } else if (err.name === 'NotFoundError') {
        error.value = 'No camera found on this device.'
      } else {
        error.value = 'Failed to access camera. Please try again.'
      }
      throw err
    }
  }

  /**
   * Stop scanning
   */
  function stopScanning(): void {
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop())
      stream.value = null
    }
    if (videoRef.value) {
      videoRef.value.srcObject = null
    }
    isScanning.value = false
  }

  /**
   * Parse QR code data
   * Supports BIP21 URIs: lotus:address?amount=X&label=Y
   */
  function parseQRData(data: string): {
    address: string
    amount?: string
    label?: string
    message?: string
  } | null {
    // Try BIP21 URI format
    const bip21Regex = /^lotus:([a-zA-Z0-9_]+)(\?(.*))?$/i
    const match = data.match(bip21Regex)

    if (match) {
      const address = match[1]
      const params = new URLSearchParams(match[3] || '')

      return {
        address,
        amount: params.get('amount') || undefined,
        label: params.get('label') || undefined,
        message: params.get('message') || undefined,
      }
    }

    // Try plain address
    if (data.startsWith('lotus_') || data.startsWith('lotus:')) {
      return {
        address: data.replace('lotus:', ''),
      }
    }

    return null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopScanning()
  })

  return {
    isScanning,
    hasPermission,
    error,
    checkPermission,
    startScanning,
    stopScanning,
    parseQRData,
  }
}
```

---

### Task 6.2: Create QR Scanner Component

**File**: `components/send/QRScanner.vue`

```vue
<script setup lang="ts">
/**
 * QRScanner
 *
 * Camera-based QR code scanner component.
 */
import { BrowserQRCodeReader } from '@aspect-dev/zxing-wasm'

const emit = defineEmits<{
  scan: [data: { address: string; amount?: string; label?: string }]
  close: []
}>()

const {
  isScanning,
  hasPermission,
  error,
  startScanning,
  stopScanning,
  parseQRData,
} = useQRScanner()

const videoRef = ref<HTMLVideoElement | null>(null)
const reader = ref<BrowserQRCodeReader | null>(null)
const scanError = ref<string | null>(null)

onMounted(async () => {
  if (!videoRef.value) return

  try {
    await startScanning(videoRef.value)

    // Initialize QR reader
    reader.value = new BrowserQRCodeReader()

    // Start continuous scanning
    scanLoop()
  } catch {
    // Error already set by startScanning
  }
})

onUnmounted(() => {
  stopScanning()
  reader.value = null
})

async function scanLoop() {
  if (!isScanning.value || !videoRef.value || !reader.value) return

  try {
    const result = await reader.value.decodeFromVideoElement(videoRef.value)

    if (result) {
      const parsed = parseQRData(result.getText())

      if (parsed) {
        stopScanning()
        emit('scan', parsed)
      } else {
        scanError.value =
          'Invalid QR code. Please scan a Lotus payment QR code.'
        // Continue scanning
        setTimeout(scanLoop, 1000)
      }
    }
  } catch {
    // No QR code found, continue scanning
    requestAnimationFrame(scanLoop)
  }
}

function handleClose() {
  stopScanning()
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black">
    <!-- Header -->
    <div
      class="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-white font-semibold">Scan QR Code</h2>
        <UButton
          icon="i-lucide-x"
          color="white"
          variant="ghost"
          @click="handleClose"
        />
      </div>
    </div>

    <!-- Camera View -->
    <video
      ref="videoRef"
      class="w-full h-full object-cover"
      autoplay
      playsinline
      muted
    />

    <!-- Scan Frame Overlay -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="w-64 h-64 border-2 border-white rounded-2xl relative">
        <!-- Corner accents -->
        <div
          class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"
        />
        <div
          class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"
        />
        <div
          class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"
        />
        <div
          class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"
        />

        <!-- Scanning line animation -->
        <div class="absolute inset-x-4 top-4 h-0.5 bg-primary animate-scan" />
      </div>
    </div>

    <!-- Instructions -->
    <div
      class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent"
    >
      <p class="text-white text-center text-sm">
        Position the QR code within the frame to scan
      </p>

      <!-- Error Message -->
      <div v-if="error || scanError" class="mt-4">
        <UAlert color="error" icon="i-lucide-alert-circle">
          <template #description>{{ error || scanError }}</template>
        </UAlert>
      </div>

      <!-- Permission Denied -->
      <div v-if="hasPermission === false" class="mt-4 text-center">
        <p class="text-white text-sm mb-3">
          Camera access is required to scan QR codes.
        </p>
        <UButton color="primary" @click="handleClose">
          Enter Address Manually
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes scan {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(240px);
  }
}

.animate-scan {
  animation: scan 2s ease-in-out infinite;
}
</style>
```

---

### Task 6.3: Integrate Scanner into Send Page

**File**: `pages/transact/send.vue`

Add QR scanner integration:

```vue
<script setup lang="ts">
// Add to existing script
const showScanner = ref(false)

function handleScanResult(data: {
  address: string
  amount?: string
  label?: string
}) {
  // Fill in the form
  recipientAddress.value = data.address

  if (data.amount) {
    amount.value = data.amount
  }

  if (data.label) {
    // Could be used for note/memo
    note.value = data.label
  }

  showScanner.value = false

  toast.add({
    title: 'QR Code Scanned',
    description: 'Payment details filled in',
    color: 'success',
  })
}
</script>

<template>
  <!-- Add scan button next to address input -->
  <UFormField label="Recipient Address">
    <div class="flex gap-2">
      <UInput
        v-model="recipientAddress"
        placeholder="lotus_..."
        class="flex-1"
      />
      <UButton
        icon="i-lucide-scan"
        color="neutral"
        variant="outline"
        @click="showScanner = true"
      />
    </div>
  </UFormField>

  <!-- QR Scanner Modal -->
  <SendQRScanner
    v-if="showScanner"
    @scan="handleScanResult"
    @close="showScanner = false"
  />
</template>
```

---

### Task 6.4: Install QR Scanning Library

Add the zxing-wasm library for QR code decoding:

```bash
npm install @aspect-dev/zxing-wasm
```

Alternative: Use `html5-qrcode` library which is lighter weight:

```bash
npm install html5-qrcode
```

---

## Verification Checklist

- [ ] Scan button appears on send page
- [ ] Scanner opens in full-screen overlay
- [ ] Camera permission is requested
- [ ] Permission denied state is handled
- [ ] QR codes are detected and parsed
- [ ] BIP21 URIs are parsed correctly
- [ ] Plain addresses are accepted
- [ ] Invalid QR codes show error
- [ ] Form is filled after successful scan
- [ ] Scanner can be closed

---

## Browser Compatibility

| Browser | Camera Access | Notes           |
| ------- | ------------- | --------------- |
| Chrome  | ✅            | Full support    |
| Firefox | ✅            | Full support    |
| Safari  | ✅            | Requires HTTPS  |
| Edge    | ✅            | Full support    |
| Mobile  | ✅            | Best experience |

---

## Notes

- Camera access requires HTTPS in production
- Consider adding flashlight toggle for low-light scanning
- Future: Add image upload as alternative to camera
- Future: Add history of scanned addresses

---

_Phase 6 of Critical Gaps Remediation Plan_
