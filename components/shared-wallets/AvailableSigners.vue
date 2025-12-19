<script setup lang="ts">
/**
 * AvailableSigners
 *
 * Phase 6: Enhanced with loading skeletons and improved empty states.
 * Phase 10 R10.4.1: Available signers list for Shared Wallets page.
 * Migrated from P2P SignerList with adaptations for the unified experience.
 */
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store, type StoreSigner } from '~/stores/musig2'

const props = defineProps<{
  /** Loading state */
  loading?: boolean
}>()

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

const emit = defineEmits<{
  addToWallet: [signer: StoreSigner]
  saveContact: [signer: StoreSigner]
  viewDetails: [signer: StoreSigner]
  refresh: []
}>()

// Use the store getter for available signers (excludes self)
const signers = computed(() => musig2Store.availableSigners)

// Check if actively subscribed to signers
const isSubscribed = computed(() => !!musig2Store.signerSubscriptionId)

// Discovery status for header info
type BadgeColor = 'neutral' | 'warning' | 'success' | 'error' | 'primary' | 'info' | 'secondary'
const discoveryStatus = computed((): { color: BadgeColor; text: string } => {
  if (!p2pStore.connected) return { color: 'neutral', text: 'Disconnected' }
  if (!p2pStore.dhtReady) return { color: 'warning', text: 'DHT Initializing' }
  if (!musig2Store.initialized) return { color: 'warning', text: 'MuSig2 Not Ready' }
  if (!isSubscribed.value) return { color: 'warning', text: 'Not Subscribed' }
  return { color: 'success', text: 'Active' }
})

// Contextual empty state description
const emptyStateDescription = computed(() => {
  if (!p2pStore.connected) {
    return 'Connect to the P2P network to discover signers'
  }
  if (!p2pStore.dhtReady) {
    return 'Waiting for DHT to initialize...'
  }
  if (!musig2Store.initialized) {
    return 'MuSig2 service is initializing...'
  }
  if (!isSubscribed.value) {
    return 'Not subscribed to signer updates. Try refreshing.'
  }
  return 'No signers are currently advertising. Try refreshing or check back later.'
})

// Filter state
const selectedTxType = ref<string | null>(null)

const txTypeOptions = [
  { label: 'All Types', value: null },
  { label: 'Spend', value: 'spend' },
  { label: 'CoinJoin', value: 'coinjoin' },
  { label: 'Escrow', value: 'escrow' },
  { label: 'Swap', value: 'swap' },
]

const filteredSigners = computed(() => {
  if (!selectedTxType.value) return signers.value
  return signers.value.filter(s =>
    s.capabilities && Object.entries(s.capabilities)
      .filter(([_, enabled]) => enabled)
      .some(([type]) => type.toLowerCase() === selectedTxType.value),
  )
})

// Handle P2P connection
async function handleConnect() {
  try {
    await p2pStore.initialize()
    await p2pStore.connect()
  } catch (err) {
    console.error('Failed to connect to P2P:', err)
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="font-semibold">Available Signers</h3>
        <UBadge :color="discoveryStatus.color" variant="subtle" size="sm">
          {{ discoveryStatus.text }}
        </UBadge>
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ filteredSigners.length }}
        </UBadge>
      </div>
      <div class="flex items-center gap-2">
        <USelect v-model="selectedTxType" :options="txTypeOptions" option-attribute="label" value-attribute="value"
          size="xs" class="w-32" />
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw"
          :loading="loading || musig2Store.loading" @click="emit('refresh')" />
      </div>
    </div>

    <!-- Phase 6: Skeleton Loading State with semantic colors -->
    <div v-if="(loading || musig2Store.loading) && filteredSigners.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="p-4 bg-background rounded-lg border border-default">
          <div class="flex items-center gap-3">
            <!-- Avatar skeleton -->
            <div class="w-10 h-10 bg-muted rounded-full" />
            <!-- Content skeleton -->
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-muted rounded w-1/3" />
              <div class="h-3 bg-muted rounded w-1/2" />
            </div>
            <!-- Action skeleton -->
            <div class="w-20 h-8 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 6: Discovery Progress Banner with semantic colors -->
    <div v-else-if="loading || musig2Store.loading" class="bg-info/10 p-3 rounded-lg">
      <div class="flex items-center gap-2 text-sm text-info">
        <UIcon name="i-lucide-loader-2" class="animate-spin w-4 h-4" />
        <span>Discovering signers on the network...</span>
        <span class="text-xs opacity-75">({{ filteredSigners.length }} found)</span>
      </div>
    </div>

    <!-- Phase 6: DHT Initializing Banner with semantic colors -->
    <div v-else-if="!p2pStore.dhtReady && p2pStore.connected" class="bg-warning/10 p-3 rounded-lg">
      <div class="flex items-center gap-2 text-sm text-warning">
        <UIcon name="i-lucide-radio" class="w-4 h-4" />
        <span>DHT initializing - discovery will start shortly...</span>
      </div>
    </div>

    <!-- Signers List -->
    <div v-if="filteredSigners.length" class="space-y-2">
      <CommonSignerCard v-for="signer in filteredSigners" :key="signer.id" :signer="signer" :primary-action="{
        label: 'Add',
        icon: 'i-lucide-plus',
        event: 'addToWallet',
      }" variant="card" @add-to-wallet="emit('addToWallet', signer)" @save-contact="emit('saveContact', signer)"
        @view-details="emit('viewDetails', signer)" />
    </div>

    <!-- Empty State -->
    <UiAppEmptyState v-else-if="!(loading || musig2Store.loading)" icon="i-lucide-users" title="No signers found"
      :description="emptyStateDescription">
      <template #actions>
        <div class="flex gap-2">
          <UButton v-if="!p2pStore.connected" color="primary" icon="i-lucide-wifi" size="sm" @click="handleConnect">
            Connect to P2P
          </UButton>
          <UButton color="neutral" variant="soft" icon="i-lucide-refresh-cw" size="sm" @click="emit('refresh')">
            Refresh
          </UButton>
        </div>
      </template>
    </UiAppEmptyState>
  </div>
</template>
