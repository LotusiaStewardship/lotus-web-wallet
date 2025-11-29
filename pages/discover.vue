<script setup lang="ts">
import { useP2PStore, type ServiceAdvertisement } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'
import { useContactsStore } from '~/stores/contacts'

definePageMeta({
  title: 'Discover',
})

const p2pStore = useP2PStore()
const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const toast = useToast()

// Filter state
const selectedType = ref<ServiceAdvertisement['type'] | 'all'>('all')
const searchQuery = ref('')

// Service type options
const serviceTypes = [
  { label: 'All Services', value: 'all', icon: 'i-lucide-layers' },
  { label: 'Wallets', value: 'wallet', icon: 'i-lucide-wallet' },
  { label: 'Signers', value: 'signer', icon: 'i-lucide-pen-tool' },
  { label: 'Relays', value: 'relay', icon: 'i-lucide-radio' },
  { label: 'Exchanges', value: 'exchange', icon: 'i-lucide-arrow-left-right' },
]

// Filtered services
const filteredServices = computed(() => {
  let services = p2pStore.discoveredServices

  // Filter by type
  if (selectedType.value !== 'all') {
    services = services.filter(s => s.type === selectedType.value)
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    services = services.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.peerId.toLowerCase().includes(query)
    )
  }

  // Sort by creation time (newest first)
  return services.sort((a, b) => b.createdAt - a.createdAt)
})

// Initialize P2P and contacts
onMounted(async () => {
  contactsStore.initialize()
  if (!p2pStore.initialized) {
    await p2pStore.initialize()
  }
  // Discover services only if P2P initialized successfully
  if (p2pStore.initialized) {
    await p2pStore.discoverServices()
  }
})

// Watch for P2P initialization to complete
watch(() => p2pStore.initialized, async (initialized) => {
  if (initialized && p2pStore.discoveredServices.length === 0) {
    await p2pStore.discoverServices()
  }
})

// Refresh services
const refreshing = ref(false)
const refreshServices = async () => {
  refreshing.value = true
  try {
    await p2pStore.discoverServices()
    toast.add({
      title: 'Services Refreshed',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Refresh Failed',
      description: 'Could not refresh service list',
      color: 'error',
      icon: 'i-lucide-x',
    })
  } finally {
    refreshing.value = false
  }
}

// Connect to service
const connectToService = async (service: ServiceAdvertisement) => {
  if (!service.multiaddrs?.length) {
    toast.add({
      title: 'Cannot Connect',
      description: 'No connection addresses available',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  try {
    await p2pStore.connectToPeer(service.multiaddrs[0])
    toast.add({
      title: 'Connected',
      description: `Connected to ${service.name}`,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Connection Failed',
      description: err instanceof Error ? err.message : 'Failed to connect',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Format timestamp
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

// Network stats for display
const networkStats = computed(() => [
  { value: p2pStore.peerCount, label: 'Connected Peers', mono: true },
  { value: p2pStore.serviceCount, label: 'Services Found', mono: true },
  { value: p2pStore.routingTableSize, label: 'DHT Nodes', mono: true },
  { value: p2pStore.dhtReady ? 'Ready' : 'Syncing', label: 'DHT Status' },
])

// Get service icon
const getServiceIcon = (type: ServiceAdvertisement['type']) => {
  switch (type) {
    case 'wallet': return 'i-lucide-wallet'
    case 'signer': return 'i-lucide-pen-tool'
    case 'relay': return 'i-lucide-radio'
    case 'exchange': return 'i-lucide-arrow-left-right'
    default: return 'i-lucide-box'
  }
}

// Get service color
const getServiceColor = (type: ServiceAdvertisement['type']) => {
  switch (type) {
    case 'wallet': return 'primary'
    case 'signer': return 'success'
    case 'relay': return 'info'
    case 'exchange': return 'warning'
    default: return 'neutral'
  }
}

// Check if service is already a contact
const isServiceInContacts = (service: ServiceAdvertisement) => {
  return contactsStore.getContactByPeerId(service.peerId) !== undefined
}

// Save service as contact modal
const showSaveContactModal = ref(false)
const selectedService = ref<ServiceAdvertisement | null>(null)

const openSaveContactModal = (service: ServiceAdvertisement) => {
  selectedService.value = service
  showSaveContactModal.value = true
}

const handleContactSaved = () => {
  showSaveContactModal.value = false
  selectedService.value = null
}

// Send to service (if it has a wallet address)
const sendToService = (service: ServiceAdvertisement) => {
  const walletAddress = service.metadata?.walletAddress as string | undefined
  if (walletAddress) {
    navigateTo({
      path: '/send',
      query: { address: walletAddress },
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Discover Services</h1>
        <p class="text-muted">Find wallets, signers, and services on the P2P network</p>
      </div>
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="refreshing"
          @click="refreshServices">
          Refresh
        </UButton>
        <UButton color="primary" icon="i-lucide-plus" to="/settings/advertise">
          Advertise Service
        </UButton>
      </div>
    </div>

    <!-- P2P Status -->
    <UCard v-if="!p2pStore.initialized">
      <LoadingSpinner message="Connecting to P2P network..." size="lg" />
    </UCard>

    <template v-else>
      <!-- Network Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard v-for="(stat, index) in networkStats.slice(0, 3)" :key="index">
          <StatsCard :value="stat.value" :label="stat.label" :mono="stat.mono" />
        </UCard>
        <UCard>
          <div class="text-center">
            <UBadge :color="p2pStore.dhtReady ? 'success' : 'warning'" size="lg">
              {{ networkStats[3].value }}
            </UBadge>
            <p class="text-sm text-muted mt-1">{{ networkStats[3].label }}</p>
          </div>
        </UCard>
      </div>

      <!-- Filters -->
      <UCard>
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <UInput v-model="searchQuery" placeholder="Search services..." class="flex-1" icon="i-lucide-search" />

          <!-- Type Filter -->
          <USelectMenu v-model="selectedType" :items="serviceTypes" value-key="value" class="w-full md:w-48">
            <template #leading>
              <UIcon :name="serviceTypes.find(t => t.value === selectedType)?.icon || 'i-lucide-layers'"
                class="w-4 h-4" />
            </template>
          </USelectMenu>
        </div>
      </UCard>

      <!-- Service List -->
      <EmptyState v-if="filteredServices.length === 0" icon="i-lucide-search-x" icon-size="lg" title="No Services Found"
        :description="searchQuery || selectedType !== 'all'
          ? 'Try adjusting your filters'
          : 'Be the first to advertise a service!'">
        <template #actions>
          <UButton color="primary" icon="i-lucide-plus" to="/settings/advertise">
            Advertise Your Service
          </UButton>
        </template>
      </EmptyState>

      <div v-else class="grid gap-4">
        <UCard v-for="service in filteredServices" :key="service.id"
          class="hover:ring-2 hover:ring-primary/50 transition-all">
          <div class="flex items-start gap-4">
            <!-- Service Icon -->
            <div class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="`bg-${getServiceColor(service.type)}-100 dark:bg-${getServiceColor(service.type)}-900/20`">
              <UIcon :name="getServiceIcon(service.type)" class="w-6 h-6"
                :class="`text-${getServiceColor(service.type)}-500`" />
            </div>

            <!-- Service Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold truncate">{{ service.name }}</h3>
                <UBadge :color="getServiceColor(service.type)" variant="subtle" size="xs">
                  {{ service.type }}
                </UBadge>
              </div>

              <p v-if="service.description" class="text-sm text-muted mb-2 line-clamp-2">
                {{ service.description }}
              </p>

              <!-- Capabilities -->
              <div v-if="service.capabilities?.length" class="flex flex-wrap gap-1 mb-2">
                <UBadge v-for="cap in service.capabilities.slice(0, 3)" :key="cap" color="neutral" variant="subtle"
                  size="xs">
                  {{ cap }}
                </UBadge>
                <UBadge v-if="service.capabilities.length > 3" color="neutral" variant="subtle" size="xs">
                  +{{ service.capabilities.length - 3 }} more
                </UBadge>
              </div>

              <!-- Meta -->
              <div class="flex items-center gap-4 text-xs text-muted">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-clock" class="w-3 h-3" />
                  {{ formatTime(service.createdAt) }}
                </span>
                <span class="flex items-center gap-1 truncate">
                  <UIcon name="i-lucide-fingerprint" class="w-3 h-3" />
                  {{ service.peerId.slice(0, 12) }}...
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2">
              <UButton color="primary" size="sm" icon="i-lucide-link" @click="connectToService(service)">
                Connect
              </UButton>
              <UDropdownMenu :items="[
                [
                  {
                    label: isServiceInContacts(service) ? 'View Contact' : 'Save to Contacts',
                    icon: isServiceInContacts(service) ? 'i-lucide-user-check' : 'i-lucide-user-plus',
                    click: () => isServiceInContacts(service) ? navigateTo('/contacts') : openSaveContactModal(service),
                  },
                  {
                    label: 'Send Lotus',
                    icon: 'i-lucide-send',
                    click: () => sendToService(service),
                    disabled: !service.metadata?.walletAddress,
                  },
                ],
              ]">
                <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-more-horizontal" />
              </UDropdownMenu>
            </div>
          </div>

          <!-- Contact indicator -->
          <div v-if="isServiceInContacts(service)"
            class="mt-3 pt-3 border-t border-default flex items-center gap-2 text-sm text-success-500">
            <UIcon name="i-lucide-user-check" class="w-4 h-4" />
            <span>Saved to contacts</span>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Save Contact Modal -->
    <UModal v-model:open="showSaveContactModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-plus" class="w-5 h-5" />
              <span class="font-semibold">Save to Contacts</span>
            </div>
          </template>
          <ContactsContactForm v-if="selectedService" :prefill-name="selectedService.name"
            :prefill-address="(selectedService.metadata?.walletAddress as string) || ''"
            :prefill-peer-id="selectedService.peerId" :prefill-service-type="selectedService.type"
            @saved="handleContactSaved" @cancel="showSaveContactModal = false; selectedService = null" />
        </UCard>
      </template>
    </UModal>
  </div>
</template>
