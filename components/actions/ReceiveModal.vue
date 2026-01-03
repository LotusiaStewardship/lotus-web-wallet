<script setup lang="ts">
/**
 * Receive Modal Component
 *
 * Shows QR code and address for receiving XPI with copy/share options.
 * Uses useOverlay pattern - emits 'close' event when done.
 */
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'
import QRCodeVue3 from 'qrcode-vue3'

const emit = defineEmits<{
  close: []
}>()

const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const { getAddressType } = useAddress()
const { createPaymentURI } = useQRCode()

// Reset state on mount
onMounted(() => {
  showAmountRequest.value = false
  requestAmount.value = ''
  copied.value = false
  amountCopied.value = false
})

const showAmountRequest = ref(false)
const requestAmount = ref('')
const copied = ref(false)
const amountCopied = ref(false)


const address = computed(() => walletStore.address || '')

// Payment URI parameters and link for QR code
const paymentURI = computed(() => {
  const amount = String(requestAmount.value || '').trim()
  if (amount && parseFloat(amount) > 0) {
    return createPaymentURI(address.value, { amount })
  }
  return createPaymentURI(address.value)
})

// Check if QR code includes amount
const hasAmount = computed(() => {
  const amount = String(requestAmount.value || '').trim()
  return amount && parseFloat(amount) > 0
})

// Determine if address is Taproot (modern) or Legacy
const isTaproot = computed(() => getAddressType(address.value) === 'taproot')
// Address network
const isMainnet = computed(() => networkStore.currentNetwork === 'livenet')

const addressTypeLabel = computed(() => isTaproot.value ? 'Taproot' : 'Legacy')

async function copyAddress() {
  await navigator.clipboard.writeText(address.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 690)
}

async function shareAddress() {
  if (navigator.share) {
    try {
      await navigator.share({
        text: address.value,
      })
    } catch {
      // User cancelled or share failed, fall back to copy
      copyAddress()
    }
  } else {
    copyAddress()
  }
}

async function shareWithAmount() {
  const amount = parseFloat(requestAmount.value)
  if (!amount) return

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Request for ${amount} XPI`,
        text: `Please send ${amount} XPI to: ${address.value}`,
        url: paymentURI.value,
      })
    } catch {
      await navigator.clipboard.writeText(paymentURI.value)
      amountCopied.value = true
      setTimeout(() => {
        amountCopied.value = false
      }, 2000)
    }
  } else {
    await navigator.clipboard.writeText(paymentURI.value)
    amountCopied.value = true
    setTimeout(() => {
      amountCopied.value = false
    }, 2000)
  }
}

async function copyPaymentURI() {
  await navigator.clipboard.writeText(paymentURI.value)
  amountCopied.value = true
  setTimeout(() => {
    amountCopied.value = false
  }, 2000)
}

function resetAmountRequest() {
  requestAmount.value = ''
  showAmountRequest.value = !showAmountRequest.value
}
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Receive XPI</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="emit('close')" />
        </div>

        <!-- QR Code -->
        <div class="space-y-2">
          <div class="flex justify-center">
            <div class="p-2 bg-white rounded-xl shadow-sm" :class="hasAmount ? 'ring-2 ring-primary-500' : ''">
              <QRCodeVue3 :key="paymentURI" :value="paymentURI" :width="256" :height="256"
                :qr-options="{ errorCorrectionLevel: 'M' }" :dots-options="{ type: 'rounded', color: '#000000' }"
                :corners-square-options="{ type: 'rounded', color: '#000000' }"
                :corners-dot-options="{ type: 'dot', color: '#000000' }" :background-options="{ color: '#ffffff' }"
                image-options="" />
            </div>
          </div>
          <!-- Amount indicator -->
          <div v-if="hasAmount" class="flex justify-center">
            <UBadge color="primary" variant="subtle" size="lg">
              <UIcon name="i-lucide-coins" class="w-3 h-3 mr-1" />
              Requesting {{ requestAmount }} XPI
            </UBadge>
          </div>
          <div v-else class="flex justify-center">
            <UBadge color="secondary" variant="subtle" size="lg">
              <UIcon name="i-lucide-coins" class="w-3 h-3 mr-1" />
              Requesting any amount
            </UBadge>
          </div>
        </div>

        <!-- Address Type Indicator -->
        <div class="flex gap-2 justify-center">
          <UTooltip :text="isTaproot
            ? 'Taproot addresses offer improved privacy and lower fees'
            : 'Legacy address format for older wallet compatibility'">
            <UBadge :color="isTaproot ? 'success' : 'neutral'" variant="subtle" size="lg">
              <UIcon :name="isTaproot ? 'i-lucide-shield-check' : 'i-lucide-history'" class="w-3 h-3 mr-1" />
              {{ addressTypeLabel }}
            </UBadge>
          </UTooltip>

          <!-- Testnet Type Indicator -->
          <UBadge v-if="!isMainnet" color="warning" variant="subtle" size="lg">
            <UIcon name="i-lucide-flask-conical" class="w-3 h-3 mr-1" />
            Testnet
          </UBadge>
        </div>

        <!-- Address Display -->
        <div class="space-y-2">
          <div class="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
            <code class="flex-1 text-sm font-mono break-all">{{ address }}</code>
          </div>
        </div>

        <!-- Share Options -->
        <div class="grid grid-cols-2 gap-3">
          <UButton variant="outline" block :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" @click="copyAddress">
            {{ copied ? 'Copied!' : 'Copy' }}
          </UButton>
          <UButton variant="outline" block icon="i-lucide-share" @click="shareAddress">
            Share
          </UButton>
        </div>

        <!-- Request Amount (optional) -->
        <div class="pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton variant="ghost" block :icon="showAmountRequest ? 'i-lucide-minus' : 'i-lucide-plus'"
            @click="resetAmountRequest">
            {{ showAmountRequest ? 'Hide amount request' : 'Request specific amount' }}
          </UButton>

          <div v-if="showAmountRequest" class="mt-4 space-y-3">
            <UInput class="w-full" v-model="requestAmount" type="number" step="0.000001" min="0"
              placeholder="Amount in XPI" icon="i-lucide-coins" />

            <!-- Share/Copy with Amount Buttons -->
            <div v-if="hasAmount" class="grid grid-cols-2 gap-3">
              <UButton variant="outline" block :icon="amountCopied ? 'i-lucide-check' : 'i-lucide-copy'"
                @click="copyPaymentURI">
                {{ amountCopied ? 'Copied!' : 'Copy URI' }}
              </UButton>
              <UButton variant="solid" block icon="i-lucide-share" @click="shareWithAmount">
                Share Request
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
