<script setup lang="ts">
/**
 * NetworkStatus Component
 *
 * Phase 5: Unified network status component.
 * Consolidates wallet/NetworkStatus, p2p/NetworkStatus, and shared-wallets/NetworkStatusBar.
 * Supports multiple display variants for different contexts.
 */
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore, P2PConnectionState } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useIdentityStore } from '~/stores/identity'

const props = withDefaults(
  defineProps<{
    /** Display variant */
    variant?: 'compact' | 'standard' | 'detailed' | 'inline'
    /** Show wallet stats (block height, UTXOs) */
    showWalletStats?: boolean
    /** Show P2P stats (peers, DHT) */
    showP2PStats?: boolean
    /** Show MuSig2 stats (signers, sessions) */
    showMuSig2Stats?: boolean
    /** Show debug info (peer ID, multiaddrs) */
    showDebug?: boolean
    /** Show action buttons (connect/disconnect) */
    showActions?: boolean
  }>(),
  {
    variant: 'standard',
    showWalletStats: true,
    showP2PStats: true,
    showMuSig2Stats: true,
    showDebug: false,
    showActions: false,
  },
)

const emit = defineEmits<{
  connect: []
  disconnect: []
  manage: []
}>()

const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const identityStore = useIdentityStore()

// Online identity count
const onlineIdentityCount = computed(() => identityStore.onlineIdentities.length)

// Connection status
type StatusColor = 'success' | 'warning' | 'error' | 'neutral'

const connectionStatus = computed((): { text: string; color: StatusColor; icon: string } => {
  switch (p2pStore.connectionState) {
    case P2PConnectionState.DISCONNECTED:
      return { text: 'Disconnected', color: 'neutral', icon: 'i-lucide-wifi-off' }
    case P2PConnectionState.CONNECTING:
    case P2PConnectionState.RECONNECTING:
      return { text: 'Connecting...', color: 'warning', icon: 'i-lucide-loader-2' }
    case P2PConnectionState.CONNECTED:
      return { text: 'Connected', color: 'success', icon: 'i-lucide-wifi' }
    case P2PConnectionState.DHT_INITIALIZING:
      return { text: 'DHT Initializing', color: 'warning', icon: 'i-lucide-radio' }
    case P2PConnectionState.DHT_READY:
    case P2PConnectionState.FULLY_OPERATIONAL:
      return { text: 'Online', color: 'success', icon: 'i-lucide-check-circle' }
    case P2PConnectionState.ERROR:
      return { text: 'Error', color: 'error', icon: 'i-lucide-alert-circle' }
    default:
      return { text: 'Unknown', color: 'neutral', icon: 'i-lucide-help-circle' }
  }
})

const isConnecting = computed(() =>
  p2pStore.connectionState === P2PConnectionState.CONNECTING ||
  p2pStore.connectionState === P2PConnectionState.RECONNECTING,
)

// DHT status color
const dhtColor = computed(() => {
  if (p2pStore.dhtReady) return 'success'
  if (p2pStore.connected) return 'warning'
  return 'neutral'
})

// Compact stats for wallet variant
const compactStats = computed(() => {
  const stats = []

  if (props.showWalletStats) {
    stats.push({
      label: 'Block',
      value: walletStore.tipHeight.toLocaleString(),
      icon: 'i-lucide-box',
      show: true,
    })
    stats.push({
      label: 'UTXOs',
      value: walletStore.utxoCount.toString(),
      icon: 'i-lucide-coins',
      show: true,
    })
  }

  if (props.showP2PStats) {
    stats.push({
      label: 'Peers',
      value: p2pStore.connectedPeers.length.toString(),
      icon: 'i-lucide-users',
      show: p2pStore.initialized,
    })
  }

  if (props.showMuSig2Stats) {
    stats.push({
      label: 'Signers',
      value: musig2Store.onlineSigners.length.toString(),
      icon: 'i-lucide-pen-tool',
      show: musig2Store.initialized && musig2Store.onlineSigners.length > 0,
    })
  }

  return stats.filter(s => s.show !== false)
})

// Debug info items
const debugItems = computed(() => [
  { label: 'Peer ID', slot: 'peer-id' },
  { label: 'Multiaddrs', slot: 'multiaddrs' },
])

// Signer count for inline variant
const signerCount = computed(() => musig2Store.availableSigners.length)
</script>

<template>
  <!-- Compact Variant: Simple stats row -->
  <UiAppCard v-if="variant === 'compact'" title="Network Status" icon="i-lucide-activity">
    <div class="flex flex-wrap gap-4">
      <div v-for="stat in compactStats" :key="stat.label" class="flex items-center gap-2">
        <UIcon :name="stat.icon" class="w-4 h-4 text-muted" />
        <span class="text-sm">
          <span class="font-medium">{{ stat.value }}</span>
          <span class="text-muted ml-1">{{ stat.label }}</span>
        </span>
      </div>
    </div>
  </UiAppCard>

  <!-- Inline Variant: Status bar with actions - Phase 6: Semantic colors -->
  <div v-else-if="variant === 'inline'" class="flex items-center justify-between px-4 py-3 rounded-lg border" :class="{
    'bg-muted/50 border-default': connectionStatus.color === 'neutral',
    'bg-success/10 border-success/30': connectionStatus.color === 'success',
    'bg-warning/10 border-warning/30': connectionStatus.color === 'warning',
    'bg-error/10 border-error/30': connectionStatus.color === 'error',
  }">
    <!-- Status Info -->
    <div class="flex items-center gap-4">
      <!-- Connection Status -->
      <div class="flex items-center gap-2">
        <UIcon :name="connectionStatus.icon" class="w-4 h-4" :class="{
          'text-muted': connectionStatus.color === 'neutral',
          'text-success': connectionStatus.color === 'success',
          'text-warning': connectionStatus.color === 'warning',
          'text-error': connectionStatus.color === 'error',
          'animate-spin': isConnecting,
        }" />
        <span class="text-sm font-medium" :class="{
          'text-muted': connectionStatus.color === 'neutral',
          'text-success': connectionStatus.color === 'success',
          'text-warning': connectionStatus.color === 'warning',
          'text-error': connectionStatus.color === 'error',
        }">
          {{ connectionStatus.text }}
        </span>
      </div>

      <!-- Stats (when connected) -->
      <template v-if="p2pStore.connected">
        <span class="text-muted/30">|</span>
        <div class="flex items-center gap-1.5 text-sm text-muted">
          <UIcon name="i-lucide-users" class="w-3.5 h-3.5" />
          <span>{{ p2pStore.peerCount }} peers</span>
        </div>

        <span class="text-muted/30">|</span>
        <div class="flex items-center gap-1.5 text-sm">
          <UIcon name="i-lucide-database" class="w-3.5 h-3.5"
            :class="p2pStore.dhtReady ? 'text-success' : 'text-warning'" />
          <span :class="p2pStore.dhtReady ? 'text-muted' : 'text-warning'">
            {{ p2pStore.dhtReady ? 'DHT Ready' : 'DHT Initializing' }}
          </span>
        </div>

        <span class="text-muted/30">|</span>
        <div class="flex items-center gap-1.5 text-sm text-muted">
          <UIcon name="i-lucide-pen-tool" class="w-3.5 h-3.5" />
          <span>{{ signerCount }} signers</span>
        </div>
      </template>
    </div>

    <!-- Actions -->
    <div v-if="showActions" class="flex items-center gap-2">
      <template v-if="!p2pStore.connected">
        <UButton color="primary" size="sm" icon="i-lucide-wifi" :loading="isConnecting" @click="emit('connect')">
          Connect
        </UButton>
      </template>
      <template v-else>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-settings" @click="emit('manage')">
          Manage
        </UButton>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-wifi-off" @click="emit('disconnect')" />
      </template>
    </div>
  </div>

  <!-- Standard Variant: Inline compact stats -->
  <div v-else-if="variant === 'standard'" class="flex items-center gap-4 text-sm">
    <div class="flex items-center gap-1.5">
      <span class="text-muted">Status:</span>
      <UBadge :color="connectionStatus.color" variant="subtle" size="xs">
        {{ connectionStatus.text }}
      </UBadge>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="text-muted">Peers:</span>
      <span class="font-medium">{{ p2pStore.peerCount }}</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="text-muted">DHT:</span>
      <UBadge :color="dhtColor" variant="subtle" size="xs">
        {{ p2pStore.dhtReady ? 'Ready' : 'Initializing' }}
      </UBadge>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="text-muted">Signers:</span>
      <span class="font-medium">{{ musig2Store.discoveredSigners.length }}</span>
    </div>
  </div>

  <!-- Detailed Variant: Full card with all info -->
  <UiAppCard v-else title="Network Status" icon="i-lucide-activity">
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
      <!-- Connection State -->
      <div>
        <span class="text-muted block mb-1">Connection</span>
        <UBadge :color="connectionStatus.color" variant="subtle">
          {{ connectionStatus.text }}
        </UBadge>
      </div>

      <!-- Peer Count -->
      <div>
        <span class="text-muted block mb-1">Connected Peers</span>
        <div class="font-medium text-lg">{{ p2pStore.peerCount }}</div>
      </div>

      <!-- DHT Status -->
      <div>
        <span class="text-muted block mb-1">DHT Status</span>
        <UBadge :color="dhtColor" variant="subtle">
          {{ p2pStore.dhtReady ? 'Ready' : 'Initializing' }}
        </UBadge>
      </div>

      <!-- Routing Table Size -->
      <div>
        <span class="text-muted block mb-1">Routing Table</span>
        <div class="font-medium">{{ p2pStore.routingTableSize }} peers</div>
      </div>

      <!-- Discovered Signers -->
      <div>
        <span class="text-muted block mb-1">Discovered Signers</span>
        <div class="font-medium text-lg">{{ musig2Store.discoveredSigners.length }}</div>
      </div>

      <!-- Online Identities -->
      <div>
        <span class="text-muted block mb-1">Online Identities</span>
        <div class="font-medium text-lg">{{ onlineIdentityCount }}</div>
      </div>

      <!-- Active Sessions -->
      <div>
        <span class="text-muted block mb-1">Active Sessions</span>
        <div class="font-medium text-lg">{{ musig2Store.activeSessions.length }}</div>
      </div>
    </div>

    <!-- MuSig2 Status -->
    <div class="mt-4 pt-4 border-t border-default">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted">MuSig2 Service</span>
        <UBadge :color="musig2Store.initialized ? 'success' : 'neutral'" variant="subtle" size="xs">
          {{ musig2Store.initialized ? 'Initialized' : 'Not Initialized' }}
        </UBadge>
      </div>
      <div v-if="musig2Store.signerEnabled" class="flex items-center justify-between text-sm mt-2">
        <span class="text-muted">Signer Mode</span>
        <UBadge color="primary" variant="subtle" size="xs">
          Advertising
        </UBadge>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="p2pStore.error || musig2Store.error" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <div class="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
        <UIcon name="i-lucide-alert-circle" class="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <div v-if="p2pStore.error">P2P: {{ p2pStore.error }}</div>
          <div v-if="musig2Store.error">MuSig2: {{ musig2Store.error }}</div>
        </div>
      </div>
    </div>

    <!-- Expandable Debug Info -->
    <UAccordion v-if="showDebug && p2pStore.peerId" :items="debugItems" class="mt-4">
      <template #peer-id>
        <code class="text-xs break-all bg-muted/30 p-2 rounded block">
          {{ p2pStore.peerId }}
        </code>
      </template>
      <template #multiaddrs>
        <div class="space-y-1">
          <code v-for="(addr, idx) in p2pStore.multiaddrs" :key="idx"
            class="text-xs break-all bg-muted/30 p-2 rounded block">
            {{ addr }}
          </code>
          <div v-if="!p2pStore.multiaddrs.length" class="text-muted text-sm">
            No multiaddrs available
          </div>
        </div>
      </template>
    </UAccordion>
  </UiAppCard>
</template>
