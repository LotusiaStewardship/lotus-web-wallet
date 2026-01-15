<script setup lang="ts">
/**
 * Share Contact Modal
 *
 * Displays a Contact URI and QR code for sharing an existing contact.
 */
import { useContactUri } from '~/composables/useContactUri'
import { useAddress } from '~/composables/useAddress'
import { usePersonContext } from '~/composables/usePersonContext'
import QRCodeVue3 from 'qrcode-vue3'

const props = defineProps<{
  person: Person | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Use person context and other composables
const { generateContactUriForPerson } = useContactUri()
const { truncateAddress } = useAddress()
const { displayName, address } = usePersonContext(computed(() => props.person?.id || ''))

// Reset state on mount
onMounted(() => {
  copied.value = false
  copiedUri.value = false
})

const copied = ref(false)
const copiedUri = ref(false)

const truncatedAddress = computed(() => {
  const addr = address.value
  if (!addr) return ''
  return truncateAddress(addr, 14, 8)
})

const contactUri = computed(() => {
  if (!props.person || !address.value) return ''
  return generateContactUriForPerson({
    address: address.value,
    name: displayName.value,
    publicKeyHex: props.person.publicKeyHex,
  })
})

async function copyAddress() {
  const addr = address.value
  if (!addr) return
  await navigator.clipboard.writeText(addr)
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
  if (!contactUri.value || !props.person) return

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${props.person.name}'s Lotus Contact`,
        text: `Add ${props.person.name} on Lotus: ${contactUri.value}`,
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
      <div v-if="person" class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Share Contact</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <p class="text-sm text-gray-500">
          Share {{ person.name }}'s contact information. Others can scan this QR code or use the link to add them.
        </p>

        <!-- QR Code with distinct contact styling -->
        <div class="flex justify-center">
          <div
            class="p-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 rounded-2xl shadow-sm border-2 border-primary-200 dark:border-primary-800">
            <div class="p-2 bg-white rounded-xl">
              <QRCodeVue3 :value="contactUri" :width="220" :height="220" :qr-options="{ errorCorrectionLevel: 'M' }"
                :dots-options="{ type: 'rounded', color: '#7c3aed' }"
                :corners-square-options="{ type: 'extra-rounded', color: '#7c3aed' }"
                :corners-dot-options="{ type: 'dot', color: '#5b21b6' }" :background-options="{ color: '#ffffff' }"
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

        <!-- Contact Name -->
        <div class="text-center">
          <h3 class="text-xl font-semibold">{{ person.name }}</h3>
          <p v-if="person.canSign" class="text-sm text-primary-600 dark:text-primary-400 mt-1">
            <UIcon name="i-lucide-shield" class="w-4 h-4 inline" />
            MuSig2 Signer
          </p>
        </div>

        <!-- Identity Address -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Identity Address
          </label>
          <div
            class="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            @click="copyAddress">
            <code class="flex-1 text-sm font-mono break-all">{{ truncatedAddress }}</code>
            <UButton variant="ghost" size="xs" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copied ? 'success' : 'neutral'" />
          </div>
        </div>

        <!-- Contact URI -->
        <div class="space-y-2">
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
        </div>

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

      <!-- No person selected -->
      <div v-else class="p-6 text-center">
        <UIcon name="i-lucide-user-x" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500">No contact selected</p>
        <UButton class="mt-4" @click="close">Close</UButton>
      </div>
    </template>
  </USlideover>
</template>
