<script setup lang="ts">
/**
 * Share My Contact Modal
 *
 * Displays the user's Contact URI and QR code for sharing their wallet identity.
 * The Contact URI uses the PRIMARY BIP44 address as the canonical human identity.
 */
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useContactUri } from '~/composables/useContactUri'
import { useAddress } from '~/composables/useAddress'
import QRCodeVue3 from 'qrcode-vue3'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const { generateMyContactUri } = useContactUri()
const { truncateAddress } = useAddress()

// Reset state on mount
onMounted(() => {
  displayName.value = ''
  copied.value = false
  copiedUri.value = false
})

const displayName = ref('')
const copied = ref(false)
const copiedUri = ref(false)

const address = computed(() => walletStore.address || '')
const truncatedAddress = computed(() => truncateAddress(address.value, 14, 8))

const contactUri = computed(() => {
  return generateMyContactUri(displayName.value.trim() || undefined) || ''
})

async function copyAddress() {
  if (!address.value) return
  await navigator.clipboard.writeText(address.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function copyContactUri() {
  if (!contactUri.value) return
  await navigator.clipboard.writeText(contactUri.value)
  copiedUri.value = true
  setTimeout(() => {
    copiedUri.value = false
  }, 2000)
}

async function shareContact() {
  if (!contactUri.value) return

  if (navigator.share) {
    try {
      await navigator.share({
        title: displayName.value || 'My Lotus Contact',
        text: `Add me on Lotus: ${contactUri.value}`,
        url: contactUri.value,
      })
    } catch {
      copyContactUri()
    }
  } else {
    copyContactUri()
  }
}

function close() {
  emit('close')
}

</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Share My Contact</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <p class="text-sm text-gray-500">
          Share your wallet identity with others. They can scan this QR code or use the link to add you as a contact.
        </p>

        <!-- QR Code with distinct contact styling -->
        <div class="flex justify-center">
          <div
            class="p-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 rounded-2xl shadow-sm border-2 border-primary-200 dark:border-primary-800">
            <div class="p-2 bg-white rounded-xl">
              <QRCodeVue3 :value="contactUri" :width="256" :height="256" :qr-options="{ errorCorrectionLevel: 'M' }"
                :dots-options="{ type: 'rounded', color: '#000000' }"
                :corners-square-options="{ type: 'extra-rounded', color: '#000000' }"
                :corners-dot-options="{ type: 'dot', color: '#000000' }" :background-options="{ color: '#ffffff' }"
                image-options="" />
            </div>
          </div>
        </div>

        <!-- Contact Badge -->
        <div class="flex justify-center">
          <UBadge color="primary" variant="subtle" size="lg">
            <UIcon name="i-lucide-user-circle" class="w-4 h-4 mr-1" />
            Contact Card
          </UBadge>
        </div>

        <!-- Display Name (optional) -->
        <div class="space-y-2">
          <UInput class="w-full" v-model="displayName" placeholder="Enter your name (optional)" icon="i-lucide-user" />
          <p class="text-xs text-gray-500">
            This name will be shown when others scan your contact QR code.
          </p>
        </div>

        <!-- Identity Address -->
        <!-- <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Identity Address
          </label>
          <div
            class="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            @click="copyAddress">
            <code class="flex-1 text-sm font-mono break-all">{{ truncatedAddress }}</code>
            <UButton variant="ghost" size="xs" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copied ? 'success' : 'neutral'" />
          </div>
          <p class="text-xs text-gray-500">
            This Lotus address is your unique identity in the Lotusia ecosystem. Others can use it to find and connect
            with you.
          </p>
        </div> -->

        <!-- Contact URI -->
        <!-- <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Contact Link
          </label>
          <div
            class="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            @click="copyContactUri">
            <code class="flex-1 text-xs font-mono break-all text-primary-600 dark:text-primary-400">
              {{ contactUri }}
            </code>
            <UButton variant="ghost" size="xs" :icon="copiedUri ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copiedUri ? 'success' : 'neutral'" />
          </div>
        </div> -->

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-3 pt-4">
          <UButton variant="outline" block :icon="copiedUri ? 'i-lucide-check' : 'i-lucide-link'"
            @click="copyContactUri">
            {{ copiedUri ? 'Copied!' : 'Copy Link' }}
          </UButton>
          <UButton color="primary" block icon="i-lucide-share" @click="shareContact">
            Share
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
