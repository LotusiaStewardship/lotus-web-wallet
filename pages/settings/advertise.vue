<script setup lang="ts">
import { useP2PStore, type ServiceAdvertisement } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Advertise Service',
})

const p2pStore = useP2PStore()
const walletStore = useWalletStore()
const toast = useToast()
const router = useRouter()

// Form mode: 'select' for preconfigured, 'custom' for manual
const formMode = ref<'select' | 'custom'>('select')

// Preconfigured service templates
const serviceTemplates = [
  {
    id: 'wallet-basic',
    type: 'wallet' as const,
    name: 'Lotus Wallet',
    description: 'Standard Lotus wallet for sending and receiving',
    icon: 'i-lucide-wallet',
    color: 'primary',
    capabilities: ['send', 'receive'],
  },
  {
    id: 'wallet-p2p',
    type: 'wallet' as const,
    name: 'P2P Wallet',
    description: 'Wallet with peer-to-peer transfer support',
    icon: 'i-lucide-users',
    color: 'primary',
    capabilities: ['send', 'receive', 'p2p-transfer'],
  },
  {
    id: 'signer-musig2',
    type: 'signer' as const,
    name: 'MuSig2 Signer',
    description: 'Multi-signature signing service using MuSig2',
    icon: 'i-lucide-pen-tool',
    color: 'success',
    capabilities: ['musig2', '2-of-2'],
  },
  {
    id: 'signer-threshold',
    type: 'signer' as const,
    name: 'Threshold Signer',
    description: 'Flexible threshold signing (n-of-m)',
    icon: 'i-lucide-shield-check',
    color: 'success',
    capabilities: ['musig2', 'threshold-signing', 'n-of-m'],
  },
  {
    id: 'relay-node',
    type: 'relay' as const,
    name: 'Relay Node',
    description: 'Help others connect through NAT',
    icon: 'i-lucide-radio',
    color: 'info',
    capabilities: ['circuit-relay', 'nat-traversal'],
  },
  {
    id: 'exchange-otc',
    type: 'exchange' as const,
    name: 'OTC Exchange',
    description: 'Over-the-counter trading service',
    icon: 'i-lucide-arrow-left-right',
    color: 'warning',
    capabilities: ['buy', 'sell', 'otc'],
  },
]

// Selected template
const selectedTemplate = ref<string | null>(null)

// Custom form state
const customName = ref('')
const customDescription = ref('')
const customType = ref<ServiceAdvertisement['type']>('wallet')
const customCapabilities = ref<string[]>([])
const customCapabilityInput = ref('')
const publishing = ref(false)

// Service type options for custom form
const serviceTypeOptions = [
  { label: 'Wallet', value: 'wallet' },
  { label: 'Signer', value: 'signer' },
  { label: 'Relay', value: 'relay' },
  { label: 'Exchange', value: 'exchange' },
]

// Available capabilities by type
const availableCapabilities = computed(() => {
  switch (customType.value) {
    case 'wallet':
      return ['send', 'receive', 'p2p-transfer', 'atomic-swap']
    case 'signer':
      return ['musig2', 'threshold-signing', '2-of-2', '2-of-3', 'n-of-m']
    case 'relay':
      return ['circuit-relay', 'dht-server', 'bootstrap', 'nat-traversal']
    case 'exchange':
      return ['buy', 'sell', 'swap', 'escrow', 'otc']
    default:
      return []
  }
})

// Toggle capability
const toggleCapability = (cap: string) => {
  const index = customCapabilities.value.indexOf(cap)
  if (index >= 0) {
    customCapabilities.value.splice(index, 1)
  } else {
    customCapabilities.value.push(cap)
  }
}

// Add custom capability
const addCustomCapability = () => {
  const cap = customCapabilityInput.value.trim().toLowerCase()
  if (cap && !customCapabilities.value.includes(cap)) {
    customCapabilities.value.push(cap)
    customCapabilityInput.value = ''
  }
}

// Validation
const canPublish = computed(() => {
  if (!p2pStore.initialized || publishing.value) return false
  if (formMode.value === 'select') {
    return selectedTemplate.value !== null
  }
  return customName.value.trim().length >= 3
})

// Publish service
const publishService = async () => {
  if (!canPublish.value) return

  publishing.value = true

  try {
    let serviceData: Parameters<typeof p2pStore.announceService>[0]

    if (formMode.value === 'select' && selectedTemplate.value) {
      const template = serviceTemplates.find(t => t.id === selectedTemplate.value)!
      serviceData = {
        type: template.type,
        name: template.name,
        description: template.description,
        capabilities: template.capabilities,
        metadata: { walletAddress: walletStore.address },
      }
    } else {
      serviceData = {
        type: customType.value,
        name: customName.value.trim(),
        description: customDescription.value.trim() || undefined,
        capabilities: customCapabilities.value,
        metadata: { walletAddress: walletStore.address },
      }
    }

    await p2pStore.announceService(serviceData)

    toast.add({
      title: 'Service Published',
      description: 'Your service is now visible on the P2P network',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    router.push('/discover')
  } catch (err) {
    toast.add({
      title: 'Publish Failed',
      description: err instanceof Error ? err.message : 'Failed to publish service',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    publishing.value = false
  }
}

// Initialize P2P if needed - note: initialization may fail silently
// The UI already handles the uninitialized state with a warning alert
onMounted(async () => {
  if (!p2pStore.initialized) {
    await p2pStore.initialize()
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <NuxtLink to="/settings" class="text-sm text-muted hover:text-foreground flex items-center gap-1 mb-4">
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-2xl font-bold">Advertise Service</h1>
      <p class="text-muted">Make your service discoverable on the P2P network</p>
    </div>

    <!-- P2P Status -->
    <UAlert v-if="!p2pStore.initialized" color="warning" variant="subtle" icon="i-lucide-loader-2">
      <template #title>Connecting to P2P Network...</template>
      <template #description>
        Please wait while we establish a connection to the network.
      </template>
    </UAlert>

    <!-- Mode Toggle -->
    <div class="flex gap-2">
      <UButton :color="formMode === 'select' ? 'primary' : 'neutral'"
        :variant="formMode === 'select' ? 'solid' : 'outline'" @click="formMode = 'select'">
        Quick Setup
      </UButton>
      <UButton :color="formMode === 'custom' ? 'primary' : 'neutral'"
        :variant="formMode === 'custom' ? 'solid' : 'outline'" @click="formMode = 'custom'">
        Custom Service
      </UButton>
    </div>

    <!-- Quick Setup: Service Templates -->
    <template v-if="formMode === 'select'">
      <div class="grid gap-3 sm:grid-cols-2">
        <button v-for="template in serviceTemplates" :key="template.id"
          class="p-4 rounded-lg border-2 text-left transition-all" :class="[
            selectedTemplate === template.id
              ? 'border-primary bg-primary/5'
              : 'border-default hover:border-primary/50'
          ]" @click="selectedTemplate = template.id">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              :class="`bg-${template.color}-100 dark:bg-${template.color}-900/20`">
              <UIcon :name="template.icon" class="w-5 h-5" :class="`text-${template.color}-500`" />
            </div>
            <div class="min-w-0">
              <p class="font-semibold">{{ template.name }}</p>
              <p class="text-sm text-muted">{{ template.description }}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                <UBadge v-for="cap in template.capabilities" :key="cap" color="neutral" variant="subtle" size="xs">
                  {{ cap }}
                </UBadge>
              </div>
            </div>
          </div>
        </button>
      </div>

      <UButton block size="lg" :loading="publishing" :disabled="!canPublish" icon="i-lucide-send"
        @click="publishService">
        {{ publishing ? 'Publishing...' : 'Publish Service' }}
      </UButton>
    </template>

    <!-- Custom Service Form -->
    <template v-else>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-settings-2" class="w-5 h-5" />
            <span class="font-semibold">Custom Service</span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Service Type -->
          <UFormField label="Service Type" required>
            <USelectMenu v-model="customType" :items="serviceTypeOptions" value-key="value" />
          </UFormField>

          <!-- Service Name -->
          <UFormField label="Service Name" required hint="Minimum 3 characters">
            <UInput v-model="customName" placeholder="My Custom Service"
              :color="customName && customName.length < 3 ? 'error' : undefined" />
          </UFormField>

          <!-- Description -->
          <UFormField label="Description" hint="Optional">
            <UTextarea v-model="customDescription" placeholder="Describe your service..." :rows="2" />
          </UFormField>

          <!-- Capabilities -->
          <UFormField label="Capabilities">
            <div class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <UButton v-for="cap in availableCapabilities" :key="cap" size="xs"
                  :color="customCapabilities.includes(cap) ? 'primary' : 'neutral'"
                  :variant="customCapabilities.includes(cap) ? 'solid' : 'outline'" @click="toggleCapability(cap)">
                  {{ cap }}
                </UButton>
              </div>

              <div class="flex gap-2">
                <UInput v-model="customCapabilityInput" placeholder="Add custom..." size="sm" class="flex-1"
                  @keyup.enter="addCustomCapability" />
                <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-plus"
                  :disabled="!customCapabilityInput" @click="addCustomCapability">
                  Add
                </UButton>
              </div>

              <div v-if="customCapabilities.length" class="flex flex-wrap gap-1">
                <UBadge v-for="cap in customCapabilities" :key="cap" color="primary" variant="subtle">
                  {{ cap }}
                  <button class="ml-1 hover:text-error-500"
                    @click="customCapabilities = customCapabilities.filter(c => c !== cap)">
                    <UIcon name="i-lucide-x" class="w-3 h-3" />
                  </button>
                </UBadge>
              </div>
            </div>
          </UFormField>

          <UButton block size="lg" :loading="publishing" :disabled="!canPublish" icon="i-lucide-send"
            @click="publishService">
            {{ publishing ? 'Publishing...' : 'Publish Service' }}
          </UButton>
        </div>
      </UCard>
    </template>

    <!-- Info -->
    <UCard>
      <div class="flex gap-3">
        <UIcon name="i-lucide-info" class="w-5 h-5 text-info-500 shrink-0 mt-0.5" />
        <p class="text-sm text-muted">
          Your service will be advertised on the P2P network. Advertisements expire after 1 hour.
        </p>
      </div>
    </UCard>

    <!-- My Advertisements -->
    <UCard v-if="p2pStore.myAdvertisements.length">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-list" class="w-5 h-5" />
          <span class="font-semibold">My Active Advertisements</span>
        </div>
      </template>

      <div class="divide-y divide-default -my-2">
        <div v-for="ad in p2pStore.myAdvertisements" :key="ad.id" class="py-3 flex items-center justify-between">
          <div>
            <p class="font-medium">{{ ad.name }}</p>
            <p class="text-sm text-muted">{{ ad.type }}</p>
          </div>
          <UBadge color="success" variant="subtle" size="xs">
            Active
          </UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>
